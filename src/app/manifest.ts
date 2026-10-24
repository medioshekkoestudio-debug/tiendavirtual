import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shopux — Marketplace de tiendas",
    short_name: "Shopux",
    description: "Crea y administra tu tienda online como una app.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5f7",
    theme_color: "#78b913",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
