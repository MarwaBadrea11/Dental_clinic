Set-Location "C:\Users\Dell\Desktop\clincfxm\Dental_clinic"
Write-Host "Step 1: Stash" -ForegroundColor Cyan
git stash push -m "local-work"
Write-Host "Step 2: Merge main" -ForegroundColor Cyan
git merge origin/main --no-edit
Write-Host "Step 3: Pop stash" -ForegroundColor Cyan
git stash pop
Write-Host "Step 4: Stage and commit" -ForegroundColor Cyan
git add -A
git status --short
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    git commit -m "chore: merge main into Alesar and reapply local fixes"
}
Write-Host "Step 5: Push" -ForegroundColor Cyan
git push origin A:Alesar
Write-Host "Step 6: Log" -ForegroundColor Green
git log --oneline -8
