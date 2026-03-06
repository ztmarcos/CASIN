#!/bin/bash

# Script para hacer deploy a Firebase Hosting
# Uso: ./deploy-firebase.sh [--all]

set -e  # Exit on error

echo "🚀 Iniciando deploy a Firebase Hosting..."
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI no está instalado${NC}"
    echo "Instala con: npm install -g firebase-tools"
    exit 1
fi

echo -e "${BLUE}📦 Instalando dependencias del frontend...${NC}"
cd frontend
npm install

echo ""
echo -e "${BLUE}🔨 Building frontend...${NC}"
npm run build

# Verificar que el build fue exitoso
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Error: El directorio dist no fue creado${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Build completado exitosamente${NC}"

cd ..

# Verificar login de Firebase
echo ""
echo -e "${BLUE}🔐 Verificando autenticación de Firebase...${NC}"
if ! firebase projects:list &> /dev/null; then
    echo -e "${RED}❌ No estás autenticado en Firebase${NC}"
    echo "Ejecuta: firebase login"
    exit 1
fi

# Verificar proyecto correcto
echo -e "${BLUE}🎯 Proyecto actual:${NC}"
firebase use

echo ""
if [ "$1" == "--all" ]; then
    echo -e "${BLUE}🚀 Desplegando hosting + reglas...${NC}"
    firebase deploy
else
    echo -e "${BLUE}🚀 Desplegando solo hosting...${NC}"
    firebase deploy --only hosting
fi

echo ""
echo -e "${GREEN}✅ Deploy completado exitosamente!${NC}"
echo ""
echo -e "${BLUE}🌐 Tu aplicación está disponible en:${NC}"
echo "   https://casin-crm.web.app"
echo "   (alternativas: casin.web.app, casinbbdd.web.app)"
echo ""

