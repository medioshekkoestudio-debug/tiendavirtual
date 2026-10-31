"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { ImageUpload } from "@/components/image-upload";
import { GALLERY_SLOTS, TESTIMONIAL_SLOTS, type Highlight, type ResolvedSite, type SiteContent, type SiteTier } from "@/lib/site";
import { saveSiteContent } from "@/lib/store-actions";

type Form = Omit<ResolvedSite, "icons" | "value_icons" | "gallery"> & { gallery: (string | null)[] };

function toForm(s: ResolvedSite): Form {
  return {
    ...s,
    gallery: Array.from({ length: GALLERY_SLOTS }, (_, i) => s.gallery[i] ?? null),
    testimonials: Array.from({ length: TESTIMONIAL_SLOTS }, (_, i) => s.testimonials[i] ?? { name: "", text: "" }),
  };
}

/** Lo que es igual a lo sugerido no se guarda: así sigue al rubro y a la descripción si cambian */
function toContent(f: Form, s: ResolvedSite): SiteContent {
  const own = (v: string, base: string) => (v.trim() === base.trim() ? "" : v.trim());
  const list = (items: Highlight[], base: Highlight[]) => items.map((h, i) => ({ title: own(h.title, base[i]?.title ?? ""), text: own(h.text, base[i]?.text ?? "") }));
  return {
    hero_title: own(f.hero_title, s.hero_title),
    hero_subtitle: own(f.hero_subtitle, s.hero_subtitle),
    hero_image: f.hero_image,
    highlights: list(f.highlights, s.highlights),
    about_title: own(f.about_title, s.about_title),
    about_text: own(f.about_text, s.about_text),
    about_image: f.about_image,
    mission: own(f.mission, s.mission),
    vision: own(f.vision, s.vision),
    values: list(f.values, s.values),
    gallery: f.gallery.filter((u): u is string => !!u),
    testimonials: f.testimonials.filter((t) => t.name.trim() && t.text.trim()),
    whatsapp: f.whatsapp,
    instagram: f.instagram,
    address: f.address,
    hours: f.hours,
  };
}

function Field({ label, value, onChange, max, rows, placeholder }: { label: string; value: string; onChange: (v: string) => void; max: number; rows?: number; placeholder?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {rows ? (
        <textarea className="input" rows={rows} maxLength={max} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="input" maxLength={max} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-4 p-5">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {hint && <p className="text-sm text-slate-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function SiteEditor({
  tier,
  userId,
  initial,
  suggested,
  sliderImage,
}: {
  tier: SiteTier;
  userId: string;
  initial: ResolvedSite;
  suggested: ResolvedSite;
  sliderImage: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => toForm(initial));
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok?: boolean; error?: string } | null>(null);
  const business = tier === "business";

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setStatus(null);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const setItem = (k: "highlights" | "values", i: number, patch: Partial<Highlight>) =>
    set(k, form[k].map((h, j) => (j === i ? { ...h, ...patch } : h)));

  function save() {
    startTransition(async () => {
      const res = await saveSiteContent(toContent(form, suggested));
      setStatus(res.error ? { error: res.error } : { ok: true });
      if (!res.error) router.refresh();
    });
  }

  function restoreTexts() {
    setStatus(null);
    setForm((f) => ({ ...toForm(suggested), hero_image: f.hero_image, about_image: f.about_image, gallery: f.gallery, testimonials: f.testimonials, whatsapp: f.whatsapp, instagram: f.instagram, address: f.address, hours: f.hours }));
  }

  return (
    <div className="space-y-5">
      <Section title="Portada" hint="Lo primero que ven tus clientes al abrir tu página.">
        <Field label="Título" value={form.hero_title} max={80} onChange={(v) => set("hero_title", v)} />
        <Field label="Frase de presentación" value={form.hero_subtitle} max={220} rows={2} onChange={(v) => set("hero_subtitle", v)} />
        <ImageUpload
          label="Foto de portada"
          hint="Horizontal, de buena calidad."
          value={form.hero_image}
          onChange={(u) => set("hero_image", u)}
          userId={userId}
          folder="pagina"
          className="aspect-[16/7] w-full"
        />
        <p className="text-xs text-slate-500">
          {sliderImage ? "Sin foto se usa la primera imagen de tu slider." : "Sin foto se usa un fondo con los colores de tu marca."}
        </p>
      </Section>

      <Section title="Puntos fuertes" hint="Tres razones para comprarte.">
        <div className="grid gap-4 sm:grid-cols-3">
          {form.highlights.map((h, i) => (
            <div key={i} className="space-y-2 rounded-xl bg-slate-50 p-3">
              <Field label={`Título ${i + 1}`} value={h.title} max={60} onChange={(v) => setItem("highlights", i, { title: v })} />
              <Field label="Texto" value={h.text} max={240} rows={3} onChange={(v) => setItem("highlights", i, { text: v })} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Quiénes somos" hint="Cuenta tu historia: cómo empezaste, qué haces y por qué elegirte.">
        <Field label="Título de la sección" value={form.about_title} max={60} onChange={(v) => set("about_title", v)} />
        <Field label="Texto" value={form.about_text} max={3000} rows={6} onChange={(v) => set("about_text", v)} />
        <ImageUpload label="Foto" value={form.about_image} onChange={(u) => set("about_image", u)} userId={userId} folder="pagina" className="aspect-[4/3] w-full max-w-sm" />
      </Section>

      {business && (
        <>
          <Section title="Misión y visión" hint="Se muestran en tu página «Nosotros».">
            <Field label="Misión" value={form.mission} max={400} rows={2} onChange={(v) => set("mission", v)} />
            <Field label="Visión" value={form.vision} max={400} rows={2} onChange={(v) => set("vision", v)} />
          </Section>

          <Section title="Valores">
            <div className="grid gap-4 sm:grid-cols-3">
              {form.values.map((h, i) => (
                <div key={i} className="space-y-2 rounded-xl bg-slate-50 p-3">
                  <Field label={`Valor ${i + 1}`} value={h.title} max={60} onChange={(v) => setItem("values", i, { title: v })} />
                  <Field label="Texto" value={h.text} max={240} rows={3} onChange={(v) => setItem("values", i, { text: v })} />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Galería" hint="Hasta 6 fotos de tu local, tu equipo o tus trabajos. Sin fotos, el inicio muestra las de tus productos.">
            <div className="grid grid-cols-3 gap-3">
              {form.gallery.map((src, i) => (
                <ImageUpload
                  key={i}
                  value={src}
                  onChange={(u) => set("gallery", form.gallery.map((g, j) => (j === i ? u : g)))}
                  userId={userId}
                  folder="pagina"
                  className="aspect-square w-full"
                />
              ))}
            </div>
          </Section>

          <Section title="Opiniones de clientes" hint="Solo opiniones reales de tus clientes. Si las dejas vacías, la sección no aparece.">
            {form.testimonials.map((t, i) => (
              <div key={i} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_2fr]">
                <Field label="Nombre" value={t.name} max={60} onChange={(v) => set("testimonials", form.testimonials.map((x, j) => (j === i ? { ...x, name: v } : x)))} />
                <Field label="Opinión" value={t.text} max={400} rows={2} onChange={(v) => set("testimonials", form.testimonials.map((x, j) => (j === i ? { ...x, text: v } : x)))} />
              </div>
            ))}
          </Section>
        </>
      )}

      <Section title="Contacto" hint="Siempre aparece el botón para escribirte por el chat de tu tienda.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp" value={form.whatsapp} max={30} placeholder="0414-1234567" onChange={(v) => set("whatsapp", v)} />
          <Field label="Instagram" value={form.instagram} max={80} placeholder="@tutienda" onChange={(v) => set("instagram", v)} />
          <Field label="Dirección" value={form.address} max={200} placeholder="Av. Bolívar, Valencia" onChange={(v) => set("address", v)} />
          <Field label="Horario" value={form.hours} max={120} placeholder="Lunes a sábado, 8 a.m. a 6 p.m." onChange={(v) => set("hours", v)} />
        </div>
      </Section>

      <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
        <button type="button" className="btn-primary" onClick={save} disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        <button type="button" className="btn-ghost" onClick={restoreTexts}>
          <RotateCcw className="size-4" /> Usar textos sugeridos
        </button>
        {status?.ok && <span className="text-sm font-medium text-emerald-600">Cambios guardados ✓</span>}
        {status?.error && <span className="text-sm text-rose-600">{status.error}</span>}
      </div>
    </div>
  );
}
