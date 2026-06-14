Set-Location "C:\Users\Dell\Desktop\clincfxm\Dental_clinic"

Write-Host "Step 1: Stash all local changes" -ForegroundColor Cyan
git stash push -m "local-work-before-merge-with-main"
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: stash failed" -ForegroundColor Red; exit 1 }

Write-Host "Step 2: Merge origin/main into branch A" -ForegroundColor Cyan
git merge origin/main --no-edit
if ($LASTEXITCODE -ne 0) {
    Write-Host "MERGE had conflicts. Restoring stash." -ForegroundColor Yellow
    git stash pop
    git diff --name-only --diff-filter=U
    exit 1
}

Write-Host "Step 3: Reapply stashed local changes" -ForegroundColor Cyan
git stash pop
$stashResult = $LASTEXITCODE

if ($stashResult -ne 0) {
    Write-Host "Stash pop had conflicts. Conflicted files:" -ForegroundColor Yellow
    git diff --name-only --diff-filter=U
}

Write-Host "Step 4: Stage everything" -ForegroundColor Cyan
git add -A
git status --short

Write-Host "Step 5: Commit" -ForegroundColor Cyan
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    git commit -m "chore: merge main into Alesar and reapply local fixes"
} else {
    Write-Host "Nothing to commit, already up to date." -ForegroundColor Green
}

Write-Host "Step 6: Push to origin/Alesar" -ForegroundColor Cyan
git push origin A:Alesar
if ($LASTEXITCODE -ne 0) {
    Write-Host "Push failed - may need force push if history diverged" -ForegroundColor Yellow
    git push origin A:Alesar --force-with-lease
}

Write-Host "Done! Recent commits:" -ForegroundColor Green
git log --oneline -10
