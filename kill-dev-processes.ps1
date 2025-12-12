# Script pentru oprirea tuturor proceselor de development
# Folosește: .\kill-dev-processes.ps1

Write-Host "Oprind procesele Node.js..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Oprind procesele pe porturile 5173, 8888, 8889..." -ForegroundColor Yellow
$ports = @(5173, 8888, 8889)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $connections | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
            Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
            Write-Host "  Oprit proces pe portul $port (PID: $_)" -ForegroundColor Green
        }
    }
}

Write-Host "Oprind procesele Vite și Netlify..." -ForegroundColor Yellow
Get-Process | Where-Object { 
    $_.ProcessName -like "*vite*" -or 
    $_.ProcessName -like "*netlify*" -or
    $_.CommandLine -like "*vite*" -or
    $_.CommandLine -like "*netlify*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 1

Write-Host "`nVerificare finală..." -ForegroundColor Cyan
$remaining = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($remaining) {
    Write-Host "  ⚠️  Portul 5173 este încă ocupat!" -ForegroundColor Red
    $remaining | ForEach-Object {
        Write-Host "    PID: $($_.OwningProcess)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✅ Toate porturile sunt libere!" -ForegroundColor Green
}

Write-Host "`nGata! Poți porni serverul acum." -ForegroundColor Green


