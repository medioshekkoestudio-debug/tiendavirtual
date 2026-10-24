import Link from "next/link";
import { Lock } from "lucide-react";

export function LoginPrompt({ slug, text, next }: { slug: string; text: string; next: string }) {
  return (
    <div className="px-4 py-12 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand/10 text-brand">
        <Lock className="size-6" />
      </span>
      <p className="mt-4 text-slate-600">{text}</p>
      <div className="mt-6 flex flex-col gap-2">
        <Link href={`/${slug}/login?next=${encodeURIComponent(next)}`} className="btn-primary">Iniciar sesión</Link>
        <Link href={`/${slug}/login?modo=registro&next=${encodeURIComponent(next)}`} className="btn-outline">Crear cuenta</Link>
      </div>
    </div>
  );
}
