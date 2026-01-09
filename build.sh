#!/bin/bash

# ASR PO System Build Script for Render Deployment

echo "🔧 Starting ASR PO System build process..."

# Navigate to web directory
cd web

echo "📦 Installing dependencies..."
npm install

echo "🗄️ Generating Prisma client..."
npx prisma generate

echo "🏗️ Building Next.js application..."
npm run build

echo "✅ Build completed successfully!"

# Go back to root for any additional setup
cd ..

echo "🔍 Verifying build output..."
if [ -d "web/.next" ]; then
    echo "✅ Next.js build output found"
else
    echo "❌ Next.js build output not found"
    exit 1
fi

if [ -d "web/node_modules/@prisma/client" ]; then
    echo "✅ Prisma client generated"
else
    echo "❌ Prisma client not found"
    exit 1
fi

echo "🎉 Build verification complete - ready for deployment!"