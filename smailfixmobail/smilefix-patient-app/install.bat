@echo off
echo ============================================
echo  SmileFix - Clean Install
echo ============================================
echo.

cd /d "c:\Users\Dell\Desktop\smailfixmobail\smilefix-patient-app"

echo [1/3] Verifying package.json...
node -e "const p=require('./package.json'); console.log('expo version:', p.dependencies.expo); console.log('babel-preset-expo:', p.devDependencies['babel-preset-expo']);"

echo.
echo [2/3] Running npm install --legacy-peer-deps...
npm install --legacy-peer-deps

echo.
echo [3/3] Verifying critical packages...
node -e "const fs=require('fs'); const checks=['babel-preset-expo','expo','react-native','@react-navigation/native','react-native-reanimated','react-native-svg','zustand']; checks.forEach(p=>{ const ok=fs.existsSync('./node_modules/'+p); console.log((ok?'[OK]':'[MISSING]'), p); });"

echo.
echo ============================================
echo  Installation complete!
echo  Run: npx expo start --clear
echo ============================================
pause
