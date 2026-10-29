export type Role = "superadmin" | "store_owner" | "customer";

export type Profile = {
  id: string;
  role: Role;
  full_name: string | null;
  email: string | null;
  cedula: string | null;
  phone: string | null;
  created_at: string;
};

export type PaymentMethodKey = "zelle" | "paypal" | "pago_movil" | "binance" | "transferencia";

export type PaymentMethodConfig = {
  enabled: boolean;
  [field: string]: string | boolean;
};

export type Store = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  /** Rubro (clave de RUBROS en constants.ts); null en tiendas creadas antes de existir el campo. */
  industry: string | null;
  description: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_key: string;
  slider_images: string[];
  payment_methods: Partial<Record<PaymentMethodKey, PaymentMethodConfig>>;
  commission_rate: number;
  onboarding_step: number;
  onboarding_completed: boolean;
  is_active: boolean;
  created_at: string;
};

export type Category = {
  id: string;
  store_id: string;
  parent_id: string | null;
  name: string;
  position: number;
};

export type Product = {
  id: string;
  store_id: string;
  category_id: string | null;
  subcategory_id: string | null;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type OrderStatus = "pendiente" | "pagado" | "enviado" | "entregado" | "cancelado";
export type PaymentStatus = "pendiente" | "aprobado" | "rechazado";

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  category_id: string | null;
  subcategory_id: string | null;
  quantity: number;
  unit_price: number;
};

export type Payment = {
  id: string;
  order_id: string;
  store_id: string;
  method: PaymentMethodKey;
  reference: string;
  amount: number;
  status: PaymentStatus;
  reviewed_at: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  order_number: number;
  store_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_cedula: string;
  customer_phone: string;
  customer_email: string | null;
  shipping_address: string | null;
  delivery_type: "envio" | "retiro";
  scheduled_for: string | null;
  notes: string | null;
  subtotal: number;
  total: number;
  commission: number;
  status: OrderStatus;
  created_at: string;
};

export type Conversation = {
  id: string;
  store_id: string;
  customer_id: string;
  customer_name: string | null;
  last_message_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type LandingContent = {
  brand_name: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
  description_title: string;
  description: string;
  cta_text: string;
  features: { title: string; text: string }[];
  footer_text: string;
};
