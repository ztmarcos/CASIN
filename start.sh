#!/bin/bash
set -e

echo "Starting build process..."

# Build the application
npm run build

# Verify build output
echo "Build completed. Contents of dist:"
ls -la dist/

# Start the server
echo "Starting server on port $PORT..."
npx serve dist -s -p $PORT 