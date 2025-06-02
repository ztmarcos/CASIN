#!/bin/bash

# CASIN Root Directory Cleanup Script
# Removes deployment artifacts and unused files from root directory

echo "🧹 Cleaning up root directory files..."
echo "✅ Your working app (frontend/ + server-mysql.js) will be preserved"

# Create backup for removed files
mkdir -p cleanup-backup/root-$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="cleanup-backup/root-$(date +%Y%m%d_%H%M%S)"

echo "📦 Backing up removed files to $BACKUP_DIR..."

echo "🗑️  Removing unused server files..."
# server.js is the mock server, not needed since you use server-mysql.js
mv server.js $BACKUP_DIR/ 2>/dev/null || true

echo "🗑️  Removing deployment configuration files..."
# Railway deployment files (you can recreate if needed)
mv Procfile $BACKUP_DIR/ 2>/dev/null || true
mv railway.toml $BACKUP_DIR/ 2>/dev/null || true
mv .railwayignore $BACKUP_DIR/ 2>/dev/null || true
mv nixpacks.toml $BACKUP_DIR/ 2>/dev/null || true

echo "🗑️  Removing Docker files..."
# Docker deployment files (you can recreate if needed)
mv Dockerfile $BACKUP_DIR/ 2>/dev/null || true
mv .dockerignore $BACKUP_DIR/ 2>/dev/null || true
mv nginx.conf $BACKUP_DIR/ 2>/dev/null || true

echo "🗑️  Removing build scripts..."
# Build and deployment scripts
mv start.sh $BACKUP_DIR/ 2>/dev/null || true
mv build.sh $BACKUP_DIR/ 2>/dev/null || true

echo "🗑️  Removing database setup files..."
# Database setup files (you have working DB already)
mv database.js $BACKUP_DIR/ 2>/dev/null || true
mv database_setup.sql $BACKUP_DIR/ 2>/dev/null || true
mv setup_directorio.sql $BACKUP_DIR/ 2>/dev/null || true
mv table_structure.sql $BACKUP_DIR/ 2>/dev/null || true

echo "🗑️  Removing example and old files..."
# Example and template files
mv env.example $BACKUP_DIR/ 2>/dev/null || true

echo "🗑️  Removing cleanup script..."
# This cleanup script itself
mv cleanup-project.sh $BACKUP_DIR/ 2>/dev/null || true

echo "✅ Root cleanup completed!"
echo ""
echo "📋 ESSENTIAL FILES REMAINING:"
echo "   ✅ frontend/ (working frontend)"
echo "   ✅ server-mysql.js (working backend)"
echo "   ✅ node_modules/ (dependencies)"
echo "   ✅ package.json & package-lock.json (dependencies)"
echo "   ✅ .git/ (version control)"
echo "   ✅ .env (environment variables)"
echo "   ✅ .gitignore (git configuration)"
echo "   ✅ README.md (documentation)"
echo "   ✅ index.html (main entry point)"
echo "   ✅ crud_db_export.sql (database backup)"
echo "   ✅ .cursorrules (editor config)"
echo "   ✅ database/ & sql/ (database files)"
echo ""
echo "📦 Moved files backed up in: $BACKUP_DIR"
echo "🎯 Only essential files remain in root directory"
echo ""
echo "Your working application:"
echo "   Backend: PORT=3000 node server-mysql.js"
echo "   Frontend: cd frontend && npm run dev" 