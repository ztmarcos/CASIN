#!/bin/bash

# CASIN CRM - Vercel Environment Variables Setup
# This script uploads environment variables from .env to Vercel

echo "🚀 Setting up Vercel Environment Variables for CASIN CRM"
echo "📋 Reading from .env file..."

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Backend environment variables (for both production and preview)
echo "🔧 Setting up Backend environment variables..."

# Read .env and set each variable
while IFS='=' read -r key value; do
    # Skip empty lines and comments
    if [[ $key =~ ^[[:space:]]*$ ]] || [[ $key =~ ^# ]]; then
        continue
    fi
    
    # Remove any quotes from value
    value=$(echo "$value" | sed 's/^["'\'']//' | sed 's/["'\'']$//')
    
    echo "Setting $key..."
    echo "$value" | vercel env add "$key" production --sensitive
    echo "$value" | vercel env add "$key" preview --sensitive
done < .env

echo "✅ Backend environment variables set!"

# Now set up frontend environment variables
echo "🎨 Setting up Frontend environment variables..."
cd frontend

# Frontend needs the same variables
while IFS='=' read -r key value; do
    # Skip empty lines and comments
    if [[ $key =~ ^[[:space:]]*$ ]] || [[ $key =~ ^# ]]; then
        continue
    fi
    
    # Remove any quotes from value
    value=$(echo "$value" | sed 's/^["'\'']//' | sed 's/["'\'']$//')
    
    echo "Setting frontend $key..."
    echo "$value" | vercel env add "$key" production --sensitive
    echo "$value" | vercel env add "$key" preview --sensitive
done < ../.env

cd ..

echo "✅ All environment variables set up!"
echo "🎯 You can now deploy your applications successfully" 