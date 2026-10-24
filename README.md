# Shopux.app

Marketplace de tiendas PWA — **Next.js 15 + Supabase + Vercel**.
Contexto completo y bitácora: [`memoria.md`](./memoria.md) · Plan por etapas: [`PLAN.md`](./PLAN.md)

## Puesta en marcha (15 minutos)

1. **Supabase** → crea un proyecto en https://supabase.com
   - SQL Editor → New query → pega todo `supabase/schema.sql` → **Run**
   - Project Settings → API → copia `Project URL`, `anon public key` y `service_role key`
2. **Variables**: copia `.env.example` a `.env.local` y completa los valores.
3. Instala y crea los usuarios de prueba:
   ```bash
   npm install
   npm run seed
   npm run dev      # http://localhost:3000
   ```
4. **Vercel** → New Project → importa el repo de GitHub → agrega las mismas 4 variables de entorno
   (`NEXT_PUBLIC_SITE_URL=https://shopuxapp.com`) → Deploy → Settings → Domains → `shopuxapp.com`.
5. En Supabase → Authentication → URL Configuration → Site URL = `https://shopuxapp.com`.

## Usuarios de prueba (creados por `npm run seed`)

| Rol | Email | Contraseña | Entra en |
|---|---|---|---|
| Superadmin | superadmin@shopux.app | `Shopux#Admin2026` | `/login` → `/superadmin` |
| Tienda (Empresa X) | tienda@empresax.com | `Empresax#2026` | `/login` → `/panel` |
| Cliente | cliente@shopux.app | `Cliente#2026` | `/empresax/login` |

> Cámbialas antes de abrir la plataforma al público.

## Rutas

| Ruta | Qué es |
|---|---|
| `/` | Landing del marketplace (editable desde Superadmin) |
| `/registro`, `/login` | Registro de empresa / acceso de tiendas y superadmin |
| `/onboarding` | Asistente: branding → categorías/productos → métodos de pago |
| `/panel` (+ `/tienda`, `/pagos`, `/pedidos`, `/mensajes`, `/ajustes`) | App de gestión de la tienda |
| `/<slug>` (+ `/producto/:id`, `/checkout`, `/compras`, `/mensajes`, `/login`) | Tienda pública para clientes |
| `/superadmin`, `/superadmin/landing` | Estadísticas, tiendas, comisiones y editor de la landing |
