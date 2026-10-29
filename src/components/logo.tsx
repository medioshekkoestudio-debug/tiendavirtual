import { cn } from "@/lib/utils";

/**
 * Logo oficial de Linki App.
 * - horizontal (por defecto): barras de navegación y footer. JPEG con fondo blanco: mix-blend-multiply lo oculta sobre fondos claros.
 * - vertical: pantallas centradas (login, registro, 404). PNG transparente.
 */
export function Logo({ className, variant = "horizontal" }: { className?: string; variant?: "horizontal" | "vertical" }) {
  if (variant === "vertical") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/brand/linkiapp-logo-vertical.png" alt="Linki App" width={267} height={285} className={cn("h-24 w-auto", className)} />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/linkiapp-logo-horizontal.jpg" alt="Linki App" width={409} height={86} className={cn("h-9 w-auto mix-blend-multiply", className)} />
  );
}
