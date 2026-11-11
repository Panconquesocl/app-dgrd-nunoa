/** Correlativo anual `SOL-AAAA-NNN`. Compara sufijos como números: 1000 va después de 999. */
export function nextRequestFolio(folios: string[], year: number) {
  const prefix = `SOL-${year}-`
  let max = 0
  for (const folio of folios) {
    if (!folio.startsWith(prefix)) continue
    const suffix = folio.slice(prefix.length)
    if (/^\d+$/.test(suffix)) max = Math.max(max, Number(suffix))
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`
}
