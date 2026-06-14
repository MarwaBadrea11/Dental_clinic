Set-Location "C:\Users\Dell\Desktop\clincfxm\Dental_clinic"

Write-Host "=== Step 1: Switch to local branch A (your Alesar branch) ===" -ForegroundColor Cyan
git checkout A
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: checkout A failed" -ForegroundColor Red; exit 1 }

Write-Host "`n=== Step 2: Set upstream tracking to origin/Alesar ===" -ForegroundColor Cyan
git branch --set-upstream-to=origin/Alesar A

Write-Host "`n=== Step 3: Merge origin/main into branch A ===" -ForegroundColor Cyan
git merge origin/main --no-edit
if ($LASTEXITCODE -ne 0) {
    Write-Host "MERGE CONFLICTS detected. Listing conflicted files:" -ForegroundColor Yellow
    git diff --name-only --diff-filter=U
    Write-Host "Resolve conflicts, then run: git add . && git commit && git push origin A:Alesar" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== Step 4: Push updated branch to origin/Alesar ===" -ForegroundColor Cyan
git push origin A:Alesar
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: push failed" -ForegroundColor Red; exit 1 }

Write-Host "`n=== Done! Your Alesar branch is now up to date with main ===" -ForegroundColor Green
git log --oneline -8
