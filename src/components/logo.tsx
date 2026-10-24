import { cn } from "@/lib/utils";

/** Logo oficial de Shopux.app. mix-blend-multiply oculta el fondo blanco del JPEG sobre fondos claros. */
export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/shopux-logo.jpg" alt="Shopux.app" width={992} height={305} className={cn("h-9 w-auto mix-blend-multiply", className)} />
  );
}
