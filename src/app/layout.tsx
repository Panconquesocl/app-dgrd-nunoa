import type { Metadata } from "next"
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google"
import { Providers } from "@/providers"
import "./globals.css"

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
})

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "DGRD Ñuñoa",
  icons: { icon: { url: "/logo-mark-yellow.svg", type: "image/svg+xml" } },
  description: "Dirección de Gestión del Riesgo de Desastres, Municipalidad de Ñuñoa",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
