@echo off
title SmileFix - Full Setup
color 0A

echo.
echo  ============================================
echo   SmileFix Patient App - Full Clean Setup
echo  ============================================
echo.

cd /d "c:\Users\Dell\Desktop\smailfixmobail\smilefix-patient-app"

echo [Step 1/4] Cleaning old node_modules...
if exist node_modules (
    echo  Removing node_modules...
    rd /s /q node_modules
    echo  Done.
) else (
    echo  node_modules not found, skipping.
)

if exist package-lock.json (
    del /f /q package-lock.json
    echo  Removed package-lock.json
)

echo.
echo [Step 2/4] Installing all packages (this takes 3-5 minutes)...
npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo  ERROR: npm install failed!
    pause
    exit /b 1
)

echo.
echo [Step 3/4] Verifying critical packages...
node -e "const fs=require('fs'); const pkgs=['expo','babel-preset-expo','typescript','react-native','@react-navigation/native','react-native-reanimated','react-native-svg','expo-blur','expo-linear-gradient','zustand']; let ok=true; pkgs.forEach(p=>{const e=fs.existsSync('./node_modules/'+p); console.log((e?'  [OK]  ':'  [!!]  ')+p); if(!e)ok=false;}); process.exit(ok?0:1);"
if %errorlevel% neq 0 (
    echo.
    echo  WARNING: Some packages missing. Retrying install...
    npm install --legacy-peer-deps
)

echo.
echo [Step 4/4] Clearing Expo cache and starting...
echo.
echo  ============================================
echo   Setup complete! Starting Expo...
echo   Scan the QR Code with Expo Go app
echo  ============================================
echo.

npx expo start --clear

pause
