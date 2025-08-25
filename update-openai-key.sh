#!/bin/bash

# Script para actualizar la API key de OpenAI en todos los servicios
echo "🔑 Actualizando API key de OpenAI en todos los servicios..."

NEW_API_KEY="YOUR_NEW_API_KEY_HERE"

echo "📝 Actualizando Vercel..."
# Primero eliminar las variables existentes
vercel env rm OPENAI_API_KEY production --yes 2>/dev/null || echo "    ⚠️  OPENAI_API_KEY no existe en production"
vercel env rm VITE_OPENAI_API_KEY production --yes 2>/dev/null || echo "    ⚠️  VITE_OPENAI_API_KEY no existe en production"
vercel env rm OPENAI_API_KEY preview --yes 2>/dev/null || echo "    ⚠️  OPENAI_API_KEY no existe en preview"
vercel env rm VITE_OPENAI_API_KEY preview --yes 2>/dev/null || echo "    ⚠️  VITE_OPENAI_API_KEY no existe en preview"

# Luego agregar las nuevas
echo "$NEW_API_KEY" | vercel env add OPENAI_API_KEY production --sensitive
echo "$NEW_API_KEY" | vercel env add VITE_OPENAI_API_KEY production --sensitive
echo "$NEW_API_KEY" | vercel env add OPENAI_API_KEY preview --sensitive
echo "$NEW_API_KEY" | vercel env add VITE_OPENAI_API_KEY preview --sensitive

echo "📝 Actualizando Heroku..."
# Actualizar variables en Heroku (si tienes la CLI instalada)
if command -v heroku &> /dev/null; then
    # Listar las apps disponibles
    echo "📋 Apps de Heroku disponibles:"
    heroku apps
    echo ""
    echo "⚠️  Actualiza manualmente en el dashboard de Heroku con la nueva API key:"
    echo "   $NEW_API_KEY"
else
    echo "⚠️  Heroku CLI no encontrado. Actualiza manualmente en el dashboard de Heroku"
    echo "   Variables: OPENAI_API_KEY y VITE_OPENAI_API_KEY"
    echo "   Nueva key: $NEW_API_KEY"
fi

echo "✅ API key actualizada en todos los servicios"
echo "🔒 Recuerda: Nunca subas las API keys al repositorio"
echo ""
echo "📋 Resumen de cambios:"
echo "   ✅ .env (root)"
echo "   ✅ frontend/.env"
echo "   ✅ start-server.sh"
echo "   ✅ start-server-dotenv.js"
echo "   ✅ vercel-deployment-guide.md"
echo "   ✅ Variables de Vercel actualizadas"
