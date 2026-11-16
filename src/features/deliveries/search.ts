/** La búsqueda parcial compara también fragmentos que incluyen el verificador. */
export function rutSearchFragments(value: string) {
  const compact = value.replace(/[.\s-]/g, "").toUpperCase()
  if (!/^[\dK]+$/.test(compact)) return []
  return compact.length > 1 ? [compact, `${compact.slice(0, -1)}-${compact.at(-1)}`] : [compact]
}
