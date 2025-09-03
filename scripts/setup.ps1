# Fish Trophy Setup Script for Windows

Write-Host "🎣 Setting up Fish Trophy..." -ForegroundColor Green

# Check if pnpm is installed
try {
    $pnpmVersion = pnpm --version
    Write-Host "✅ pnpm version: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ pnpm is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g pnpm" -ForegroundColor Yellow
    exit 1
}

# Check Node.js version
$nodeVersion = node --version
$nodeMajor = $nodeVersion.Split('.')[0].Replace('v', '')
if ([int]$nodeMajor -lt 20) {
    Write-Host "❌ Node.js 20+ is required. Current version: $nodeVersion" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
pnpm install

# Copy environment files
Write-Host "🔧 Setting up environment files..." -ForegroundColor Blue
if (!(Test-Path "client/.env.local")) {
    Copy-Item "client/env.example" "client/.env.local"
    Write-Host "📝 Created client/.env.local - please configure Supabase settings" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Configure Supabase in client/.env.local" -ForegroundColor White
Write-Host "2. Run supabase-schema.sql in your Supabase project" -ForegroundColor White
Write-Host "3. Run: pnpm dev" -ForegroundColor White
Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Green
