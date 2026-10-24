import { ImageResponse } from "next/og";

/**
 * Iconos PWA generados.
 * - Tiendas: /icons/192?l=E&c=%2378b913 (inicial sobre el color de la tienda)
 * - Shopux (sin "l"): fondo gris oscuro con el triángulo verde del logo
 */
export async function GET(request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = Math.min(Math.max(parseInt(raw, 10) || 192, 32), 1024);
  const { searchParams } = new URL(request.url);
  const letterParam = searchParams.get("l");
  const colorParam = searchParams.get("c") || "#78b913";
  const color = /^#[0-9a-fA-F]{6}$/.test(colorParam) ? colorParam : "#78b913";
  const maskable = searchParams.get("maskable") === "1";
  const mark = size * (maskable ? 0.4 : 0.52);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: letterParam ? color : "#333333",
          borderRadius: maskable ? 0 : size * 0.22,
          color: "white",
          fontSize: size * (maskable ? 0.42 : 0.55),
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        {letterParam ? (
          letterParam.slice(0, 2).toUpperCase()
        ) : (
          <svg width={mark} height={mark} viewBox="0 0 100 100" style={{ marginLeft: mark * 0.12 }}>
            <path d="M18 8 L92 50 L18 92 Z" fill="#78b913" stroke="#78b913" strokeWidth="10" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    ),
    { width: size, height: size },
  );
}
