# 💼 Guía Comercial y de Despliegue - RestaurantOS

Esta guía describe el modelo de negocio, propuesta de valor, argumentos de ventas y el paso a paso técnico para aprovisionar, configurar y desplegar una nueva instancia independiente del software para un nuevo cliente.

---

## 🌟 1. Propuesta de Valor y Argumentos de Venta

El sistema está diseñado para dueños de restaurantes medianos y pequeños (cafeterías, taquerías, pizzerías, food trucks, etc.) que sufren de desorganización y quieren profesionalizar su operación sin pagar las elevadas tarifas de las plataformas tradicionales.

### Beneficios Clave:
1. **Adiós a los Tickets Perdidos (KDS)**: La cocina tiene una pantalla en tiempo real con temporizadores inteligentes que agrupan platos idénticos (Smart Batching) y alertan visualmente cuando una orden supera los 15 minutos.
2. **Control de Inventario Automatizado**: Cada vez que se marca una orden como completada/pagada, el sistema deduce automáticamente del stock de ingredientes basándose en la receta técnica de cada producto.
3. **CRM y Programa de Lealtad Integrado**: Permite registrar clientes por su número de teléfono para acumular puntos por compras y rastrear de dónde vienen (TikTok, Instagram, Maps, Recomendaciones), ayudando a medir el ROI de marketing del negocio.
4. **Operación Diaria Controlada (Checklist)**: Un sistema integrado de tareas primordiales con soporte para fotos asegura que el staff limpie la cocina y complete rutinas críticas de apertura y cierre.

---

## 💰 2. Modelo de Negocio Sugerido

* **Costo de Configuración Inicial (One-time fee)**: Cobro por la carga inicial del menú, recetas técnicas en el sistema, y configuración del hardware (tablets de cocina, impresoras de tickets).
* **Suscripción Mensual (SaaS fee)**: Renta mensual por el hosting en la nube, soporte técnico continuo y actualizaciones de software.

---

## 🚀 3. Paso a Paso para Desplegar el Software a un Nuevo Cliente

Sigue estos pasos para aprovisionar una instancia aislada y personalizada de la aplicación en menos de 20 minutos:

### Paso 3.1: Crear Base de Datos en Supabase
1. Inicia sesión en [Supabase](https://supabase.com).
2. Crea un nuevo proyecto (puedes usar el plan gratuito para clientes pequeños).
3. Ve al menú **SQL Editor** en el panel de control de Supabase.
4. Copia el contenido del archivo principal de inicialización [supabase_complete_schema.sql](file:///Users/alepulsito/projects/eltesoritodejalisco/supabase_complete_schema.sql) que hemos generado.
5. Pégalo en el editor SQL y haz clic en **Run**. Esto creará todas las tablas, índices, políticas de seguridad (RLS) y el disparador (trigger) para crear perfiles de usuario automáticamente.

### Paso 3.2: Configurar Autenticación
1. En Supabase, ve a **Authentication** > **Providers** > **Email**.
2. Asegúrate de que el login por correo esté habilitado. Deshabilita la opción "Confirm email" si quieres que el acceso del staff sea inmediato sin esperar confirmación por correo electrónico.
3. Si el cliente requiere inicio de sesión con Google:
   - Configura las credenciales en **Authentication** > **Providers** > **Google** con un Client ID y Client Secret de la Google Cloud Console del cliente.

### Paso 3.3: Desplegar en Vercel
1. Crea un nuevo proyecto en [Vercel](https://vercel.com) importando tu repositorio.
2. Configura las variables de entorno (**Environment Variables**) específicas para el branding y base de datos del cliente:

| Variable | Descripción | Valor de Ejemplo |
| :--- | :--- | :--- |
| `DATABASE_URL` | String de conexión pooler de Supabase | `postgresql://postgres.[REF]:[PASS]@aws-1.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de la API del proyecto Supabase | `https://[PROJECT_REF].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave pública anónima de Supabase | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX...` |
| `NEXT_PUBLIC_SITE_URL` | Dominio personalizado del cliente | `https://pos.restaurantecliente.com` |
| `NEXT_PUBLIC_APP_NAME` | Nombre comercial del restaurante (para tickets/mensajes) | `Tacos El Pastor` |
| `NEXT_PUBLIC_SYSTEM_NAME` | Nombre del software personalizado para el login | `PastorOS` |
| `NEXT_PUBLIC_THEME_PRIMARY_COLOR` | Color primario de acento (ej. botones, focus) | `#FFB7CE` |
| `NEXT_PUBLIC_THEME_SECONDARY_COLOR` | Color secundario (ej. hovers) | `#FFD1DC` |
| `NEXT_PUBLIC_THEME_DARK_BG_COLOR` | Color de fondo de la aplicación (oscuro) | `#121212` |

3. Haz clic en **Deploy**.

### Paso 3.4: Dar de Alta al Administrador y Personal
1. Una vez desplegado, ve a la URL del sistema y regístrate o crea la cuenta del dueño del restaurante directamente desde el panel de control de Supabase Auth (o mediante el módulo `/admin/users` una vez creada la primera cuenta).
2. El rol de administrador se le asignará al correo del dueño en la tabla `profiles` estableciendo la columna `role` como `'ADMIN'` o `'MANAGER'`.
3. Desde la cuenta de administrador del cliente:
   - Ve a **Usuarios** y da de alta a los meseros (rol `WAITER`) y cocineros (rol `CHEF`).
   - Ve a **Gestión de Menú** y da de alta los platillos con sus respectivas categorías y recetas técnicas.
   - Ve a **Inventario** para cargar las existencias de ingredientes.

---

## 🛠️ 4. Solución de Problemas Frecuentes (Troubleshooting)

### 1. Error `DNS_PROBE_FINISHED_NXDOMAIN` al Conectar con Google Auth
* **Síntoma**: Al hacer clic en "Continuar con Google", el navegador muestra que no se puede acceder a la URL `[REF].supabase.co`.
* **Causa**: La propagación DNS para un nuevo subdominio de Supabase puede tardar unos minutos en ser reconocida por tu proveedor de internet local.
* **Solución**: 
  - Limpia la caché DNS en tu computadora ejecutando en terminal (en macOS): `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`.
  - Prueba ingresando a la URL desde una ventana de incógnito o utilizando datos móviles.
  - Si persiste, cambia los DNS de tu conexión de red local a los de Google (`8.8.8.8`) o Cloudflare (`1.1.1.1`).

### 2. Redirección Incorrecta a `http://localhost:3000` en Producción
* **Síntoma**: Al iniciar sesión con Google desde la aplicación desplegada en Vercel, Supabase procesa el inicio de sesión pero te redirige de vuelta a `http://localhost:3000/?code=...` en lugar del dominio en producción.
* **Causa**: Supabase bloquea redirecciones a hosts no autorizados por seguridad y recurre a la URL predeterminada (`Site URL`).
* **Solución**:
  - Ve a **Supabase Dashboard** > **Authentication** > **URL Configuration**.
  - Cambia el **Site URL** al dominio real en producción (ej. `https://birrialacuevita.vercel.app`).
  - Agrega en **Redirect URLs** tanto tu entorno local (`http://localhost:3000/**`) como el de producción (`https://birrialacuevita.vercel.app/**`) utilizando los comodines `/**` al final.

