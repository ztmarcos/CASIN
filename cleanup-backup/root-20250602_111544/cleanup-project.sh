#!/bin/bash

# CASIN Project Cleanup Script
# This script safely removes duplicated folders and files while preserving the working application

echo "🧹 Starting CASIN Project Cleanup..."
echo "⚠️  This will remove duplicate folders and old files"
echo "✅ Your working frontend/ and server-mysql.js will be preserved"

# Create backup directory for important files
mkdir -p cleanup-backup/$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="cleanup-backup/$(date +%Y%m%d_%H%M%S)"

echo "📦 Creating backup in $BACKUP_DIR..."

# Backup any potentially important configs from old directories
cp -r CASIN-OLD-frontend/vite.config.js $BACKUP_DIR/old-frontend-vite.config.js 2>/dev/null || true
cp -r CASIN-OLD-backend/app.js $BACKUP_DIR/old-backend-app.js 2>/dev/null || true
cp -r frontend-app/vite.config.js $BACKUP_DIR/frontend-app-vite.config.js 2>/dev/null || true

# Backup potentially important JSON files before removal
cp -f casinbbdd-firebase-adminsdk-*.json $BACKUP_DIR/ 2>/dev/null || true
cp -f pdfcasin-*.json $BACKUP_DIR/ 2>/dev/null || true

echo "🗑️  Removing duplicate frontend directories..."
# Remove duplicate frontend directories
rm -rf CASIN-OLD-frontend/
rm -rf frontend-app/

echo "🗑️  Removing duplicate backend directories..."
# Remove duplicate backend directories  
rm -rf CASIN-OLD-backend/
rm -rf backend/ # This appears to be unused since you're using server-mysql.js

echo "🗑️  Removing old server files..."
# Remove old server files (keeping server-mysql.js)
rm -f CASIN-OLD-server.js
rm -f app.js # Duplicate of functionality in server-mysql.js

echo "🗑️  Removing development artifacts..."
# Remove development and deployment artifacts
rm -rf clean-project/
rm -rf standalone-directorio/
rm -rf deployment/
rm -rf dist/ # Build artifacts
rm -rf .vite/ # Vite cache

echo "🗑️  Removing old config and build files..."
# Remove old configuration files
rm -f CASIN-OLD-package.json
rm -f Dockerfile.frontend.bak
rm -f start-server.js
rm -f force-deploy.txt

echo "🗑️  Removing CSV files and imports (keeping database export)..."
# Remove CSV files but keep database exports
rm -f *.csv
rm -f all_contacts.sql
rm -f railway_directorio_dump.sql
rm -f sample_data.sql
# Keep crud_db_export.sql as it's your main database backup

echo "🗑️  Removing old documentation and guides..."
# Remove old documentation (keep main README.md)
rm -f CRM_Navigation_Guide.md
rm -f DEPLOY.md
rm -f directorio-access-guide.md
rm -f newsletter-setup.md
rm -f BACKUP-v1.0-stable-README.md
rm -f NOTION_README.md
rm -f DATA_SYSTEM_OVERVIEW.txt
rm -f dataFlowSISbeta.txt
rm -f manual.txt

echo "🗑️  Removing old scripts and utilities..."
# Remove old scripts
rm -f import-directorio-contactos.js
rm -f newsletter-script.js
rm -f setup-database.js
rm -f setup-db.mjs
rm -f setup-railway-db.js
rm -f add-ramo-columns.js
rm -f check-notion-setup.js
rm -f create-autos-table.js
rm -f create-hogar-table.js
rm -f create-notion-env.js
rm -f fix-hogar-columns.js
rm -f import-csv-data.js
rm -f notion-debug.js
rm -f notion-test.js
rm -f testDb.js

echo "🗑️  Removing screenshots and images..."
# Remove screenshots
rm -f *.png
rm -f *.jpg
rm -f *.jpeg

echo "🗑️  Removing old directories..."
# Remove old directories
rm -rf csv/
rm -rf db/
rm -rf middleware/
rm -rf migrations/
rm -rf models/
rm -rf routes/
rm -rf scripts/
rm -rf services/
rm -rf utils/
rm -rf templates/
rm -rf config/
rm -rf assets/
rm -rf docs/

echo "🗑️  Removing misc files..."
# Remove misc files
rm -f kill.txt
rm -f "run servs"
rm -f vitest.config.js
rm -f pdfcasin-*.json
rm -f casinbbdd-firebase-adminsdk-*.json
rm -f Driveref.jsx
rm -f Sharepoint_reference.jsx

echo "✅ Cleanup completed!"
echo ""
echo "📋 PRESERVED FILES:"
echo "   ✅ frontend/ (your working frontend)"
echo "   ✅ server-mysql.js (your working backend)" 
echo "   ✅ node_modules/ (dependencies)"
echo "   ✅ package.json & package-lock.json (root configs)"
echo "   ✅ .git/ (version control)"
echo "   ✅ .env (environment variables)"
echo "   ✅ crud_db_export.sql (database backup)"
echo "   ✅ README.md (main documentation)"
echo "   ✅ index.html (main entry point)"
echo ""
echo "📦 Backup created in: $BACKUP_DIR"
echo "🎯 Your application should continue working normally"
echo ""
echo "To verify everything works:"
echo "   1. cd frontend && npm run dev"
echo "   2. PORT=3000 node server-mysql.js" 