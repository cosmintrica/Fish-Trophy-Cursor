# Script PowerShell pentru backup - Fish Trophy
# Folosire: .\run-backup.ps1

Write-Host "🔄 Pregătire backup baza de date..." -ForegroundColor Cyan

# Verifică dacă variabilele de mediu sunt setate
if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "❌ EROARE: SUPABASE_SERVICE_ROLE_KEY nu este setat!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Pentru a obține cheia:" -ForegroundColor Yellow
    Write-Host "1. Mergi la: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api" -ForegroundColor Yellow
    Write-Host "2. Găsește 'service_role' key (secret)" -ForegroundColor Yellow
    Write-Host "3. Rulează: `$env:SUPABASE_SERVICE_ROLE_KEY='your_key_here'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "SAU setează temporar pentru această sesiune:" -ForegroundColor Yellow
    Write-Host "`$env:SUPABASE_SERVICE_ROLE_KEY='your_key_here'" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# Verifică dacă VITE_SUPABASE_URL este setat
if (-not $env:VITE_SUPABASE_URL) {
    Write-Host "⚠️  VITE_SUPABASE_URL nu este setat, folosind default..." -ForegroundColor Yellow
}

# Nume backup
$backupName = "backup-before-rls-fix-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

Write-Host "📁 Nume backup: $backupName" -ForegroundColor Green
Write-Host ""

# Rulează scriptul de backup
node backup-database.js $backupName

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Backup completat cu succes!" -ForegroundColor Green
    Write-Host "📁 Verifică folderul: database-backups/" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Eroare la backup!" -ForegroundColor Red
    exit 1
}

