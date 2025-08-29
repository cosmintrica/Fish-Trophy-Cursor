#!/bin/bash

echo "🎣 Setting up Romanian Fishing Hub..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first:"
    echo "npm install -g pnpm"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 20+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ pnpm version: $(pnpm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Setup Husky
echo "🐕 Setting up Husky..."
pnpm exec husky install

# Copy environment files
echo "🔧 Setting up environment files..."
if [ ! -f "client/.env.local" ]; then
    cp client/env.example client/.env.local
    echo "📝 Created client/.env.local - please configure Firebase settings"
fi

if [ ! -f "api/.env.local" ]; then
    cp api/env.example api/.env.local
    echo "📝 Created api/.env.local - please configure database and Firebase Admin"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure Firebase in client/.env.local"
echo "2. Configure database and Firebase Admin in api/.env.local"
echo "3. Create Neon database and enable PostGIS extensions"
echo "4. Run: pnpm dev"
echo ""
echo "Happy coding! 🚀"
