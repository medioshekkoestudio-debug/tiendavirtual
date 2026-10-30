import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import { RegisterSW } from "@/components/register-sw";

export const metadata: Metadata = {
  title: { default: "Linki App — Crea tu tienda online", template: "%s · Linki App" },
  description: "Marketplace de tiendas: crea tu tienda PWA con tu marca, pagos locales, pedidos y chat.",
  applicationName: "Linki App",
  appleWebApp: { capable: true, title: "Linki App", statusBarStyle: "default" },
  icons: { icon: "/brand/linkiapp-icon-48.png", apple: "/brand/linkiapp-icon-180.png" },
  // Vista previa al compartir el link (WhatsApp, Facebook): el logo sobre fondo blanco
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://linkiapp.com"),
  openGraph: { siteName: "Linki App", images: [{ url: "/brand/linkiapp-og.png", width: 1200, height: 630, alt: "Linki App" }] },
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
