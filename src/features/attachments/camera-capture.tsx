"use client"
import { useEffect, useRef, useState } from "react"
import { Camera } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CameraCapture({ disabled, onCapture }: { disabled: boolean; onCapture: (file: File) => void }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  function close() {
    setOpen(false)
    trigger.current?.focus()
  }
  return (
    <div>
      <Button
        ref={trigger}
        type="button"
        variant="outline"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Camera size={18} aria-hidden="true" />
        Tomar foto
      </Button>
      {open && !disabled && <CameraSession onClose={close} onCapture={onCapture} />}
    </div>
  )
}
function cameraMessage(error: unknown) {
  const name = error instanceof Error ? error.name : ""
  if (name === "NotAllowedError" || name === "SecurityError")
    return "No se autorizó la cámara. Puedes permitir el acceso desde el navegador o elegir una fotografía del dispositivo."
  if (name === "NotFoundError") return "No se encontró una cámara. Puedes elegir una fotografía del dispositivo."
  if (name === "NotReadableError")
    return "No se pudo usar la cámara. Comprueba que otra aplicación no la esté utilizando."
  return "No se pudo abrir la cámara. Usa HTTPS o localhost y comprueba los permisos. Puedes elegir una fotografía del dispositivo."
}
function CameraSession({ onClose, onCapture }: { onClose: () => void; onCapture: (file: File) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const alive = useRef(false)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    alive.current = true
    let cancelled = false
    const stop = () => {
      stream.current?.getTracks().forEach((track) => track.stop())
      stream.current = null
    }
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported")
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        })
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop())
          return
        }
        stream.current = media
        if (video.current) {
          video.current.srcObject = media
          await video.current.play()
        }
        if (!cancelled) setReady(true)
      } catch (err) {
        if (!cancelled) {
          stop()
          setError(cameraMessage(err))
        }
      }
    }
    void start()
    const hide = () => {
      if (document.visibilityState === "hidden") {
        cancelled = true
        alive.current = false
        stop()
        setReady(false)
        setError("La cámara se detuvo al salir de la vista. Cierra la cámara y vuelve a abrirla para continuar.")
      }
    }
    document.addEventListener("visibilitychange", hide)
    const leave = () => {
      cancelled = true
      alive.current = false
      stop()
    }
    window.addEventListener("pagehide", leave)
    return () => {
      cancelled = true
      alive.current = false
      stop()
      document.removeEventListener("visibilitychange", hide)
      window.removeEventListener("pagehide", leave)
    }
  }, [])
  async function capture() {
    const source = video.current
    if (!source?.videoWidth || !ready || busy) return
    setBusy(true)
    try {
      const canvas = document.createElement("canvas")
      canvas.width = source.videoWidth
      canvas.height = source.videoHeight
      const context = canvas.getContext("2d")
      if (!context) throw new Error("canvas")
      context.drawImage(source, 0, 0)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9))
      if (!alive.current) return
      if (!blob) throw new Error("capture")
      onCapture(new File([blob], `fotografia-${Date.now()}.jpg`, { type: "image/jpeg" }))
      onClose()
    } catch {
      if (alive.current) setError("No se pudo capturar la fotografía. Intenta nuevamente.")
    } finally {
      if (alive.current) setBusy(false)
    }
  }
  return (
    <section aria-label="Cámara de fotografías" className="bg-muted mt-3 space-y-3 rounded-xl border p-3">
      <video
        ref={video}
        autoPlay
        playsInline
        muted
        aria-label="Vista previa de la cámara"
        className="max-h-[40dvh] w-full rounded-lg bg-black object-contain"
      />
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : (
        <p role="status" className="text-sm">
          {ready ? "Encuadra la fotografía y pulsa Capturar foto." : "Solicitando acceso a la cámara…"}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={!ready || busy} onClick={() => void capture()}>
          {busy ? "Capturando…" : "Capturar foto"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar cámara
        </Button>
      </div>
    </section>
  )
}
