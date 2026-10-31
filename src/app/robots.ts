import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/utils";

/** Google puede leer la landing y las tiendas públicas; los paneles y las pantallas de cuenta no se indexan */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/panel", "/superadmin", "/onboarding", "/login", "/cupon", "/icons/", "/*/checkout", "/*/compras", "/*/mensajes", "/*/login"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
