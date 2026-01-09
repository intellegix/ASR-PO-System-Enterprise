#!/bin/bash

# ASR PO System Start Script for Render Deployment

echo "🚀 Starting ASR PO System..."

# Navigate to web directory
cd web

echo "🔍 Checking environment..."
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set"
    exit 1
fi

if [ -z "$NEXTAUTH_SECRET" ]; then
    echo "❌ NEXTAUTH_SECRET not set"
    exit 1
fi

echo "✅ Environment variables configured"

echo "🗄️ Checking Prisma client..."
if [ ! -d "node_modules/@prisma/client" ]; then
    echo "📦 Prisma client not found, generating..."
    npx prisma generate
fi

echo "🔍 Verifying build..."
if [ ! -d ".next" ]; then
    echo "❌ Next.js build not found"
    exit 1
fi

echo "🌐 Starting Next.js production server..."
npm start