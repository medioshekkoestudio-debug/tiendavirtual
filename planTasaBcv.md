# Plan: precios en dólares y bolívares (tasa BCV) en las pasarelas de pago

_29-10-2026. Aplica a la pasarela de planes de Linki App (`/suscripcion`) y al checkout de cada tienda (`/<slug>/checkout`)._

## 1. Qué se quiere

En las dos pasarelas, quien paga ve siempre:

- cada producto (o plan) con su precio en **$** y su equivalente en **Bs**;
- el subtotal de cada línea (precio × cantidad) en ambas monedas;
- el **total** en ambas monedas;
- la tasa usada y su fecha («Tasa BCV del 29-10-2026: Bs. 215,40 por $»).

Los precios se siguen guardando y escribiendo en dólares. El bolívar es un **equivalente calculado** con la
tasa oficial del día.

## 2. De dónde sale la tasa (cómo lo hace La Mejor Llave)

Revisado en `llaveMental/llave-mental/lib/payments/exchangeRate.ts` y `pagos.md` §1:

- **No se lee la página del BCV ni la del Banco de Venezuela.** La web del BCV (bcv.org.ve) falla la
  verificación TLS desde los servidores. Se usa **dolarapi.com**, que replica el dólar oficial del BCV:
  `https://ve.dolarapi.com/v1/dolares/oficial` → campo `promedio`.
- **Fin de semana** (sábado y domingo, hora de Caracas): se usa la tasa del **lunes**, que el BCV publica el
  viernes en la tarde. Sale de la última fila del histórico
  `https://ve.dolarapi.com/v1/historicos/dolares/oficial`. Si el histórico falla, se usa la del viernes.
- **Caché de 1 hora**, con un tiempo límite de 3 s por consulta. Si dolarapi falla, se sirve la última tasa
  conocida y no se reintenta durante 5 minutos: una API externa lenta no puede volver lenta la compra.
- Si nunca se consiguió una tasa, se muestra solo el precio en $ con el aviso «Tasa BCV no disponible».

Linki App usa exactamente esta lógica, copiada en `src/lib/exchange-rate.ts`.

## 3. Fase 1 — Mostrar $ y Bs (se aplica ya)

1. **`src/lib/exchange-rate.ts`** (solo servidor): `getBcvRate()` con la lógica de §2. Devuelve
   `{ rate, date }` o `null`.
2. **`src/lib/utils.ts`**: `formatBs(n)` → `Bs. 1.234,56` (formato `es-VE`) y `toBs(usd, rate)` redondeado a
   2 decimales.
3. **Componente `Money`** (`src/components/money.tsx`): muestra `$7,00` y debajo `Bs. 1.507,80`. Si no hay
   tasa, muestra solo los dólares.
4. **Pasarela de planes** (`/suscripcion`): la página pide la tasa y se la pasa a la pasarela.
   - En las tarjetas del paso Plan: precio en $ y Bs.
   - En el paso Pago: un resumen con el plan seleccionado, su precio y el **total en $ y Bs**, además de la
     tasa usada.
   - En Pago Móvil el monto a transferir se muestra en Bs y en grande (en La Mejor Llave, mostrar el monto
     exacto redujo los pagos incompletos).
5. **Checkout de las tiendas** (`/<slug>/checkout`):
   - en el carrito, cada producto con su precio unitario y su subtotal en $ y Bs;
   - el total al pie de cada paso y el «Total a pagar» del paso Pago, en ambas monedas;
   - la línea «Tasa BCV del …».

## 4. Fase 2 — Congelar el monto en Bs al registrar el pago (necesaria para la validación automática)

Hoy el monto en Bs solo se muestra. Para poder comparar contra el banco (ver `planValidacionAutomatica.md`)
hay que **guardarlo en el momento del pago**, calculado en el servidor, sin confiar en el navegador. Así lo
hace La Mejor Llave:

```
amount_ves = redondear(amount_usd × tasa × 100) / 100
```

- Migración: `orders.total_ves`, `orders.exchange_rate`, `payments.amount_ves`,
  `subscription_payments.amount_ves`, `subscription_payments.exchange_rate` (todas `numeric`, nulas).
- `placeOrder`, `createSubscriptionPayment` y `createPlanSignup` piden la tasa con `getBcvRate()` y guardan la
  tasa usada y el monto en Bs.
- El panel de la tienda, «Mis compras» del cliente y el Superadmin muestran el monto en Bs congelado junto al
  de $.
- Si la tasa cambió entre que el cliente vio el precio y envió el pago, manda la del servidor (es la misma
  la mayor parte del tiempo, porque cambia una vez al día).

## 5. Riesgos

| Riesgo | Cómo se cubre |
|---|---|
| dolarapi se cae | Última tasa conocida en caché; si no hay ninguna, solo $ con aviso |
| La caché en memoria es por servidor (Vercel arranca varias instancias) | Cada instancia pide como mucho 1 vez por hora; es gratis. Si molesta, guardar la tasa en una tabla `exchange_rates` |
| El cliente paga con la tasa del viernes un lunes | Se ve la fecha de la tasa al lado del monto |
| Redondeos distintos entre la tienda y el banco | Fase 2 guarda el monto exacto y la validación tiene tolerancia (±0,5 %) |
