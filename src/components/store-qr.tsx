"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, Share2 } from "lucide-react";
import { cn, contrastText } from "@/lib/utils";

const SIZE = 1080; // la imagen descargada: cuadrada, buena para imprimir y para historias
const QR = 760;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // el bucket público responde con CORS abierto; sin esto no se puede descargar el canvas
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** El color de la tienda solo si contrasta con el fondo blanco; si es muy claro, el lector no lo distingue */
const qrColor = (color: string) => (contrastText(color) === "#ffffff" ? color : "#111827");

/** Dibuja la tarjeta del QR: nombre de la tienda, QR con su logo en el centro y su link */
async function drawCard(canvas: HTMLCanvasElement, { url, name, logoUrl, color }: { url: string; name: string; logoUrl: string | null; color: string }) {
  const ink = qrColor(color);
  const ctx = canvas.getContext("2d")!;
  canvas.width = canvas.height = SIZE;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Corrección de errores alta: el QR se sigue leyendo aunque el logo tape el centro
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, url, { errorCorrectionLevel: "H", margin: 0, width: QR, color: { dark: ink, light: "#ffffff" } });
  const top = 150;
  ctx.drawImage(qr, (SIZE - QR) / 2, top);

  if (logoUrl) {
    try {
      const logo = await loadImage(logoUrl);
      const box = QR * 0.22;
      const x = (SIZE - box) / 2;
      const y = top + (QR - box) / 2;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(x - 14, y - 14, box + 28, box + 28, 28);
      ctx.fill();
      const scale = Math.min(box / logo.width, box / logo.height);
      const w = logo.width * scale;
      const h = logo.height * scale;
      ctx.drawImage(logo, x + (box - w) / 2, y + (box - h) / 2, w, h);
    } catch {
      // Sin logo legible: el QR queda limpio
    }
  }

  ctx.textAlign = "center";
  ctx.fillStyle = ink;
  ctx.font = "bold 64px Inter, system-ui, sans-serif";
  ctx.fillText(name.length > 26 ? `${name.slice(0, 25)}…` : name, SIZE / 2, 100);
  ctx.fillStyle = "#475569";
  ctx.font = "500 40px Inter, system-ui, sans-serif";
  ctx.fillText(url.replace(/^https?:\/\//, ""), SIZE / 2, top + QR + 80);
  ctx.font = "32px Inter, system-ui, sans-serif";
  ctx.fillText("Escanea para comprar y descargar la app", SIZE / 2, top + QR + 135);
}

/** QR de la tienda con botones para descargarlo como imagen y compartirlo */
export function StoreQr({
  url,
  name,
  slug,
  logoUrl,
  color,
  className,
}: {
  url: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  color: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setReady(false);
    drawCard(canvas, { url, name, logoUrl, color }).then(() => setReady(true));
  }, [url, name, logoUrl, color]);

  const toBlob = () =>
    new Promise<Blob | null>((resolve) => {
      try {
        canvasRef.current?.toBlob(resolve, "image/png");
      } catch {
        resolve(null); // canvas «manchado» por una imagen sin CORS
      }
    });

  async function download() {
    const blob = await toBlob();
    if (!blob) return setNote("No se pudo crear la imagen. Intenta de nuevo.");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qr-${slug}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function share() {
    setNote(null);
    const text = `Conoce ${name}: compra desde tu teléfono y descarga su app aquí`;
    const blob = await toBlob();
    const file = blob ? new File([blob], `qr-${slug}.png`, { type: "image/png" }) : null;
    try {
      if (file && navigator.canShare?.({ files: [file] })) return await navigator.share({ files: [file], title: name, text: `${text}: ${url}` });
      if (navigator.share) return await navigator.share({ title: name, text, url });
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // la persona cerró el menú de compartir
    }
    await navigator.clipboard?.writeText(url).catch(() => {});
    setNote("Link copiado. Pégalo donde quieras compartirlo, o descarga el QR.");
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <canvas ref={canvasRef} className="aspect-square w-full max-w-64 rounded-2xl border border-slate-200 bg-white" aria-label={`Código QR de ${name}`} />
      <div className="flex w-full max-w-64 gap-2">
        <button type="button" className="btn-primary flex-1 px-3" onClick={download} disabled={!ready}>
          <Download className="size-4" /> Descargar
        </button>
        <button type="button" className="btn-outline flex-1 px-3" onClick={share} disabled={!ready}>
          <Share2 className="size-4" /> Compartir
        </button>
      </div>
      {note && <p className="max-w-64 text-center text-xs text-slate-500">{note}</p>}
    </div>
  );
}
