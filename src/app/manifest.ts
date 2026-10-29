import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Linki App — Marketplace de tiendas",
    short_name: "Linki App",
    description: "Crea y administra tu tienda online como una app.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#009688",
    icons: [
      { src: "/brand/linkiapp-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/linkiapp-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/linkiapp-icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
