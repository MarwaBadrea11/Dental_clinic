Set-Location "C:\Users\Dell\Desktop\clincfxm\Dental_clinic"

Write-Host "Step 1: Fetch latest from origin" -ForegroundColor Cyan
git fetch origin
if ($LASTEXITCODE -ne 0) {
    Write-Host "Cannot reach GitHub - check internet connection and retry" -ForegroundColor Red
    exit 1
}

Write-Host "Step 2: Check how far behind main we are" -ForegroundColor Cyan
$counts = git rev-list --left-right --count HEAD...origin/main
Write-Host "Ahead / Behind: $counts"

$behind = ($counts -split "\s+")[1]

if ([int]$behind -gt 0) {
    Write-Host "Step 3: New commits on main - merging into A" -ForegroundColor Yellow

    Write-Host "Stashing local changes..." -ForegroundColor Cyan
    git stash push -m "sync-before-merge"

    git merge origin/main --no-edit
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Merge conflict - restoring stash and aborting" -ForegroundColor Red
        git merge --abort
        git stash pop
        exit 1
    }

    Write-Host "Reapplying stash..." -ForegroundColor Cyan
    git stash pop

    git add -A
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        git commit -m "chore: merge main into Alesar and reapply local fixes"
    }
} else {
    Write-Host "Step 3: Already up to date with main" -ForegroundColor Green
}

Write-Host "Step 4: Push to origin/Alesar" -ForegroundColor Cyan
git push origin A:Alesar
if ($LASTEXITCODE -ne 0) {
    Write-Host "Normal push rejected - using force-with-lease" -ForegroundColor Yellow
    git push origin A:Alesar --force-with-lease
}

Write-Host "Done! Final log:" -ForegroundColor Green
git log --oneline -8
