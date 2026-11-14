# Personalización de platillos (grupos de opciones)

> Estado: **implementado** (fases 1–5) · 2026-11-14 · ver §10 para despliegue
> Alcance: KittnOS (POS + admin de menú) y kittn-pickup
> Reemplaza: modal hardcodeado de "Tacos Mixtos" (`POSMixedOrderModal`, `MIXED_ORDER_FLAVORS`, `isMixedOrderItem`)

## 1. Objetivo

Que el administrador configure cualquier producto del menú con **grupos de opciones** (sabores, proteínas, extras, salsas…) y que, al elegir ese producto en el POS o en Pickup, se abra un modal donde el cliente/mesero arma el platillo. Todo es configurable por producto; nada queda en código.

Primer cliente: tenant **Tesorito** (tacos mixtos: elige 3 entre Carnitas, Birria, Pastor, Jamaica).

### Estado actual (lo que se elimina)

- `isMixedOrderItem(name)` detecta el platillo por palabra clave en el nombre — `hooks/pos/usePOSCart.ts:48`.
- Sabores y total fijos — `types/pos.ts:64-70`.
- La selección se guarda como texto en `order_items.notes` (`"2x Pastor, 1x Birria"`): sin precio, sin inventario, sin reportes.

**Sin migración.** Las órdenes históricas conservan sus notas. Tesorito vuelve a crear su producto con el sistema nuevo y luego se borra el código de mixtos.

### Fuera del alcance

- Grupos condicionales/anidados (un grupo que aparece según lo elegido en otro).
- Grupos reutilizables entre productos (cada producto trae su propia configuración; se mitiga con "Copiar personalización", §4.4).

## 2. Comportamiento

### 2.1 Cuándo se abre el modal

Un producto con **al menos un grupo activo** abre siempre el modal de personalización (POS y Pickup). Un producto sin grupos se agrega directo, como hoy.

### 2.2 Reglas configurables por grupo

| Campo | Significado |
|---|---|
| `name` | Título visible ("Elige tus tacos") |
| `sort_order` | Orden de los grupos en el modal |
| `min_select` / `max_select` | Unidades mínimas/máximas del grupo. Obligatorio ⇔ `min_select > 0`. `max_select` nulo = sin límite |
| `allow_repeat` | `true`: contador (+/−), se puede elegir 3× Pastor. `false`: checkbox (o radio si `max_select = 1`) |
| `max_per_option` | Solo si `allow_repeat`. Tope por opción (ej. máx 2 del mismo). Nulo = sin tope |
| `pricing_mode` | `ADDITIVE`: suma `price_delta` de cada unidad elegida. `TIERED`: el grupo cobra según la cantidad total de unidades (niveles) **más** los `price_delta` de las opciones |
| `tier_match_mode` | Solo `TIERED`, ver §2.3 |

### 2.3 Precio por niveles (`TIERED`)

Tabla de niveles por grupo: `quantity_from`, `quantity_to` (nulo = abierto), `price`.

| `tier_match_mode` | Regla | Ejemplo (niveles 3→$120, 5→$190) con 4 unidades |
|---|---|---|
| `EXACT` | Solo se permiten cantidades que coinciden con un nivel (`from = to`). El modal bloquea las demás | No se puede confirmar con 4 |
| `ROUND_UP` | Se cobra el primer nivel cuya cantidad sea ≥ a la elegida. Arriba del nivel mayor: bloqueado | Cobra $190 |
| `RANGE` | Cada nivel es un rango `[from, to]`; se cobra el rango que contiene la cantidad | Con 3–4→$120 y 5–6→$190, cobra $120 |

El editor valida que los niveles no se traslapen y que sean consistentes con `min_select` / `max_select`.

### 2.4 Cálculo del precio

```
precio_unitario = menu_items.price                       (base; el admin puede poner $0)
                + Σ grupos TIERED: precio del nivel
                + Σ opciones elegidas: price_efectivo × cantidad
```

`price_efectivo` de una opción:
- `price_source = CUSTOM` → `price_delta` (default $0).
- `price_source = LINKED_PRODUCT` → precio actual del producto enlazado.

**El servidor siempre recalcula** el precio a partir de la base de datos (POS, Pickup y webhook de Stripe) y rechaza selecciones inválidas. El precio del cliente es solo de referencia visual.

### 2.5 Opciones

| Campo | Significado |
|---|---|
| `name`, `sort_order`, `is_active` | Básicos |
| `price_source`, `price_delta` | §2.4 |
| `linked_menu_item_id` | **Wrapper**: la opción representa un producto existente del menú |
| `deduct_linked_inventory` | Si está enlazada: descuenta la receta/ingrediente del producto enlazado por unidad (default `true`) |
| Receta propia | `menu_item_option_recipe_items` (0..n ingredientes + cantidad). Un solo ingrediente = receta de una fila |
| `out_of_stock_behavior` | `DISABLE`: aparece gris con "Agotado" y no se puede elegir. `ALLOW`: se vende aunque no haya stock |

Una opción usa **o** producto enlazado **o** receta propia **o** nada (sin inventario).

"Agotado" se evalúa con el stock de los ingredientes requeridos (enlazado o propio) y, si está enlazada, también con `is_available` del producto enlazado.

### 2.6 Inventario

En `deductInventoryForOrder` / `reverseInventoryForOrder` (`lib/services/inventory.ts`), por cada `order_item`:

1. **Producto base**: descuenta su receta/ingrediente como hoy, salvo que `menu_items.customization_deduct_base` sea `false` (default `true`; sirve para combos donde el base no consume nada).
2. **Opciones**: por cada `order_item_option`, `cantidad_opción × order_item.quantity × requerimiento` (receta propia o, si `deduct_linked_inventory`, la del producto enlazado).

### 2.7 Carrito y orden

- La selección se guarda **por unidad del renglón**: `2× Tacos Mixtos` con la misma selección es un renglón con `quantity = 2`.
- Dos renglones se fusionan solo si coinciden producto, selección y nota libre; con selección distinta son renglones separados.
- **Editar**: tocar el renglón reabre el modal con la selección cargada, tanto en el carrito como en una orden abierta.
- La **nota libre** sigue existiendo y es independiente de la selección.

### 2.8 Editar después de enviar a cocina (configurable por tenant)

| Ajuste | Valores | Default |
|---|---|---|
| `customization_edit_after_kitchen` | `NEVER` · `WITH_PERMISSION` (`pos.edit_order`) · `WITH_MANAGER_AUTH` (`POSManagerAuthModal`) | `WITH_PERMISSION` |
| `customization_edit_reprint` | Reimprimir ticket de cocina al editar | `true` |
| `customization_edit_notify_kds` | Marcar el platillo como "Modificado" en KDS | `true` |

Todas las ediciones quedan en `order_audit_logs` (antes/después).

### 2.9 Ticket de cocina y KDS

Una sola línea bajo el platillo, generada desde `order_item_options` (no desde `notes`):

```
2x Tacos Mixtos
   2x Pastor, 1x Birria · Queso extra
   Nota: sin cebolla
```

Opciones del mismo grupo separadas por `, `; grupos separados por ` · `. La nota libre va en su propia línea.

### 2.10 Descuentos

Ajuste de tenant `discount_includes_modifiers` (default `true`): el descuento por artículo se calcula sobre el precio unitario completo (base + niveles + opciones). Con `false`, solo sobre el precio base.

### 2.11 Layout del modal (configurable por producto)

`menu_items.customization_layout`:
- `SCROLL` (default): todos los grupos en una sola vista con scroll, total y validación fijos abajo (estilo Umpo).
- `WIZARD`: un grupo por paso con "Siguiente/Atrás"; no se avanza si el grupo no cumple su mínimo.

Elementos comunes: chip por grupo ("Obligatorio · Elige 3" / "Opcional · Máx 2"), contador `n/max`, opciones agotadas en gris, total en vivo y botón "Agregar" deshabilitado con la razón ("Faltan 1 en Elige tus tacos").

## 3. Modelo de datos (Supabase)

Todas las tablas llevan `tenant_id` y RLS por tenant como el resto del esquema.

```sql
-- Configuración
menu_item_option_groups (
  id uuid pk, tenant_id uuid, menu_item_id uuid fk → menu_items on delete cascade,
  name text, sort_order int,
  min_select int default 0, max_select int null,
  allow_repeat bool default false, max_per_option int null,
  pricing_mode text check in ('ADDITIVE','TIERED') default 'ADDITIVE',
  tier_match_mode text check in ('EXACT','ROUND_UP','RANGE') null,
  is_active bool default true, created_at, updated_at
)

menu_item_option_group_tiers (
  id uuid pk, tenant_id uuid, group_id uuid fk on delete cascade,
  quantity_from int, quantity_to int null, price numeric(10,2)
)

menu_item_options (
  id uuid pk, tenant_id uuid, group_id uuid fk on delete cascade,
  name text, sort_order int, is_active bool default true,
  price_source text check in ('CUSTOM','LINKED_PRODUCT') default 'CUSTOM',
  price_delta numeric(10,2) default 0,
  linked_menu_item_id uuid null fk → menu_items on delete set null,
  deduct_linked_inventory bool default true,
  out_of_stock_behavior text check in ('DISABLE','ALLOW') default 'DISABLE',
  created_at, updated_at
)

menu_item_option_recipe_items (
  id uuid pk, tenant_id uuid, option_id uuid fk on delete cascade,
  ingredient_id uuid fk → ingredients, quantity_required numeric
)

-- Columnas nuevas
menu_items.customization_layout text default 'SCROLL'
menu_items.customization_deduct_base bool default true

tenants.customization_edit_after_kitchen text default 'WITH_PERMISSION'
tenants.customization_edit_reprint bool default true
tenants.customization_edit_notify_kds bool default true
tenants.discount_includes_modifiers bool default true

order_items.base_unit_price numeric(10,2) null   -- precio base congelado
-- order_items.unit_price pasa a ser el precio unitario FINAL (base + niveles + opciones),
-- así totales, división de cuenta y pagos siguen funcionando sin cambios.

-- Venta (snapshot para tickets y reportes)
order_item_options (
  id uuid pk, tenant_id uuid, order_item_id uuid fk on delete cascade,
  option_id uuid null fk on delete set null,  -- null si la opción se borra después
  group_id uuid null,
  group_name text, option_name text,          -- congelados
  quantity int,                               -- unidades por unidad del renglón
  unit_price numeric(10,2),                   -- price_efectivo congelado
  group_sort int, option_sort int
)
order_item_group_tiers (                       -- nivel cobrado por grupo TIERED
  order_item_id uuid fk on delete cascade, group_id uuid null,
  group_name text, quantity int, price numeric(10,2)
)
```

Borrar una opción o un grupo de la configuración **no** afecta órdenes pasadas (todo está congelado en `order_item_*`).

## 4. Administración

### 4.1 Permiso

Nuevo permiso en `lib/permissions.ts`, módulo Menú:

```
menu.manage_customization — "Configurar personalización de platillos"
```

Incluido por defecto en `ADMIN`; asignable a roles personalizados. Sin él, el botón "Personalizar" no aparece y la API responde 403.

### 4.2 Modal "Personalizar platillo"

Se abre desde cada producto en `/menu` con el botón **Personalizar**. Es un modal (como `custom-product-dialog.tsx` de Umpo):

- Encabezado: producto, precio base (solo lectura; se edita en el modal del producto para no duplicar la sincronización con Stripe), layout `SCROLL/WIZARD`, `customization_deduct_base`.
- Lista de grupos (reordenable ↑↓, colapsable, eliminar): todos los campos de §2.2; si es `TIERED`, la tabla de niveles y `tier_match_mode`.
- Opciones por grupo (reordenables): nombre, origen del precio, `price_delta`, inventario (ninguno / producto enlazado con buscador / receta propia con selector de ingredientes + cantidad), `out_of_stock_behavior`, activo.
- **Vista previa en vivo**: rango de precio mínimo–máximo y botón "Probar" que abre el modal del POS en modo prueba.
- **Avisos que bloquean el guardado**: mín > máx; mín mayor que las opciones disponibles sin repetición; niveles traslapados o fuera de [mín, máx]; `EXACT` sin nivel alcanzable; grupo sin opciones; opción enlazada a sí misma.

Se guarda todo en una sola transacción (RPC o endpoint que reemplaza la configuración completa del producto).

### 4.3 Indicadores en el menú

Las tarjetas del POS y de Pickup muestran el chip "Personalizable" (sustituye el chip "Mixto") y el precio como "desde $X" cuando el mínimo difiere del base.

### 4.4 Copiar personalización

En el modal: "Copiar de otro producto…" clona todos los grupos, niveles, opciones y recetas del producto elegido. Después son independientes.

## 5. Pickup (kittn-pickup)

- `GET /api/menu` incluye los grupos, niveles y opciones activas, con una bandera de agotado ya calculada.
- `ItemDetailModal` muestra el mismo modal (mismas reglas y layout). `CartItem` agrega `selections: { optionId, quantity }[]` y la clave de fusión de §2.7.
- `checkout-session` recalcula el precio con la selección y crea las líneas de Stripe con el precio final.
- **Riesgo a resolver:** hoy los artículos viajan en `session.metadata.orderItems` (`app/api/webhooks/stripe/route.ts:92`), y Stripe limita cada valor de metadata a 500 caracteres. Con selecciones esto se desborda. Se guarda el carrito completo en una tabla `checkout_drafts` (id, tenant_id, payload jsonb, expires_at) antes de crear la sesión, y la metadata solo lleva `draftId`. El webhook lee el borrador, revalida y crea la orden.

## 6. Lógica compartida

Módulo puro `lib/customization/` (sin dependencias de React ni Supabase), con tests unitarios exhaustivos:

- `validateSelection(config, selections) → { valid, errors[] }`
- `priceSelection(config, selections, basePrice) → { unitPrice, breakdown }`
- `formatSelectionLine(snapshot) → "2x Pastor, 1x Birria · Queso extra"`
- `selectionKey(menuItemId, selections, notes)` para fusionar renglones

Lo usan el modal del POS, las APIs y el webhook. kittn-pickup (Vite, repo aparte) lleva una copia del mismo módulo con los mismos tests como garantía de paridad. De todos modos, el servidor tiene la última palabra.

## 7. Reportes

Nueva pestaña **"Opciones"** en `/reports`:

- Por opción: unidades vendidas, ingreso por opciones (`unit_price × quantity × order_item.quantity`), producto padre y grupo.
- Filtros: rango de fechas, producto, grupo y canal (POS / Pickup).
- Exportación con el mismo mecanismo que los reportes existentes.
- Fuente: `order_item_options` (snapshot), así que sobrevive a cambios de configuración.

## 8. Fases de entrega

| Fase | Contenido | Resultado |
|---|---|---|
| 1. Base | Tablas, RLS, permiso, `lib/customization`, modal de admin (§4.2) sin inventario, modal de POS `SCROLL`, carrito/orden con snapshot, precio en servidor, ticket/KDS | Tesorito configura y vende tacos mixtos desde el POS |
| 2. Pickup | API de menú, modal en Pickup, `checkout_drafts`, webhook | Mismo platillo en pedidos en línea |
| 3. Inventario | Wrapper, receta propia, `customization_deduct_base`, agotados `DISABLE/ALLOW` | Las opciones descuentan stock |
| 4. Operación | Edición en orden y después de cocina (§2.8), descuentos (§2.10), layout `WIZARD`, copiar personalización, reportes | Funcionalidad completa |
| 5. Limpieza | Borrar `POSMixedOrderModal`, `MIXED_ORDER_*`, `isMixedOrderItem`, `formatMixedNotes` y sus tests | Sin código legado |

## 9. Criterios de aceptación (caso Tesorito)

1. El admin crea "Tacos Mixtos" con base $0 y el grupo "Elige tus tacos": mín 3, máx 3, repetir sí, `TIERED`/`EXACT` con nivel 3→$120. Opciones: Carnitas, Birria, Jamaica y Pastor +$10.
2. En el POS, tocar el producto abre el modal; "Agregar" no se habilita hasta llegar a 3.
3. 2× Pastor + 1× Birria → $140; el ticket de cocina muestra `2x Pastor, 1x Birria`.
4. Editar el renglón en el carrito y cambiar a 3× Carnitas → $120.
5. Con Birria agotada y `DISABLE`, aparece gris y no se puede elegir.
6. Mismo flujo en Pickup; Stripe cobra $140 y la orden llega con la selección.
7. El reporte "Opciones" muestra 2 Pastor y 1 Birria para ese día.
8. Un usuario sin `menu.manage_customization` no ve "Personalizar".

## 10. Implementación y despliegue

### Migraciones: aplicadas en producción (2026-11-14)

- `20261113_menu_item_customization.sql` y `20261114_profile_announcements.sql` se aplicaron en Supabase, cada una en una transacción única.
- Antes de aplicarlas se verificó que la `create_order_with_items` viva era idéntica a la de `20260907_add_discounts.sql` (base del reemplazo) y que las políticas usan `get_user_tenants(auth.uid())`, patrón que adoptan también las tablas nuevas.
- Verificado después: 7 tablas nuevas con RLS, columnas nuevas con sus defaults (4 tenants, 22 perfiles), una sola versión de cada función (sin PGRST203), `save_menu_item_customization` solo para `service_role`, `mark_announcement_seen` solo para usuarios autenticados, permiso nuevo en los 3 roles de gerente.
- Prueba de humo en producción dentro de una transacción con `ROLLBACK`: 2 platillos a $140 → subtotal $280, snapshot de opciones y niveles guardado, descuento sobre precio base respetado, producto base omitido del inventario. No quedó ningún dato.

Siguiente paso: desplegar KittnOS y luego kittn-pickup. El código nuevo requiere estas migraciones (ya aplicadas); el código anterior sigue funcionando con ellas porque todo es aditivo y `create_order_with_items` conserva su firma y su comportamiento cuando no recibe los campos nuevos.

### Inventario del producto base (verificado)

`fn_deduct_inventory_for_order` (no versionada en el repo) solo procesa renglones con `inventory_deducted = FALSE`, igual que `lib/services/inventory.ts`. Por eso `skip_base_inventory` funciona insertando el renglón con `inventory_deducted = true`.

### Mapa de archivos

| Área | Archivos |
|---|---|
| Reglas puras (compartidas con Pickup) | `lib/customization/{types,tiers,selection,pricing,format}.ts` — copia exacta en `kittn-pickup/src/customization/` (`parity.test.ts` lo vigila) |
| Validación del admin, rango de precio, editor | `lib/customization/{config,editor,inventory}.ts` |
| Servidor | `lib/customization/server.ts`, `lib/customization/checkoutDraft.ts` |
| APIs | `app/api/menu/[id]/customization`, `app/api/orders`, `app/api/orders/[id]`, `app/api/payments/checkout-session`, `app/api/webhooks/stripe`, `app/api/reports/options`, `app/api/announcements/seen` |
| POS | `components/customization/CustomizationModal.tsx`, `components/pos/POSCustomizationHost.tsx`, `hooks/pos/usePOSCart.ts` |
| Admin | `components/menu/components/CustomizationEditorModal.tsx`, `components/admin/settings/SettingsCustomizationSection.tsx` |
| Cocina / tickets | `components/pos/KitchenTicket.tsx`, `components/kitchen/OrderCard.tsx`, `components/pos/OrderTicket.tsx` |
| Reportes | `lib/services/optionReports.ts`, `components/reports/OptionSalesSection.tsx` |
| Inventario | `lib/services/inventory.ts` (opciones + `skip_base_inventory`) |

## 11. Anuncios de novedades

- Columna `profiles.seen_announcements JSONB` (`{ "clave": "fecha ISO" }`) y función `mark_announcement_seen(p_key)` (solo actualiza el perfil de `auth.uid()`).
- Catálogo en `lib/announcements.ts`. Para publicar un anuncio nuevo basta con agregar una entrada con una clave nueva; se muestra hasta que el usuario lo acepta.
- `components/announcements/AnnouncementGate.tsx` (montado en `app/layout.tsx`) muestra el primer anuncio pendiente; "Entendido" o el botón de acción llaman `POST /api/announcements/seen`.
- Primer anuncio: `customization-v1` ("¡Ya puedes crear platillos personalizados!"), para usuarios con `menu.manage_customization` o `pos.view`. El botón "Configurar en Menú" solo aparece con el permiso de configurar.
