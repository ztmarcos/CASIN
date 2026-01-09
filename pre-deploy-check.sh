#!/bin/bash

# Script de verificación pre-deploy
# Verifica que todo esté listo antes de hacer deploy a Firebase

set -e

echo "🔍 Verificación Pre-Deploy para Firebase Hosting"
echo "================================================"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0

# 1. Verificar Firebase CLI
echo -e "${BLUE}1. Verificando Firebase CLI...${NC}"
if command -v firebase &> /dev/null; then
    FIREBASE_VERSION=$(firebase --version)
    echo -e "${GREEN}✅ Firebase CLI instalado: $FIREBASE_VERSION${NC}"
else
    echo -e "${RED}❌ Firebase CLI no está instalado${NC}"
    echo "   Instala con: npm install -g firebase-tools"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 2. Verificar autenticación de Firebase
echo -e "${BLUE}2. Verificando autenticación...${NC}"
if firebase projects:list &> /dev/null; then
    echo -e "${GREEN}✅ Autenticado en Firebase${NC}"
    echo "   Proyecto actual:"
    firebase use
else
    echo -e "${RED}❌ No estás autenticado en Firebase${NC}"
    echo "   Ejecuta: firebase login"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 3. Verificar Node.js y npm
echo -e "${BLUE}3. Verificando Node.js y npm...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    ERRORS=$((ERRORS + 1))
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm no está instalado${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 4. Verificar archivos de configuración
echo -e "${BLUE}4. Verificando archivos de configuración...${NC}"

if [ -f "firebase.json" ]; then
    echo -e "${GREEN}✅ firebase.json existe${NC}"
else
    echo -e "${RED}❌ firebase.json no encontrado${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ -f ".firebaserc" ]; then
    echo -e "${GREEN}✅ .firebaserc existe${NC}"
else
    echo -e "${RED}❌ .firebaserc no encontrado${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "frontend/package.json" ]; then
    echo -e "${GREEN}✅ frontend/package.json existe${NC}"
else
    echo -e "${RED}❌ frontend/package.json no encontrado${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 5. Verificar variables de entorno
echo -e "${BLUE}5. Verificando variables de entorno...${NC}"
if [ -f "frontend/.env" ]; then
    echo -e "${GREEN}✅ frontend/.env existe${NC}"
    
    # Verificar variables críticas
    if grep -q "VITE_FIREBASE_API_KEY" frontend/.env; then
        echo -e "${GREEN}   ✅ VITE_FIREBASE_API_KEY configurado${NC}"
    else
        echo -e "${YELLOW}   ⚠️  VITE_FIREBASE_API_KEY no encontrado${NC}"
    fi
    
    if grep -q "VITE_FIREBASE_PROJECT_ID" frontend/.env; then
        echo -e "${GREEN}   ✅ VITE_FIREBASE_PROJECT_ID configurado${NC}"
    else
        echo -e "${YELLOW}   ⚠️  VITE_FIREBASE_PROJECT_ID no encontrado${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  frontend/.env no encontrado${NC}"
    echo "   Esto es opcional si las variables están en el código"
fi
echo ""

# 6. Verificar dependencias del frontend
echo -e "${BLUE}6. Verificando dependencias del frontend...${NC}"
if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✅ node_modules existe en frontend${NC}"
else
    echo -e "${YELLOW}⚠️  node_modules no existe en frontend${NC}"
    echo "   Se instalarán durante el build"
fi
echo ""

# 7. Test build del frontend
echo -e "${BLUE}7. Probando build del frontend...${NC}"
cd frontend

if [ ! -d "node_modules" ]; then
    echo "   Instalando dependencias..."
    npm install --silent
fi

echo "   Ejecutando build..."
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Build exitoso${NC}"
    
    if [ -d "dist" ]; then
        DIST_SIZE=$(du -sh dist | cut -f1)
        echo -e "${GREEN}   ✅ Directorio dist creado (tamaño: $DIST_SIZE)${NC}"
        
        # Verificar archivos importantes
        if [ -f "dist/index.html" ]; then
            echo -e "${GREEN}   ✅ index.html existe${NC}"
        else
            echo -e "${RED}   ❌ index.html no encontrado en dist${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo -e "${RED}   ❌ Directorio dist no fue creado${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}❌ Build falló${NC}"
    echo "   Ejecuta manualmente: cd frontend && npm run build"
    ERRORS=$((ERRORS + 1))
fi

cd ..
echo ""

# 8. Verificar reglas de Firestore
echo -e "${BLUE}8. Verificando reglas de Firestore...${NC}"
if [ -f "firestore.rules" ]; then
    echo -e "${GREEN}✅ firestore.rules existe${NC}"
else
    echo -e "${YELLOW}⚠️  firestore.rules no encontrado${NC}"
fi
echo ""

# 9. Verificar reglas de Storage
echo -e "${BLUE}9. Verificando reglas de Storage...${NC}"
if [ -f "storage.rules" ]; then
    echo -e "${GREEN}✅ storage.rules existe${NC}"
else
    echo -e "${YELLOW}⚠️  storage.rules no encontrado${NC}"
fi
echo ""

# Resumen final
echo "================================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Todas las verificaciones pasaron!${NC}"
    echo ""
    echo -e "${BLUE}Puedes hacer deploy con:${NC}"
    echo "   ./deploy-firebase.sh"
    echo "   o"
    echo "   npm run deploy:firebase"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Se encontraron $ERRORS error(es)${NC}"
    echo ""
    echo "Por favor corrige los errores antes de hacer deploy."
    echo ""
    exit 1
fi

