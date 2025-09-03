#!/bin/bash

echo "🎣 Setting up Fish Trophy..."

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

# Copy environment files
echo "🔧 Setting up environment files..."
if [ ! -f "client/.env.local" ]; then
    cp client/env.example client/.env.local
    echo "📝 Created client/.env.local - please configure Supabase settings"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure Supabase in client/.env.local"
echo "2. Run supabase-schema.sql in your Supabase project"
echo "3. Run: pnpm dev"
echo ""
echo "Happy coding! 🚀"
