Write-Host ""
Write-Host "  ================================" -ForegroundColor Cyan
Write-Host "   AGENDA PRO - Iniciando App" -ForegroundColor Cyan
Write-Host "  ================================" -ForegroundColor Cyan
Write-Host ""

# 1. Matar procesos anteriores
Write-Host "[1/4] Limpiando procesos anteriores..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name python -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# 2. Liberar puerto 19006 si está ocupado
Write-Host "[2/4] Verificando puerto 19006..." -ForegroundColor Yellow
$portInUse = netstat -ano | Select-String ":19006.*LISTENING"
if ($portInUse) {
    $pid19006 = ($portInUse -split "\s+")[-1]
    Stop-Process -Id $pid19006 -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Host "      Puerto liberado." -ForegroundColor Green
} else {
    Write-Host "      Puerto libre. OK" -ForegroundColor Green
}

# 3. Backend Django
Write-Host "[3/4] Levantando Backend Django (puerto 8001)..." -ForegroundColor Yellow
$backendPath = "$PSScriptRoot\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; .\venv\Scripts\Activate.ps1; python manage.py runserver 8001" -WindowStyle Normal

Start-Sleep -Seconds 3

# 4. Frontend Expo
Write-Host "[4/4] Levantando Frontend Expo (puerto 19006)..." -ForegroundColor Yellow
$frontendPath = "$PSScriptRoot\frontend"
$env:BROWSER = "none"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; `$env:BROWSER='none'; npx expo start --web --port 19006" -WindowStyle Normal

Write-Host ""
Write-Host "  ================================" -ForegroundColor Green
Write-Host "   Servidores iniciados!" -ForegroundColor Green
Write-Host "  ================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Backend:  http://localhost:8001/api" -ForegroundColor White
Write-Host "  Frontend: http://localhost:19006" -ForegroundColor White
Write-Host ""
Write-Host "  Abriendo navegador en 8 segundos..." -ForegroundColor Gray
Start-Sleep -Seconds 8
Start-Process "http://localhost:19006"
Write-Host "  Si no carga, espera 30s y recarga con F5." -ForegroundColor Gray
Write-Host ""
