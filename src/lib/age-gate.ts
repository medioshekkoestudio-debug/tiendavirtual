/** Cookie que recuerda en este navegador que el cliente ya confirmó su mayoría de edad en esta tienda */
export const adultCookieName = (storeId: string) => `linki_mayor_${storeId.replace(/-/g, "")}`;
