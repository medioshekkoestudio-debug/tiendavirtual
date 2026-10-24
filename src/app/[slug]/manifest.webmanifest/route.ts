import { getStoreBySlug } from "@/lib/storefront";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) return new Response("Not found", { status: 404 });
  const color = encodeURIComponent(store.primary_color);
  const letter = encodeURIComponent(store.name.trim()[0] ?? "S");
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
        { src: `/icons/192?l=${letter}&c=${color}`, sizes: "192x192", type: "image/png" },
        { src: `/icons/512?l=${letter}&c=${color}`, sizes: "512x512", type: "image/png" },
        { src: `/icons/512?l=${letter}&c=${color}&maskable=1`, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
