export function RecordAuthor({ name, description }: { name: string; description: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="bg-ink flex size-[30px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
      >
        {initials || "—"}
      </span>
      <div className="min-w-0">
        <strong className="break-words">{name}</strong>
        <p>{description}</p>
      </div>
    </div>
  )
}
