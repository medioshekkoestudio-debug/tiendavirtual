import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { TermsContent } from "@/components/terms-content";
import { TERMS_PATH, TERMS_TITLE } from "@/lib/terms";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Términos y condiciones de servicio y uso de la plataforma Linki App.",
  alternates: { canonical: TERMS_PATH },
};

export default function TermsPage() {
  return (
    <main className="min-h-dvh bg-white">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center px-4 py-4">
          <Link href="/" aria-label="Ir al inicio de Linki App">
            <Logo className="h-8" />
          </Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-extrabold leading-tight text-slate-900 md:text-3xl">{TERMS_TITLE}</h1>
        <TermsContent />
      </article>
    </main>
  );
}
