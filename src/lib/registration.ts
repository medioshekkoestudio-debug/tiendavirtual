import { isRubro } from "@/lib/constants";

export type Registration = {
  fullName: string;
  company: string;
  email: string;
  password: string;
  industry: string;
  cedula: string;
  phone: string;
};

/** Valida los datos del formulario de registro de una empresa (registro normal y pasarela de planes). */
export function parseRegistration(fd: FormData): { error: string } | { data: Registration } {
  const str = (key: string) => String(fd.get(key) ?? "").trim();
  const data: Registration = {
    fullName: str("full_name"),
    company: str("company_name"),
    email: str("email").toLowerCase(),
    password: String(fd.get("password") ?? ""),
    industry: str("industry"),
    cedula: str("cedula").toUpperCase().replace(/\s+/g, "").slice(0, 20),
    phone: str("phone").slice(0, 30),
  };

  if (!data.fullName || !data.company || !data.email || !data.cedula || !data.phone) return { error: "Completa todos los campos" };
  if (data.company.length < 3) return { error: "El nombre de la empresa debe tener al menos 3 caracteres" };
  if (!isRubro(data.industry)) return { error: "Elige el rubro de tu empresa" };
  if (!/^[VEJGPR]-?\d{6,9}(-?\d)?$/.test(data.cedula)) return { error: "Cédula o RIF inválido. Ejemplo: V-12345678 o J-12345678-9" };
  if (data.phone.replace(/\D/g, "").length < 10) return { error: "Teléfono inválido. Ejemplo: 0414-1234567" };
  if (!/^\S+@\S+\.\S+$/.test(data.email)) return { error: "Email inválido" };
  if (data.password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" };
  return { data };
}

export function registrationMetadata(r: Registration) {
  return { role: "store_owner", full_name: r.fullName, company_name: r.company, industry: r.industry, cedula: r.cedula, phone: r.phone };
}

export function isDuplicateEmailError(message: string) {
  return /already|registered|exists/i.test(message);
}
