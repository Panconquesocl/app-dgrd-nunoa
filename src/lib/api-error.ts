import { NextResponse } from "next/server"
import { z, ZodError } from "zod"

type AppErrorOptions = {
  /** Errores por campo, para que el formulario los marque. Mismo formato que zod. */
  fieldErrors?: Record<string, string[]>
  /** Datos extra del caso, p. ej. el conteo de actividades que impiden borrar. */
  details?: Record<string, unknown>
}

/**
 * Error de dominio con un código HTTP asociado. Permite que los servicios
 * expresen el resultado (404, 409, ...) sin depender de Request/Response.
 */
export class AppError extends Error {
  readonly fieldErrors?: AppErrorOptions["fieldErrors"]
  readonly details?: AppErrorOptions["details"]

  constructor(
    readonly status: number,
    message: string,
    { fieldErrors, details }: AppErrorOptions = {},
  ) {
    super(message)
    this.name = "AppError"
    this.fieldErrors = fieldErrors
    this.details = details
  }
}

/** Traduce cualquier error lanzado dentro de un route handler a una respuesta. */
export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        message: error.message,
        ...(error.fieldErrors && { fieldErrors: error.fieldErrors }),
        ...(error.details && { details: error.details }),
      },
      { status: error.status },
    )
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        message: "Revisa los datos ingresados.",
        fieldErrors: z.flattenError(error).fieldErrors,
      },
      { status: 400 },
    )
  }

  console.error(error)

  return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 })
}
