Set-Location "C:\Users\Dell\Desktop\clincfxm\Dental_clinic"
Write-Host "Current branch:" -ForegroundColor Cyan
git branch
Write-Host "Fetch from origin:" -ForegroundColor Cyan
git fetch origin
Write-Host "Commits ahead/behind (local A vs origin/main):" -ForegroundColor Cyan
git rev-list --left-right --count HEAD...origin/main
Write-Host "Last 5 commits on origin/main:" -ForegroundColor Cyan
git log --oneline origin/main -5
Write-Host "Last 5 commits on HEAD:" -ForegroundColor Cyan
git log --oneline HEAD -5
