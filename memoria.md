# memoria.md — Contexto vivo de Linki App (antes Shopux.app)

> Archivo de contexto del proyecto. **Se actualiza en cada sesión de trabajo** (ver Bitácora al final).
> Si retomas el proyecto (tú o Claude): lee este archivo primero.

## 1. Qué es
**Linki App** (renombrada desde Shopux el 29-oct-2026) es un marketplace de tiendas. Cada empresa se registra, obtiene su link `linkiapp.com/<slug>`
(ej. `linkiapp.com/tuempresa`) y una **PWA** con dos caras:
- **Panel de la tienda** (admin de la empresa): Inicio · Tienda · Pagos · Pedidos · Mensajes (+ Ajustes).
- **Tienda pública** (cliente final): Inicio · Mis compras · Mensajes, barra superior con carrito e inicio de sesión.
Los dueños del marketplace usan el **Superadmin**: estadísticas, comisiones por cobrar y editor de la landing.

## 2. Stack y decisiones
| Tema | Decisión |
|---|---|
| Framework | Next.js **15.5.28** (App Router, Server Actions). Se eligió 15.x (con parches de seguridad) en vez de 16.x para evitar cambios de API |
| UI | Tailwind CSS 4 (clases propias con `@utility` en `globals.css`: btn, input, card, chip…), lucide-react |
| Backend | Supabase: Postgres + RLS, Auth (email/contraseña), Storage (`store-assets`), Realtime (chat) |
| Hosting | Vercel (dominio `linkiapp.com`) |
| PWA | `app/manifest.ts` + manifest por tienda (`/<slug>/manifest.webmanifest`) y del panel; `public/sw.js` (offline); iconos generados en `/icons/[size]?l=E&c=%23hex` |
| Tema por tienda | Variables CSS `--brand`, `--brand-2`, `--accent`, `--on-brand`, `--brand-font` (ver `components/theme-vars.tsx`) |
| Tipografías | 3 sans (Inter, Poppins, Montserrat) + 3 serif (Playfair, Merriweather, Lora) con visualizador |
| Slider | 3 slides, proporción fija **2,5:1** (`aspect-[5/2]`), sugerencia **1500×600 px**; imagen con `object-contain` sobre copia desenfocada |
| Comisión | **1 %** por venta pagada (`stores.commission_rate = 0.01`), guardada por pedido en `orders.commission` |
| Slug | `"Empresa X" → "empresax"` (sin espacios ni acentos, función SQL `slugify`/`unique_slug`); editable en Ajustes |
| Registro | Server action con service role (`auth.admin.createUser` con `email_confirm: true`), luego inicia sesión. No requiere confirmar email |
| Checkout | RPC `place_order` (security definer): calcula precios y descuenta stock en el servidor; funciona sin cuenta |
| Pagos | Manuales: el cliente registra método + referencia; la tienda aprueba/rechaza (RPC `review_payment`, rechazo devuelve stock) |
| Moneda | USD (`formatMoney` → `$1.234,50`), locale es-VE |
| Identidad Linki App | Paleta oficial: Azul Marino Tech **#004D40** (títulos/texto/fondos premium), Cian Digital **#009688** (CTA), Verde Lima **#9CCC65** (éxito/acentos), Gris Neutro **#9E9E9E** (líneas; subtítulos en #757575 por legibilidad). Tipografía Inter. En `globals.css`: `--brand`, `--brand-2`, `--accent`, escala `slate` → grises/azul marino y `emerald` → tonos lima. Logos en `public/brand/`: horizontal (barras/footer) y vertical (login/registro) vía `components/logo.tsx` (`variant`); iconos PWA estáticos `linkiapp-icon-*.png` (símbolo del logo). Landing: fondo `public/landing/hero-fondo.jpg` + `hero-telefonos.png`. Tiendas nuevas arrancan con la paleta (migración `20261029120000`) |
| Rubro | `stores.industry`, 12 rubros (`RUBROS` en `constants.ts`, check en BD). Se elige en el registro (junto con responsable, cédula/RIF y teléfono → `profiles`), sugiere categorías en el onboarding y se edita en Ajustes |

## 3. Estructura
```
shopux/
├─ supabase/config.toml     ← config de la Supabase CLI (project_id "shopux")
├─ supabase/migrations/     ← UNA migración por cambio de BD; 20261024000000_init.sql = esquema inicial
├─ .github/workflows/supabase-migrations.yml ← aplica migraciones en Supabase al hacer push a main
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
| Tienda “Empresa X”, renombrada por el usuario a “Tienda Prueba” (`/tiendaprueba`) | tienda@empresax.com | Empresax#2026 |
| Cliente | cliente@shopux.app | Cliente#2026 |

## 6. Entorno local (Windows)
- Instalados con winget: **Git**, **Visual Studio Code**, **Node.js LTS**. (También hay un Node portátil v24.22.1 en `%USERPROFILE%\.tools`.)
- Abrir en VS Code: `code C:\Users\Héctor\shopux` · Ejecutar: `npm run dev`.
- Variables en `.env.local` (plantilla en `.env.example`). **Nunca** subir `.env.local` ni exponer `SUPABASE_SERVICE_ROLE_KEY`.

## 7. Pendientes / riesgos conocidos
- [x] Migración inicial aplicada (Action), usuarios creados (`npm run seed`), producción verificada (`npm run verify:prod`).
- [ ] Mover las claves reales de `.env.example` a `.env.local` (`.env.example` está versionado: NO commitear con claves).
- [x] Dominio `linkiapp.com` conectado en Vercel (29-oct).
- [ ] `NEXT_PUBLIC_SITE_URL=https://linkiapp.com` en Vercel y Site URL en Supabase Auth.
- [x] Repositorio en GitHub: https://github.com/medioshekkoestudio-debug/tiendavirtual
- [x] Banner de tienda: proporción fija 2,5:1 (1500×600) e imagen siempre completa con relleno desenfocado (antes 25 % del alto → recortes distintos por equipo).
- [ ] `landing_content.hero_image` apunta a un adjunto de Gmail (no carga para visitantes): borrarlo desde Superadmin → Landing.
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
- Código subido a GitHub: https://github.com/medioshekkoestudio-debug/tiendavirtual (rama `main`).
- Primer deploy en Vercel falló: faltaban variables de entorno y `getSession` lanzaba el error antes de leer cookies,
  por lo que Next intentaba prerenderizar `/onboarding`. Corregido (commit `10037ee`): `getSession` llama a `cookies()` primero.
  Lección: verificar `next build` por **código de salida**, no buscando texto en la salida.
- Proyecto Supabase del usuario: ref `pozexcjbxmoluftfxxus` → URL `https://pozexcjbxmoluftfxxus.supabase.co`
  (dashboard: https://supabase.com/dashboard/project/pozexcjbxmoluftfxxus).
- Verificación de producción (https://tiendavirtual-ruddy.vercel.app): páginas estáticas OK; la BD estaba vacía
  (tablas sin crear) y el deploy no tenía las variables → `/panel` y `/empresax` daban 500. Creado `scripts/verify-prod.mjs`
  (`npm run verify:prod`): prueba logins, roles, RLS, checkout de invitado, aprobar/rechazar pago, chat y páginas con sesión.
- **Migraciones configuradas** (pedido del usuario: “subir migraciones por cada cambio a Supabase”):
  Supabase CLI 2.122.0 como devDependency, `schema.sql` → `supabase/migrations/20261024000000_init.sql`,
  scripts `npm run db:*`, y GitHub Action que hace `supabase db push` en cada push a main.
  **Regla:** todo cambio de BD = nueva migración (`npm run db:new <nombre>`); nunca editar una ya aplicada.
  Si la inicial se ejecutó a mano en el SQL Editor, marcarla aplicada: `npx supabase migration repair --status applied 20261024000000 --linked`.
- GitHub Action de migraciones en verde → tablas creadas. `npm run seed` creó los 3 usuarios + Empresa X (8 productos,
  11 pedidos, chat). `verify:prod` en https://tiendavirtual-ruddy.vercel.app: **35/35 OK** (logins, roles, RLS, checkout
  invitado, stock, aprobar/rechazar pago, chat, todas las páginas del panel/superadmin/cliente con sesión).
  Storage: subida a carpeta propia OK, imagen pública OK, carpeta ajena bloqueada.
  Pendiente de probar a mano en el navegador: formularios (registro, onboarding, checkout UI) e instalación PWA en el móvil.
- Pruebas E2E en navegador (Playwright, viewport iPhone 13, script fuera del repo): registro de tienda + onboarding
  (logo/slider subidos), CRUD de categorías/productos con imagen, métodos de pago, login de los 3 roles, permisos entre roles,
  suspender/reactivar tiendas → OK. Bugs reales corregidos: precios salían "USD 45,00" → ahora `$45,00`;
  botón "Nuevo producto" sin nombre accesible en móvil → `aria-label`. La última pasada completa se colgó (sin salida) y se detuvo;
  pendiente re-ejecutarla registrando a archivo.
- **Identidad visual Shopux** (commit `5541578`): paleta #78B913 / #333333 / #666666 / #F4F5F7, logo oficial en landing,
  login/registro, footer y superadmin; icono PWA nuevo; preset "Shopux" en branding; migración con colores por defecto.
  Build y typecheck OK (exit 0), Action de migraciones en verde, `verify:prod` OK, logo servido en producción.
- Git en Windows: `C:\Program Files\Git\cmd` no está en el PATH de PowerShell del agente → anteponerlo en cada comando.
- E2E completo (la pasada colgada era un bug del script: `getRetry` se llamaba a sí mismo). Bugs reales corregidos:
  · Cerrar sesión desde el menú de cuenta de la tienda no hacía nada: el menú se cerraba con el clic y desmontaba el
    `<form>` antes del submit (`0cfd8bb`).
  · Botón ✓ de renombrar categoría sin nombre accesible → `aria-label="Guardar nombre"` (`7f386f0`).
  · **Pantalla "estirada" en iPhone** (reporte del usuario con captura): iOS hacía zoom al enfocar inputs de 14px y la
    barra inferior quedaba a media pantalla. Inputs a 16px en móvil (`text-base sm:text-sm`), `overflow-x: clip` en body,
    `text-size-adjust: 100%` y alto exacto en Mensajes de tienda y panel (`1575b0c`). Verificado en prod a 390px:
    sin scroll horizontal, inputs 16px, barra pegada al borde, Mensajes = alto de pantalla.
  Resultado final: 36/37 (el único fallo, "Editar producto", fue espera por red lenta; pasó en las 3 corridas previas).
- El usuario renombró Empresa X → **"Tienda Prueba"** (slug `tiendaprueba`) desde Ajustes: `/empresax` ya no existe.
- Quedan 4 usuarios de prueba de corridas interrumpidas (`e2e.tienda.609222`, `e2e.tienda.263948`, `e2e.cliente.540186`,
  `e2e.tienda.540186` @shopux.test) con sus tiendas "Prueba E2E …": borrar cuando el usuario lo autorice.

### 2026-10-29 — Sesión 2 (proyecto clonado en otra PC: `C:\Users\estef\Documents\tiendavirtual`)
- **Cambio de marca Shopux → Linki App** con dominio `linkiapp.com`: nombre en títulos, manifest, 404, offline, landing;
  logos nuevos, iconos PWA desde el símbolo del logo, paleta oficial (ver tabla). Migración `20261029120000_linkiapp_marca.sql`:
  colores por defecto, textos de la landing en BD y slugs `linki`/`linkiapp` reservados. Correos de las cuentas de prueba sin cambiar.
- **Rubros**: migración `20261029130000_rubro_tienda.sql` (`stores.industry`, trigger de registro, `superadmin_store_stats` con rubro).
  Registro pide rubro, responsable, cédula/RIF y teléfono. Categorías sugeridas por rubro en el onboarding.
- Tienda pública: logo a la izquierda de la barra superior y nombre centrado en el color principal de la tienda (debajo del banner queda oculto, para lectores de pantalla).
- Formulario de producto: el modal ya no se cierra al tocar fuera; borrador en localStorage por producto (sobrevive a recargas de Android al elegir foto).
- Landing: imagen de teléfonos + foto de fondo con velo azul marino.
- Local apunta a la Supabase de producción: lo que dependa de migraciones nuevas solo funciona tras el push.
