# 🚀 Guía de Configuración - TesoritoOS

Esta guía te llevará paso a paso para poner en marcha el sistema completo.

## Requisitos Previos

- **Node.js** 20.x o superior
- **PostgreSQL** 14.x o superior
- **npm** o **yarn**
- **Git**

## Paso 1: Instalación de Dependencias

```bash
# Instalar todas las dependencias
npm install
```

Esto instalará:
- Next.js 16
- Prisma Client y CLI
- TypeScript
- TailwindCSS 4
- React 19

## Paso 2: Configurar Base de Datos

### Opción A: PostgreSQL Local

1. **Instalar PostgreSQL** (si no lo tienes):
```bash
# macOS con Homebrew
brew install postgresql@16
brew services start postgresql@16

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

2. **Crear la base de datos**:
```bash
psql -U postgres
CREATE DATABASE tesoritoos;
\q
```

3. **Configurar .env**:
```bash
cp .env.example .env
```

Edita `.env` y actualiza:
```env
DATABASE_URL="postgresql://postgres:tu_password@localhost:5432/tesoritoos?schema=public"
```

### Opción B: Supabase (Recomendado para producción)

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto
2. Copia tu Connection String de la configuración del proyecto
3. En `.env`:
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

## Paso 3: Inicializar Base de Datos con Prisma

```bash
# Generar el cliente de Prisma
npm run prisma:generate

# Sincronizar el schema con la base de datos
npm run prisma:push

# O crear una migración formal
npm run prisma:migrate
```

## Paso 4: Poblar con Datos de Ejemplo (Opcional)

```bash
# Usando el script SQL incluido
psql -U postgres -d tesoritoos -f prisma/seed.sql

# O usa Prisma Studio para añadir datos manualmente
npm run prisma:studio
```

Prisma Studio abrirá una interfaz web en `http://localhost:5555` donde podrás ver y editar datos.

## Paso 5: Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

## Paso 6: Verificar la Instalación

### Probar la Pantalla de Cocina
Visita: [http://localhost:3000/kitchen](http://localhost:3000/kitchen)

### Probar API de Órdenes
```bash
# Crear una orden de prueba
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "source": "TikTok",
    "table": "Mesa 1",
    "orderItems": [
      {
        "menuItemId": "menu1",
        "quantity": 2,
        "notes": "Sin cebolla"
      }
    ]
  }'
```

### Verificar Inventario
```bash
# Ver todos los ingredientes
curl http://localhost:3000/api/inventory

# Ver ingredientes con stock bajo
curl http://localhost:3000/api/inventory?lowStock=true
```

## Paso 7: Configuración para Producción

### 1. Variables de Entorno

Crea `.env.production` con:
```env
DATABASE_URL="tu_url_de_producción"
NEXTAUTH_SECRET="genera_un_secreto_seguro"
NEXTAUTH_URL="https://tu-dominio.com"
NODE_ENV="production"
```

### 2. Migraciones

```bash
# Aplicar migraciones en producción
npx prisma migrate deploy
```

### 3. Build

```bash
npm run build
npm run start
```

## Troubleshooting

### Error: Cannot connect to database
- Verifica que PostgreSQL esté corriendo: `pg_isready`
- Revisa la URL de conexión en `.env`
- Asegúrate de que el puerto 5432 esté abierto

### Error: Prisma Client not generated
```bash
npm run prisma:generate
```

### Error: Module not found
```bash
# Limpia caché y reinstala
rm -rf node_modules .next
npm install
```

### Base de datos desactualizada
```bash
npm run prisma:push
# O
npm run prisma:migrate
```

## Herramientas Útiles

### Prisma Studio
Interfaz visual para administrar la base de datos:
```bash
npm run prisma:studio
```

### Reset de Base de Datos (⚠️ Cuidado: borra todos los datos)
```bash
npx prisma migrate reset
```

### Ver logs de Prisma
```bash
# En development, los queries se muestran en la consola
# Para más detalle:
DATABASE_URL="..." npx prisma db pull --print
```

## Siguiente Pasos

1. **Configurar Real-time**: Implementar WebSockets o Supabase Realtime
2. **Autenticación**: Añadir NextAuth.js para login seguro
3. **Testing**: Configurar Jest y React Testing Library
4. **Monitoring**: Integrar Sentry o similar
5. **Analytics**: Conectar Google Analytics o Mixpanel

## Recursos

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Prisma](https://www.prisma.io/docs)
- [Documentación de TailwindCSS](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)

## Soporte

Para problemas o dudas, contacta al equipo de desarrollo o crea un issue en el repositorio.

---

**¡Listo!** Tu sistema TesoritoOS debería estar funcionando. 🎉
