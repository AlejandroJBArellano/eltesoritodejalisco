# 📚 API Examples - TesoritoOS

Esta guía contiene ejemplos prácticos de cómo usar todas las APIs del sistema.

## 🔧 Configuración Inicial

Todas las peticiones asumen que el servidor está corriendo en `http://localhost:3000`.

Para producción, reemplaza con tu dominio real.

---

## 📦 Orders API

### 1. Crear una Nueva Orden

**Endpoint:** `POST /api/orders`

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust1",
    "source": "TikTok",
    "table": "Mesa 5",
    "notes": "Cliente tiene prisa",
    "orderItems": [
      {
        "menuItemId": "menu1",
        "quantity": 2,
        "notes": "Sin cebolla"
      },
      {
        "menuItemId": "menu5",
        "quantity": 1
      }
    ]
  }'
```

**Respuesta:**

```json
{
  "order": {
    "id": "ord_xyz123",
    "orderNumber": "001",
    "customerId": "cust1",
    "source": "TikTok",
    "status": "PENDING",
    "table": "Mesa 5",
    "subtotal": 195.00,
    "tax": 31.20,
    "total": 226.20,
    "createdAt": "2026-02-03T14:30:00Z",
    "orderItems": [...]
  }
}
```

### 2. Obtener Todas las Órdenes

**Endpoint:** `GET /api/orders`

```bash
# Todas las órdenes
curl http://localhost:3000/api/orders

# Filtrar por estado
curl http://localhost:3000/api/orders?status=PENDING
curl http://localhost:3000/api/orders?status=PREPARING
```

### 3. Actualizar Estado de Orden

**Endpoint:** `PATCH /api/orders/[id]/status`

```bash
# Cambiar a "En Preparación"
curl -X PATCH http://localhost:3000/api/orders/ord_xyz123/status \
  -H "Content-Type: application/json" \
  -d '{"status": "PREPARING"}'

# Marcar como Listo
curl -X PATCH http://localhost:3000/api/orders/ord_xyz123/status \
  -H "Content-Type: application/json" \
  -d '{"status": "READY"}'

# Entregar (esto dispara desconteo de inventario)
curl -X PATCH http://localhost:3000/api/orders/ord_xyz123/status \
  -H "Content-Type: application/json" \
  -d '{"status": "DELIVERED"}'
```

---

## 📊 Inventory API

### 1. Obtener Todo el Inventario

**Endpoint:** `GET /api/inventory`

```bash
# Todos los ingredientes
curl http://localhost:3000/api/inventory

# Solo ingredientes con stock bajo
curl http://localhost:3000/api/inventory?lowStock=true
```

**Respuesta:**

```json
{
  "ingredients": [
    {
      "id": "ing1",
      "name": "Pan Telera",
      "unit": "unit",
      "currentStock": 100,
      "minimumStock": 20,
      "costPerUnit": 5.00,
      "stockAdjustments": [...]
    }
  ]
}
```

### 2. Crear Nuevo Ingrediente

**Endpoint:** `POST /api/inventory`

```bash
curl -X POST http://localhost:3000/api/inventory \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jitomate",
    "unit": "kg",
    "currentStock": 15,
    "minimumStock": 3,
    "costPerUnit": 35.00
  }'
```

### 3. Ajustar Stock Manualmente

**Endpoint:** `PATCH /api/inventory/adjust`

```bash
# Añadir stock (compra nueva)
curl -X PATCH http://localhost:3000/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "ingredientId": "ing1",
    "adjustment": 50,
    "reason": "Compra del 3 de febrero",
    "userId": "user1"
  }'

# Reducir stock (corrección o merma)
curl -X PATCH http://localhost:3000/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "ingredientId": "ing2",
    "adjustment": -2,
    "reason": "Merma por fecha vencida"
  }'
```

### 4. Descontar Inventario por Orden

**Endpoint:** `POST /api/inventory/deduct`

> ⚠️ Esta API se llama automáticamente cuando una orden cambia a DELIVERED/PAID.
> Solo úsala manualmente para correcciones.

```bash
curl -X POST http://localhost:3000/api/inventory/deduct \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ord_xyz123"
  }'
```

**Respuesta:**

```json
{
  "success": true,
  "message": "Inventory deducted successfully",
  "deductions": [
    {
      "ingredientId": "ing1",
      "ingredientName": "Pan Telera",
      "quantityDeducted": 2,
      "previousStock": 100,
      "newStock": 98
    },
    {
      "ingredientId": "ing2",
      "ingredientName": "Carne Vegana",
      "quantityDeducted": 0.3,
      "previousStock": 10,
      "newStock": 9.7
    }
  ]
}
```

---

## 👥 Customers API (Próximamente)

### 1. Registrar Nuevo Cliente

**Endpoint:** `POST /api/customers`

```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "María González",
    "phone": "+525512345678",
    "email": "maria@example.com",
    "birthday": "1990-05-15"
  }'
```

### 2. Obtener Perfil de Cliente

**Endpoint:** `GET /api/customers/[id]`

```bash
curl http://localhost:3000/api/customers/cust1
```

**Respuesta:**

```json
{
  "customer": {
    "id": "cust1",
    "name": "María González",
    "phone": "+525512345678",
    "email": "maria@example.com",
    "loyaltyPoints": 25,
    "totalSpend": 850.00,
    "orders": [...]
  }
}
```

---

## 🍽️ Menu Items API (Próximamente)

### 1. Obtener Menú Completo

**Endpoint:** `GET /api/menu-items`

```bash
curl http://localhost:3000/api/menu-items

# Filtrar por categoría
curl http://localhost:3000/api/menu-items?category=Platos%20Fuertes
```

### 2. Crear Nuevo Producto

**Endpoint:** `POST /api/menu-items`

```bash
curl -X POST http://localhost:3000/api/menu-items \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Torta Cubana",
    "description": "Torta con todos los ingredientes",
    "price": 120.00,
    "category": "Platos Fuertes",
    "isAvailable": true
  }'
```

### 3. Crear Receta (Relación con Ingredientes)

**Endpoint:** `POST /api/recipes`

```bash
curl -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -d '{
    "menuItemId": "menu1",
    "ingredients": [
      {
        "ingredientId": "ing1",
        "quantityRequired": 1
      },
      {
        "ingredientId": "ing2",
        "quantityRequired": 0.15
      },
      {
        "ingredientId": "ing3",
        "quantityRequired": 0.1
      }
    ]
  }'
```

---

## 📈 Analytics API (Próximamente)

### 1. Reporte de Ventas por Fuente

**Endpoint:** `GET /api/analytics/by-source`

```bash
curl http://localhost:3000/api/analytics/by-source?from=2026-02-01&to=2026-02-28
```

**Respuesta:**

```json
{
  "analytics": [
    {
      "source": "TikTok",
      "totalOrders": 45,
      "totalRevenue": 12350.0,
      "averageOrderValue": 274.44
    },
    {
      "source": "Instagram",
      "totalOrders": 32,
      "totalRevenue": 8960.0,
      "averageOrderValue": 280.0
    }
  ]
}
```

### 2. Top Productos

**Endpoint:** `GET /api/analytics/top-products`

```bash
curl http://localhost:3000/api/analytics/top-products?limit=10
```

### 3. Reporte de Inventario

**Endpoint:** `GET /api/analytics/inventory-usage`

```bash
curl http://localhost:3000/api/analytics/inventory-usage?from=2026-02-01&to=2026-02-28
```

---

## 🔄 Ejemplos de Integración Frontend

### React Hook para Órdenes en Tiempo Real

```typescript
import { useState, useEffect } from "react";

export function useRealtimeOrders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // Fetch inicial
    fetch("/api/orders?status=PENDING,PREPARING,READY")
      .then((res) => res.json())
      .then((data) => setOrders(data.orders));

    // Polling cada 5 segundos (reemplazar con WebSocket)
    const interval = setInterval(async () => {
      const res = await fetch("/api/orders?status=PENDING,PREPARING,READY");
      const data = await res.json();
      setOrders(data.orders);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return orders;
}
```

### Actualizar Estado de Orden

```typescript
async function updateOrderStatus(orderId: string, newStatus: string) {
  const response = await fetch(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: newStatus }),
  });

  if (!response.ok) {
    throw new Error("Failed to update order");
  }

  return response.json();
}

// Uso
await updateOrderStatus("ord_xyz123", "READY");
```

---

## 🧪 Testing con Postman

### Colección de Postman

Puedes importar esta colección en Postman:

```json
{
  "info": {
    "name": "TesoritoOS API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Order",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "url": "{{baseUrl}}/api/orders",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"source\": \"TikTok\",\n  \"orderItems\": [...]\n}"
        }
      }
    }
  ],
  "variable": [{ "key": "baseUrl", "value": "http://localhost:3000" }]
}
```

---

## 🐛 Manejo de Errores

Todas las APIs devuelven errores en este formato:

```json
{
  "error": "Descripción del error",
  "details": ["Detalle 1", "Detalle 2"]
}
```

**Códigos HTTP:**

- `200`: Success
- `201`: Created
- `400`: Bad Request (datos inválidos)
- `404`: Not Found
- `500`: Internal Server Error

---

## 🔐 Autenticación (Futuro)

Cuando se implemente autenticación, las peticiones incluirán:

```bash
curl http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

**💡 Tip:** Usa herramientas como [HTTPie](https://httpie.io/) o [Postman](https://www.postman.com/) para probar las APIs más fácilmente.
