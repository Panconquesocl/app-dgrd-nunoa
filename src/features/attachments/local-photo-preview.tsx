"use client"
/* eslint-disable @next/next/no-img-element -- Las imágenes locales usan URLs temporales del navegador. */
import { useEffect, useRef } from "react"
export function LocalPhotoPreview({ file }: { file: File }) {
  const image = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    if (image.current) {
      image.current.hidden = false
      image.current.src = url
    }
    return () => URL.revokeObjectURL(url)
  }, [file])
  return (
    <img
      ref={image}
      alt={`Vista previa de ${file.name}`}
      className="size-16 shrink-0 rounded-lg object-cover"
      onError={(event) => {
        event.currentTarget.hidden = true
      }}
    />
  )
}
