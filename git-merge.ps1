Set-Location "C:\Users\Dell\Desktop\clincfxm\Dental_clinic"

Write-Host "=== Fetching all remotes ===" -ForegroundColor Cyan
git fetch origin

Write-Host "`n=== Commits on origin/Alesar ===" -ForegroundColor Cyan
git log --oneline origin/Alesar -10 2>&1

Write-Host "`n=== Commits on origin/alesar ===" -ForegroundColor Cyan
git log --oneline origin/alesar -10 2>&1

Write-Host "`n=== Commits ahead/behind main on each branch ===" -ForegroundColor Cyan
Write-Host "origin/Alesar vs main:"
git rev-list --left-right --count origin/main...origin/Alesar 2>&1
Write-Host "origin/alesar vs main:"
git rev-list --left-right --count origin/main...origin/alesar 2>&1
