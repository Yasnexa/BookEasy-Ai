import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';

export function formatAppointmentDate(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return `Today, ${format(d, 'MMM d')}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, 'MMM d')}`;
  if (isYesterday(d)) return `Yesterday, ${format(d, 'MMM d')}`;
  return format(d, 'EEE, MMM d, yyyy');
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), 'h:mm a');
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
