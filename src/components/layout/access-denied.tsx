import Link from "next/link"

export function AccessDenied() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-5 py-10" role="alert">
      <h1 className="text-2xl font-semibold">Sin permisos</h1>
      <p className="mt-3">No tienes permisos para acceder a este módulo.</p>
      <Link className="mt-4 inline-block underline" href="/entregas">
        Volver a entregas
      </Link>
    </section>
  )
}
