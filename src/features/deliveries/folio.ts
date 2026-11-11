/** Compara sufijos como números: 1000 debe ir después de 999. */
export function nextDeliveryFolio(folios: string[], year: number) {
  const prefix = `ENT-${year}-`
  let max = 0
  for (const folio of folios) {
    if (!folio.startsWith(prefix)) continue
    const suffix = folio.slice(prefix.length)
    if (/^\d+$/.test(suffix)) max = Math.max(max, Number(suffix))
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`
}
export function deliveryFolioYear(now = new Date()) {
  return Number(new Intl.DateTimeFormat("en", { timeZone: "America/Santiago", year: "numeric" }).format(now))
}
