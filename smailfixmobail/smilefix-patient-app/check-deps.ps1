Set-Location "C:\Users\Dell\Desktop\clincfxm\Dental_clinic\smailfixmobail\smilefix-patient-app"

Write-Host "=== Node / npm versions ===" -ForegroundColor Cyan
node --version
npm --version

Write-Host "=== node_modules status ===" -ForegroundColor Cyan
if (Test-Path "node_modules") {
    $count = (Get-ChildItem node_modules -Directory).Count
    Write-Host "node_modules exists — $count top-level packages" -ForegroundColor Green
} else {
    Write-Host "node_modules does NOT exist" -ForegroundColor Red
}

Write-Host "=== Checking key packages ===" -ForegroundColor Cyan
$check = @(
    "node_modules/@expo/metro-runtime",
    "node_modules/expo",
    "node_modules/react-native",
    "node_modules/react"
)
foreach ($p in $check) {
    if (Test-Path $p) {
        Write-Host "  FOUND    $p" -ForegroundColor Green
    } else {
        Write-Host "  MISSING  $p" -ForegroundColor Red
    }
}
