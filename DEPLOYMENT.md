# SmileFix Deployment Guide

> **Version:** 1.0.0 (Pre-Multi-Tenant)  
> **Last Updated:** August 2026

## Overview

This document describes the standardized deployment process for SmileFix. Following these procedures ensures consistent, safe deployments across all environments.

---

## 🚨 Important: Safety Net (TX-00)

This deployment process is part of **TX-00: Basic Safety Net**, established before the multi-tenant migration. The safety net includes:

1. ✅ **Automated Testing** - GitHub Actions runs tests on every push/PR
2. ✅ **Branch Protection** - Tests must pass before merging to `main`
3. ✅ **Unified Deployment** - Single standardized script (this guide)

**Why this matters:** Once SmileFix becomes multi-tenant, a deployment mistake will affect ALL clinics, not just one. This safety net prevents breaking changes from reaching production.

---

## Prerequisites

Before deploying, ensure you have:

- [x] Node.js v20 or higher installed
- [x] PostgreSQL database running and accessible
- [x] `.env` file configured in `dental-clinic-backend/`
- [x] Git repository (recommended)
- [x] All tests passing locally: `npm test`

---

## Deployment Methods

### Method 1: Automated Script (Recommended)

The unified deployment script handles all steps automatically.

#### On Linux/Mac:

```bash
# Make script executable (first time only)
chmod +x deploy.sh

# Run deployment
./deploy.sh production
```

#### On Windows:

```powershell
# Run deployment
.\deploy.ps1 -Environment production
```

#### What the script does:

1. **Pre-flight checks** - Validates Node.js, npm, database, .env file
2. **Pull code** - Updates from git (if applicable)
3. **Install dependencies** - Runs `npm ci`
4. **Run migrations** - Applies database schema changes
5. **Run tests** - Validates everything works (halts if tests fail)
6. **Restart service** - Restarts the backend (PM2 or manual)

#### Script Options:

```bash
# Production deployment (default)
./deploy.sh production

# Staging deployment
./deploy.sh staging
```

---

### Method 2: Manual Deployment

If you need to run steps individually:

```bash
# 1. Navigate to backend directory
cd dental-clinic-backend

# 2. Pull latest code (if using git)
git pull origin main

# 3. Install dependencies
npm ci

# 4. Run database migrations
npm run db:migrate

# 5. Run tests (CRITICAL - do not skip!)
npm test

# 6. Restart the service
pm2 restart smilefix-backend
# OR
npm start
```

**⚠️ Warning:** Manual deployments are error-prone. Use the automated script whenever possible.

---

## Service Management

### Using PM2 (Recommended for Production)

PM2 is a production-ready process manager for Node.js applications.

#### Install PM2:

```bash
npm install -g pm2
```

#### Start the service:

```bash
cd dental-clinic-backend
pm2 start src/server.js --name smilefix-backend
pm2 save  # Save process list for auto-restart on reboot
```

#### Manage the service:

```bash
# View status
pm2 status

# View logs
pm2 logs smilefix-backend

# Restart
pm2 restart smilefix-backend

# Stop
pm2 stop smilefix-backend

# Delete process
pm2 delete smilefix-backend

# Monitor in real-time
pm2 monit
```

#### Auto-start on system reboot:

```bash
pm2 startup
# Follow the instructions printed
pm2 save
```

---

### Using systemd (Linux Alternative)

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/smilefix-backend.service
```

Content:

```ini
[Unit]
Description=SmileFix Backend API
After=network.target postgresql.service

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/Dental_clinic/dental-clinic-backend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable smilefix-backend
sudo systemctl start smilefix-backend
sudo systemctl status smilefix-backend
```

---

## GitHub Actions CI/CD

### Automatic Test Runs

The CI pipeline automatically runs on:
- Every push to `main` or `develop` branches
- Every pull request targeting `main`

### What gets tested:

1. **Backend tests** - Full test suite with PostgreSQL
2. **Code quality** - Basic syntax validation
3. **Dependencies** - Verifies clean npm install

### Viewing CI Results:

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. View workflow runs and their status

### CI Workflow File:

Located at `.github/workflows/ci.yml`

---

## Branch Protection Rules

To enable branch protection on GitHub:

### Steps:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Branches**
3. Click **Add branch protection rule**
4. Configure as follows:

```
Branch name pattern: main

✅ Require a pull request before merging
   ✅ Require approvals: 1
   ✅ Dismiss stale pull request approvals when new commits are pushed

✅ Require status checks to pass before merging
   ✅ Require branches to be up to date before merging
   Status checks required:
     - Backend Tests
     - All Checks Passed

✅ Do not allow bypassing the above settings
```

5. Click **Create** or **Save changes**

### What this means:

- ✅ No direct pushes to `main` (must use pull requests)
- ✅ Tests MUST pass before merging
- ✅ At least 1 approval required
- ✅ Branch must be up-to-date with `main`

---

## Post-Deployment Checklist

After every deployment, verify:

- [ ] Service is running: `pm2 status` or `systemctl status smilefix-backend`
- [ ] Health check responds: `curl http://localhost:3000/api/v1/health`
- [ ] Login works: Test with a known user account
- [ ] Database connection: Check logs for database errors
- [ ] Monitor logs for errors: `pm2 logs smilefix-backend --lines 50`

---

## Troubleshooting

### Tests fail during deployment

**Symptom:** `npm test` returns exit code 1

**Solutions:**
1. Run tests locally first: `cd dental-clinic-backend && npm test`
2. Check database connection in `.env`
3. Ensure migrations ran: `npm run db:migrate`
4. Review test output for specific failures

### Database migration fails

**Symptom:** `npm run db:migrate` errors

**Solutions:**
1. Check database connection: `psql -h localhost -U postgres -d smilefix_db`
2. Verify DATABASE_URL in `.env`
3. Check PostgreSQL service is running
4. Review migration files for syntax errors

### Service won't start

**Symptom:** Backend doesn't respond after deployment

**Solutions:**
1. Check logs: `pm2 logs smilefix-backend`
2. Verify .env file exists and is valid
3. Check port 3000 isn't already in use: `lsof -i :3000` (Linux/Mac) or `netstat -ano | findstr :3000` (Windows)
4. Try starting manually: `cd dental-clinic-backend && npm start`

### PM2 not found

**Symptom:** `pm2: command not found`

**Solution:**
```bash
npm install -g pm2
```

---

## Rollback Procedure

If a deployment causes issues:

### Using Git:

```bash
# 1. Identify the last working commit
git log --oneline -10

# 2. Revert to that commit
git reset --hard <commit-hash>

# 3. Force push (if already pushed)
git push origin main --force

# 4. Re-run deployment
./deploy.sh production
```

### Using Database Migrations:

```bash
# Rollback last migration
cd dental-clinic-backend
npm run db:rollback

# Rollback specific number of migrations
npm run db:rollback -- --all  # Rollback all
```

---

## Future Enhancements (Post TX-00)

After the multi-tenant migration (TX-01, TX-02), this deployment process will be enhanced with:

- [ ] Automated rollback on test failure
- [ ] Blue-green or canary deployment
- [ ] Database backup before migrations
- [ ] Automated smoke tests in production
- [ ] Notification on deployment (Slack/email)
- [ ] Multi-tenant data isolation validation

---

## Support

For deployment issues:

1. Check this document first
2. Review logs: `pm2 logs smilefix-backend`
3. Check GitHub Actions for CI failures
4. Review `deployment-*.log` files

---

## Changelog

### v1.0.0 (August 2026)
- Initial deployment guide (TX-00)
- Added automated deployment scripts (bash + PowerShell)
- Configured GitHub Actions CI
- Documented branch protection rules
- Added PM2 and systemd service management
