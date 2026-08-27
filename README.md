# SmileFix - Dental Clinic Management System

> A full-stack dental clinic management system transitioning to multi-tenant SaaS

## 📚 Documentation

- **[Project Context](PROJECT_CONTEXT.md)** - Complete technical overview
- **[Deployment Guide](DEPLOYMENT.md)** - How to deploy SmileFix
- **[Branch Protection Setup](BRANCH_PROTECTION_SETUP.md)** - GitHub branch protection configuration
- **[TX-00 Completion](TX-00_COMPLETION_SUMMARY.md)** - Safety net implementation summary

## 🚀 Quick Start

### Backend
```bash
cd dental-clinic-backend
npm install
npm run db:migrate
npm run dev
```

### Run Tests
```bash
cd dental-clinic-backend
npm test
```

### Deploy
```bash
# Linux/Mac
./deploy.sh production

# Windows
.\deploy.ps1 -Environment production
```

## 🧪 Testing & CI/CD

- **CI Pipeline:** `.github/workflows/ci.yml`
- **Tests:** Automatically run on push/PR to `main`
- **Branch Protection:** See `BRANCH_PROTECTION_SETUP.md`

## 📦 Project Structure

```
Dental_clinic/
├── dental-clinic-backend/    # Node.js + Fastify API
├── smilefix-app/            # React admin dashboard
├── smailfixmobail/          # React Native patient app
├── deploy.sh                # Deployment script (Linux/Mac)
├── deploy.ps1               # Deployment script (Windows)
└── .github/workflows/       # CI/CD automation
```

## 🔒 Safety Net (TX-00)

Before multi-tenant migration, we've implemented:
- ✅ Automated testing via GitHub Actions
- ✅ Branch protection on `main`
- ✅ Standardized deployment process
- ✅ Test coverage for critical paths

See [TX-00_COMPLETION_SUMMARY.md](TX-00_COMPLETION_SUMMARY.md) for details.

## 🛠️ Development Workflow

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit
3. Push and create Pull Request
4. Wait for CI tests to pass
5. Get approval and merge

## 📖 More Information

For complete project context, architecture, API documentation, and more, see [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).