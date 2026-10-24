import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import { RegisterSW } from "@/components/register-sw";

export const metadata: Metadata = {
  title: { default: "Shopux — Crea tu tienda online", template: "%s · Shopux" },
  description: "Marketplace de tiendas: crea tu tienda PWA con tu marca, pagos locales, pedidos y chat.",
  applicationName: "Shopux",
  appleWebApp: { capable: true, title: "Shopux", statusBarStyle: "default" },
  icons: { icon: "/icons/192", apple: "/icons/180" },
};

export const viewport: Viewport = {
  themeColor: "#78b913",
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
