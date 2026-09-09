"use client"

import { useId } from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/**
 * Envuelve un control de formulario con su etiqueta, su ayuda y su error, y
 * cablea `aria-describedby`/`aria-invalid` para que el lector de pantalla
 * anuncie el mensaje junto al campo.
 */
export function Field({
  label,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby": string | undefined }) => React.ReactNode
}) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(" ") || undefined

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-[13px]">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>

      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}

      {hint && !error && (
        <p id={hintId} className="text-muted-foreground text-[11.5px]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-destructive text-[11.5px]">
          {error}
        </p>
      )}
    </div>
  )
}
