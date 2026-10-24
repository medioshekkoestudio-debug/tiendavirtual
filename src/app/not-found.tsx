import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="text-6xl font-extrabold text-brand">404</p>
        <h1 className="mt-2 text-xl font-bold">No encontramos esta página o tienda</h1>
        <p className="mt-1 text-slate-600">Revisa que el link esté bien escrito.</p>
        <Link href="/" className="btn-primary mt-6">Ir a Shopux</Link>
      </div>
    </div>
  );
}
