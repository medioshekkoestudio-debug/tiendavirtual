"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Gift } from "lucide-react";
import { PLAN_KEYS, PLANS, TRIAL_DAYS } from "@/lib/constants";
import type { PlanCycle } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Sección de planes de la landing. Cada plan lleva a /suscripcion (pide iniciar sesión o crear la tienda si hace falta). */
export function PlansSection() {
  const [cycle, setCycle] = useState<PlanCycle>("mensual");

  return (
    <section id="planes" className="bg-slate-50 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-3xl font-bold">Planes a la medida de tu negocio</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
          Un esquema flexible por suscripción, sin grandes inversiones para empezar. Ganamos cuando tú ganas.
        </p>

        <Link
          href="/registro"
          className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full bg-accent/20 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-accent/30"
        >
          <Gift className="size-4" /> Crea tu tienda con {TRIAL_DAYS} días de prueba gratis (con las funciones del Plan Emprendedor)
        </Link>

        <div className="mx-auto mt-8 flex w-fit rounded-xl bg-slate-200/70 p-1" role="group" aria-label="Forma de pago">
          {(
            [
              ["mensual", "Mensual"],
              ["anual", "Anual · ahorra 2 meses"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={cycle === k}
              onClick={() => setCycle(k)}
              className={cn("rounded-lg px-4 py-2 text-sm font-semibold transition", cycle === k ? "bg-white text-slate-900 shadow" : "text-slate-500")}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {PLAN_KEYS.map((k) => {
            const p = PLANS[k];
            const price = cycle === "anual" ? p.annual : p.monthly;
            return (
              <div key={k} className={cn("card relative flex flex-col p-6", p.recommended && "border-2 border-brand shadow-lg md:-translate-y-2")}>
                {p.recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">
                    Recomendado
                  </span>
                )}
                <h3 className="text-xl font-bold">Plan {p.label}</h3>
                <p className="mt-3">
                  <span className="text-4xl font-extrabold">${price}</span>
                  <span className="text-slate-500"> / {cycle === "anual" ? "año" : "mes"}</span>
                </p>
                <ul className="mt-4 space-y-1 text-sm font-semibold">
                  <li>{p.products}</li>
                  <li>Comisión: {p.commission}</li>
                </ul>
                <div className="mt-4 flex-1 border-t border-slate-100 pt-4 text-sm">
                  {p.intro && <p className="mb-2 font-medium text-slate-600">{p.intro}</p>}
                  <ul className="space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-brand" /> <span className="text-slate-600">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href={`/suscripcion?plan=${k}&ciclo=${cycle}`}
                  className={cn("mt-6 w-full", p.recommended ? "btn-primary" : "btn-outline")}
                >
                  Elegir Plan {p.label}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
