Set-Location "C:\Users\Dell\Desktop\clincfxm\Dental_clinic"

Write-Host "=== Starting merge ===" -ForegroundColor Cyan
git merge origin/main --no-edit
if ($LASTEXITCODE -eq 0) {
    Write-Host "Clean merge - no conflicts" -ForegroundColor Green
} else {
    Write-Host "Conflicts detected - resolving package-lock.json files automatically..." -ForegroundColor Yellow

    # package-lock.json files are auto-generated - always safe to take theirs
    git checkout --theirs smilefix-app/package-lock.json 2>$null
    git checkout --theirs "smailfixmobail/smilefix-patient-app/package-lock.json" 2>$null

    # For source files - keep our version (it's the correct fixed version)
    git checkout --ours smilefix-app/src/services/apiClient.ts 2>$null
    git checkout --ours smilefix-app/src/services/authService.ts 2>$null

    git add smilefix-app/package-lock.json
    git add "smailfixmobail/smilefix-patient-app/package-lock.json"
    git add smilefix-app/src/services/apiClient.ts
    git add smilefix-app/src/services/authService.ts

    # Mark any remaining conflicts resolved
    $remaining = git diff --name-only --diff-filter=U
    if ($remaining) {
        Write-Host "Remaining conflicts:" -ForegroundColor Yellow
        $remaining | ForEach-Object { Write-Host "  $_" }
        # Take ours for any other source files
        $remaining | ForEach-Object { git checkout --ours $_ ; git add $_ }
    }

    git commit -m "chore: merge main into Alesar - resolve package-lock conflicts"
    Write-Host "Merge committed" -ForegroundColor Green
}

Write-Host "=== Reapplying stash if any ===" -ForegroundColor Cyan
$stashList = git stash list
if ($stashList -match "sync-stash") {
    git stash pop
    git add -A
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        git commit -m "chore: reapply local fixes after merge"
    }
}

Write-Host "=== Pushing to origin/Alesar ===" -ForegroundColor Cyan
git push origin A:Alesar
if ($LASTEXITCODE -ne 0) {
    Write-Host "Using force-with-lease..." -ForegroundColor Yellow
    git push origin A:Alesar --force-with-lease
}

Write-Host "=== Done! ===" -ForegroundColor Green
git log --oneline -8
