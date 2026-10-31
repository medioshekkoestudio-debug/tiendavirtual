# Linki App — Avances del 31 de octubre de 2026

Todo lo de esta lista está **en producción** (linkiapp.com) y en la rama `main`, salvo lo que se indica en «Lo que falta».

---

## Lo que se hizo

### Landing (linkiapp.com)
- **Plan Pro:** «Dominio personalizado (ej. tutienda.com.ve)» se cambió por **«Link personalizado con el nombre de tu tienda (ej. linkiapp.com/tutienda)»**, porque no se ofrece dominio propio.
- **Sección de beneficios** (Tu marca, tu app · Pagos locales · Pedidos y chat): fondo verde con el patrón de links, tarjetas blancas y los iconos de Linki App, cada uno en su bloque.
- **Cierre «Tu tienda, como app, lista hoy»:** fondo verde oscuro de la marca, Linkito con el teléfono y un patrón de links suave detrás.
- **Redes sociales en el pie:** Instagram (@linki.app), Facebook y TikTok (@linkiapp.com).

### Panel de las tiendas
- **Menú lateral en escritorio:** en pantallas grandes, Inicio, Tienda, Pagos, Pedidos y Mensajes van a la izquierda. En el teléfono sigue la barra de abajo.
- **Colores tomados del logo:** al subir el logo, la app propone los colores principal, secundario y de acento a partir del logo. Hay un botón «Colores de mi logo» para volver a aplicarlos.
- **Franja para el dueño en su tienda pública:** si el dueño abre su propia tienda, arriba ve «Así ven tu tienda tus clientes» con el botón **Cargar productos**. Antes no había forma de llegar al panel desde ahí; así le pasó a Vakog.
- **QR de cada tienda:** se genera a partir del link de la tienda, así que lo tienen todas, las actuales y las nuevas. Va en el color de la tienda, con su logo al centro, y se descarga en PNG de 1080 px o se comparte. Está en el inicio del panel, al terminar la configuración y en la tienda pública (icono de QR en la barra superior).
- **Hora de Venezuela:** el panel, el superadmin y los chats mostraban las horas 4 h adelantadas (hora del servidor). Ahora usan la hora de Caracas, igual que los filtros de hoy, semana y mes.

### Chat sin iniciar sesión
- El cliente puede escribirle a la tienda **sin crear cuenta**: deja su nombre, su teléfono (opcional) y el mensaje. La conversación queda guardada en su navegador y las respuestas le llegan en pocos segundos.
- En el panel, la conversación aparece con la etiqueta **«Invitado»** y su teléfono. Los contadores de mensajes sin leer incluyen los de invitados.
- **Seguridad:** clave secreta en una cookie que el código de la página no puede leer (en la base solo se guarda su huella), límite de 5 chats nuevos y 60 mensajes por hora, y campo trampa contra bots.
- Se probó completo en producción con Tienda Prueba y luego se borró la conversación de prueba.

### Superadmin
- **Registros por día, semana y mes**, cada uno comparado con el período anterior (ayer, semana pasada, mes pasado).
- **Pestaña Finanzas:**
  - total cobrado, mensualidades y comisiones cobradas, y lo que falta por cobrar;
  - **dónde está el dinero:** Pago móvil (Bancamiga), PayPal y Binance, con lo que entró en cada uno;
  - mensualidades por plan (Emprendedor, Pro, Business, en mensual y anual);
  - comisiones que debe cada tienda y planes vencidos sin renovar;
  - lista de todos los pagos con tienda, concepto, a dónde pagó, referencia, monto y estado, con filtros.
- **Seguimiento de usuarios:**
  - embudo **Se registró → Configuró su tienda → Cargó productos → Recibió pedidos**, con cuántas tiendas se quedaron en cada paso;
  - etapa de cada tienda con su fecha;
  - última actividad en días (ámbar desde 7, rojo desde 14);
  - filtros «Sin usar la app 7+ / 14+ / 30+ días».
- **PayPal activado** en la pasarela de planes con **estefaniamr716@gmail.com**. Se editó en la configuración, sin cambios de código.

### Avisos por WhatsApp al administrador
- El código para avisar al **0412-8364248** está listo y en producción: avisa en cada registro (con cupón o desde la página de planes), en cada pago de plan y en cada pago de comisiones, con el enlace directo al superadmin para aprobar.
- **Todavía no envía nada:** falta la clave de CallMeBot (ver «Lo que falta»).

### Seguridad
- **Migración anti-inyección aplicada:** la base limpia las direcciones de imágenes y los colores cada vez que se guardan, y el bucket de imágenes ya no acepta SVG. Antes de aplicarla se revisó que los datos existentes cumplieran las reglas.

### SEO y Google
- **`/favicon.ico` con el icono oficial.** Antes daba error 404, y por eso Google mostraba un icono sin los colores de la marca.
- **`robots.txt`:** Google puede leer la landing y las tiendas, pero no los paneles ni las pantallas de cuenta.
- **`sitemap.xml`:** la landing, el registro, los planes y cada tienda activa, actualizado cada hora.
- **Datos estructurados:** nombre, logo oficial y redes de Linki App, para que Google los muestre correctamente.
- **Título y descripción** pensados para búsquedas, URL canónica en la landing y en cada tienda, vista previa para WhatsApp, Facebook y X, y manifiesto de la app completo.
- Listo para verificar en Google Search Console con la variable `GOOGLE_SITE_VERIFICATION`.

### Migraciones aplicadas hoy en la base
| Archivo | Para qué |
|---|---|
| `20261031200000_anti_inyeccion.sql` | Limpiar URLs y colores; quitar SVG del bucket |
| `20261031210000_finanzas.sql` | Totales de la pestaña Finanzas |
| `20261031220000_chat_invitados.sql` | Conversaciones y mensajes sin cuenta |
| `20261031230000_seguimiento_usuarios.sql` | Fechas de cada paso del embudo |

---

## Lo que falta

### Lo tiene que hacer la dueña del proyecto
1. **Avisos por WhatsApp.** CallMeBot tiene el bot **lleno** (no muestra su número hasta que libere cupos). Hay que elegir:
   - **esperar** a que abra cupos. Cuando abra: desde el 0412-8364248 enviar *«I allow callmebot to send me messages»* al número que publiquen, y poner en Vercel `ADMIN_WHATSAPP_PHONE=584128364248` y `CALLMEBOT_APIKEY=<clave>`;
   - o **pasar a la API oficial de WhatsApp (Meta):** es estable, pero requiere una cuenta de WhatsApp Business y una plantilla aprobada, y cuesta unos centavos de dólar por aviso.
2. **Google Search Console** (Google aún no tiene indexado linkiapp.com, porque el dominio se conectó el 29-oct):
   - agregar la propiedad `https://linkiapp.com` y elegir el método «Etiqueta HTML»;
   - poner el código en Vercel como `GOOGLE_SITE_VERIFICATION` (o pasárselo a Claude) y volver a desplegar;
   - enviar `sitemap.xml` y solicitar la indexación de `https://linkiapp.com`. Esto también actualiza el icono en los resultados.
3. **Revisar el correo de PayPal:** se usó **estefaniamr716@gmail.com**, porque el que se dictó no tenía «.com». Si es otro, se cambia en Superadmin → Planes y cobros.

### Pendientes técnicos (de `memoria.md`)
- **CSP con nonce** en `middleware.ts`, probada con un build en otra carpeta.
- **Cloudflare Turnstile** en la pasarela, el cupón, el login y el registro de clientes (faltan las claves).
- **Cloudflare:** registros en DNS only y cambiar los nameservers (hoy siguen los de Vercel).
- **Escribir `seguridad.md`** con todo lo hecho y lo pendiente.

### Ideas que quedaron abiertas
- Avisar también por WhatsApp cuando se registre un **cliente** al comprar en una tienda (hoy solo avisa de tiendas y pagos).
- Contar en el superadmin los **clientes registrados**, además de las tiendas.
- Probar los avisos de WhatsApp con un pago real cuando haya clave.
