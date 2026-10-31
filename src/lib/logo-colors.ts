/** Saca una paleta (principal, secundario, acento) de los colores de un logo, en el navegador. */

type Rgb = [number, number, number];
export type LogoPalette = { primary: string; secondary: string; accent: string };

const hex = ([r, g, b]: Rgb) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

function toHsl([r, g, b]: Rgb): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): Rgb {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

const hueGap = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // el bucket público responde con CORS abierto; sin esto el canvas no se puede leer
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function paletteFromLogo(url: string): Promise<LogoPalette | null> {
  const img = await loadImage(url);
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  // Agrupa los píxeles visibles en cubetas de color; el fondo blanco/negro y los grises van aparte
  const buckets = new Map<string, { sum: Rgb; n: number }>();
  const neutrals: Rgb[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 128) continue;
    const rgb: Rgb = [data[i]!, data[i + 1]!, data[i + 2]!];
    const [, s, l] = toHsl(rgb);
    if (s < 0.2 || l < 0.08 || l > 0.94) {
      if (l > 0.08 && l < 0.6) neutrals.push(rgb); // grises oscuros o negros suaves sirven de secundario
      continue;
    }
    const key = rgb.map((v) => v >> 5).join(",");
    const b = buckets.get(key) ?? { sum: [0, 0, 0], n: 0 };
    b.sum = [b.sum[0] + rgb[0], b.sum[1] + rgb[1], b.sum[2] + rgb[2]];
    b.n++;
    buckets.set(key, b);
  }

  const colors = [...buckets.values()]
    .filter((b) => b.n >= 4)
    .map((b) => {
      const rgb: Rgb = [b.sum[0] / b.n, b.sum[1] / b.n, b.sum[2] / b.n];
      return { rgb, hsl: toHsl(rgb), n: b.n };
    })
    .sort((a, b) => b.n * (0.5 + b.hsl[1]) - a.n * (0.5 + a.hsl[1]));

  const main = colors[0];
  if (!main) {
    // Logo sin colores (negro o gris): paleta sobria con su tono más oscuro
    if (!neutrals.length) return null;
    const dark = neutrals.reduce((a, b) => (toHsl(b)[2] < toHsl(a)[2] ? b : a));
    return { primary: hex(dark), secondary: hex(fromHsl(0, 0, 0.12)), accent: "#9e9e9e" };
  }

  // El principal no puede ser tan claro que el texto blanco encima no se lea
  const [h, s, l] = main.hsl;
  const primary = fromHsl(h, s, Math.min(l, 0.5));
  const other = colors.find((c) => hueGap(c.hsl[0], h) > 40);
  // Secundario: un tono oscuro del mismo color, siempre visiblemente más oscuro que el principal
  const pl = Math.min(l, 0.5);
  const darkInLogo = colors.find((c) => c !== main && c.hsl[2] < pl - 0.12 && hueGap(c.hsl[0], h) < 40);
  const secondary = darkInLogo ? darkInLogo.rgb : fromHsl(h, Math.min(s, 0.7), Math.max(0.1, Math.min(0.18, pl * 0.55)));
  const accent = other ? other.rgb : fromHsl((h + 150) % 360, Math.max(s, 0.6), 0.55);
  return { primary: hex(primary), secondary: hex(secondary), accent: hex(accent) };
}
