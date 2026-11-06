/**
 * Términos y Condiciones de Linki App (documento de la dueña, noviembre de 2026).
 * Se muestran en /terminos-y-condiciones y en el registro, donde hay que aceptarlos.
 * Al cambiar el texto, cambia TERMS_VERSION: queda guardada con la aceptación de cada cuenta nueva.
 */
export const TERMS_VERSION = "2026-11";
export const TERMS_PATH = "/terminos-y-condiciones";
export const TERMS_TITLE = "Términos y Condiciones de Servicio y Uso de la Plataforma Linkiapp";
export const TERMS_UPDATED = "Noviembre de 2026";

type Block = { p: string; label?: string } | { list: string[] };
export type TermsSection = { title: string; blocks: Block[] };

export const TERMS_INTRO = "Plataforma: Linkiapp (accesible a través de linkiapp.com y subdominios asociados).";

export const TERMS: TermsSection[] = [
  {
    title: "1. Aceptación de los términos",
    blocks: [
      {
        p: 'El presente documento constituye un contrato legalmente vinculante entre el comercio, empresa o usuario vendedor (en adelante, el "Comercio Afiliado" o "Usuario") y Linkiapp. Al afiliarse, registrarse, activar una tienda web, seleccionar un plan de suscripción o hacer uso de la plataforma, el Comercio Afiliado declara haber leído, comprendido y aceptado en su totalidad las presentes normas de uso, políticas y condiciones de responsabilidad.',
      },
    ],
  },
  {
    title: "2. Naturaleza y alcance de la plataforma",
    blocks: [
      {
        label: "2.1. Definición del Servicio:",
        p: "Linkiapp opera única y exclusivamente como un proveedor de servicios tecnológicos y marketplace de tiendas autogestionables (SaaS). La plataforma proporciona la infraestructura digital para que los Comercios Afiliados exhiban sus productos o servicios mediante catálogos digitales integrables con redes sociales y plataformas de mensajería.",
      },
      {
        label: "2.2. Independencia Operativa:",
        p: "Linkiapp no interviene en las transacciones comerciales ni ejerce control sobre la negociación, compra, venta, empaque, calidad, envío o entrega de los productos promocionados por los Comercios Afiliados.",
      },
    ],
  },
  {
    title: "3. Exclusión total de responsabilidad sobre productos y servicios vendidos",
    blocks: [
      {
        label: "3.1. Responsabilidad Exclusiva del Vendedor:",
        p: "El Comercio Afiliado es el único y exclusivo responsable de la autenticidad, calidad, estado, garantía, licitud, precio, descripción, inventario y entrega de los productos o servicios ofrecidos en su tienda dentro de Linkiapp.",
      },
      {
        label: "3.2. Deslinde de Responsabilidad:",
        p: "Linkiapp no asume responsabilidad alguna —directa, indirecta, subsidiaria o solidaria— frente al Comercio Afiliado, compradores finales o terceros por:",
      },
      {
        list: [
          "Reclamaciones, reembolsos, devoluciones, garantías o insatisfacción sobre los productos o servicios adquiridos.",
          "Fallas, demoras o extravíos en los servicios de envío, entrega o delivery.",
          "Error o disputa en las transacciones financieras o métodos de pago (Zelle, PayPal, Pago Móvil, Binance, transferencias u otros) coordinados entre el cliente y el Comercio Afiliado.",
        ],
      },
    ],
  },
  {
    title: "4. Prohibición absoluta de productos y actividades ilícitas",
    blocks: [
      {
        label: "4.1. Prohibición Estricta:",
        p: "Queda estrictamente prohibida sin excepción alguna la exhibición, oferta, comercialización o distribución de cualquier bien, producto o servicio que sea considerado ilícito, ilegal, prohibido o no regulado conforme a la legislación nacional aplicable o las normas internacionales aplicables.",
      },
      { label: "4.2. Listado No Exhaustivo de Artículos Prohibidos:", p: "" },
      {
        list: [
          "Sustancias estupefacientes, psicotrópicas o drogas ilegales.",
          "Armas de fuego, explosivos, municiones o material bélico.",
          "Medicamentos sujetos a prescripción médica o productos farmacéuticos no autorizados.",
          "Mercancía falsificada, réplicas no autorizadas o bienes que infrinjan derechos de propiedad intelectual, derechos de autor o marcas registradas.",
          "Contenido o servicios de índole pornográfica, explotación o material no apto para menores.",
          "Cualquier producto obtenido mediante contrabando, hurto o comisión de delitos.",
        ],
      },
      {
        label: "4.3. Facultad de Suspensión Inmediata:",
        p: "Linkiapp se reserva el derecho de auditar, suspender temporalmente o cancelar de manera definitiva y sin previo aviso la cuenta y tienda de cualquier Comercio Afiliado que vulnere esta prohibición, sin derecho a reembolso de tarifas o suscripciones abonadas, y reportando el hecho a las autoridades competentes si fuese requerido.",
      },
    ],
  },
  {
    title: "5. Normas de uso y obligaciones del Comercio Afiliado",
    blocks: [
      { p: "El Comercio Afiliado se compromete a cumplir las siguientes directrices de uso:" },
      {
        list: [
          "Veracidad de la Información: Proveer información veraz, actualizada y exacta referente a su negocio, datos de contacto, precios e inventario.",
          "Custodia de Credenciales: Mantener la confidencialidad y seguridad de las credenciales de acceso al panel de administración de su tienda.",
          "Uso Adecuado del Sistema: No utilizar scripts, malware, herramientas automatizadas o realizar acciones que puedan comprometer la seguridad, estabilidad o integridad del servidor e infraestructura de Linkiapp.",
          "Respeto a los Límites del Plan: Ajustar su catálogo de productos y funcionalidades al límite estipulado según el plan suscrito (Emprendedor, Pro o Business).",
        ],
      },
    ],
  },
  {
    title: "6. Planes de suscripción, comisiones y pagos",
    blocks: [
      {
        label: "6.1. Estructura de Tarifas:",
        p: "El Comercio Afiliado aceptará el esquema tarifario vigente correspondiente al plan de afiliación seleccionado (pago mensual o anual) más el porcentaje de comisión por ventas concretadas establecido en las condiciones de contratación.",
      },
      {
        label: "6.2. Cierre de Mes y Comisiones:",
        p: "Las comisiones sobre las ventas gestionadas a través de la plataforma serán liquidadas y canceladas por el Comercio Afiliado al cierre de cada periodo mensual. El incumplimiento o mora en el pago de comisiones o suscripciones podrá acarrear la suspensión temporal del servicio.",
      },
    ],
  },
  {
    title: "7. Modificaciones a los términos",
    blocks: [
      {
        p: "Linkiapp se reserva el derecho de modificar o actualizar los presentes Términos y Condiciones en cualquier momento. Dichas modificaciones entrarán en vigencia desde su publicación en el sitio web o notificación al panel de administración del Comercio Afiliado.",
      },
    ],
  },
  {
    title: "8. Aceptación digital y conformidad",
    blocks: [
      {
        p: "Al completar el registro, habilitar su tienda web o abonar la cuota de afiliación en Linkiapp, el usuario declara haber leído, comprendido y aceptado expresamente en su totalidad las condiciones dispuestas en el presente documento.",
      },
    ],
  },
];
