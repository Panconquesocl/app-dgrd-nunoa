import { NextResponse, type NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

const LOGIN_PATH = "/login"

/**
 * Guardia optimista: sólo comprueba la presencia de la cookie de sesión para
 * evitar una consulta a la base de datos en cada navegación. La validación
 * real (sesión vigente, usuario no baneado) la hace `src/app/(app)/layout.tsx`
 * contra la base de datos.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hasSessionCookie = Boolean(getSessionCookie(request))
  const isLoginRoute = pathname === LOGIN_PATH

  if (!hasSessionCookie && !isLoginRoute) {
    const url = request.nextUrl.clone()
    url.pathname = LOGIN_PATH
    url.search = ""
    url.searchParams.set("redirectTo", `${pathname}${search}`)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Todo salvo las rutas de API (incluido /api/auth), los assets de Next y los
  // archivos estáticos de /public.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
