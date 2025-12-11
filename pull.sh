#!/bin/bash
set -e

echo "📥 Fetching latest code..."
git fetch origin
git reset --hard origin/master

echo "📦 Installing dependencies..."
npm install -f

echo "⚙️ Building project..."
npm run build

echo "🚀 Restarting PM2 process..."
pm2 restart 0

echo "✅ Deployment complete!"