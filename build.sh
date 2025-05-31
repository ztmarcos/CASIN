#!/bin/bash
set -e

echo "Starting build process..."

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build the application
echo "Building application..."
npm run build

# Verify build output
echo "Verifying build output..."
ls -la dist/

# Check if index.html was properly processed
echo "Checking index.html content..."
cat dist/index.html | grep -E "(script|link)"

echo "Build completed successfully!" 