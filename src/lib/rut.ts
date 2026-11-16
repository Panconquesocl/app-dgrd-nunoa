/** Representación estable para comparar RUT ingresados con o sin puntos/guion. */
export function normalizeRut(value: string) {
  const compact = value.replace(/[.\s-]/g, "").toUpperCase()
  return compact.replace(/^([1-9]\d{0,7})([\dK])$/, "$1-$2")
}

export function isValidRut(value: string) {
  const match = /^([1-9]\d{0,7})-([\dK])$/.exec(value)
  if (!match) return false
  let sum = 0
  let multiplier = 2
  for (const digit of [...match[1]].reverse()) {
    sum += Number(digit) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }
  const check = 11 - (sum % 11)
  return match[2] === (check === 11 ? "0" : check === 10 ? "K" : String(check))
}

export function formatRut(value: string) {
  const normalized = normalizeRut(value)
  const [body, check] = normalized.split("-")
  return check ? `${body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${check}` : value
}
