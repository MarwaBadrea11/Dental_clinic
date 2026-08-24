# GitHub Branch Protection Setup Guide

> **Part of TX-00: Basic Safety Net**

## Why Branch Protection?

Once SmileFix becomes multi-tenant, a single bad merge to `main` could take down **every clinic** using the platform. Branch protection ensures that:

1. All code is reviewed before merging
2. Tests pass before any code reaches production
3. No accidental direct pushes to `main`

---

## Step-by-Step Setup Instructions

### 1. Navigate to Repository Settings

1. Open your SmileFix repository on GitHub
2. Click **Settings** tab (top right)
3. In the left sidebar, click **Branches**

### 2. Add Branch Protection Rule

Click the **Add branch protection rule** button (or **Add rule** if you see that instead).

### 3. Configure Branch Name Pattern

In the **Branch name pattern** field, enter:
```
main
```

### 4. Enable Required Settings

Check the following boxes:

#### ✅ Require a pull request before merging
- **Reason:** Prevents direct pushes to main
- Sub-options to enable:
  - ✅ **Require approvals:** Set to `1`
  - ✅ **Dismiss stale pull request approvals when new commits are pushed**
  - ✅ **Require review from Code Owners** (optional, if you have a CODEOWNERS file)

#### ✅ Require status checks to pass before merging
- **Reason:** Blocks merges if tests fail
- Sub-options to enable:
  - ✅ **Require branches to be up to date before merging**
  - In the search box under "Status checks that are required", add:
    - `Backend Tests` (the job name from ci.yml)
    - `All Checks Passed` (the final verification job)

  **Note:** These status checks will only appear in the list **after** you've run the GitHub Actions workflow at least once. If you don't see them yet:
  1. Push a commit to trigger the workflow
  2. Wait for it to complete
  3. Come back and add the status checks

#### ✅ Require conversation resolution before merging
- **Reason:** Ensures all PR comments are addressed

#### ✅ Do not allow bypassing the above settings
- **Reason:** Even admins must follow the rules

### 5. Optional but Recommended Settings

#### ✅ Require signed commits (if using GPG)
- Only check this if your team uses commit signing

#### ✅ Require linear history
- Prevents merge commits; only fast-forward or squash merges allowed
- Keeps git history clean

#### ✅ Include administrators
- Makes the rules apply to everyone, including repository admins
- **Highly recommended** to prevent accidental bypasses

### 6. Save the Rule

Click **Create** (or **Save changes** if editing an existing rule).

---

## Verification

After setting up branch protection, verify it works:

### Test 1: Try to push directly to main

```bash
# This should be rejected
git checkout main
echo "test" >> test.txt
git add test.txt
git commit -m "Test direct push"
git push origin main
```

**Expected result:** Push is rejected with an error message about branch protection.

### Test 2: Create a pull request

```bash
# Create a feature branch
git checkout -b test-branch-protection
echo "test" >> test.txt
git add test.txt
git commit -m "Test PR workflow"
git push origin test-branch-protection
```

Then on GitHub:
1. Create a pull request from `test-branch-protection` to `main`
2. Verify you see the CI checks running
3. Verify you **cannot** merge until checks pass
4. Verify you need at least 1 approval

---

## What Your Team Will See

### Before Branch Protection:
- Anyone can push directly to `main`
- No review required
- Tests might be skipped

### After Branch Protection:
- Must create a feature branch: `git checkout -b feature/my-feature`
- Push the branch: `git push origin feature/my-feature`
- Create a pull request on GitHub
- Wait for CI tests to pass (automated)
- Get at least 1 approval from a teammate
- Merge via GitHub UI (not command line)

---

## Workflow for Development

### Recommended Git Workflow (With Branch Protection):

```bash
# 1. Start from main
git checkout main
git pull origin main

# 2. Create a feature branch
git checkout -b feature/add-new-feature

# 3. Make changes and commit
git add .
git commit -m "Add new feature"

# 4. Push to GitHub
git push origin feature/add-new-feature

# 5. Create Pull Request on GitHub
# - Go to GitHub repository
# - Click "Compare & pull request" button
# - Fill in PR description
# - Submit pull request

# 6. Wait for:
#    - CI tests to pass (automatic)
#    - Code review approval (manual)

# 7. Merge via GitHub UI
# - Click "Merge pull request" button
# - Confirm merge

# 8. Clean up local branch
git checkout main
git pull origin main
git branch -d feature/add-new-feature
```

---

## Emergency Override (Break Glass)

If you **absolutely must** push to main (e.g., production is down):

1. **Admins only:** Temporarily disable branch protection:
   - Go to Settings → Branches
   - Click **Edit** on the `main` rule
   - Uncheck "Include administrators"
   - Save

2. Make your emergency fix and push

3. **IMMEDIATELY re-enable protection:**
   - Go back to Settings → Branches
   - Click **Edit** on the `main` rule
   - Re-check "Include administrators"
   - Save

**Warning:** Document why this was necessary. Emergency overrides should be extremely rare.

---

## Troubleshooting

### Problem: Can't see status checks in the list

**Solution:** 
1. The workflow must run at least once first
2. Push any commit to trigger `.github/workflows/ci.yml`
3. Wait for the workflow to complete
4. Return to branch protection settings
5. The status checks should now appear in the search

### Problem: PR shows "Waiting for status to be reported"

**Solution:**
1. Check if GitHub Actions workflow is enabled (Settings → Actions)
2. Verify `.github/workflows/ci.yml` exists in your repo
3. Check the Actions tab for errors

### Problem: Tests pass locally but fail in CI

**Solution:**
1. Check the Actions tab for detailed error logs
2. Common causes:
   - Missing environment variables
   - Database connection issues (CI uses PostgreSQL service)
   - Dependencies not installed correctly

### Problem: Team members can't push to main anymore

**Solution:**
This is expected! They need to:
1. Create feature branches
2. Push branches to GitHub
3. Create pull requests
4. Merge after approval + passing tests

---

## Summary Checklist

Once you've completed the setup:

- [ ] Branch protection rule created for `main`
- [ ] Pull requests required
- [ ] At least 1 approval required
- [ ] Status checks required: `Backend Tests`, `All Checks Passed`
- [ ] Branch must be up-to-date before merging
- [ ] Cannot bypass settings (even admins)
- [ ] Tested: Direct push to main is blocked
- [ ] Tested: PR workflow works correctly
- [ ] Team members notified of new workflow

---

## Next Steps

After branch protection is enabled:

1. ✅ Notify your team about the new PR workflow
2. ✅ Update team documentation
3. ✅ Consider adding a `CODEOWNERS` file for automatic reviewer assignment
4. ✅ Set up Slack/email notifications for PR reviews (GitHub Settings → Notifications)

---

## Questions?

If you run into issues:
1. Check GitHub's official docs: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches
2. Review the Actions tab for CI failures
3. Check the DEPLOYMENT.md file for deployment procedures
