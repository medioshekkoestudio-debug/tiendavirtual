"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Clock } from "lucide-react";
import { markNotificationsRead } from "@/lib/notification-actions";
import type { Notification } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

/** Campana del header con las notificaciones (p. ej. «tu pago fue aprobado») */
export function NotificationBell({ items }: { items: Notification[] }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(items.filter((n) => !n.read_at).length);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setUnread(items.filter((n) => !n.read_at).length), [items]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread) {
      setUnread(0);
      void markNotificationsRead();
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100"
        aria-label={unread ? `Notificaciones (${unread} sin leer)` : "Notificaciones"}
        aria-expanded={open}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-16 z-40 max-h-[70dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-80">
          <p className="px-2 py-1.5 text-sm font-bold">Notificaciones</p>
          {items.length ? (
            <ul>
              {items.map((n) => {
                const body = (
                  <>
                    <p className={cn("text-sm", !n.read_at ? "font-bold" : "font-semibold")}>{n.title}</p>
                    {n.body && <p className="text-sm text-slate-600">{n.body}</p>}
                    <p className="mt-0.5 text-xs text-slate-400">{formatDate(n.created_at)}</p>
                  </>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link href={n.link} onClick={() => setOpen(false)} className="block rounded-xl px-2 py-2 hover:bg-slate-50">
                        {body}
                      </Link>
                    ) : (
                      <div className="px-2 py-2">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-2 py-6 text-center text-sm text-slate-500">No tienes notificaciones.</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Mientras el pago del plan está en revisión */
export function PendingPlanNotice() {
  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-3xl items-start gap-3 px-4 py-3 text-sm text-amber-900">
        <Clock className="mt-0.5 size-5 shrink-0" />
        <p>
          <strong>Tu pago está en revisión.</strong> Apenas se apruebe tu pago podrás usar la plataforma sin restricciones. Te enviaremos una
          notificación <Bell className="inline size-4 align-text-bottom" /> apenas esté aprobado.
        </p>
      </div>
    </div>
  );
}
