import { ImageResponse } from "next/og";

/**
 * Iconos PWA generados para tiendas y panel: /icons/192?l=E&c=%23009688 (inicial sobre el color de la tienda).
 * El icono de Linki App es estático: public/brand/linkiapp-icon-*.png (símbolo del logo).
 */
export async function GET(request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = Math.min(Math.max(parseInt(raw, 10) || 192, 32), 1024);
  const { searchParams } = new URL(request.url);
  const letter = (searchParams.get("l") || "L").slice(0, 2).toUpperCase();
  const colorParam = searchParams.get("c") || "#009688";
  const color = /^#[0-9a-fA-F]{6}$/.test(colorParam) ? colorParam : "#009688";
  const maskable = searchParams.get("maskable") === "1";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: color,
          borderRadius: maskable ? 0 : size * 0.22,
          color: "white",
          fontSize: size * (maskable ? 0.42 : 0.55),
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        {letter}
      </div>
    ),
    { width: size, height: size },
  );
}
