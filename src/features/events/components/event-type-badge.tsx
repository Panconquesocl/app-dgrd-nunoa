import "./events.css"
export function EventTypeBadge({ name }: { name: string }) {
  const n = name.toLowerCase()
  const tone =
    n.includes("anegamiento") || n.includes("inundac")
      ? "blue"
      : n.includes("incendio") || n.includes("sismo")
        ? "red"
        : n.includes("vendaval") || n.includes("viento")
          ? "amber"
          : n.includes("social")
            ? "yellow"
            : "neutral"
  return <span className={`events-type events-type-${tone}`}>{name}</span>
}
