// Verificación de punta a punta contra producción.
// Uso: node --env-file=.env.local scripts/verify-prod.mjs https://tu-app.vercel.app
// Crea un pedido de prueba como invitado, lo rechaza como tienda (devuelve stock) y lo borra al final.
import { createClient } from "@supabase/supabase-js";

const BASE = (process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE || !URL_ || !ANON || !SERVICE) throw new Error("Faltan BASE o variables de Supabase");
const REF = new URL(URL_).hostname.split(".")[0];

const USERS = {
  superadmin: ["superadmin@shopux.app", "Shopux#Admin2026"],
  tienda: ["tienda@empresax.com", "Empresax#2026"],
  cliente: ["cliente@shopux.app", "Cliente#2026"],
};

let failures = 0;
const ok = (cond, label, extra = "") => {
  console.log(`${cond ? "✅" : "❌"} ${label}${extra ? " — " + extra : ""}`);
  if (!cond) failures++;
};
const client = () => createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });

/** Cookie de sesión en el formato de @supabase/ssr (base64url + chunks). */
function sessionCookie(session) {
  const name = `sb-${REF}-auth-token`;
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  if (value.length <= 3180) return `${name}=${value}`;
  const parts = [];
  for (let i = 0; i * 3180 < value.length; i++) parts.push(`${name}.${i}=${value.slice(i * 3180, (i + 1) * 3180)}`);
  return parts.join("; ");
}

async function page(path, cookie) {
  const res = await fetch(BASE + path, { redirect: "manual", headers: cookie ? { cookie } : {} });
  return { status: res.status, location: res.headers.get("location"), html: res.status === 200 ? await res.text() : "" };
}

async function login(role) {
  const c = client();
  const { data, error } = await c.auth.signInWithPassword({ email: USERS[role][0], password: USERS[role][1] });
  ok(!error, `Login ${role}`, error?.message);
  return { c, session: data?.session, user: data?.user };
}

async function main() {
  console.log(`\n== Producción: ${BASE}\n`);

  // 1. Base de datos
  const anon = client();
  const landing = await anon.from("landing_content").select("id").eq("id", 1);
  ok(!landing.error && landing.data?.length === 1, "Tablas creadas (landing_content)", landing.error?.message);
  const store = (await anon.from("stores").select("*").eq("slug", "empresax").maybeSingle()).data;
  ok(!!store?.onboarding_completed, "Tienda empresax publicada");
  const anonOrders = await anon.from("orders").select("id");
  ok((anonOrders.data ?? []).length === 0, "RLS: un visitante anónimo no ve pedidos");

  // 2. Usuarios y roles
  const su = await login("superadmin");
  const ow = await login("tienda");
  const cu = await login("cliente");
  for (const [label, s, role] of [["superadmin", su, "superadmin"], ["tienda", ow, "store_owner"], ["cliente", cu, "customer"]]) {
    const p = await s.c.from("profiles").select("role").eq("id", s.user?.id).single();
    ok(p.data?.role === role, `Rol de ${label} = ${role}`, p.data?.role);
  }
  const custOrders = await cu.c.from("orders").select("customer_id");
  ok((custOrders.data ?? []).every((o) => o.customer_id === cu.user.id) && custOrders.data?.length > 0, "RLS: el cliente solo ve sus pedidos", `${custOrders.data?.length} pedidos`);
  const stats = await su.c.rpc("superadmin_store_stats");
  ok(!stats.error && stats.data?.length >= 1, "RPC estadísticas del superadmin", stats.error?.message);
  const statsDenied = await cu.c.rpc("superadmin_store_stats");
  ok(!!statsDenied.error, "Un cliente NO puede ver estadísticas del superadmin");

  // 3. Checkout como invitado + rechazo del pago (devuelve stock)
  const prod = (await anon.from("products").select("id,stock,name").eq("store_id", store.id).gt("stock", 0).limit(1).single()).data;
  const order = await anon.rpc("place_order", {
    p_store: store.id,
    p_items: [{ product_id: prod.id, quantity: 1 }],
    p_customer: { name: "PRUEBA AUTOMÁTICA", cedula: "V-0", phone: "0000", email: "", notes: "verify-prod" },
    p_delivery: { type: "retiro", address: "", scheduled_for: null },
    p_payment: { method: "zelle", reference: "TEST-123" },
  });
  const created = Array.isArray(order.data) ? order.data[0] : order.data;
  ok(!order.error && created?.order_id, "Checkout de invitado (place_order)", order.error?.message || `pedido #${created?.order_number}`);
  if (created?.order_id) {
    const stockAfter = (await admin.from("products").select("stock").eq("id", prod.id).single()).data.stock;
    ok(stockAfter === prod.stock - 1, "El stock se descuenta al comprar", `${prod.stock} → ${stockAfter}`);
    const pay = (await ow.c.from("payments").select("id,status").eq("order_id", created.order_id).single()).data;
    ok(pay?.status === "pendiente", "La tienda ve el pago pendiente");
    const deny = await cu.c.rpc("review_payment", { p_payment: pay.id, p_approve: true });
    ok(!!deny.error, "Un cliente NO puede aprobar pagos");
    const rev = await ow.c.rpc("review_payment", { p_payment: pay.id, p_approve: false });
    ok(!rev.error, "La tienda rechaza el pago", rev.error?.message);
    const stockBack = (await admin.from("products").select("stock").eq("id", prod.id).single()).data.stock;
    ok(stockBack === prod.stock, "Al rechazar, el stock se devuelve", `${stockBack}`);
    await admin.from("orders").delete().eq("id", created.order_id);
  }

  // 4. Chat
  const conv = await cu.c.rpc("get_or_create_conversation", { p_store: store.id });
  ok(!conv.error && !!conv.data, "El cliente abre conversación con la tienda", conv.error?.message);

  // 5. Páginas (servidor Next.js en Vercel)
  const pages = [
    ["/", null, 200, "Linki App"],
    ["/empresax", null, 200, "Empresa X"],
    ["/empresax/checkout", null, 200, "Carrito"],
    ["/empresax/manifest.webmanifest", null, 200, "empresax"],
    ["/panel", null, 307, null],
    ["/panel", sessionCookie(ow.session), 200, "Resumen del negocio"],
    ["/panel/tienda", sessionCookie(ow.session), 200, "Vista administrador"],
    ["/panel/pagos", sessionCookie(ow.session), 200, "Compras completadas"],
    ["/panel/pedidos", sessionCookie(ow.session), 200, "Por categoría"],
    ["/panel/mensajes", sessionCookie(ow.session), 200, "Mensajes"],
    ["/panel/ajustes", sessionCookie(ow.session), 200, "Link de tu tienda"],
    ["/superadmin", sessionCookie(su.session), 200, "Tiendas creadas"],
    ["/superadmin/landing", sessionCookie(su.session), 200, "Contenido de la landing"],
    ["/superadmin", sessionCookie(cu.session), 307, null],
    ["/empresax/compras", sessionCookie(cu.session), 200, "Pedido #"],
    ["/empresax/mensajes", sessionCookie(cu.session), 200, "Escríbele"],
  ];
  for (const [path, cookie, status, text] of pages) {
    const r = await page(path, cookie);
    const good = r.status === status && (!text || r.html.includes(text));
    ok(good, `GET ${path}${cookie ? " (con sesión)" : ""} → ${status}`, good ? (r.location ?? "") : `recibido ${r.status} ${r.location ?? ""}`);
  }

  console.log(`\n${failures === 0 ? "🎉 Todo OK" : `⚠️  ${failures} comprobaciones fallaron`}\n`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
