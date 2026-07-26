# 📋 Arquitectura del Sistema - TesoritoOS

## Visión General

TesoritoOS es una aplicación web full-stack construida con Next.js 16, diseñada específicamente para la gestión de restaurantes con énfasis en:

- **Velocidad operativa** en el punto de venta
- **Gestión automática de inventario**
- **Tracking de efectividad de marketing**
- **Experiencia optimizada para cocina**

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
   └── Guarda en DB

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
   ├── Mesero marca: DELIVERED
   ├── TRIGGER: deductInventoryForOrder()
   │   ├── Calcula ingredientes usados
   │   ├── Verifica stock suficiente
   │   └── Descuenta de inventario
   └── Actualiza loyalty points del cliente
```

### Flujo 2: Gestión de Inventario

```
Desconteo Automático:
Order.status → DELIVERED
  └→ deductInventoryForOrder(orderId)
      ├→ Fetch order + items + recipes
      ├→ Calculate requirements per ingredient
      ├→ Transaction:
      │   ├→ Check stock
      │   ├→ Update Ingredient.currentStock
      │   └→ Log deduction
      └→ Return result

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

### ¿Por qué Next.js App Router?

- **Server Components**: Reduce JavaScript enviado al cliente
- **API Routes integradas**: Backend y frontend en un mismo proyecto
- **Streaming SSR**: Mejora percepción de velocidad
- **Type-safety**: TypeScript end-to-end

### ¿Por qué Prisma?

- **Type-safety**: Tipos generados automáticamente
- **Migraciones**: Control de versiones de schema
- **Queries optimizados**: Prevención de N+1 queries
- **Introspección**: Fácil debugging con Prisma Studio

### ¿Por qué PostgreSQL?

- **Transacciones ACID**: Crítico para inventario
- **JSON support**: Flexible para campos dinámicos
- **Escalabilidad**: Soporta millones de registros
- **Ecosystem**: Compatible con Supabase, Vercel, etc.

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
