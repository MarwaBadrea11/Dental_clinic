Set-Location "C:\Users\Dell\Desktop\clincfxm\Dental_clinic"

Write-Host "=== Fetching from origin ===" -ForegroundColor Cyan
git fetch origin
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Cannot reach GitHub. Check internet connection." -ForegroundColor Red
    exit 1
}

Write-Host "=== Current state ===" -ForegroundColor Cyan
git log --oneline -3
Write-Host "--- origin/main last 3 ---"
git log --oneline origin/main -3

$counts = git rev-list --left-right --count HEAD...origin/main
$ahead  = [int]($counts -split "\s+")[0]
$behind = [int]($counts -split "\s+")[1]
Write-Host "Your branch: $ahead ahead, $behind behind origin/main" -ForegroundColor Yellow

if ($behind -eq 0) {
    Write-Host "Already up to date with main." -ForegroundColor Green
} else {
    Write-Host "=== Stashing local changes ===" -ForegroundColor Cyan
    git stash push -m "sync-stash"

    Write-Host "=== Merging origin/main ===" -ForegroundColor Cyan
    git merge origin/main --no-edit
    if ($LASTEXITCODE -ne 0) {
        Write-Host "CONFLICT - check files, resolve, then push manually" -ForegroundColor Red
        git merge --abort
        git stash pop
        exit 1
    }

    Write-Host "=== Reapplying stash ===" -ForegroundColor Cyan
    git stash pop

    git add -A
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        git commit -m "chore: merge main into Alesar and reapply local fixes"
    }
}

Write-Host "=== Pushing to origin/Alesar ===" -ForegroundColor Cyan
git push origin A:Alesar
if ($LASTEXITCODE -ne 0) {
    Write-Host "Retrying with force-with-lease..." -ForegroundColor Yellow
    git push origin A:Alesar --force-with-lease
}

Write-Host "=== Done! Final log ===" -ForegroundColor Green
git log --oneline -8
