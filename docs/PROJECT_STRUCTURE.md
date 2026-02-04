# 📁 Estructura del Proyecto - TesoritoOS

```
eltesoritodejalisco/
│
├── 📂 app/                          # Next.js App Router
│   ├── 📂 api/                      # Backend API Routes
│   │   ├── 📂 inventory/
│   │   │   ├── route.ts            # GET/POST ingredientes
│   │   │   └── 📂 deduct/
│   │   │       └── route.ts        # POST desconteo automático
│   │   └── 📂 orders/
│   │       ├── route.ts            # GET/POST órdenes
│   │       └── 📂 [id]/
│   │           └── 📂 status/
│   │               └── route.ts    # PATCH actualizar estado
│   │
│   ├── 📂 kitchen/                  # Página del KDS
│   │   └── page.tsx                # Vista de cocina
│   │
│   ├── layout.tsx                  # Layout raíz
│   ├── page.tsx                    # Página principal
│   └── globals.css                 # Estilos globales
│
├── 📂 components/                   # Componentes React
│   └── 📂 kitchen/                 # Componentes del KDS
│       ├── KitchenDisplaySystem.tsx # Sistema completo de cocina
│       ├── OrderCard.tsx           # Tarjeta de orden con timer
│       └── SmartBatchingView.tsx   # Vista de agrupación inteligente
│
├── 📂 lib/                         # Lógica de negocio y utilidades
│   ├── prisma.ts                  # Prisma Client singleton
│   ├── utils.ts                   # Funciones auxiliares
│   └── 📂 services/
│       └── inventory.ts           # Servicio de inventario
│
├── 📂 hooks/                       # Custom React Hooks
│   └── useOrders.ts               # Hook para órdenes en tiempo real
│
├── 📂 types/                       # Definiciones TypeScript
│   └── index.ts                   # Todos los tipos e interfaces
│
├── 📂 prisma/                      # Prisma ORM
│   ├── schema.prisma              # Schema de base de datos
│   └── seed.sql                   # Datos de ejemplo
│
├── 📂 docs/                        # Documentación
│   ├── SETUP.md                   # Guía de instalación
│   ├── ARCHITECTURE.md            # Arquitectura del sistema
│   ├── API_EXAMPLES.md            # Ejemplos de uso de APIs
│   └── PROJECT_STRUCTURE.md       # Este archivo
│
├── 📂 public/                      # Assets estáticos
│
├── .env.example                   # Template de variables de entorno
├── .gitignore                     # Archivos ignorados por Git
├── package.json                   # Dependencias y scripts
├── tsconfig.json                  # Configuración TypeScript
├── next.config.ts                 # Configuración Next.js
├── eslint.config.mjs              # Configuración ESLint
├── postcss.config.mjs             # Configuración PostCSS
├── setup.sh                       # Script de configuración rápida
└── README.md                      # Documentación principal
```

## 📋 Descripción de Carpetas Clave

### `/app/api/` - Backend API
Contiene todas las rutas de API siguiendo el patrón de Next.js App Router:
- **RESTful endpoints** para CRUD de entidades
- **Server-side logic** para operaciones complejas
- **Transacciones de base de datos** con Prisma

### `/components/` - Componentes React
Componentes reutilizables de UI organizados por funcionalidad:
- **Client Components** ('use client') para interactividad
- **Optimizados** para performance y accesibilidad

### `/lib/` - Lógica de Negocio
Servicios y utilidades separados de la UI:
- **Services**: Lógica de negocio compleja (inventario, pagos, etc.)
- **Utils**: Funciones helper (formateo, validaciones, etc.)
- **Prisma**: Cliente de base de datos singleton

### `/types/` - TypeScript Types
Definiciones de tipos compartidas en todo el proyecto:
- **Interfaces** de entidades de base de datos
- **Enums** para estados y categorías
- **Types** para requests/responses de API

### `/prisma/` - Database Layer
Todo lo relacionado con la base de datos:
- **schema.prisma**: Definición del modelo de datos
- **migrations/**: Historial de cambios en DB
- **seed.sql**: Datos iniciales para testing

### `/docs/` - Documentación
Documentación completa del proyecto:
- **Guías de instalación** y configuración
- **Arquitectura** y decisiones técnicas
- **Ejemplos** de uso de APIs

## 🎯 Archivos Importantes

### Configuración
- **`.env`**: Variables de entorno (DATABASE_URL, secrets)
- **`tsconfig.json`**: Configuración TypeScript
- **`next.config.ts`**: Configuración Next.js
- **`package.json`**: Dependencias y scripts npm

### Entry Points
- **`app/layout.tsx`**: Layout principal de la app
- **`app/page.tsx`**: Página de inicio
- **`app/kitchen/page.tsx`**: Pantalla de cocina (KDS)

### Core Logic
- **`lib/services/inventory.ts`**: Lógica de desconteo automático
- **`components/kitchen/KitchenDisplaySystem.tsx`**: Sistema KDS completo
- **`components/kitchen/OrderCard.tsx`**: Tarjeta con temporizador

## 🔄 Flujo de Datos

```
┌─────────────────────────────────────────────────┐
│  UI Components (React)                          │
│  - OrderCard.tsx                                │
│  - SmartBatchingView.tsx                        │
└─────────────────┬───────────────────────────────┘
                  │
                  │ fetch/POST
                  ▼
┌─────────────────────────────────────────────────┐
│  API Routes (Next.js)                           │
│  - /api/orders                                  │
│  - /api/inventory                               │
└─────────────────┬───────────────────────────────┘
                  │
                  │ Prisma Client
                  ▼
┌─────────────────────────────────────────────────┐
│  Business Logic (Services)                      │
│  - inventory.ts                                 │
│  - utils.ts                                     │
└─────────────────┬───────────────────────────────┘
                  │
                  │ Transacciones
                  ▼
┌─────────────────────────────────────────────────┐
│  Database (PostgreSQL)                          │
│  - orders, ingredients, customers, etc.         │
└─────────────────────────────────────────────────┘
```

## 📦 Dependencias Principales

```json
{
  "dependencies": {
    "@prisma/client": "ORM para PostgreSQL",
    "next": "Framework React full-stack",
    "react": "Librería UI",
    "react-dom": "React para web"
  },
  "devDependencies": {
    "prisma": "CLI de Prisma",
    "typescript": "Tipado estático",
    "tailwindcss": "CSS utility-first",
    "eslint": "Linting de código"
  }
}
```

## 🚀 Scripts Disponibles

```bash
npm run dev              # Iniciar desarrollo (localhost:3000)
npm run build            # Build para producción
npm run start            # Iniciar servidor producción
npm run lint             # Lint con ESLint

# Prisma
npm run prisma:generate  # Generar cliente Prisma
npm run prisma:push      # Sincronizar schema con DB
npm run prisma:migrate   # Crear migración
npm run prisma:studio    # UI visual para DB
```

## 📝 Convenciones de Código

### Naming
- **Componentes**: PascalCase (`OrderCard.tsx`)
- **Funciones**: camelCase (`deductInventory()`)
- **Constantes**: UPPER_SNAKE_CASE (`ALERT_THRESHOLD_MINUTES`)
- **Archivos**: kebab-case para utilidades (`use-orders.ts`)

### Organización
- **Un componente por archivo**
- **Exports nombrados** para funciones
- **Default export** para componentes de página
- **Tipos junto al código** que los usa

### Imports
```typescript
// External libraries
import { useState } from 'react';
import { PrismaClient } from '@prisma/client';

// Internal modules
import { OrderCard } from '@/components/kitchen/OrderCard';
import type { Order } from '@/types';

// Relative imports
import { formatCurrency } from '../lib/utils';
```

## 🎨 Patrones de Diseño

### API Routes
- **RESTful endpoints** (GET, POST, PATCH, DELETE)
- **Manejo de errores** consistente
- **Validación de input** con TypeScript
- **Transacciones** para operaciones críticas

### React Components
- **Composición** sobre herencia
- **Hooks** para lógica reutilizable
- **Props typing** estricto con TypeScript
- **Client/Server components** según necesidad

### Database
- **Normalized schema** con foreign keys
- **Índices** en campos frecuentes
- **Soft deletes** cuando sea necesario
- **Audit trails** con timestamps

## 📚 Recursos Adicionales

- [Documentación Next.js](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [TailwindCSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

**Última actualización:** Febrero 2026
