@echo off
title Agenda Pro - Iniciando...
color 0A

echo.
echo  ================================
echo    AGENDA PRO - Iniciando App
echo  ================================
echo.

:: Matar procesos anteriores que puedan estar bloqueados
echo [1/4] Limpiando procesos anteriores...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Verificar que el puerto 19006 este libre
echo [2/4] Verificando puerto 19006...
netstat -ano | findstr :19006 >nul 2>&1
if %errorlevel%==0 (
    echo     Puerto 19006 ocupado, liberando...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :19006 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
    timeout /t 1 /nobreak >nul
)

:: Levantar el backend Django en nueva ventana
echo [3/4] Levantando Backend Django (puerto 8001)...
start "AGENDA - Backend Django" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && python manage.py runserver 8001"

timeout /t 3 /nobreak >nul

:: Levantar el frontend Expo en nueva ventana
echo [4/4] Levantando Frontend Expo (puerto 19006)...
start "AGENDA - Frontend Expo" cmd /k "cd /d %~dp0frontend && set BROWSER=none && npx expo start --web --port 19006"

echo.
echo  ================================
echo    Listo! Esperando que cargue...
echo  ================================
echo.
echo  Backend:  http://localhost:8001/api
echo  Frontend: http://localhost:19006
echo.
echo  Abre tu navegador en: http://localhost:19006
echo.

:: Esperar 8 segundos y abrir el navegador automaticamente
echo  Abriendo navegador en 8 segundos...
timeout /t 8 /nobreak >nul
start "" "http://localhost:19006"

echo.
echo  Si la pagina no carga inmediatamente, espera
echo  30 segundos y recarga (F5). El bundle tarda
echo  un poco la primera vez del dia.
echo.
pause
