# 📋 Arquitectura del Sistema - KittnOS

## Visión General

KittnOS es una plataforma SaaS multi-tenant full-stack construida con Next.js 16 y Supabase (PostgreSQL), diseñada específicamente para la operación integral de restaurantes:

- **Aislamiento Multi-Tenant estricto** por restaurante (`tenant_id`)
- **Velocidad operativa** en el punto de venta (POS) y comanderos
- **Gestión automática de inventario**, insumos y recetas
- **Kitchen Display System (KDS)** en tiempo real
- **Analytics avanzados** (ventas por hora, tendencias, rendimientos de personal)

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js App)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  KDS Screen   │  │  POS Screen  │  │  Admin Panel    │  │
│  │  (Kitchen)    │  │  (Waiters)   │  │  (Management)   │  │
│  └───────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTP/WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    API LAYER (Next.js Routes)                │
├─────────────────────────────────────────────────────────────┤
│  /api/orders         │  /api/inventory  │  /api/customers   │
│  /api/menu-items     │  /api/recipes    │  /api/analytics   │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Prisma ORM
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE (PostgreSQL)                       │
├─────────────────────────────────────────────────────────────┤
│  Orders  │  Ingredients  │  Recipes  │  Customers  │  etc.  │
└─────────────────────────────────────────────────────────────┘
```

## Capas de la Aplicación

### 1. Frontend Layer (`/app` & `/components`)

#### Responsabilidades:

- Renderizado de interfaces de usuario
- Gestión de estado local (React hooks)
- Interacción con APIs
- Actualización en tiempo real

#### Componentes Principales:

**Kitchen Display System (KDS)**

- `KitchenDisplaySystem.tsx`: Contenedor principal
- `OrderCard.tsx`: Tarjeta de orden con temporizador
- `SmartBatchingView.tsx`: Vista de agrupación inteligente

**Características:**

- Temporizador en tiempo real por orden
- Vista Kanban (Pendiente → Preparando → Listo)
- Alertas visuales para órdenes > 15 minutos
- Agrupación de ítems idénticos

### 2. API Layer (`/app/api`)

#### Endpoints Principales:

```typescript
// Orders Management
GET / api / orders; // List all orders
POST / api / orders; // Create new order
PATCH / api / orders / [id] / status; // Update order status

// Inventory Management
GET / api / inventory; // List ingredients
POST / api / inventory; // Add ingredient
PATCH / api / inventory / adjust; // Manual stock adjustment
POST / api / inventory / deduct; // Automatic deduction

// Menu Items
GET / api / menu - items; // List menu
POST / api / menu - items; // Add item
PATCH / api / menu - items / [id]; // Update item

// Customers & CRM
GET / api / customers; // List customers
POST / api / customers; // Register customer
GET / api / customers / [id]; // Customer profile
```

### 3. Business Logic Layer (`/lib/services`)

#### Servicios:

**Inventory Service** (`/lib/services/inventory.ts`)

Funciones principales:

- `deductInventoryForOrder()`: Desconteo automático basado en recetas
- `adjustIngredientStock()`: Ajustes manuales con historial
- `checkLowStockIngredients()`: Alertas de stock bajo
- `getIngredientUsageHistory()`: Reportes de consumo

**Flujo de Desconteo Automático:**

```
1. Order status → DELIVERED/PAID
2. Fetch order with items and recipes
3. Calculate total ingredient requirements
4. Verify sufficient stock
5. Execute transaction:
   - Update ingredient stocks
   - Record deductions
6. Handle errors (rollback if insufficient)
```

### 4. Data Layer (Prisma + PostgreSQL)

#### Modelo de Datos

**Entidades Core:**

```prisma
Ingredient (Insumos)
├── id, name, unit, currentStock, minimumStock
├── recipeItems[]
└── stockAdjustments[]

MenuItem (Productos del Menú)
├── id, name, price, category, isAvailable
├── recipeItems[]
└── orderItems[]

RecipeItem (Tabla Pivote)
├── menuItemId, ingredientId
└── quantityRequired

Order (Órdenes)
├── id, orderNumber, status, source
├── customer
├── orderItems[]
└── payment

Customer (Clientes CRM)
├── id, name, phone, email
├── loyaltyPoints, totalSpend
└── orders[]
```

**Relaciones Clave:**

- MenuItem ↔ Ingredient (Many-to-Many via RecipeItem)
- Order ↔ Customer (Many-to-One)
- Order ↔ OrderItem (One-to-Many)
- OrderItem ↔ MenuItem (Many-to-One)

## Flujos de Negocio Principales

### Flujo 1: Crear y Procesar Orden

```
1. Mesero crea orden en POS
   ├── Selecciona productos
   ├── Añade notas
   └── Especifica fuente (TikTok, Instagram, etc.)

2. Sistema genera orden
   ├── Asigna número único
   ├── Calcula subtotal + IVA
   ├── Si hay cliente: suma puntos de lealtad
   ├── Guarda en DB
   └── TRIGGER/RPC: deductInventoryForOrder()
       ├── Descuenta insumos inmediatamente al crear la comanda
       └── Marca items como inventory_deducted = true

3. Orden aparece en KDS
   ├── Inicia temporizador
   ├── Estado: PENDING
   └── Visible en columna "Pendientes"

4. Chef procesa
   ├── Marca: PREPARING
   ├── Vista Smart Batching muestra agrupación
   ├── Marca: READY
   └── Notifica mesero

5. Entrega y pago
   ├── Mesero marca: DELIVERED / PAID
   └── Cobro no vuelve a descontar (los items ya tienen inventory_deducted = true)

6. Cancelación o Eliminación
   └── TRIGGER/API: reverseInventoryForOrder()
       ├── Si la orden se cancela o elimina, revierte insumos al stock
       └── Marca items como inventory_deducted = false
```

### Flujo 2: Gestión de Inventario

```
Desconteo Automático:
Creación de Orden / Agregado de Productos Extras
  └→ deductInventoryForOrder(orderId)
      ├→ Fetch order + items + recipes (filtra items con inventory_deducted = false)
      ├→ Calculate requirements per ingredient
      ├→ Transaction:
      │   ├→ Check stock
      │   ├→ Update Ingredient.currentStock
      │   ├→ Log deduction
      │   └→ Update order_items SET inventory_deducted = true
      └→ Return result

Reversión Automática:
Orden CANCELLED o Eliminada
  └→ reverseInventoryForOrder(orderId)
      ├→ Fetch order + items + recipes (filtra items con inventory_deducted = true)
      ├→ Reintegra Ingredient.currentStock (+qty)
      ├→ Log reversal (StockAdjustment)
      └→ Update order_items SET inventory_deducted = false

Ajuste Manual:
Admin ajusta stock
  └→ adjustIngredientStock(ingredientId, ±amount, reason)
      ├→ Update Ingredient.currentStock
      ├→ Create StockAdjustment record
      └→ Return new stock level

Alertas Automáticas:
Cron job o trigger
  └→ checkLowStockIngredients()
      └→ Find ingredients where currentStock ≤ minimumStock
```

### Flujo 3: CRM y Lealtad

```
Cliente hace compra
  ├→ Sistema calcula: $10 pesos = 1 punto
  ├→ Customer.loyaltyPoints += points
  ├→ Customer.totalSpend += order.total
  └→ Se guarda fuente de visita (Order.source)

Análisis de Marketing:
Admin consulta dashboard
  └→ Agrupa órdenes por Order.source
      └→ "TikTok: 45 órdenes, $12,350 total"
```

## Decisiones de Arquitectura

### Multi-Tenancy y Resolución de Tenants (`getTenantContext`)

- **Aislamiento Lógico**: Base de datos unificada en PostgreSQL (Supabase) con filtrado estricto por `tenant_id`.
- **Resolución Dinámica**: `getTenantContext()` (`lib/tenant.ts`) resuelve el restaurante a partir del subdominio (`[slug].admin.trykittn.com`, `[slug].localhost`) o el header `x-tenant-slug`.
- **Caché de Doble Nivel**:
  - `react.cache()`: Deduplica lecturas concurrentes dentro del ciclo de render de React Server Components.
  - `tenantMemoryCache`: Mapa en memoria del worker Node.js con TTL de 2 minutos que evita la latencia de ~80ms por query a Supabase en cada request.

### Separación de Clientes Supabase

- **`createClient()` (`lib/supabase/server.ts`)**: Basado en `@supabase/ssr` para operaciones bajo el contexto de cookies de sesión del usuario autenticado.
- **`createAdminClient()` (`lib/supabase/admin.ts`)**: Basado en `@supabase/supabase-js` con `SUPABASE_SERVICE_ROLE_KEY` para operaciones del sistema (aprovisionamiento, RPCs administrativas, webhooks y consultas de tenants).

### ¿Por qué Next.js App Router?

- **Server Components & Server Actions**: Reduce JavaScript enviado al cliente y elimina la necesidad de capas de API boilerplate para mutaciones directas.
- **Streaming SSR**: Mejora la percepción de velocidad en dashboards y POS.
- **Type-safety**: TypeScript end-to-end con tipos generados de Supabase (`types/supabase.ts`).

### ¿Por qué PostgreSQL (Supabase)?

- **Transacciones ACID & RPCs**: Crítico para descuentos atómicos de inventario y creación de comandas (`create_order_with_items`).
- **JSONB**: Flexibilidad para notas mixtas, modificadores y configuraciones por restaurante.
- **Supabase Realtime**: Sincronización instantánea por WebSockets para KDS y comandas en cocina.

## Consideraciones de Performance

### Frontend

- **React Server Components** para reducir bundle size
- **Lazy loading** de componentes pesados
- **Optimistic updates** en cambios de estado
- **Debouncing** en búsquedas

### Backend

- **Connection pooling** en Prisma
- **Índices** en campos frecuentes (order_number, createdAt)
- **Paginación** en listados grandes
- **Caching** con Redis (futuro)

### Base de Datos

```sql
-- Índices recomendados
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_ingredients_stock ON ingredients(current_stock);
CREATE INDEX idx_customers_phone ON customers(phone);
```

## Seguridad

### Implementaciones Actuales:

- **Type validation** con TypeScript
- **Transacciones** para operaciones críticas
- **Error handling** robusto

### TODO para Producción:

- [ ] Autenticación (NextAuth.js)
- [ ] Rate limiting en APIs
- [ ] Input sanitization
- [ ] CORS configurado
- [ ] HTTPS obligatorio
- [ ] Passwords hasheados (bcrypt)
- [ ] JWT tokens para sesiones

## Escalabilidad

### Horizontal Scaling

- Next.js es stateless → múltiples instancias
- PostgreSQL con read replicas
- CDN para assets estáticos

### Vertical Scaling

- Aumentar recursos de DB primero
- Luego aplicación servers
- Separar DB de cache (Redis)

## Monitoreo y Observabilidad

### Métricas Clave:

- **Latencia de API** (objetivo: < 200ms p95)
- **Tiempo de renderizado KDS** (< 100ms)
- **Errores de desconteo** (objetivo: 0%)
- **Uptime** (objetivo: 99.9%)

### Herramientas Recomendadas:

- **Sentry**: Error tracking
- **Vercel Analytics**: Performance metrics
- **Supabase Dashboard**: DB monitoring
- **Custom logs**: Business metrics

## Roadmap Técnico

### Fase 1: MVP (Actual) ✅

- [x] Schema completo
- [x] KDS con temporizador
- [x] Desconteo automático
- [x] CRM básico

### Fase 2: Real-time 🚧

- [ ] WebSockets con Socket.io
- [ ] O Supabase Realtime
- [ ] Sincronización multi-dispositivo

### Fase 3: Avanzado 📅

- [ ] Dashboard de analytics
- [ ] Reportes automáticos
- [ ] Integración con impresoras
- [ ] App móvil (React Native)

---

**Última actualización:** Febrero 2026
