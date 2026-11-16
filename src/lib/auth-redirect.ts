const VALIDATION_ORIGIN = "https://internal.invalid"

export function safeLoginRedirect(target: unknown): string {
  if (
    typeof target !== "string" ||
    !target.startsWith("/") ||
    target.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/.test(target)
  )
    return "/"
  try {
    const url = new URL(target, VALIDATION_ORIGIN)
    if (url.origin !== VALIDATION_ORIGIN || url.pathname.startsWith("/login") || /^\/(?:%2f|%5c)/i.test(url.pathname))
      return "/"
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return "/"
  }
}
