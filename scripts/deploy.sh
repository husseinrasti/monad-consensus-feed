#!/bin/bash

# Vercel Deployment Script for Monad BlockStats
# This script helps prepare and deploy the project to Vercel

set -e

echo "🚀 Preparing Monad BlockStats for Vercel deployment..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it first:"
    echo "   npm i -g vercel"
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository. Please initialize git first."
    exit 1
fi

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  You have uncommitted changes. Please commit them first:"
    echo "   git add . && git commit -m 'Prepare for deployment'"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Creating from template..."
    cp env.example .env.local
    echo "📝 Please edit .env.local with your Monad RPC URL before deploying"
    echo "   NEXT_PUBLIC_RPC_URL=wss://your-monad-testnet-rpc-url"
fi

# Test build
echo "🔨 Testing production build..."
if npm run build; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Please fix the issues before deploying."
    exit 1
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "📖 Check DEPLOYMENT.md for configuration instructions"
