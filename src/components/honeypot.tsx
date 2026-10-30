/** Campo trampa invisible para bots: las personas no lo ven ni lo llenan (ver lib/guard.ts) */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
      <label htmlFor="sitio_web">No llenar este campo</label>
      <input id="sitio_web" name="sitio_web" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  );
}
