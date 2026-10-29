// Crea los usuarios de prueba y datos de ejemplo.
// Uso: npm run seed   (lee .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

export const USERS = {
  superadmin: { email: "superadmin@shopux.app", password: "Shopux#Admin2026", meta: { role: "customer", full_name: "Superadmin Linki App" } },
  tienda: { email: "tienda@empresax.com", password: "Empresax#2026", meta: { role: "store_owner", full_name: "Admin Empresa X", company_name: "Empresa X" } },
  cliente: { email: "cliente@shopux.app", password: "Cliente#2026", meta: { role: "customer", full_name: "María Pérez", phone: "0414-5551234", cedula: "V-20123456" } },
};

function check(res, label) {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
  return res.data;
}

async function ensureUser({ email, password, meta }) {
  const created = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta });
  if (!created.error) return created.data.user.id;
  const list = check(await db.auth.admin.listUsers({ page: 1, perPage: 1000 }), "listUsers");
  const user = list.users.find((u) => u.email === email);
  if (!user) throw new Error(`No se pudo crear ${email}: ${created.error.message}`);
  check(await db.auth.admin.updateUserById(user.id, { password }), "updateUser");
  return user.id;
}

const img = (seed, w = 800, h = 800) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
const daysAgo = (d, h = 12) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(h, 15, 0, 0);
  return t.toISOString();
};

async function main() {
  console.log("→ Usuarios");
  const superId = await ensureUser(USERS.superadmin);
  const ownerId = await ensureUser(USERS.tienda);
  const clientId = await ensureUser(USERS.cliente);
  check(await db.from("profiles").update({ role: "superadmin" }).eq("id", superId), "superadmin role");

  console.log("→ Tienda Empresa X");
  const store = check(await db.from("stores").select("*").eq("owner_id", ownerId).single(), "store");
  check(
    await db
      .from("stores")
      .update({
        name: "Empresa X",
        slug: "empresax",
        description: "Moda y tecnología con envíos a todo el país. Calidad garantizada y atención personalizada por chat.",
        primary_color: "#7c3aed",
        secondary_color: "#1e1b4b",
        accent_color: "#f59e0b",
        font_key: "poppins",
        slider_images: [img("empresax-1", 1920, 480), img("empresax-2", 1920, 480), img("empresax-3", 1920, 480)],
        payment_methods: {
          zelle: { enabled: true, email: "pagos@empresax.com", holder: "Empresa X LLC" },
          paypal: { enabled: true, link: "https://paypal.me/empresax", email: "paypal@empresax.com" },
          pago_movil: { enabled: true, bank: "Banesco (0134)", id_number: "J-12345678-9", phone: "0414-1234567", holder: "Empresa X C.A." },
          binance: { enabled: true, pay_id: "123456789", email: "binance@empresax.com", holder: "empresax" },
          transferencia: {
            enabled: true,
            id_number: "J-12345678-9",
            email: "pagos@empresax.com",
            account: "0134-0000-00-0000000000",
            bank: "Banesco",
            holder: "Empresa X C.A.",
          },
        },
        onboarding_step: 4,
        onboarding_completed: true,
        is_active: true,
      })
      .eq("id", store.id),
    "update store",
  );

  const { count } = await db.from("products").select("id", { count: "exact", head: true }).eq("store_id", store.id);
  if (count) {
    console.log("   (ya tiene productos: se omiten datos de ejemplo)");
  } else {
    console.log("→ Categorías y productos");
    const tree = { Moda: ["Ropa de mujer", "Ropa de hombre", "Calzado", "Accesorios"], Electrónica: ["Teléfonos", "Audio", "Accesorios"] };
    const ids = {};
    let pos = 0;
    for (const [parent, subs] of Object.entries(tree)) {
      const p = check(await db.from("categories").insert({ store_id: store.id, name: parent, position: pos++ }).select().single(), "cat");
      ids[parent] = p.id;
      for (const [i, s] of subs.entries()) {
        const c = check(await db.from("categories").insert({ store_id: store.id, name: s, parent_id: p.id, position: i }).select().single(), "sub");
        ids[`${parent}/${s}`] = c.id;
      }
    }
    const products = [
      ["Vestido floral", "Moda", "Ropa de mujer", 35, 12, "Vestido fresco de algodón, ideal para el día."],
      ["Blusa de lino", "Moda", "Ropa de mujer", 22, 8, "Blusa liviana de lino natural."],
      ["Camisa Oxford", "Moda", "Ropa de hombre", 28, 15, "Camisa clásica de manga larga."],
      ["Zapatos deportivos", "Moda", "Calzado", 49.9, 6, "Cómodos y livianos para todo el día."],
      ["Lentes de sol", "Moda", "Accesorios", 18, 2, "Protección UV400."],
      ["Smartphone X12", "Electrónica", "Teléfonos", 299, 5, "128 GB, cámara triple, batería de larga duración."],
      ["Audífonos Bluetooth", "Electrónica", "Audio", 45, 20, "Cancelación de ruido y 30 h de batería."],
      ["Cargador rápido 20W", "Electrónica", "Accesorios", 12.5, 30, "USB-C, compatible con la mayoría de teléfonos."],
    ];
    const rows = products.map(([name, cat, sub, price, stock, description], i) => ({
      store_id: store.id,
      name,
      description,
      price,
      stock,
      category_id: ids[cat],
      subcategory_id: ids[`${cat}/${sub}`],
      image_url: img(`ex-prod-${i}`),
    }));
    const inserted = check(await db.from("products").insert(rows).select(), "products");

    console.log("→ Pedidos y pagos de ejemplo");
    const methods = ["zelle", "pago_movil", "paypal", "binance", "transferencia"];
    const plan = [
      // [díasAtrás, estadoPedido, estadoPago, esCliente, [índices de producto]]
      [0, "pendiente", "pendiente", true, [1, 4]],
      [0, "pendiente", "pendiente", false, [6]],
      [1, "pagado", "aprobado", true, [0]],
      [2, "enviado", "aprobado", false, [5]],
      [3, "entregado", "aprobado", false, [2, 7]],
      [5, "cancelado", "rechazado", false, [3]],
      [8, "entregado", "aprobado", true, [6, 7]],
      [12, "entregado", "aprobado", false, [0, 1]],
      [18, "entregado", "aprobado", false, [3]],
      [26, "entregado", "aprobado", false, [4, 2]],
      [45, "entregado", "aprobado", true, [5]],
    ];
    for (const [i, [d, status, payStatus, isClient, items]] of plan.entries()) {
      const lines = items.map((idx) => ({ p: inserted[idx], qty: 1 + (i % 2) }));
      const total = lines.reduce((a, l) => a + Number(l.p.price) * l.qty, 0);
      const order = check(
        await db
          .from("orders")
          .insert({
            store_id: store.id,
            customer_id: isClient ? clientId : null,
            customer_name: isClient ? "María Pérez" : ["Carlos Gómez", "Ana Rodríguez", "Luis Martínez"][i % 3],
            customer_cedula: isClient ? "V-20123456" : `V-1${i}234567`,
            customer_phone: isClient ? "0414-5551234" : `0412-55500${i}`,
            customer_email: isClient ? USERS.cliente.email : null,
            shipping_address: i % 3 === 0 ? null : "Caracas, Chacao, Av. Francisco de Miranda, Edif. Centro, piso 4",
            delivery_type: i % 3 === 0 ? "retiro" : "envio",
            scheduled_for: i % 3 === 0 ? null : daysAgo(d - 1, 15),
            notes: i === 0 ? "Por favor llamar antes de llegar" : null,
            subtotal: total,
            total,
            commission: Math.round(total * 0.01 * 100) / 100,
            status,
            created_at: daysAgo(d, 9 + i),
          })
          .select()
          .single(),
        "order",
      );
      check(
        await db.from("order_items").insert(
          lines.map((l) => ({
            order_id: order.id,
            product_id: l.p.id,
            product_name: l.p.name,
            category_id: l.p.category_id,
            subcategory_id: l.p.subcategory_id,
            quantity: l.qty,
            unit_price: l.p.price,
          })),
        ),
        "items",
      );
      check(
        await db.from("payments").insert({
          order_id: order.id,
          store_id: store.id,
          method: methods[i % methods.length],
          reference: String(10000000 + i * 7919),
          amount: total,
          status: payStatus,
          reviewed_at: payStatus === "pendiente" ? null : daysAgo(d, 18),
          created_at: daysAgo(d, 9 + i),
        }),
        "payment",
      );
    }

    console.log("→ Conversación de ejemplo");
    const conv = check(
      await db.from("conversations").insert({ store_id: store.id, customer_id: clientId, customer_name: "María Pérez" }).select().single(),
      "conversation",
    );
    check(
      await db.from("messages").insert([
        { conversation_id: conv.id, sender_id: clientId, body: "¡Hola! ¿El vestido floral viene en talla M?", created_at: daysAgo(1, 10), read_at: daysAgo(1, 11) },
        { conversation_id: conv.id, sender_id: ownerId, body: "¡Hola María! Sí, tenemos S, M y L disponibles.", created_at: daysAgo(1, 11) },
        { conversation_id: conv.id, sender_id: clientId, body: "Perfecto, acabo de hacer el pedido y pagué por Zelle 🙌", created_at: daysAgo(0, 9) },
      ]),
      "messages",
    );
  }

  console.log("\n✅ Listo. Credenciales de prueba:");
  console.table(Object.entries(USERS).map(([rol, u]) => ({ rol, email: u.email, password: u.password })));
  console.log("Tienda: /empresax · Panel: /panel · Superadmin: /superadmin");
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
