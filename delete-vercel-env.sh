#!/bin/bash

echo "🗑️  Eliminando todas las variables de entorno de Vercel..."

# Lista de todas las variables a eliminar
VARIABLES=(
    "FIREBASE_ENABLED"
    "FIREBASE_PROJECT_ID" 
    "FIREBASE_CLIENT_EMAIL"
    "FIREBASE_PRIVATE_KEY"
    "TEST_EMAIL"
    "EMAIL_HOST"
    "EMAIL_PASS"
    "EMAIL_USER"
    "VITE_NOTION_DATABASE_ID"
    "VITE_NOTION_API_KEY"
    "VITE_API_URL"
    "NOTION_DATABASE_ID"
    "NOTION_API_KEY"
    "COMPANY_NAME"
    "SMTP_PASS"
    "SMTP_USER"
    "SMTP_PORT"
    "SMTP_HOST"
    "DB_PORT"
    "DB_NAME"
    "DB_PASSWORD"
    "DB_USER"
    "DB_HOST"
    "VITE_FIREBASE_APP_ID"
    "VITE_FIREBASE_MESSAGING_SENDER_ID"
    "VITE_FIREBASE_STORAGE_BUCKET"
    "VITE_FIREBASE_PROJECT_ID"
    "VITE_FIREBASE_AUTH_DOMAIN"
    "VITE_FIREBASE_API_KEY"
    "GOOGLE_DRIVE_PRIVATE_KEY"
    "GOOGLE_DRIVE_PROJECT_ID"
    "GOOGLE_DRIVE_CLIENT_EMAIL"
    "GOOGLE_DRIVE_FOLDER_ID"
    "PORT"
    "OPENAI_API_KEY"
    "VITE_GOOGLE_DRIVE_CLIENT_EMAIL"
    "VITE_OPENAI_API_KEY"
    "VITE_DEV_SERVER_URL"
    "VITE_NODE_ENV"
)

# Eliminar variables de Production
echo "🔥 Eliminando variables de Production..."
for var in "${VARIABLES[@]}"; do
    echo "  - Eliminando $var (production)..."
    vercel env rm "$var" production --yes 2>/dev/null || echo "    ⚠️  $var no existe en production"
done

# Eliminar variables de Preview  
echo "🔥 Eliminando variables de Preview..."
for var in "${VARIABLES[@]}"; do
    echo "  - Eliminando $var (preview)..."
    vercel env rm "$var" preview --yes 2>/dev/null || echo "    ⚠️  $var no existe en preview"
done

echo "✅ Proceso completado. Verificando variables restantes..."
vercel env ls 