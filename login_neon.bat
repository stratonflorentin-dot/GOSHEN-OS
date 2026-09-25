@echo off
REM One-time Neon CLI sign-in. Credentials persist for this machine.
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "D:\my projects\GOSHEN OS"
echo === Neon sign-in ===
echo A browser (Chrome) will open. Complete the sign-in there.
echo.
npx -y neon@latest auth
echo.
if %ERRORLEVEL%==0 (echo Sign-in complete. You can close this window.) else (echo Sign-in FAILED with code %ERRORLEVEL%.)
pause
