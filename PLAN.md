# Shopux.app — Plan de trabajo por etapas

Stack: **Next.js 15 (App Router) + Supabase (Postgres, Auth, Storage, Realtime) + Vercel**, instalable como **PWA**.
Leyenda: `[x]` hecho · `[ ]` pendiente · `[~]` requiere acción del dueño del proyecto (credenciales/cuentas).

---

## Etapa 0 — Entorno de desarrollo
- [x] Node.js LTS (v24) disponible
- [x] Instalar Git, Visual Studio Code y Node.js LTS (winget)
- [~] Crear cuenta/proyecto en **Supabase** (región cercana, p. ej. `us-east-1`)
- [~] Crear cuenta en **Vercel** y conectar el repositorio (GitHub)
- [~] Comprar/conectar el dominio `shopuxapp.com` en Vercel

## Etapa 1 — Base del proyecto
- [x] Proyecto Next.js 15 + TypeScript + Tailwind 4
- [x] Clientes Supabase (navegador, servidor, admin/service-role) con `@supabase/ssr`
- [x] Middleware: refresco de sesión y protección de `/panel`, `/onboarding`, `/superadmin`
- [x] PWA: `manifest`, service worker, iconos generados, manifest por tienda (`/[slug]/manifest.webmanifest`)

## Etapa 2 — Base de datos (Supabase)
- [x] Esquema: `profiles`, `stores`, `categories` (con subcategorías), `products`, `orders`, `order_items`, `payments`, `conversations`, `messages`, `landing_content`
- [x] Trigger `handle_new_user`: crea perfil y, si es tienda, crea la tienda con su **slug** único (`shopuxapp.com/empresax`)
- [x] RLS (seguridad por filas) para superadmin, dueño de tienda y cliente
- [x] Funciones: `review_payment` (aprobar/rechazar + devolver stock), `is_superadmin`
- [x] Storage: bucket público `store-assets` (logos, sliders, productos)
- [x] Realtime en `messages`
- [x] Script de semilla: Superadmin, tienda **Empresa X** y cliente de prueba con datos de ejemplo

## Etapa 3 — Landing del Marketplace
- [x] Barra de navegación, banner, descripción, beneficios y botón grande “Crea tu tienda”
- [x] Contenido editable desde el Superadmin (tabla `landing_content`)

## Etapa 4 — Registro y Onboarding de la tienda
- [x] Registro (nombre, email, contraseña, nombre de empresa) → crea link `shopuxapp.com/<slug>`
- [x] Asistente con barra de progreso
  - [x] Sección 1 — Branding: logo, colores, slider de 3 imágenes (sugerencia 1920×480 px, 25 % de alto), tipografía con visualizador (sans-serif / serif), descripción
  - [x] Sección 2 — Productos/servicios (opcional): categorías y subcategorías por defecto + “Crear categoría” / “Nueva subcategoría” + primer producto
  - [x] Sección 3 — Métodos de pago (Zelle, PayPal, Pago móvil, Binance, Transferencia)
- [x] Al guardar → acceso al panel (PWA de la tienda)

## Etapa 5 — Panel de la tienda (PWA admin, barra inferior)
- [x] **Inicio**: resumen (ventas últimos 30 días, monto facturado, comisión), productos, pedidos, mensajes recientes
- [x] **Tienda**: vista cliente / vista administrador, CRUD de productos (imagen, descripción, precio, stock), totales por categoría/subcategoría, buscador y filtros
- [x] **Pagos**: completados, pendientes, aprobados, rechazados; aprobar/rechazar; orden reciente/antiguo; filtro día/semana/mes/año
- [x] **Pedidos**: pedidos por categoría en día/semana/mes/año; cambio de estado
- [x] **Mensajes**: chat en tiempo real con clientes
- [x] **Ajustes**: branding, categorías, métodos de pago, link de la tienda

## Etapa 6 — Tienda pública (cliente final)
- [x] Barra superior: logo, carrito, iniciar sesión / mi cuenta (comprar sin registrarse)
- [x] Barra inferior: **Inicio** (slider + carruseles de productos), **Mis compras**, **Mensajes**
- [x] Pasarela de pago en 5 pasos:
  1. Resumen del carrito
  2. Dirección de envío
  3. Programar envío (fecha/hora) o “comprar sin envío”
  4. Facturación (nombre, cédula, teléfono, confirmar dirección, comentarios) + crear cuenta opcional (email/contraseña)
  5. Registrar pago (Zelle / PayPal / Pago móvil / Binance / Transferencia con los datos de la tienda + referencia)

## Etapa 7 — Superadmin
- [x] Estadísticas: tiendas creadas, ventas, productos, comisión adeudada por tienda
- [x] Listado de tiendas (activar/suspender)
- [x] Editor de la landing principal

## Etapa 8 — Despliegue
- [~] Ejecutar `supabase/schema.sql` en el SQL Editor de Supabase
- [~] Configurar variables en Vercel (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`)
- [~] `npm run seed` para crear los 3 usuarios de prueba
- [~] Deploy en Vercel + dominio

## Etapa 9 — Próximas mejoras (backlog)
- [ ] Notificaciones push (Web Push) para nuevos pedidos/mensajes
- [ ] Subdominios por tienda (`empresax.shopuxapp.com`) además de rutas
- [ ] Liquidación de comisiones (marcar comisión como pagada, facturas)
- [ ] Verificación automática de pagos (APIs PayPal/Binance)
- [ ] Variantes de producto (talla, color), cupones
- [ ] Analítica con gráficos, exportar CSV
- [ ] Tests E2E (Playwright)
