// Manifiesto de Linki App (landing, login, registro…).
// Va como ruta normal y NO como app/manifest.ts: ese archivo especial de Next pisa el `manifest` de todos los
// layouts, y entonces las tiendas (/[slug]) y el panel se instalaban como «Linki App» en vez de con su propio manifiesto.
export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      id: "/",
      name: "Linki App — Crea tu tienda online",
      short_name: "Linki App",
      description: "Crea y administra tu tienda online como una app: catálogo, pedidos, pagos locales y chat.",
      lang: "es",
      dir: "ltr",
      categories: ["business", "shopping", "productivity"],
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#009688",
      icons: [
        { src: "/brand/linkiapp-icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/brand/linkiapp-icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/brand/linkiapp-icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
