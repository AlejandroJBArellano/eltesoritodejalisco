#!/bin/bash

# TesoritoOS - Quick Setup Script
# Este script automatiza la configuración inicial del proyecto

set -e  # Exit on error

echo "🚀 Iniciando configuración de TesoritoOS..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo "📦 Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    echo "Por favor instala Node.js desde https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v) detectado${NC}"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm -v) detectado${NC}"
echo ""

# Install dependencies
echo "📥 Instalando dependencias..."
npm install
echo -e "${GREEN}✅ Dependencias instaladas${NC}"
echo ""

# Setup environment variables
echo "⚙️  Configurando variables de entorno..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Se ha creado .env desde .env.example${NC}"
    echo -e "${YELLOW}⚠️  Por favor edita .env con tu DATABASE_URL antes de continuar${NC}"
    echo ""
    echo "Presiona ENTER después de editar .env..."
    read
else
    echo -e "${GREEN}✅ .env ya existe${NC}"
fi
echo ""

# Check if PostgreSQL is running
echo "🐘 Verificando PostgreSQL..."
if command -v pg_isready &> /dev/null; then
    if pg_isready &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL está corriendo${NC}"
    else
        echo -e "${YELLOW}⚠️  PostgreSQL instalado pero no está corriendo${NC}"
        echo "Inicia PostgreSQL con: brew services start postgresql@16"
    fi
else
    echo -e "${YELLOW}⚠️  PostgreSQL no detectado${NC}"
    echo "Puedes usar una base de datos remota (Supabase) en su lugar"
fi
echo ""

# Generate Prisma Client
echo "🔧 Generando Prisma Client..."
npm run prisma:generate
echo -e "${GREEN}✅ Prisma Client generado${NC}"
echo ""

# Push schema to database
echo "📊 Sincronizando schema con base de datos..."
echo -e "${YELLOW}¿Quieres sincronizar el schema ahora? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    npm run prisma:push
    echo -e "${GREEN}✅ Schema sincronizado${NC}"
else
    echo -e "${YELLOW}⚠️  Recuerda ejecutar 'npm run prisma:push' antes de iniciar${NC}"
fi
echo ""

# Ask about seed data
echo "🌱 ¿Quieres poblar la base de datos con datos de ejemplo? (y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    if [ -f prisma/seed.sql ]; then
        echo "Ejecutando seed script..."
        # Extract database URL from .env
        DB_URL=$(grep DATABASE_URL .env | cut -d '=' -f2- | tr -d '"')
        if [ ! -z "$DB_URL" ]; then
            # This is a simplified version - you might need psql installed
            echo -e "${YELLOW}⚠️  Por favor ejecuta manualmente:${NC}"
            echo "psql $DB_URL -f prisma/seed.sql"
        fi
    fi
else
    echo "Puedes poblar datos después con: npm run prisma:studio"
fi
echo ""

# Final message
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✨ ¡Configuración completa!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Para iniciar el servidor de desarrollo:"
echo -e "${YELLOW}  npm run dev${NC}"
echo ""
echo "Para abrir Prisma Studio (UI de base de datos):"
echo -e "${YELLOW}  npm run prisma:studio${NC}"
echo ""
echo "Visita: http://localhost:3000"
echo "KDS: http://localhost:3000/kitchen"
echo ""
echo "📚 Documentación disponible en /docs/"
echo "   - docs/SETUP.md"
echo "   - docs/ARCHITECTURE.md"
echo "   - docs/API_EXAMPLES.md"
echo ""
echo -e "${GREEN}¡Bienvenido a TesoritoOS! 🎉${NC}"
