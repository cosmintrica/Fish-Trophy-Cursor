# Romanian Fishing Hub Setup Script for Windows

Write-Host "🎣 Setting up Romanian Fishing Hub..." -ForegroundColor Green

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

# Setup Husky
Write-Host "🐕 Setting up Husky..." -ForegroundColor Blue
pnpm exec husky install

# Copy environment files
Write-Host "🔧 Setting up environment files..." -ForegroundColor Blue
if (!(Test-Path "client/.env.local")) {
    Copy-Item "client/env.example" "client/.env.local"
    Write-Host "📝 Created client/.env.local - please configure Firebase settings" -ForegroundColor Yellow
}

if (!(Test-Path "api/.env.local")) {
    Copy-Item "api/env.example" "api/.env.local"
    Write-Host "📝 Created api/.env.local - please configure database and Firebase Admin" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Configure Firebase in client/.env.local" -ForegroundColor White
Write-Host "2. Configure database and Firebase Admin in api/.env.local" -ForegroundColor White
Write-Host "3. Create Neon database and enable PostGIS extensions" -ForegroundColor White
Write-Host "4. Run: pnpm dev" -ForegroundColor White
Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Green
