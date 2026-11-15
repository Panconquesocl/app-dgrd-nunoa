import { REQUEST_STATUS_LABELS, type RequestStatus } from "../schemas"
import "./requests.css"

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`requests-status requests-status-${status}`}>
      <span aria-hidden="true" />
      {REQUEST_STATUS_LABELS[status]}
    </span>
  )
}
