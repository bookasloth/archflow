import { Badge } from '@/components/ui/Badge'
import { STATUS_LABEL, type InvoiceStatus } from '@/lib/invoice/rules'

// Full literal class strings (Tailwind scanner). Color only where it means something.
const CLS: Record<InvoiceStatus, string> = {
  draft: 'bg-surface-hover text-ink-muted',
  issued: 'bg-info-soft text-info',
  partially_paid: 'bg-warning-soft text-warning',
  paid: 'bg-success-soft text-success',
  overdue: 'bg-danger-soft text-danger',
  cancelled: 'bg-surface-hover text-ink-faint line-through',
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge className={CLS[status]}>{STATUS_LABEL[status]}</Badge>
}
