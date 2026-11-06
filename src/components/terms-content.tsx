import { TERMS, TERMS_INTRO, TERMS_UPDATED } from "@/lib/terms";

/** Texto de los Términos y Condiciones (página pública y ventana del registro) */
export function TermsContent() {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-slate-700">
      <div className="space-y-1 text-slate-500">
        <p>Última actualización: {TERMS_UPDATED}</p>
        <p>{TERMS_INTRO}</p>
      </div>
      {TERMS.map((s) => (
        <section key={s.title} className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">{s.title}</h2>
          {s.blocks.map((b, i) =>
            "list" in b ? (
              <ul key={i} className="list-disc space-y-1 pl-5">
                {b.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p key={i}>
                {b.label && <strong className="font-semibold text-slate-900">{b.label}</strong>} {b.p}
              </p>
            ),
          )}
        </section>
      ))}
    </div>
  );
}
