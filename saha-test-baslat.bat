@echo off
setlocal
chcp 65001 >nul
title Menteşe SYDV - Sentetik Veriyle Guvenli Saha Testi

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"
set "STAGING_DIR=%BACKEND_DIR%\staging_data"

set "SYDV_DATABASE_PATH=%STAGING_DIR%\db.sqlite3"
set "SYDV_MEDIA_ROOT=%STAGING_DIR%\media"
set "SYDV_SERVE_MEDIA=true"
set "SYDV_DEBUG=false"
set "SYDV_ALLOWED_HOSTS=127.0.0.1,localhost"
set "SYDV_CORS_ALLOW_ALL_ORIGINS=false"
set "SYDV_DISABLE_GEMINI=true"
set "API_BASE_URL=http://127.0.0.1:8100"
set "NEXT_PUBLIC_SAHA_TEST=true"
set "SYDV_NEXT_DIST_DIR=.next-saha-test"
set "NEXT_TELEMETRY_DISABLED=1"

if not exist "%BACKEND_DIR%\venv\Scripts\python.exe" (
  echo Backend sanal ortami bulunamadi: "%BACKEND_DIR%\venv"
  echo README dosyasindaki kurulum adimlarini tamamlayin.
  pause
  exit /b 1
)

if not exist "%ROOT%cloudflared.exe" (
  echo cloudflared.exe bulunamadi: "%ROOT%cloudflared.exe"
  pause
  exit /b 1
)

netstat -ano | findstr /R /C:":8100 .*LISTENING" >nul
if not errorlevel 1 (
  echo 8100 portu zaten kullanimda. Hicbir calisan islem durdurulmadi.
  pause
  exit /b 1
)
netstat -ano | findstr /R /C:":3100 .*LISTENING" >nul
if not errorlevel 1 (
  echo 3100 portu zaten kullanimda. Hicbir calisan islem durdurulmadi.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "[guid]::NewGuid().ToString() + [guid]::NewGuid().ToString()"`) do set "SYDV_SECRET_KEY=%%I"
if not defined SYDV_SECRET_KEY (
  echo Gecici Django anahtari olusturulamadi.
  pause
  exit /b 1
)

if not exist "%STAGING_DIR%" mkdir "%STAGING_DIR%"
if not exist "%SYDV_MEDIA_ROOT%" mkdir "%SYDV_MEDIA_ROOT%"

echo ================================================================
echo   SENTETIK VERIYLE GECICI MOBIL SAHA TESTI
echo ================================================================
echo Bu ortam mevcut veritabaninizi ve medya dosyalarinizi kullanmaz.
echo Gercek kisi bilgisi veya gercek hane fotografi girmeyin.
echo Gemini bulut siniflandirmasi devre disidir.
echo.

echo [1/4] Izole test veritabani hazirlaniyor...
pushd "%BACKEND_DIR%"
venv\Scripts\python.exe manage.py migrate --noinput
set "SETUP_ERROR=%ERRORLEVEL%"
if "%SETUP_ERROR%"=="0" venv\Scripts\python.exe manage.py seed_synthetic_data
if "%SETUP_ERROR%"=="0" set "SETUP_ERROR=%ERRORLEVEL%"
popd
if not "%SETUP_ERROR%"=="0" (
  echo Test veritabani hazirlanamadi.
  pause
  exit /b 1
)

echo [2/4] Django test sunucusu baslatiliyor...
start "SYDV Synthetic Django" cmd /k "cd /d ""%BACKEND_DIR%"" && venv\Scripts\python.exe manage.py runserver 127.0.0.1:8100 --noreload"

set "BACKEND_READY="
for /L %%I in (1,1,30) do (
  if not defined BACKEND_READY (
    curl.exe --fail --silent --output nul http://127.0.0.1:8100/api/registered-households/stats/ >nul 2>&1
    if not errorlevel 1 set "BACKEND_READY=1"
    if not defined BACKEND_READY ping -n 2 127.0.0.1 >nul
  )
)
if not defined BACKEND_READY (
  echo Django test sunucusu baslatilamadi. Acik Django penceresini kontrol edin.
  pause
  exit /b 1
)

echo [3/4] Next.js production build hazirlaniyor...
pushd "%FRONTEND_DIR%"
call npm.cmd run build
set "SETUP_ERROR=%ERRORLEVEL%"
popd
if not "%SETUP_ERROR%"=="0" (
  echo Next.js production build basarisiz oldu.
  pause
  exit /b 1
)

echo Next.js production sunucusu baslatiliyor...
start "SYDV Synthetic Next.js" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm.cmd run start -- --hostname 127.0.0.1 --port 3100"

set "FRONTEND_READY="
for /L %%I in (1,1,60) do (
  if not defined FRONTEND_READY (
    curl.exe --fail --silent --output nul http://127.0.0.1:3100/households/new >nul 2>&1
    if not errorlevel 1 set "FRONTEND_READY=1"
    if not defined FRONTEND_READY ping -n 2 127.0.0.1 >nul
  )
)
if not defined FRONTEND_READY (
  echo Next.js production sunucusu baslatilamadi. Acik Next.js penceresini kontrol edin.
  pause
  exit /b 1
)

echo.
echo [4/4] Cloudflare HTTPS Quick Tunnel aciliyor...
echo Baslangicta olusan trycloudflare.com adresini telefonunuzda acin.
echo Test bitince bu pencerede Ctrl+C yapin; sonra iki sunucu penceresini kapatin.
echo ================================================================
"%ROOT%cloudflared.exe" tunnel --url http://127.0.0.1:3100

echo.
echo Cloudflare tuneli kapandi. Django ve Next.js pencerelerini kapatabilirsiniz.
pause
