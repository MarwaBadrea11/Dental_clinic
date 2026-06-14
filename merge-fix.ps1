Set-Location "C:\Users\Dell\Desktop\clincfxm\Dental_clinic"

# Abort any in-progress merge
git merge --abort 2>$null
git reset --hard HEAD 2>$null

Write-Host "Starting fresh merge of origin/main..." -ForegroundColor Cyan
git merge origin/main --no-commit --no-ff
if ($LASTEXITCODE -ne 0) {
    Write-Host "Resolving conflicts..." -ForegroundColor Yellow

    # package-lock files: always take theirs (auto-generated)
    git checkout --theirs -- "smilefix-app/package-lock.json"
    git checkout --theirs -- "smailfixmobail/smilefix-patient-app/package-lock.json"

    # Our service files are the CORRECT versions - keep ours
    git checkout --ours -- "smilefix-app/src/services/apiClient.ts"
    git checkout --ours -- "smilefix-app/src/services/authService.ts"

    # Stage all resolved files
    git add "smilefix-app/package-lock.json"
    git add "smailfixmobail/smilefix-patient-app/package-lock.json"
    git add "smilefix-app/src/services/apiClient.ts"
    git add "smilefix-app/src/services/authService.ts"
}

# Stage everything else that merged cleanly
git add -A

# Commit the merge
git commit -m "chore: merge main into Alesar (keep our API client fixes)"

Write-Host "Pushing to origin/Alesar..." -ForegroundColor Cyan
git push origin A:Alesar --force-with-lease

Write-Host "Done!" -ForegroundColor Green
git log --oneline -6
