import { REQUEST_STATUS_LABELS, type RequestStatus } from "../schemas"

const tone: Record<RequestStatus, string> = {
  pending: "border-amber-300 bg-amber-50 text-amber-900",
  attended: "border-emerald-300 bg-emerald-50 text-emerald-900",
  cancelled: "text-muted-foreground",
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`delivery-badge ${tone[status]}`}>{REQUEST_STATUS_LABELS[status]}</span>
}
