import { redirect } from "next/navigation";

// Nada es gratis: la cuenta se crea en la pasarela de pago del plan (o con un cupón en /cupon)
export default function RegisterPage() {
  redirect("/suscripcion");
}
