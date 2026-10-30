// Reloj propio del banco: entra a cada cuenta cada N minutos (o antes si hay pagos esperando),
// respetando el enfriamiento, y guarda los movimientos sin duplicar. Así no hace falta el «latido»
// de La Mejor Llave.

import { decrypt } from "../crypto.js";
import { db } from "../db.js";
import { env } from "../env.js";
import { bancamiga } from "./bancamiga.js";
import type { BankCredentials, BankScraper, ScrapedMovement } from "./types.js";
import { LoginError, NotConfiguredError } from "./types.js";

const SCRAPERS: Record<string, BankScraper> = { bancamiga };
const LOOKBACK_DAYS = 3;
const running = new Set<string>();

export type BankAccount = {
  id: string;
  label: string;
  bank: string;
  credentials: string | null;
  active: boolean;
  login_failures: number;
  last_scraped_at: string | null;
};

/** Guarda movimientos; la clave única (cuenta, referencia, fecha, monto) evita duplicados */
export async function saveMovements(accountId: string, movements: ScrapedMovement[]) {
  if (!movements.length) return 0;
  const rows = movements.map((m) => ({
    account_id: accountId,
    date: m.date,
    reference: m.reference.trim().slice(0, 60),
    amount: Math.round(m.amount * 100) / 100,
    type: m.type,
    description: m.description?.slice(0, 200) ?? null,
    origin_bank: m.origin_bank?.slice(0, 80) ?? null,
    origin_id: m.origin_id?.slice(0, 20) ?? null,
  }));
  const { data, error } = await db
    .from("bank_movements")
    .upsert(rows, { onConflict: "account_id,reference,date,amount", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export function minutesSince(iso: string | null) {
  return iso ? (Date.now() - new Date(iso).getTime()) / 60_000 : Infinity;
}

/** Entra al banco ya. Devuelve el resultado o por qué no entró */
export async function scrapeAccount(account: BankAccount, opts: { force?: boolean } = {}) {
  if (running.has(account.id)) return { result: "en_curso" as const };
  const since = minutesSince(account.last_scraped_at);
  if (since < env.scrapeCooldownMin) {
    return { result: "cooldown" as const, retry_in_s: Math.ceil((env.scrapeCooldownMin - since) * 60) };
  }
  if (!account.active && !opts.force) return { result: "pausada" as const };
  const scraper = SCRAPERS[account.bank];
  if (!scraper || !account.credentials) return { result: "not_configured" as const };

  running.add(account.id);
  const started = Date.now();
  let result: "ok" | "login_failed" | "not_configured" | "error" = "ok";
  let newMovements = 0;
  let error: string | null = null;
  try {
    const creds = decrypt<BankCredentials>(account.credentials);
    const movements = await scraper.fetchMovements(creds, new Date(Date.now() - LOOKBACK_DAYS * 86_400_000));
    newMovements = await saveMovements(account.id, movements);
  } catch (e) {
    error = (e as Error).message.slice(0, 500);
    result = e instanceof LoginError ? "login_failed" : e instanceof NotConfiguredError ? "not_configured" : "error";
  } finally {
    running.delete(account.id);
  }

  const failures = result === "login_failed" ? account.login_failures + 1 : result === "ok" ? 0 : account.login_failures;
  await db
    .from("bank_accounts")
    .update({
      last_scraped_at: new Date().toISOString(),
      last_error: error,
      login_failures: failures,
      ...(failures >= 2 ? { active: false, paused_reason: "2 entradas fallidas seguidas: revisa usuario y clave" } : {}),
    })
    .eq("id", account.id);
  await db.from("bank_scrape_runs").insert({
    account_id: account.id,
    duration_ms: Date.now() - started,
    result,
    new_movements: newMovements,
    error,
  });
  if (error) console.error(`[banco ${account.label}] ${result}: ${error}`);
  return { result, new_movements: newMovements, error };
}

/** Una vuelta del reloj: entra a las cuentas que toca */
export async function scrapeDueAccounts(hasPending: boolean) {
  const { data } = await db.from("bank_accounts").select("*").eq("active", true);
  const every = hasPending ? env.scrapeCooldownMin : env.scrapeEveryMin;
  for (const account of (data ?? []) as BankAccount[]) {
    if (minutesSince(account.last_scraped_at) >= every) await scrapeAccount(account);
  }
}
