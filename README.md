# 🍽️ TesoritoOS - Restaurant Management System

> Sistema de gestión integral para restaurantes enfocado en **velocidad**, **inventarios en tiempo real** y **análisis de efectividad de marketing**.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4-38B2AC)](https://tailwindcss.com/)

---

## 🚀 Características Principales

### 1. Sistema de Cocina (KDS - Kitchen Display System)

- ⏱️ **Temporizador en tiempo real** para cada orden
- 🎨 **Vista Kanban** con columnas: Pendiente → En Preparación → Listo
- 📦 **Smart Batching**: Agrupación inteligente de ítems idénticos
- 🔴 **Alertas visuales** cuando una orden supera 15 minutos

### 2. Gestión de Inventario Inteligente

- 📝 **Recetas con ingredientes** (relación many-to-many)
- 🔄 **Desconteo automático** al completar órdenes
- 📊 **Alertas de stock bajo**
- ✏️ **Ajustes manuales** con historial

### 3. CRM y Marketing

- 📱 **Captura de fuente de visita** (TikTok, Instagram, etc.)
- 💎 **Programa de lealtad**: $10 pesos = 1 punto
- 👥 **Perfiles de cliente** con gasto histórico
- 🎂 **Fechas de cumpleaños**

---

## ⚡ Inicio Rápido

### Opción 1: Script Automático (Recomendado)

```bash
# Clonar el repositorio
git clone <repo-url>
cd eltesoritodejalisco

# Ejecutar script de configuración
./setup.sh
```

### Opción 2: Instalación Manual

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales de Supabase

# 3. Iniciar servidor
npm run dev
```

Visita:

- **App**: [http://localhost:3000](http://localhost:3000)
- **KDS**: [http://localhost:3000/kitchen](http://localhost:3000/kitchen)

> 💡 **Tip**: Lee [docs/SETUP.md](docs/SETUP.md) para instrucciones detalladas

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript
- **UI**: TailwindCSS 4
- **Database**: PostgreSQL (Supabase)
- **Real-time**: Supabase Realtime
- **Estado**: React Hooks nativos

---

## 📂 Estructura del Proyecto

```
eltesoritodejalisco/
├── app/                    # Next.js App Router
│   ├── api/               # Backend API Routes
│   │   ├── orders/       # Gestión de órdenes
│   │   └── inventory/    # Gestión de inventario
│   └── kitchen/          # Página del KDS
├── components/            # Componentes React
│   └── kitchen/          # Componentes del KDS
├── lib/                  # Lógica de negocio
│   ├── services/        # Servicios (inventario, etc.)
│   ├── supabase/        # Cliente y utilidades Supabase
│   └── utils.ts         # Funciones auxiliares
├── prisma/              # Schema de referencia (No requerido en runtime)
│   └── schema.prisma    # Schema de base de datos
├── types/               # Tipos TypeScript
├── hooks/               # Custom React Hooks
└── docs/                # Documentación completa
```

---

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo
npm run build            # Build para producción
npm run start            # Servidor de producción
```

---

## 📚 Documentación

| Documento                                         | Descripción                         |
| ------------------------------------------------- | ----------------------------------- |
| [SETUP.md](docs/SETUP.md)                         | Guía de instalación y configuración |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)           | Arquitectura del sistema            |
| [API_EXAMPLES.md](docs/API_EXAMPLES.md)           | Ejemplos de uso de APIs             |
| [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) | Estructura de carpetas              |

---

## 📋 Modelo de Datos

### Entidades Principales

- **Ingredient**: Insumos con stock actual y mínimo
- **MenuItem**: Productos del menú con precio
- **RecipeItem**: Relación entre platos e ingredientes
- **Order**: Órdenes con estado y temporizador
- **OrderItem**: Ítems individuales de cada orden
- **Customer**: Clientes con puntos de lealtad
- **Payment**: Pagos asociados a órdenes

---

## 🔄 Flujo de Trabajo

### Creación de Orden

1. Mesero selecciona productos del menú
2. Añade notas específicas y fuente de visita
3. Orden se crea con número único (001, 002...)
4. Aparece en KDS en columna "Pendiente"

### Preparación en Cocina

1. Chef ve la orden en KDS con temporizador
2. Cambia a "En Preparación"
3. Smart Batching muestra ítems agrupados
4. Marca "Listo" cuando termina

### Entrega y Pago

1. Mesero marca como "Entregado"
2. **Sistema descuenta inventario automáticamente**
3. Se suman puntos de lealtad al cliente
4. Orden se completa

---

## 🗺️ Roadmap

### ✅ Fase 1: MVP (Completado)

- [x] Schema completo de base de datos
- [x] KDS con temporizador en tiempo real
- [x] Sistema de desconteo automático
- [x] CRM básico con programa de lealtad
- [x] API RESTful completa

### 🚧 Fase 2: Real-time & UX

- [x] WebSockets para actualizaciones en vivo (Polling implementado)
- [ ] Drag & drop en vista Kanban
- [ ] Notificaciones push
- [x] Dashboard de analytics

### 📅 Fase 3: Avanzado

- [ ] Autenticación (NextAuth.js)
- [ ] Módulo de gestión de mesas
- [ ] Reportes automáticos
- [ ] Integración con impresoras
- [ ] App móvil (React Native)

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto es privado y propiedad de **El Tesorito de Jalisco**.

---

## 🙏 Recursos Adicionales

- [Documentación Next.js](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [TailwindCSS](https://tailwindcss.com/docs)

---

<div align="center">

**Desarrollado con ❤️ para El Tesorito de Jalisco**

⭐ Si te gusta este proyecto, ¡dale una estrella!

</div>
