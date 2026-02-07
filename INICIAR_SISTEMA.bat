@echo off
TITLE Sistema Veterinario - Lanzador
echo ==========================================
echo   INICIANDO SISTEMA VETERINARIO
echo ==========================================
echo.

echo [1/2] Iniciando Servidor Backend...
start "Backend - Veterinario" cmd /k "cd /d %~dp0backend && .\venv\Scripts\python.exe -m uvicorn app.main:app --reload"

echo [2/2] Iniciando Servidor Frontend...
start "Frontend - Veterinario" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ==========================================
echo   SISTEMA EN MARCHA
echo ==========================================
echo.
echo El backend estara en: http://localhost:8000
echo El frontend estara en: http://localhost:5173
echo.
echo Puedes cerrar esta ventana. Las otras dos seguiran funcionando.
timeout /t 5
exit
