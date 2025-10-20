#!/bin/bash

# SmartAudit Agent Setup Script
# This script helps you set up the SmartAudit Agent quickly

set -e

echo "╔════════════════════════════════════════════════════╗"
echo "║                                                    ║"
echo "║      🔒 SmartAudit Agent Setup                    ║"
echo "║                                                    ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "❌ Error: Node.js >= 22.0 is required"
    echo "   Current version: $(node -v)"
    echo "   Please upgrade Node.js and try again"
    exit 1
fi
echo "✅ Node.js $(node -v) detected"
echo ""

# Check if pnpm is installed
echo "📦 Checking pnpm..."
if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm not found. Installing..."
    npm install -g pnpm
    echo "✅ pnpm installed"
else
    echo "✅ pnpm $(pnpm -v) detected"
fi
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install
echo "✅ Dependencies installed"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your API keys:"
    echo "   - GEMINI_API_KEY (required)"
    echo "   - GITHUB_TOKEN (optional, for PR creation)"
    echo "   - TESTNET_PRIVATE_KEY (optional, for dynamic testing)"
    echo "   - TELEGRAM_TOKEN (optional, for notifications)"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Check Python and Slither (optional)
echo "🐍 Checking for Python and Slither (optional)..."
if command -v python3 &> /dev/null; then
    echo "✅ Python 3 detected"
    
    if command -v slither &> /dev/null; then
        echo "✅ Slither already installed"
    else
        echo "⚠️  Slither not found"
        echo "   Install with: pip install slither-analyzer solc-select"
        echo "   (Optional but recommended for enhanced static analysis)"
    fi
else
    echo "⚠️  Python 3 not found"
    echo "   Install Python to use Slither for enhanced analysis"
fi
echo ""

# Create memory directory
echo "📁 Creating memory directory..."
mkdir -p memory
mkdir -p cloned-repos
echo "✅ Directories created"
echo ""

echo "╔════════════════════════════════════════════════════╗"
echo "║                                                    ║"
echo "║      ✅ Setup Complete!                            ║"
echo "║                                                    ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Edit .env with your API keys:"
echo "   nano .env"
echo ""
echo "2. Run a dry-run demo (no real API calls):"
echo "   pnpm demo:dry"
echo ""
echo "3. Start the web server:"
echo "   pnpm dev:server"
echo ""
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "📚 For full documentation, see README-agent.md"
echo ""
