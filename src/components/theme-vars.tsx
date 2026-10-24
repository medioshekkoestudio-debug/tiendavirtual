import type { CSSProperties } from "react";
import { fontFamily } from "@/lib/font-options";
import { contrastText } from "@/lib/utils";

type Themeable = { primary_color: string; secondary_color: string; accent_color: string; font_key: string };

/** Variables CSS con los colores y tipografía de una tienda. */
export function themeStyle(s: Themeable): CSSProperties {
  return {
    "--brand": s.primary_color,
    "--brand-2": s.secondary_color,
    "--accent": s.accent_color,
    "--on-brand": contrastText(s.primary_color),
    "--brand-font": fontFamily(s.font_key),
  } as CSSProperties;
}
