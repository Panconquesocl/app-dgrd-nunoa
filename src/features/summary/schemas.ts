import { z } from "zod"
export type NavigationCounts = { deliveries: number; requests?: number; events?: number }
export const summaryYearSchema = z.coerce
  .number()
  .int("El año debe ser entero.")
  .min(1900, "El año debe estar entre 1900 y 2200.")
  .max(2200, "El año debe estar entre 1900 y 2200.")
export function currentSummaryYear(now = new Date()) {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric" }).format(now))
}
export function summaryToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}
export type SummaryData = {
  year: number
  availableYears: number[]
  deliveries: {
    count: number
    totalsByUnit: { unit: string; quantity: number }[]
    recent: {
      id: string
      folio: string
      beneficiary: string
      date: string
      neighborhoodAssociation: { number: number; name: string } | null
      _count: { items: number }
    }[]
  }
  supplies: {
    catalogCount: number
    distributedCount: number
    top: { id: string; type: string; unit: string; quantity: number }[]
  }
  actions: {
    count: number
    recent: {
      id: string
      number: number
      year: number
      title: string
      startDate: string
      endDate: string
      _count: { activities: number }
    }[]
  }
  activities: {
    count: number
    agenda: { id: string; date: string; objective: string; action: { number: number }; upcoming: boolean }[]
  }
  requests?: {
    count: number
    pending: number
    recent: {
      id: string
      folio: string
      channel: string
      createdAt: string
      status: "pending" | "attended" | "cancelled"
    }[]
  }
  events?: {
    count: number
    recent: { id: string; folio: string; sector: string; date: string; type: { name: string } }[]
  }
}
