# memoria.md — Contexto vivo de Shopux.app

> Archivo de contexto del proyecto. **Se actualiza en cada sesión de trabajo** (ver Bitácora al final).
> Si retomas el proyecto (tú o Claude): lee este archivo primero.

## 1. Qué es
**Shopux.app** es un marketplace de tiendas. Cada empresa se registra, obtiene su link `shopuxapp.com/<slug>`
(ej. `shopuxapp.com/empresax`) y una **PWA** con dos caras:
- **Panel de la tienda** (admin de la empresa): Inicio · Tienda · Pagos · Pedidos · Mensajes (+ Ajustes).
- **Tienda pública** (cliente final): Inicio · Mis compras · Mensajes, barra superior con carrito e inicio de sesión.
Los dueños del marketplace usan el **Superadmin**: estadísticas, comisiones por cobrar y editor de la landing.

## 2. Stack y decisiones
| Tema | Decisión |
|---|---|
| Framework | Next.js **15.5.28** (App Router, Server Actions). Se eligió 15.x (con parches de seguridad) en vez de 16.x para evitar cambios de API |
| UI | Tailwind CSS 4 (clases propias con `@utility` en `globals.css`: btn, input, card, chip…), lucide-react |
| Backend | Supabase: Postgres + RLS, Auth (email/contraseña), Storage (`store-assets`), Realtime (chat) |
| Hosting | Vercel (dominio `shopuxapp.com`) |
| PWA | `app/manifest.ts` + manifest por tienda (`/<slug>/manifest.webmanifest`) y del panel; `public/sw.js` (offline); iconos generados en `/icons/[size]?l=E&c=%23hex` |
| Tema por tienda | Variables CSS `--brand`, `--brand-2`, `--accent`, `--on-brand`, `--brand-font` (ver `components/theme-vars.tsx`) |
| Tipografías | 3 sans (Inter, Poppins, Montserrat) + 3 serif (Playfair, Merriweather, Lora) con visualizador |
| Slider | 3 slides, 25 % del alto (`h-[25vh]`), sugerencia **1920×480 px (4:1)** |
| Comisión | **1 %** por venta pagada (`stores.commission_rate = 0.01`), guardada por pedido en `orders.commission` |
| Slug | `"Empresa X" → "empresax"` (sin espacios ni acentos, función SQL `slugify`/`unique_slug`); editable en Ajustes |
| Registro | Server action con service role (`auth.admin.createUser` con `email_confirm: true`), luego inicia sesión. No requiere confirmar email |
| Checkout | RPC `place_order` (security definer): calcula precios y descuenta stock en el servidor; funciona sin cuenta |
| Pagos | Manuales: el cliente registra método + referencia; la tienda aprueba/rechaza (RPC `review_payment`, rechazo devuelve stock) |
| Moneda | USD (`formatMoney`), locale es-VE |

## 3. Estructura
```
shopux/
├─ supabase/schema.sql      ← ejecutar en Supabase SQL Editor (tablas, RLS, RPC, storage, realtime, landing inicial)
├─ scripts/seed.mjs         ← npm run seed: 3 usuarios + Empresa X + productos, pedidos, pagos, chat
├─ src/middleware.ts        ← refresca sesión; protege /panel, /onboarding, /superadmin
├─ src/lib/                 ← supabase (client/server/admin), auth, constants, types, utils, store-actions (server actions del panel)
├─ src/components/          ← branding-form, font-picker, image-upload, category-manager, payment-methods-form,
│                             product-form, storefront-home, store-slider, cart, chat, bottom-nav, modal, ui
└─ src/app/
   ├─ page.tsx              ← landing (contenido desde tabla landing_content)
   ├─ login, registro, auth-actions.ts
   ├─ onboarding/           ← asistente con barra de progreso (branding → productos → pagos → listo)
   ├─ panel/                ← Inicio, tienda, pagos, pedidos, mensajes, ajustes
   ├─ [slug]/               ← tienda pública: inicio, producto/[id], checkout (5 pasos), compras, mensajes, login
   └─ superadmin/           ← estadísticas + tiendas (activar/suspender) + landing editor
```

## 4. Base de datos (resumen)
`profiles` (rol: superadmin | store_owner | customer) · `stores` (1 por dueño, branding, payment_methods jsonb) ·
`categories` (parent_id = subcategoría) · `products` · `orders` (+ `order_items`, `payments` 1:1) ·
`conversations` / `messages` · `landing_content` (fila única id=1).
Trigger `handle_new_user` crea perfil y, si es tienda, la tienda con slug único. El rol superadmin **solo** se asigna por seed/SQL.
Permisos de UPDATE limitados por columna (un dueño no puede cambiar su comisión ni activarse si fue suspendido).

## 5. Usuarios de prueba (creados con `npm run seed`)
| Rol | Email | Contraseña |
|---|---|---|
| Superadmin | superadmin@shopux.app | Shopux#Admin2026 |
| Tienda “Empresa X” (`/empresax`) | tienda@empresax.com | Empresax#2026 |
| Cliente | cliente@shopux.app | Cliente#2026 |

## 6. Entorno local (Windows)
- Instalados con winget: **Git**, **Visual Studio Code**, **Node.js LTS**. (También hay un Node portátil v24.22.1 en `%USERPROFILE%\.tools`.)
- Abrir en VS Code: `code C:\Users\Héctor\shopux` · Ejecutar: `npm run dev`.
- Variables en `.env.local` (plantilla en `.env.example`). **Nunca** subir `.env.local` ni exponer `SUPABASE_SERVICE_ROLE_KEY`.

## 7. Pendientes / riesgos conocidos
- [ ] Crear proyecto Supabase, ejecutar `schema.sql`, completar `.env.local`, `npm run seed` (requiere cuenta del usuario).
- [ ] Repositorio en GitHub + proyecto en Vercel + dominio `shopuxapp.com`.
- Periodos “día/semana” se calculan con la hora del servidor (UTC en Vercel); ajustar a hora de Venezuela si hace falta.
- Registro sin verificación de email (rápido para MVP); considerar activar confirmación más adelante.
- La tienda puede cambiar manualmente el estado de un pedido (incluido “cancelado”), lo que afecta la comisión: auditar en Superadmin.
- Imágenes del seed vienen de picsum.photos (solo demo).
- Backlog: notificaciones push, subdominios por tienda, liquidación de comisiones, variantes de producto, gráficos, tests E2E.

## 8. Bitácora
### 2026-10-24 — Sesión 1
- Instalados Git, VS Code y Node LTS (winget); Node portátil para compilar.
- Creado el proyecto completo (Etapas 1–7 del `PLAN.md`): landing, registro con link por empresa, onboarding con barra de progreso,
  panel con 5 tabs + ajustes, tienda pública con carrito y checkout de 5 pasos (creación de cuenta opcional), chat en tiempo real,
  superadmin con estadísticas/comisiones/editor de landing, PWA.
- Esquema SQL con RLS + script de seed con los 3 usuarios de prueba.
- `next build` OK (tipos válidos, 23 rutas). Smoke test: `/`, `/login`, `/registro`, iconos, manifest y `sw.js` responden 200.
- Repositorio git local inicializado con el primer commit.
- Siguiente paso: conectar Supabase y Vercel (Etapa 8).
