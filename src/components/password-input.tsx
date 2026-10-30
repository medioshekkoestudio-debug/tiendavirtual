"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Campo de contraseña con el ojo para ver lo que se escribe */
export function PasswordInput(props: React.ComponentProps<"input">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={`input pr-11 ${props.className ?? ""}`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
        aria-label={show ? "Ocultar contraseña" : "Ver contraseña"}
        aria-pressed={show}
      >
        {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}
