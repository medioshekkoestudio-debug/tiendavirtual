export function GET() {
  return Response.json(
    {
      name: "Linki App — Panel de mi tienda",
      short_name: "Mi tienda",
      start_url: "/panel",
      scope: "/panel",
      display: "standalone",
      background_color: "#f8fafc",
      theme_color: "#ffffff",
      icons: [
        { src: "/icons/192?l=P", sizes: "192x192", type: "image/png" },
        { src: "/icons/512?l=P", sizes: "512x512", type: "image/png" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
