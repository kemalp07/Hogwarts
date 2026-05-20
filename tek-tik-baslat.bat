@echo off
setlocal

cd /d "%~dp0"

if exist ".venv\Scripts\python.exe" (
  set "PY=.venv\Scripts\python.exe"
) else (
  set "PY=python"
)

echo [1/3] Backend baslatiliyor...
start "HP Backend" cmd /k "%PY% -m uvicorn backend.main:app --reload --port 8001"

echo [2/3] Frontend Expo uygulamasi baslatiliyor...
if not exist "frontend\node_modules" (
  pushd frontend
  call npm install
  popd
)
start "" /D "%~dp0frontend" cmd /k npm run web

echo [3/3] Tarayici aciliyor...
start "" "http://localhost:8081"

echo Tamam. Pencereleri kapatana kadar servisler calismaya devam eder.
