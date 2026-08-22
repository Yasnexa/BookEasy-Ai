import type { AppointmentStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const statusConfig: Record<AppointmentStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-warning/10 text-warning border-warning/20' },
  confirmed: { label: 'Confirmed', className: 'bg-success/10 text-success border-success/20' },
  rescheduled: { label: 'Rescheduled', className: 'bg-primary/10 text-primary border-primary/20' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  completed: { label: 'Completed', className: 'bg-secondary text-secondary-foreground border-border' },
  no_show: { label: 'No-show', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

export { statusConfig };
