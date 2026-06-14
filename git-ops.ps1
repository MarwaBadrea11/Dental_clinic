Set-Location "C:\Users\Dell\Desktop\clincfxm\Dental_clinic"
Write-Host "=== Current branch ===" -ForegroundColor Cyan
git branch
Write-Host "`n=== All branches (local + remote) ===" -ForegroundColor Cyan
git branch -a
Write-Host "`n=== Remote info ===" -ForegroundColor Cyan
git remote -v
Write-Host "`n=== Recent commits on current branch ===" -ForegroundColor Cyan
git log --oneline -10
