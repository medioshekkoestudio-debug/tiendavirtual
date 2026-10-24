"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { SITE_DOMAIN } from "@/lib/constants";
import { saveSlug } from "@/lib/store-actions";

export function SlugForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [value, setValue] = useState(slug);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <div className="flex items-stretch overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-brand">
        <span className="flex items-center bg-slate-100 px-3 text-sm text-slate-500">{SITE_DOMAIN}/</span>
        <input
          className="min-w-0 flex-1 px-2 py-2.5 font-mono text-sm outline-none"
          value={value}
          onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          aria-label="Link de la tienda"
        />
        <button
          type="button"
          className="px-3 text-slate-500 hover:text-brand"
          aria-label="Copiar link"
          onClick={() => navigator.clipboard?.writeText(`https://${SITE_DOMAIN}/${slug}`)}
        >
          <Copy className="size-4" />
        </button>
      </div>
      {value !== slug && (
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await saveSlug(value);
              setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: "Link actualizado" });
              router.refresh();
            })
          }
        >
          Guardar link
        </button>
      )}
      {msg && <p className={msg.ok ? "text-sm text-emerald-600" : "text-sm text-rose-600"}>{msg.text}</p>}
      <p className="text-xs text-slate-500">Si cambias el link, el anterior dejará de funcionar.</p>
    </div>
  );
}
