import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import { RegisterSW } from "@/components/register-sw";

const DESCRIPTION =
  "Crea tu tienda online en minutos con Linki App: tu propia app con tu marca, catálogo, pedidos y chat. Cobra por Pago móvil, Zelle, PayPal, Binance y transferencias. Sin programar.";

export const metadata: Metadata = {
  title: { default: "Linki App — Crea tu tienda online y tu app en minutos", template: "%s · Linki App" },
  description: DESCRIPTION,
  applicationName: "Linki App",
  keywords: ["tienda online", "crear tienda online", "tienda virtual", "catálogo digital", "app para mi negocio", "Pago móvil", "Venezuela", "PWA", "Linki App"],
  appleWebApp: { capable: true, title: "Linki App", statusBarStyle: "default" },
  // Google toma el icono del sitio de aquí (múltiplos de 48 px); /favicon.ico lo sirve src/app/favicon.ico
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48 192x192" },
      { url: "/brand/linkiapp-icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/brand/linkiapp-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/linkiapp-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/brand/linkiapp-icon-180.png",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://linkiapp.com"),
  // Verificación de Google Search Console (método «etiqueta HTML»): el código va en la variable de Vercel
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  // Vista previa al compartir el link (WhatsApp, Facebook, X): el logo sobre fondo blanco
  openGraph: {
    type: "website",
    locale: "es_VE",
    siteName: "Linki App",
    title: "Linki App — Crea tu tienda online y tu app en minutos",
    description: DESCRIPTION,
    images: [{ url: "/brand/linkiapp-og.png", width: 1200, height: 630, alt: "Linki App" }],
  },
  twitter: { card: "summary_large_image", title: "Linki App — Crea tu tienda online y tu app en minutos", description: DESCRIPTION, images: ["/brand/linkiapp-og.png"] },
};

export const viewport: Viewport = {
  themeColor: "#009688",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={fontVariables}>
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
