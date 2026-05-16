Write-Host ""
Write-Host "  ================================" -ForegroundColor Cyan
Write-Host "   AGENDA PRO - Iniciando App" -ForegroundColor Cyan
Write-Host "  ================================" -ForegroundColor Cyan
Write-Host ""

# NOTA: Puerto 8081 BLOQUEADO por macmnsvc (McAfee). Frontend siempre en 19006.

# 1. Matar procesos anteriores
Write-Host "[1/4] Limpiando procesos anteriores..." -ForegroundColor Yellow
Get-Process -Name node   -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name python -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# 2. Liberar puertos si estan ocupados
Write-Host "[2/4] Verificando puertos 8001 y 19006..." -ForegroundColor Yellow
foreach ($puerto in @(8001, 19006)) {
    $portInUse = netstat -ano | Select-String ":$puerto\s.*LISTENING"
    if ($portInUse) {
        $pid_ = ($portInUse -split '\s+') | Select-Object -Last 1
        Stop-Process -Id ([int]$pid_) -Force -ErrorAction SilentlyContinue
        Write-Host "      Puerto $puerto liberado." -ForegroundColor Green
    } else {
        Write-Host "      Puerto $puerto libre. OK" -ForegroundColor Green
    }
}

# 3. Backend Django (puerto 8001)
Write-Host "[3/4] Levantando Backend Django (puerto 8001)..." -ForegroundColor Yellow
$backendPath = "$PSScriptRoot\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "cd '$backendPath'; .\venv\Scripts\Activate.ps1; python manage.py runserver 8001" `
    -WindowStyle Normal

Start-Sleep -Seconds 3

# 4. Frontend Expo Web (puerto 19006 — 8081 bloqueado por McAfee)
Write-Host "[4/4] Levantando Frontend Expo (puerto 19006)..." -ForegroundColor Yellow
$frontendPath = "$PSScriptRoot\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "cd '$frontendPath'; npx expo start --web --port 19006 -c" `
    -WindowStyle Normal

Write-Host ""
Write-Host "  ================================" -ForegroundColor Green
Write-Host "   Servidores iniciados!" -ForegroundColor Green
Write-Host "  ================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Backend:   http://localhost:8001/api" -ForegroundColor White
Write-Host "  Frontend:  http://localhost:19006" -ForegroundColor White
Write-Host ""
Write-Host "  ---- Flujo de agendamiento publico ----" -ForegroundColor Cyan
Write-Host "  Agendar:   http://localhost:19006/agendar/<empresa_id>" -ForegroundColor White
Write-Host "  Carrito:   http://localhost:19006/carrito" -ForegroundColor White
Write-Host ""
Write-Host "  Abriendo navegador en 20 segundos (Expo tarda en compilar)..." -ForegroundColor Gray
Start-Sleep -Seconds 20
Start-Process "http://localhost:19006"
Write-Host "  Si no carga, espera 30s mas y recarga con F5." -ForegroundColor Gray
Write-Host ""
