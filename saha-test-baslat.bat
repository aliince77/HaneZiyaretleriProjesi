@echo off
chcp 65001 >nul
title Menteşe SYDV - Mobil Saha Test Başlatıcı (Cloudflare HTTPS)

echo ============================================================================
echo   MENTEŞE SYDV HANE ZİYARETİ BİLGİ SİSTEMİ - MOBİL SAHA TEST BAŞLATICI
echo ============================================================================
echo.
echo [1/3] Django Backend (Port 8000) baslatiliyor...
start "SYDV Django Backend" cmd /k "cd /d "%~dp0backend" && venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000"

echo [2/3] Next.js Frontend (Port 3000) baslatiliyor...
start "SYDV Next.js Frontend" cmd /k "cd /d "%~dp0frontend" && npm.cmd run dev"

echo Sunucularin hazir olmasi icin 4 saniye bekleniyor...
timeout /t 4 /nobreak >nul

echo.
echo [3/3] Cloudflare Guvenli HTTPS Tuneli aciliyor...
echo Asagidaki kutuda cikan "https://....trycloudflare.com" adresini
echo telefonunuzun tarayicisindan (Safari / Chrome) acabilirsiniz:
echo ============================================================================
echo.

"%~dp0cloudflared.exe" tunnel --url http://localhost:3000
pause
