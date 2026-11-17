import { ImageResponse } from "next/og";
import { getStoreBySlug } from "@/lib/storefront";

/**
 * Icono de la app de una tienda: su logo centrado sobre fondo blanco, al tamaño exacto (192, 512, 180 para iPhone).
 * Con ?maskable=1 deja más margen, porque Android recorta el icono en círculo o en gota.
 * Si la tienda no tiene logo (o el logo no se puede leer) se usa la inicial sobre el color de la tienda.
 */
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const FORMATOS = ["image/png", "image/jpeg", "image/gif"]; // los que sabe dibujar el generador de imágenes

/** Solo se leen logos de nuestro propio almacenamiento (nunca una URL cualquiera) */
async function logoDataUrl(url: string | null): Promise<string | null> {
  const storage = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !storage || !url.startsWith(`${storage}/storage/v1/object/public/`)) return null;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!res.ok || !FORMATOS.includes(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_LOGO_BYTES) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; size: string }> }) {
  const { slug, size: raw } = await params;
  const size = Math.min(Math.max(parseInt(raw, 10) || 192, 32), 1024);
  const maskable = new URL(request.url).searchParams.get("maskable") === "1";
  const store = await getStoreBySlug(slug);
  if (!store) return new Response("Not found", { status: 404 });

  const logo = await logoDataUrl(store.logo_url);
  const color = /^#[0-9a-fA-F]{6}$/.test(store.primary_color) ? store.primary_color : "#009688";
  // Zona segura de un icono maskable: el 80 % del centro. Se deja un poco más para que el logo respire.
  const pad = Math.round(size * (maskable ? 0.18 : 0.08));

  const image = new ImageResponse(
    logo ? (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", padding: pad }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
    ) : (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: color,
          color: "white",
          fontSize: size * (maskable ? 0.42 : 0.55),
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        {(store.name.trim()[0] ?? "T").toUpperCase()}
      </div>
    ),
    { width: size, height: size },
  );
  // El manifiesto pide el icono con ?v=… del logo actual: si cambia el logo, cambia la URL y no queda el viejo guardado
  image.headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
  return image;
}
