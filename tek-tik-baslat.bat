@echo off
title Hogwarts - Baslatiliyor...
color 0A

echo.
echo  ==========================================
echo         HOGWARTS - BUYUCU DUNYASI
echo  ==========================================
echo.

:: Python check
echo [1/5] Python kontrol ediliyor...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python bulunamadi. Indiriliyor...
    curl -o python_installer.exe https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe
    python_installer.exe /quiet InstallAllUsers=1 PrependPath=1 Include_test=0
    del python_installer.exe
    echo Python kuruldu!
) else (
    echo Python mevcut.
)

:: Node check
echo [2/5] Node.js kontrol ediliyor...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js bulunamadi. Indiriliyor...
    curl -o node_installer.msi https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi
    msiexec /i node_installer.msi /quiet /norestart
    del node_installer.msi
    echo Node.js kuruldu!
) else (
    echo Node.js mevcut.
)

:: Backend deps
echo [3/5] Backend bagimliliklari...
if not exist ".venv" (
    echo Sanal ortam olusturuluyor...
    python -m venv .venv
    echo Paketler yukleniyor...
    .venv\Scripts\pip install -r backend\requirements.txt --quiet
    echo Backend hazir!
) else (
    echo Backend zaten kurulu.
)

:: Frontend deps
echo [4/5] Frontend bagimliliklari...
if not exist "frontend\node_modules" (
    echo Paketler yukleniyor...
    cd frontend
    npm install --silent
    cd ..
    echo Frontend hazir!
) else (
    echo Frontend zaten kurulu.
)

:: Start
echo [5/5] Baslatiliyor...

start "Hogwarts Backend" cmd /k ".venv\Scripts\uvicorn backend.main:app --reload --port 8001"
timeout /t 3 /nobreak >nul
start "Hogwarts Frontend" cmd /k "cd frontend && npx serve . -l 5173"
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo.
echo  Hogwarts acildi!
echo  Tarayicinizda http://localhost:5173 adresine gidin.
echo.
pause
