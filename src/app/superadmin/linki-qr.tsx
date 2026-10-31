"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";
import { Modal } from "@/components/modal";
import { StoreQr } from "@/components/store-qr";
import { siteUrl } from "@/lib/utils";

/** QR de la landing de Linki App para compartirla o imprimirla */
export function LinkiQr() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="QR de Linki App" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
        <QrCode className="size-4" /> <span className="hidden sm:inline">QR de Linki App</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="QR de Linki App">
        <p className="mb-4 text-center text-sm text-slate-600">Lleva a linkiapp.com. Descárgalo para imprimirlo o compártelo.</p>
        <StoreQr
          url={siteUrl()}
          name="Linki App"
          slug="linkiapp"
          logoUrl="/brand/linkiapp-icon-512.png"
          color="#004D40"
          shareText="Crea tu tienda online y tu app en minutos con Linki App"
        />
      </Modal>
    </>
  );
}
