export type BankCredentials = {
  username: string;
  password: string;
  /** Respuestas a preguntas de seguridad u otros datos que pida el portal */
  extra?: Record<string, string>;
};

export type ScrapedMovement = {
  /** YYYY-MM-DD */
  date: string;
  reference: string;
  amount: number;
  type: "credito" | "debito";
  description?: string;
  origin_bank?: string;
  origin_id?: string;
};

/** Un archivo por banco con esta interfaz (planValidacionAutomatica.md §3.5) */
export interface BankScraper {
  fetchMovements(credentials: BankCredentials, since: Date): Promise<ScrapedMovement[]>;
}

/** Usuario o clave rechazados: tras 2 seguidos se pausa la cuenta para que el banco no la bloquee */
export class LoginError extends Error {}
/** El scraper de ese banco aún no está mapeado */
export class NotConfiguredError extends Error {}
