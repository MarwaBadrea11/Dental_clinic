@echo off
echo ============================================
echo  SmileFix - Clean Metro Dev Start
echo ============================================

echo [1/4] Killing stale node processes...
taskkill /F /IM node.exe >nul 2>&1
echo Done.

echo [2/4] Opening firewall for Metro (port 8082)...
netsh advfirewall firewall delete rule name="Expo Metro 8082" >nul 2>&1
netsh advfirewall firewall add rule name="Expo Metro 8082" dir=in action=allow protocol=TCP localport=8082 >nul 2>&1
echo Done.

echo [3/4] Clearing Expo and Metro caches...
if exist ".expo" (
    rmdir /s /q ".expo"
    echo Cleared .expo
)
if exist "%TEMP%\metro-*" (
    del /q /f "%TEMP%\metro-*" >nul 2>&1
    echo Cleared Metro temp files
)
if exist "%LOCALAPPDATA%\Temp\metro-*" (
    del /q /f "%LOCALAPPDATA%\Temp\metro-*" >nul 2>&1
)
echo Done.

echo [4/4] Starting Metro Bundler with cleared cache on LAN...
echo.
echo ============================================
echo  Scan the QR code in Expo Go
echo  OR manually enter: exp://192.168.1.226:8082
echo ============================================
echo.
npx expo start --clear --lan --port 8082

pause
