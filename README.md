# Linki App (linkiapp.com)

Marketplace de tiendas PWA — **Next.js 15 + Supabase + Vercel**.
Contexto completo y bitácora: [`memoria.md`](./memoria.md) · Plan por etapas: [`PLAN.md`](./PLAN.md)

## Puesta en marcha (15 minutos)

1. **Supabase** → crea un proyecto en https://supabase.com
   - Aplica las migraciones: `npm run db:login` → `npm run db:link` → `npm run db:push`
     (o deja que lo haga el GitHub Action, ver “Migraciones”)
   - Project Settings → API → copia `Project URL`, `anon public key` y `service_role key`
2. **Variables**: copia `.env.example` a `.env.local` y completa los valores.
3. Instala y crea los usuarios de prueba:
   ```bash
   npm install
   npm run seed
   npm run dev      # http://localhost:3000
   ```
4. **Vercel** → New Project → importa el repo de GitHub → agrega las mismas 4 variables de entorno
   (`NEXT_PUBLIC_SITE_URL=https://linkiapp.com`) → Deploy → Settings → Domains → `linkiapp.com`.
5. En Supabase → Authentication → URL Configuration → Site URL = `https://linkiapp.com`.

## Usuarios de prueba (creados por `npm run seed`)

| Rol | Email | Contraseña | Entra en |
|---|---|---|---|
| Superadmin | superadmin@shopux.app | `Shopux#Admin2026` | `/login` → `/superadmin` |
| Tienda (Empresa X) | tienda@empresax.com | `Empresax#2026` | `/login` → `/panel` |
| Cliente | cliente@shopux.app | `Cliente#2026` | `/empresax/login` |

> Cámbialas antes de abrir la plataforma al público.

## Migraciones de base de datos

Cada cambio de base de datos es un archivo SQL nuevo en `supabase/migrations/` (nunca se edita uno ya aplicado).

```bash
npm run db:new agregar_cupones     # crea supabase/migrations/<fecha>_agregar_cupones.sql → escribe el SQL ahí
npm run db:status                  # qué migraciones están aplicadas en Supabase
npm run db:push                    # aplica las pendientes (o haz push a main y lo hace el Action)
npm run db:diff                    # si cambiaste algo en el dashboard, genera el SQL equivalente
```

**Automático:** `.github/workflows/supabase-migrations.yml` aplica las migraciones al hacer push a `main`.
Requiere en GitHub → Settings → Secrets and variables → Actions:
`SUPABASE_ACCESS_TOKEN` (https://supabase.com/dashboard/account/tokens) y `SUPABASE_DB_PASSWORD`
(Supabase → Project Settings → Database).

## Rutas

| Ruta | Qué es |
|---|---|
| `/` | Landing del marketplace (editable desde Superadmin) |
| `/registro`, `/login` | Registro de empresa / acceso de tiendas y superadmin |
| `/onboarding` | Asistente: branding → categorías/productos → métodos de pago |
| `/panel` (+ `/tienda`, `/pagos`, `/pedidos`, `/mensajes`, `/ajustes`) | App de gestión de la tienda |
| `/<slug>` (+ `/producto/:id`, `/checkout`, `/compras`, `/mensajes`, `/login`) | Tienda pública para clientes |
| `/superadmin`, `/superadmin/landing` | Estadísticas, tiendas, comisiones y editor de la landing |
