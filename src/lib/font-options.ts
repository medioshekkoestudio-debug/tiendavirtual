export type FontOption = { key: string; label: string; kind: "sans" | "serif"; cssVar: string; mood: string };

export const FONT_OPTIONS: FontOption[] = [
  { key: "inter", label: "Inter", kind: "sans", cssVar: "--font-inter", mood: "Moderna y neutra" },
  { key: "poppins", label: "Poppins", kind: "sans", cssVar: "--font-poppins", mood: "Amigable y redondeada" },
  { key: "montserrat", label: "Montserrat", kind: "sans", cssVar: "--font-montserrat", mood: "Urbana y con carácter" },
  { key: "playfair", label: "Playfair Display", kind: "serif", cssVar: "--font-playfair", mood: "Elegante, lujo y moda" },
  { key: "merriweather", label: "Merriweather", kind: "serif", cssVar: "--font-merriweather", mood: "Clásica y confiable" },
  { key: "lora", label: "Lora", kind: "serif", cssVar: "--font-lora", mood: "Cálida y artesanal" },
];

export function fontFamily(key: string | null | undefined) {
  const opt = FONT_OPTIONS.find((f) => f.key === key) ?? FONT_OPTIONS[0]!;
  const fallback = opt.kind === "serif" ? "ui-serif, Georgia, serif" : "ui-sans-serif, system-ui, sans-serif";
  return `var(${opt.cssVar}), ${fallback}`;
}
