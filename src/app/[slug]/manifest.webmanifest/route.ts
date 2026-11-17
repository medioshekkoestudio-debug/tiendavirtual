import { createHash } from "node:crypto";
import { getStoreBySlug } from "@/lib/storefront";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) return new Response("Not found", { status: 404 });
  // Icono = logo de la tienda (ver app-icon/[size]). ?v cambia cuando cambia el logo o el color, para no quedar con el viejo
  const v = createHash("sha1").update(`${store.logo_url ?? ""}|${store.primary_color}|${store.name}`).digest("hex").slice(0, 10);
  const icon = (size: number, maskable = false) => `/${store.slug}/app-icon/${size}?v=${v}${maskable ? "&maskable=1" : ""}`;
  return Response.json(
    {
      name: store.name,
      short_name: store.name.slice(0, 12),
      description: store.description?.slice(0, 200),
      start_url: `/${store.slug}`,
      scope: `/${store.slug}`,
      display: "standalone",
      background_color: "#f8fafc",
      theme_color: store.primary_color,
      icons: [
        { src: icon(192), sizes: "192x192", type: "image/png" },
        { src: icon(512), sizes: "512x512", type: "image/png" },
        { src: icon(512, true), sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
