# Plan: validación automática de pagos (API del banco y OCR propios)

_29-10-2026. Basado en cómo lo resuelve La Mejor Llave (`llaveMental/llave-mental`: `pagos.md`, `nuevoPlanValidacionPagos.md`,
`ocr.md`, `lib/payments/`). **No se reutiliza ninguno de sus dos servicios**: la Bank Automation API
(`bank-automation-api-production.up.railway.app`, repo `Pinguino-Digital/bank_scraping_nest`) y el servicio de OCR
(`payment-ocr-service-production.up.railway.app`) son de otro equipo. Los construimos de cero._

---

## 1. Cómo funciona en La Mejor Llave (resumen de lo revisado)

### 1.1 Las piezas

| Pieza | Qué hace | De quién es |
|---|---|---|
| **OCR del comprobante** | Lee la captura del pago y devuelve referencia, monto, banco y datos del que paga | Servicio externo (Railway) |
| **API del banco** | Entra a la banca en línea (BDV), baja los movimientos recibidos y los guarda en su base | Servicio externo (Railway), multicuenta |
| **Conciliación** (`conciliar.ts`) | Cada minuto empareja las compras pendientes con los movimientos del banco y aprueba las que cuadran | La app |
| **Cron** (cron-job.org) | Llama a `/api/cron/revalidate` cada minuto | Externo, gratis |

### 1.2 El flujo

1. El jugador paga por Pago Móvil y sube la captura.
2. **OCR**: lee la referencia (últimos 6 dígitos) y el monto. Si la foto no se lee, pide otra. El OCR **no valida
   dinero**: solo evita que el jugador teclee mal la referencia y guarda el origen para el antifraude.
3. La compra queda **pendiente** con su monto en Bs **congelado** (tasa del momento).
4. Cada minuto, la **conciliación**:
   1. lee las compras pendientes;
   2. lee el estado de cuenta **ya guardado** en la API (gratis, no toca el banco);
   3. si alguna pendiente no aparece, manda **un latido**: le pide a la API una referencia imposible para obligarla
      a entrar al banco y bajar movimientos frescos (tarda 20–60 s; el banco aguanta una entrada cada ~3 min por cuenta);
   4. relee y empareja;
   5. **reclama** el movimiento en la API (`set_used=true`, para que no sirva dos veces) y aprueba la compra.

### 1.3 Las reglas para aprobar solo (todas a la vez)

1. El movimiento es de **nuestra cuenta**: se comprueban la etiqueta y el número de cuenta (la API es multicuenta).
2. No está marcado como usado, ni en el banco ni en nuestra propia base.
3. Es un **crédito** (dinero que entra).
4. El monto cuadra con tolerancia `max(0,5 Bs; 0,5 %)`, **por arriba y por abajo**. Pagar de más tampoco se aprueba solo.
5. Coinciden los **últimos 6 dígitos** de la referencia.
6. El pago cae entre **24 h antes y 2 h después** de registrar la compra.
7. Si dos movimientos comparten cola y monto, **no se aprueba ninguno**.

**Regla de oro: el sistema nunca rechaza solo.** Lo que no cuadra queda pendiente con su motivo escrito y lo decide
una persona.

### 1.4 Lo que aprendieron a golpes (y que nuestro diseño debe resolver desde el día 1)

- **Su API no tiene reloj propio**: solo entra al banco cuando alguien pregunta por una referencia que no tiene. Por eso
  existe el truco del latido. El 16-08 la cola se congeló 109 minutos.
- El código HTTP no dice si entró al banco: hay que medirlo por lo que tarda.
- Dos pasadas solapadas del cron devolvieron a pendiente una compra ya aprobada y se pagó dos veces. Hace falta un
  **cerrojo de estado** (solo se toca una compra si sigue pendiente).
- Las aprobaciones manuales no marcaban el pago como usado. Hace falta un **registro propio** de qué movimiento pagó qué.
- El 30-09 el BDV dejó de mostrar movimientos durante horas. Cuando el banco falla, todo cae a manual. Conviene una
  **segunda cuenta en otro banco** como respaldo.
- El OCR confundía nuestros propios datos (cédula, teléfono de destino) con los del que paga. Hay que **descartar lo que
  coincida con nuestros datos de cobro**.
- Diagnosticar sin rastro fue imposible: hace falta un **diario de cada pasada** (`cron_pasadas`) y un semáforo en el panel.

---

## 2. Qué construimos

Dos servicios propios, más la conciliación dentro de Linki App:

```
Comprador ──captura──▶ Linki App ──imagen──▶ linki-ocr (propio)
                          │
                          │ cada minuto
                          ▼
                    Conciliación ──lee movimientos──▶ linki-bank (propio) ──scraping──▶ Banca en línea
                          │
                          ▼
                Aprueba / deja pendiente con motivo
```

### Alcance por fases

- **Fase A — Planes de Linki App**: una sola cuenta, la nuestra (**Bancamiga**, Pago Móvil 0412-8364248). Es el caso
  más simple y el que nos da ingresos.
- **Fase B — Tiendas**: cada tienda tendría que darnos el acceso a **su** banca en línea. Es delicado (custodiamos
  credenciales de terceros), así que va después, opcional, por tienda, y solo si lo pide. Mientras tanto las tiendas
  usan OCR + aprobación manual desde su panel.

---

## 3. `linki-bank`: nuestra API del banco

### 3.1 Antes de programar: ¿el banco tiene API oficial?

El scraping es la parte frágil (cambia con cada rediseño del portal, captchas, bloqueos, OTP). Primero hay que
preguntarle a **Bancamiga** (y a otros bancos que nos interesen como respaldo: BNC, Banesco, Mercantil, BDV) si
ofrecen a empresas una **API de consulta de movimientos o de verificación de Pago Móvil**. Si existe, la usamos y el
servicio solo envuelve esa API. El scraping queda como plan B.

> **Tarea tuya**: preguntar en Bancamiga por «API de conciliación / consulta de movimientos para comercios» y si se
> puede crear un **usuario de solo consulta** en la banca en línea (sin permiso para transferir).

### 3.2 Arquitectura

- **Servicio aparte** (no en Vercel: un navegador automatizado no cabe en una función serverless). Node + TypeScript +
  **Playwright**, en Railway, Fly.io o un VPS. Unos $5–10/mes.
- **Base de datos**: tablas en nuestra Supabase, en un esquema propio `bank`, inaccesible desde el navegador.
- **Reloj propio**: a diferencia de la API de La Mejor Llave, nuestro servicio **refresca solo** cada N minutos
  (respetando el enfriamiento del banco) y además cuando hay pagos pendientes. Así se elimina el truco del latido.

### 3.3 Tablas

| Tabla | Columnas clave |
|---|---|
| `bank.accounts` | `id`, `label`, `bank` (`bancamiga`…), `account_masked`, `credentials` (cifradas con AES-256-GCM, la clave solo en una variable de entorno del servicio), `active`, `last_scraped_at`, `last_error` |
| `bank.movements` | `id`, `account_id`, `date`, `reference`, `reference_tail` (6 dígitos), `amount`, `type` (crédito/débito), `description`, `origin_bank`, `origin_id`, `scraped_at`, `used_at`, `used_by` · **única** por (`account_id`, `reference`, `date`, `amount`) |
| `bank.scrape_runs` | `id`, `account_id`, `started_at`, `duration_ms`, `result` (`ok`/`login_failed`/`cooldown`/`error`), `new_movements` — el diario |

### 3.4 Endpoints (token Bearer, solo servidor a servidor)

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/movements?account=…&since=…&tail=…` | Movimientos guardados. No toca el banco |
| `POST` | `/scrape` `{account}` | Pide una actualización ya. Responde al instante; si está en enfriamiento, dice cuándo |
| `POST` | `/movements/:id/claim` `{used_by}` | Marca un movimiento como usado, **atómico** (`update … where used_at is null`); si ya estaba usado devuelve 409 |
| `GET` | `/health` | Última actualización por cuenta, último error. Lo usa el semáforo del panel |

### 3.5 El scraper (por banco, un archivo)

`scrapers/bancamiga.ts` con la misma interfaz para todos: `login()`, `fetchMovements(desde)`, `logout()`.

- Sesión con espera humana entre pasos y reintentos con espera creciente.
- Si el banco pide **OTP / pregunta de seguridad**: se guarda la respuesta cifrada; si exige OTP por SMS en cada
  entrada, el scraping no es viable y hay que ir por la API oficial (§3.1).
- Al fallar el login 2 veces seguidas, **se pausa la cuenta** y se avisa (para que el banco no la bloquee).
- Se guardan solo los créditos de los últimos días, sin duplicar (la clave única lo impide).

---

## 4. `linki-ocr`: nuestro lector de comprobantes

### 4.1 Lo que hace el de La Mejor Llave (para igualarlo)

`POST /v1/extract?template=ve_pago_movil&refDigits=6` con la imagen. Devuelve `legible`, `reference` (6 dígitos),
`full_reference`, `amount`, `date`, `bank`, `origin`, `origin_bank`, `origin_cedula`, `confidence`. Responde **422** si
la foto no se puede leer. En su medición acierta el monto en el 99,8 % y la referencia en el 99,9 %; los pocos errores
fueron dígitos repetidos («66» leído como «6»).

### 4.2 Cómo lo hacemos nosotros

**Recomendado: un modelo de visión (Claude) con salida estructurada**, dentro de Linki App como ruta de servidor
(`/api/ocr`), sin servicio aparte:

- Se le manda la imagen y se le pide un JSON con el mismo formato de §4.1. Los recibos de cada banco venezolano son
  distintos; un modelo de visión los entiende todos sin escribir una plantilla por banco.
- Modelo: `claude-haiku-5-5` (rápido y barato) y, si devuelve poca confianza, un segundo intento con `claude-sonnet-5-5`.
- Validaciones nuestras después del modelo, nunca confiar a ciegas:
  - la referencia debe ser solo dígitos; se guarda la cola de 6;
  - el monto debe ser un número positivo;
  - **se descarta todo dato que coincida con nuestros datos de cobro** (teléfono, cédula, cuenta, titular), como hace
    `esNuestro()` en La Mejor Llave;
  - si falta la referencia o el monto → «No pudimos leer tu comprobante, adjunta uno más legible».
- Se guarda la respuesta cruda (`ocr_raw`) para auditar.
- Variable de entorno: `ANTHROPIC_API_KEY` (solo servidor).

**Alternativa sin costo por imagen:** Tesseract (o PaddleOCR) en un servicio propio + una plantilla de expresiones
regulares por banco. Gratis por lectura pero hay que mantener una plantilla por cada formato de recibo, y es menos
preciso con fotos torcidas. Solo vale la pena con mucho volumen.

**Prueba antes de encenderlo:** juntar 30–50 capturas reales (de varios bancos) y comparar lo que lee contra lo que
dice el banco. Meta: ≥ 99 % en referencia y monto.

---

## 5. La conciliación dentro de Linki App

- **Requisito previo**: la Fase 2 de `planTasaBcv.md` (guardar `amount_ves` y la tasa en cada pago).
- Columnas nuevas en `subscription_payments` (y luego en `payments` de las tiendas): `ocr_reference`, `ocr_amount`,
  `ocr_raw`, `ocr_at`, `status_note`, `bank_movement_id`, `validated_by` (`auto`/`manual`).
- Ruta `GET /api/cron/conciliar` protegida con `CRON_SECRET`, llamada cada minuto por cron-job.org. Responde al instante
  y trabaja después (`after()`), con `maxDuration = 120`.
- Una pasada: lee pendientes → lee movimientos guardados de `linki-bank` → empareja con las reglas de §1.3 → **reclama**
  el movimiento (atómico) → aprueba con el RPC que ya existe (`review_subscription_payment`) y desbloquea la cuenta.
- **Cerrojo de estado**: solo se aprueba o anota si el pago sigue `pendiente`.
- **Registro propio**: `bank_movement_id` único entre todos los pagos aprobados; un movimiento nunca paga dos cosas.
- Aprobación manual desde el Superadmin: también reclama el movimiento si lo encuentra.
- **Diario** `conciliacion_pasadas` (7 días) y **semáforo** en Superadmin → Planes y cobros: verde si el banco se leyó
  hace menos de 10 min, amarillo, rojo.
- **Interruptores** en una constante: `VALIDACION_AUTOMATICA` (apagado = todo manual) y `MODO_SOMBRA` (hace todo, anota
  lo que habría aprobado, pero no aprueba).
- Una cuenta nueva sigue bloqueada hasta que su pago se apruebe (automático o manual).

---

## 6. Puesta en marcha

| Paso | Qué | Resultado |
|---|---|---|
| 0 | Preguntar al banco por API oficial / usuario de consulta (§3.1) | Decide scraping o API |
| 1 | Fase 2 de la tasa: guardar monto en Bs y tasa | Montos verificables |
| 2 | `linki-ocr` + la referencia y el monto se llenan solos desde la captura | Menos errores de tipeo; ya útil sin banco |
| 3 | `linki-bank` con la cuenta Bancamiga, solo leyendo | Ver los movimientos en el panel |
| 4 | Conciliación en **modo sombra** 1–2 semanas | Medir cuántos habría aprobado y si alguno estaría mal |
| 5 | Encender la aprobación automática para planes | Planes activados en minutos |
| 6 | (Opcional) Fase B: tiendas que conecten su banco | Validación automática para sus clientes |

## 7. Riesgos

| Riesgo | Cómo se cubre |
|---|---|
| Credenciales del banco robadas | Cifradas con clave fuera de la base; usuario de solo consulta; servicio sin acceso público salvo con token |
| El banco cambia su portal o se cae | Diario + semáforo + aviso; todo cae a manual sin romper nada; cuenta de respaldo en otro banco |
| Aprobar un pago ajeno o dos veces | Reclamo atómico, registro propio, cerrojo de estado, reglas estrictas, ambigüedad → manual |
| El banco bloquea la cuenta por tantas entradas | Respetar el enfriamiento (≥ 3 min por cuenta), pausar tras 2 logins fallidos |
| OCR se equivoca | No aprueba nada por sí solo: quien manda es el movimiento del banco |
| Términos del banco prohíben automatizar | Preguntar (§3.1); preferir siempre la API oficial |

## 8. Lo que necesito de ti

1. Hablar con Bancamiga (§3.1).
2. Decidir dónde se aloja `linki-bank` (Railway es lo más simple).
3. Una cuenta de Anthropic con `ANTHROPIC_API_KEY` para el OCR, o elegir la alternativa con Tesseract.
4. Juntar capturas reales de pagos para probar el OCR.

---

## 9. Estado (29-10-2026)

- **Escrito**: `services/pagos-api` (conciliación, banco y OCR) y la migración `20261031120000_validacion_pagos.sql`.
  Listo para subir a Railway: los pasos están en `services/pagos-api/README.md`.
- **Decidido**: sin OCR por ahora, para no pagar por comprobante. En Pago Móvil el usuario escribe los últimos 6 dígitos
  de la referencia y con eso, el monto y la fecha se concilia.
- **Falta (lunes 2-11)**: crear con Bancamiga el usuario de solo consulta (o conseguir su API), cargarlo en el servicio,
  mapear el portal y probar. Detalle en «Pendiente» del README del servicio.
