import prisma from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { can } from "@/lib/permissions"
import { AppError } from "@/lib/api-error"
import { summaryToday, summaryYearSchema } from "./schemas"
export async function getSummary(inputYear: number, role: string | null | undefined, now = new Date()) {
  const year = summaryYearSchema.parse(inputYear)
  if (!can(role, "summary", "read")) throw new AppError(403, "No tienes permisos para consultar el resumen.")
  const readRequests = can(role, "requests", "read")
  const readEvents = can(role, "events", "read")
  const start = new Date(Date.UTC(year, 0, 1)),
    end = new Date(Date.UTC(year + 1, 0, 1))
  const dates = { gte: start, lt: end }
  const today = new Date(`${summaryToday(now)}T00:00:00.000Z`)
  return prisma.$transaction(
    async (tx) => {
      const years = await tx.$queryRaw<{ year: number }[]>(Prisma.sql`
      SELECT DISTINCT year::integer FROM (
        SELECT EXTRACT(YEAR FROM date) AS year FROM delivery
        UNION SELECT EXTRACT(YEAR FROM date) FROM activity
        UNION SELECT year FROM strategic_action
        ${readEvents ? Prisma.sql`UNION SELECT EXTRACT(YEAR FROM date) FROM "event"` : Prisma.empty}
        ${readRequests ? Prisma.sql`UNION SELECT EXTRACT(YEAR FROM "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago') FROM "request"` : Prisma.empty}
      ) AS years WHERE year BETWEEN 1900 AND 2200 ORDER BY year DESC`)
      const [
        deliveryCount,
        recentDeliveries,
        totalsByUnit,
        catalogCount,
        distinctSupplies,
        topGroups,
        actionCount,
        recentActions,
        activityCount,
        future,
      ] = await Promise.all([
        tx.delivery.count({ where: { date: dates } }),
        tx.delivery.findMany({
          where: { date: dates },
          select: {
            id: true,
            folio: true,
            beneficiary: true,
            date: true,
            neighborhoodAssociation: { select: { number: true, name: true } },
            _count: { select: { items: true } },
          },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
          take: 4,
        }),
        tx.$queryRaw<
          { unit: string; quantity: number }[]
        >`SELECT lower(btrim(s.unit)) AS unit, SUM(i.quantity)::double precision AS quantity FROM delivery_item i JOIN supply s ON s.id=i."supplyId" JOIN delivery d ON d.id=i."deliveryId" WHERE d.date >= ${start} AND d.date < ${end} GROUP BY lower(btrim(s.unit)) ORDER BY unit`,
        tx.supply.count(),
        tx.$queryRaw<
          { count: number }[]
        >`SELECT COUNT(DISTINCT i."supplyId")::integer AS count FROM delivery_item i JOIN delivery d ON d.id=i."deliveryId" WHERE d.date >= ${start} AND d.date < ${end}`,
        tx.deliveryItem.groupBy({
          by: ["supplyId"],
          where: { delivery: { date: dates } },
          _sum: { quantity: true },
          orderBy: [{ _sum: { quantity: "desc" } }, { supplyId: "asc" }],
          take: 4,
        }),
        tx.strategicAction.count({ where: { year } }),
        tx.strategicAction.findMany({
          where: { year },
          select: {
            id: true,
            number: true,
            year: true,
            title: true,
            startDate: true,
            endDate: true,
            _count: { select: { activities: { where: { date: dates } } } },
          },
          orderBy: [{ number: "asc" }, { id: "asc" }],
          take: 4,
        }),
        tx.activity.count({ where: { date: dates } }),
        tx.activity.findMany({
          where: { date: { ...dates, gte: today > start ? today : start } },
          select: { id: true, date: true, objective: true, action: { select: { number: true } } },
          orderBy: [{ date: "asc" }, { id: "asc" }],
          take: 4,
        }),
      ])
      const past =
        future.length < 4
          ? await tx.activity.findMany({
              where: { date: { gte: start, lt: today < end ? today : end } },
              select: { id: true, date: true, objective: true, action: { select: { number: true } } },
              orderBy: [{ date: "desc" }, { id: "desc" }],
              take: 4 - future.length,
            })
          : []
      const supplies = topGroups.length
        ? await tx.supply.findMany({
            where: { id: { in: topGroups.map((group) => group.supplyId) } },
            select: { id: true, type: true, unit: true },
          })
        : []
      const result = {
        year,
        availableYears: [
          ...new Set([year, Number(summaryToday(now).slice(0, 4)), ...years.map((row) => row.year)]),
        ].sort((a, b) => b - a),
        deliveries: { count: deliveryCount, totalsByUnit, recent: recentDeliveries },
        supplies: {
          catalogCount,
          distributedCount: distinctSupplies[0]?.count ?? 0,
          top: topGroups.map((group) => ({
            ...supplies.find((supply) => supply.id === group.supplyId)!,
            quantity: group._sum.quantity ?? 0,
          })),
        },
        actions: { count: actionCount, recent: recentActions },
        activities: {
          count: activityCount,
          agenda: [
            ...future.map((item) => ({ ...item, upcoming: true })),
            ...past.map((item) => ({ ...item, upcoming: false })),
          ],
        },
      }
      const requests = readRequests
        ? await (async () => {
            // createdAt es un timestamp UTC; los límites del año se calculan en Chile.
            const [bounds] = await tx.$queryRaw<
              { start: Date; end: Date }[]
            >`SELECT make_date(${year}::integer,1,1)::timestamp AT TIME ZONE 'America/Santiago' AS start, make_date(${year + 1}::integer,1,1)::timestamp AT TIME ZONE 'America/Santiago' AS end`
            const where = { createdAt: { gte: bounds.start, lt: bounds.end } }
            const [count, pending, firstPending] = await Promise.all([
              tx.request.count({ where }),
              tx.request.count({ where: { ...where, status: "pending" } }),
              tx.request.findMany({
                where: { ...where, status: "pending" },
                select: { id: true, folio: true, channel: true, createdAt: true, status: true },
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                take: 4,
              }),
            ])
            const others =
              firstPending.length < 4
                ? await tx.request.findMany({
                    where: { ...where, status: { not: "pending" } },
                    select: { id: true, folio: true, channel: true, createdAt: true, status: true },
                    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                    take: 4 - firstPending.length,
                  })
                : []
            return { count, pending, recent: [...firstPending, ...others] }
          })()
        : undefined
      const events = readEvents
        ? {
            count: await tx.event.count({ where: { date: dates } }),
            recent: await tx.event.findMany({
              where: { date: dates },
              select: { id: true, folio: true, sector: true, date: true, type: { select: { name: true } } },
              orderBy: [{ date: "desc" }, { id: "desc" }],
              take: 4,
            }),
          }
        : undefined
      return { ...result, ...(requests && { requests }), ...(events && { events }) }
    },
    { isolationLevel: "RepeatableRead" },
  )
}
