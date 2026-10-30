# pagos-api

Servicio de validación automática de pagos de Linki App (`planValidacionAutomatica.md`). Corre en Railway, aparte de
Vercel, porque necesita un reloj propio y un navegador para entrar al banco.

- **Conciliación**: cada minuto empareja los pagos de plan y de comisiones por Pago Móvil con los movimientos del banco:
  - los **últimos 6 dígitos de la referencia** que escribe el usuario al pagar;
  - el monto en Bs, calculado aquí con la tasa BCV del día, con una tolerancia de ± máx(0,5 Bs; 0,5 %);
  - una ventana de −24 h a +2 h;
  - un único movimiento que cumpla todo.

  Aprueba en una sola transacción que también reclama el movimiento (`auto_approve_payment`), así un movimiento no paga
  dos cosas. **Nunca rechaza**: lo que no cuadra queda pendiente con su motivo en `payment_validations.status_note`.
- **Banco**: entra a la banca en línea cada 10 min (cada 3 si hay pagos esperando), guarda los movimientos sin duplicar
  y pausa la cuenta tras 2 entradas fallidas. Las credenciales se guardan cifradas (AES-256-GCM).
- **OCR (apagado)**: lee comprobantes con Claude. Solo se activa si se pone `ANTHROPIC_API_KEY`; sin ella no cuesta
  nada y la conciliación usa solo la referencia escrita.

Con `AUTO_APPROVE=false` (lo predeterminado) está en **modo sombra**: hace todo y anota qué habría aprobado, sin aprobar.

## Endpoints (todos con `Authorization: Bearer $API_TOKEN`)

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/health` | Sin token: `{ok}` (lo usa Railway). Con token: cuentas con semáforo, modo y última pasada |
| POST | `/accounts` | `{label, bank: "bancamiga", account_masked, username, password}`: guarda la cuenta con las credenciales cifradas |
| POST | `/scrape` | `{account, force?}`: entra al banco ya; 429 si está en enfriamiento |
| GET | `/movements?account=&since=YYYY-MM-DD&tail=123456` | Movimientos guardados; no toca el banco |
| POST | `/movements/import` | `{account_id, movements: [{date, reference, amount, type?}]}`: carga un estado de cuenta a mano |
| POST | `/conciliar` | Una pasada ya |
| POST | `/ocr` | Solo con OCR encendido: `{kind, payment_id}` o `{image_base64, media_type}` |

## Subir a Railway

1. **Primero subir el repositorio a GitHub** (push a main). Ese push también aplica en Supabase la migración
   `20261031120000_validacion_pagos.sql`, que crea las tablas del banco y de la conciliación.
2. Railway → **New Project → Deploy from GitHub repo** → elegir este repositorio.
3. En el servicio → **Settings → Root Directory** = `services/pagos-api`. Railway usa el `Dockerfile` y `railway.json`
   de esta carpeta (imagen con Chromium para el banco, chequeo en `/health`, una sola réplica).
4. **Variables**:

   | Variable | Valor |
   |---|---|
   | `SUPABASE_URL` | `https://pozexcjbxmoluftfxxus.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | La de Supabase → Project Settings → API (la misma de `.env.local`; nunca en el código) |
   | `API_TOKEN` | Un valor al azar: `npm run clave` |
   | `BANK_CREDENTIALS_KEY` | Otro valor al azar: `npm run clave`. **Guardarlo**: si se pierde, hay que volver a cargar la cuenta del banco |
   | `AUTO_APPROVE` | `false` (modo sombra) |
   | `ANTHROPIC_API_KEY` | No ponerla (sin OCR) |

   No poner `PORT` (lo da Railway) ni `SCHEDULER`.
5. **Settings → Networking → Generate Domain**. Comprobar que `https://<dominio>/health` responde `{"ok":true}` y que
   en los logs sale `pagos-api en :… · modo sombra · OCR apagado`.
6. Guardar el dominio y el `API_TOKEN`: Linki App los usará como `PAGOS_API_URL` y `PAGOS_API_TOKEN` en Vercel.

Mientras no haya cuenta del banco cargada, el servicio corre igual: cada minuto revisa los pagos pendientes y les
escribe «Aún no aparece en el banco». No aprueba ni rechaza nada.

## Pendiente (lunes 2-11): conectar el banco

1. **Hablar con Bancamiga**:
   - preguntar si tienen una **API oficial** de consulta de movimientos o de verificación de Pago Móvil para comercios.
     Si la hay, se usa esa y no se hace scraping;
   - si no la hay, pedir un **usuario de solo consulta** en la banca en línea, que vea movimientos pero no pueda
     transferir;
   - preguntar si ese usuario pide **OTP por SMS** en cada entrada. Si lo pide, el scraping no sirve y hay que insistir
     en la API.
2. **Cargar la cuenta en el servicio** (las credenciales quedan cifradas; nunca van en el código ni en el chat):
   ```bash
   curl -X POST https://<dominio>/accounts \
     -H "Authorization: Bearer $API_TOKEN" -H "content-type: application/json" \
     -d '{"label":"Linki Bancamiga","bank":"bancamiga","account_masked":"1234","username":"…","password":"…"}'
   ```
3. **Mapear el portal** en `src/bank/bancamiga.ts`, entrando juntos con ese usuario:
   - la URL de entrada (`BANCAMIGA_LOGIN_URL`);
   - los campos de usuario y clave, el botón de entrar y el mensaje de error;
   - cómo se llega al estado de cuenta;
   - las columnas de la tabla de movimientos (fecha, referencia, descripción, monto).

   Mientras falte, la cuenta queda en `not_configured`.
4. **Probar la entrada**: `POST /scrape {"account":"<id>"}` y revisar los movimientos con `GET /movements`.
5. **Modo sombra 1–2 semanas**: comparar las notas «Modo sombra: se habría aprobado…» con lo que se aprueba a mano.
   Si ninguna está mal, poner `AUTO_APPROVE=true` en Railway.
6. **En Linki App**: en el Superadmin, mostrar el motivo de cada pago pendiente (`status_note`) y el semáforo del banco.
   Y cuando un pago se apruebe a mano, marcar su movimiento como usado.
