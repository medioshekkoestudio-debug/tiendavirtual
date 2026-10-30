// Configuración del servicio. Todas las claves viven solo en las variables de Railway.

function required(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name}`);
  return v;
}

const num = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const env = {
  port: num("PORT", 8080),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  /** Token Bearer que usa Linki App para llamar al servicio */
  apiToken: required("API_TOKEN"),
  /** Sin clave el OCR responde 503 y la conciliación usa solo la referencia escrita */
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  ocrModel: process.env.OCR_MODEL || "claude-opus-5-5",
  /** 32 bytes en base64 (npm run clave). Cifra las credenciales del banco */
  credentialsKey: process.env.BANK_CREDENTIALS_KEY ?? "",
  /** false = modo sombra: anota lo que habría aprobado pero no aprueba nada */
  autoApprove: process.env.AUTO_APPROVE === "true",
  /** Apaga el reloj interno (útil en local: se llama a POST /conciliar a mano) */
  scheduler: process.env.SCHEDULER !== "off",
  scrapeEveryMin: num("SCRAPE_EVERY_MIN", 10),
  /** Enfriamiento mínimo entre entradas al banco por cuenta */
  scrapeCooldownMin: num("SCRAPE_COOLDOWN_MIN", 3),
  ocrMaxPerPass: num("OCR_MAX_PER_PASS", 5),
};
