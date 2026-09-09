import { z } from "zod"

const MIN_YEAR = 2000
const MAX_YEAR = 2100

const DATE_ORDER_MESSAGE = "La fecha de término no puede ser anterior a la de inicio."

/** Los mensajes por defecto de zod están en inglés y llegan tal cual al formulario. */
const yearSchema = z.coerce
  .number("El año no es válido.")
  .int("El año no es válido.")
  .min(MIN_YEAR, `El año debe estar entre ${MIN_YEAR} y ${MAX_YEAR}.`)
  .max(MAX_YEAR, `El año debe estar entre ${MIN_YEAR} y ${MAX_YEAR}.`)

/**
 * Campos editables de una acción estratégica. Se mantiene sin `.refine()` para
 * poder derivar el esquema parcial del update: zod no permite encadenar
 * `.partial()` sobre un esquema que ya tiene un efecto.
 */
export const strategicActionFieldsSchema = z.object({
  number: z.coerce.number().int().positive("El número de acción debe ser mayor a cero."),
  year: yearSchema,
  title: z.string().trim().min(1, "El título es obligatorio.").max(500, "El título es demasiado largo."),
  topics: z.string().trim().min(1, "Los temas son obligatorios."),
  implementation: z.string().trim().min(1, "Debes indicar cómo desarrollar la acción."),
  startDate: z.coerce.date("La fecha de inicio no es válida."),
  endDate: z.coerce.date("La fecha de término no es válida."),
})

export const createStrategicActionSchema = strategicActionFieldsSchema.refine(
  (fields) => fields.endDate >= fields.startDate,
  { message: DATE_ORDER_MESSAGE, path: ["endDate"] },
)

/**
 * El update es parcial, así que el orden de las fechas no se puede validar acá:
 * un PATCH que solo trae `endDate` se saltaría la comparación. Esa regla vive en
 * el servicio, que compara contra el registro ya guardado.
 */
export const updateStrategicActionSchema = strategicActionFieldsSchema.partial()

export const listStrategicActionsQuerySchema = z.object({
  // La caja de búsqueda manda lo que el usuario teclee: un `q` en blanco tiene
  // que equivaler a "sin filtro", no a un error de validación.
  q: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  year: yearSchema.optional(),
})

export const dateOrderError = {
  message: DATE_ORDER_MESSAGE,
  path: "endDate",
} as const

export type CreateStrategicActionInput = z.infer<typeof createStrategicActionSchema>
export type UpdateStrategicActionInput = z.infer<typeof updateStrategicActionSchema>
/**
 * Se declara a mano en vez de inferirlo: `z.coerce` deja el tipo de entrada en
 * `unknown` y el de salida vuelve `q` obligatorio, y ninguno de los dos sirve
 * como filtro opcional del lado del cliente.
 */
export type ListStrategicActionsQuery = { q?: string; year?: number }

// ───────────────────────────────────────────────────────────
// DTOs de salida
//
// Las fechas viajan como string: `NextResponse.json` las serializa a ISO y el
// cliente nunca recibe un `Date`. Tipar esto como `Date` es el error más fácil
// de cometer en este contrato.
// ───────────────────────────────────────────────────────────

export type StrategicActionListItem = {
  id: string
  number: number
  year: number
  title: string
  topics: string
  implementation: string
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
  _count: { activities: number }
}

export type StrategicActionListResponse = {
  data: StrategicActionListItem[]
  availableYears: number[]
}

export type StrategicActionActivity = {
  id: string
  date: string
  objective: string
  location: string
  participants: string
  _count: { evidence: number }
}

export type StrategicActionDetail = StrategicActionListItem & {
  activities: StrategicActionActivity[]
}

/**
 * Lo que el cliente envía. Las fechas van como string (`<input type="date">`
 * produce "2026-01-01") y el servidor las convierte con `z.coerce.date()`.
 */
export type StrategicActionPayload = {
  number: number
  year: number
  title: string
  topics: string
  implementation: string
  startDate: string
  endDate: string
}

export type StrategicActionPatch = Partial<StrategicActionPayload>

// ───────────────────────────────────────────────────────────
// Formulario
//
// Los `<input>` entregan strings, así que el esquema del formulario valida
// strings y `toStrategicActionPayload` arma el cuerpo del request. Reutilizar
// acá el esquema del servidor obligaría a `z.coerce`, que deja los tipos de
// entrada en `unknown` y rompe el tipado de react-hook-form.
// ───────────────────────────────────────────────────────────

const integerString = (requiredMessage: string, formatMessage: string) =>
  z
    .string()
    .trim()
    .min(1, requiredMessage)
    .refine((value) => /^\d+$/.test(value), formatMessage)

export const strategicActionFormSchema = z
  .object({
    number: integerString("El número de acción es obligatorio.", "El número de acción debe ser un entero.").refine(
      (value) => Number(value) > 0,
      "El número de acción debe ser mayor a cero.",
    ),
    year: integerString("El año es obligatorio.", "El año debe ser un número.").refine(
      (value) => Number(value) >= MIN_YEAR && Number(value) <= MAX_YEAR,
      `El año debe estar entre ${MIN_YEAR} y ${MAX_YEAR}.`,
    ),
    title: z.string().trim().min(1, "El título es obligatorio.").max(500, "El título es demasiado largo."),
    startDate: z.string().min(1, "La fecha de inicio es obligatoria."),
    endDate: z.string().min(1, "La fecha de término es obligatoria."),
    implementation: z.string().trim().min(1, "Debes indicar cómo desarrollar la acción."),
    topics: z.string().trim().min(1, "Los temas son obligatorios."),
  })
  // Las fechas van en formato "AAAA-MM-DD", que ordena igual como texto.
  .refine((values) => values.endDate >= values.startDate, {
    message: DATE_ORDER_MESSAGE,
    path: ["endDate"],
  })

export type StrategicActionFormValues = z.infer<typeof strategicActionFormSchema>

export function toStrategicActionPayload(values: StrategicActionFormValues): StrategicActionPayload {
  return {
    number: Number(values.number),
    year: Number(values.year),
    title: values.title,
    topics: values.topics,
    implementation: values.implementation,
    startDate: values.startDate,
    endDate: values.endDate,
  }
}
