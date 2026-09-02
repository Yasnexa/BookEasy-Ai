'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, Plus, Search, ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, PageContainer, EmptyState } from '@/components/dashboard/shared';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatAppointmentDate, formatTime, formatCurrency } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import {
  fetchBusinessByOwner,
  fetchAppointmentsByBusiness,
  fetchAppointmentsByCustomer,
  updateAppointmentStatus,
} from '@/lib/api';
import type { AppointmentStatus, Appointment } from '@/lib/types';
import { RescheduleDialog } from '@/components/dashboard/reschedule-dialog';

const statusFilters: { value: 'all' | AppointmentStatus; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No-show' },
];

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);

  const loadAppointments = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    if (user.role === 'business_owner') {
      const biz = await fetchBusinessByOwner(user.id);
      if (biz) {
        const appts = await fetchAppointmentsByBusiness(biz.id);
        setAppointments(appts);
      }
    } else {
      const appts = await fetchAppointmentsByCustomer(user.id);
      setAppointments(appts);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleCancel = async (apt: Appointment) => {
    const ok = await updateAppointmentStatus(apt.id, 'cancelled');
    if (ok) {
      toast.success('Appointment cancelled.');
      loadAppointments();
    } else {
      toast.error('Failed to cancel appointment.');
    }
  };

  const handleApprove = async (apt: Appointment) => {
    const ok = await updateAppointmentStatus(apt.id, 'confirmed');
    if (ok) {
      toast.success('Appointment confirmed.');
      loadAppointments();
    } else {
      toast.error('Failed to confirm appointment.');
    }
  };

  const canManage = (apt: Appointment) =>
    ['pending', 'confirmed', 'rescheduled'].includes(apt.status) && new Date(apt.start_time) > new Date();

  const handleRescheduled = () => {
    setRescheduling(null);
    loadAppointments();
  };

  const filtered = appointments.filter((a) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !a.customer_name.toLowerCase().includes(q) &&
        !a.service_name.toLowerCase().includes(q) &&
        !a.staff_name.toLowerCase().includes(q)
      ) return false;
    }
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  }).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  const isOwner = user?.role === 'business_owner';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Appointments"
        description={isOwner ? "View and manage all appointments for your business." : "View your appointments."}
      />

      <Card className="border-border/60">
        <CardContent className="p-4 sm:p-6">
          {/* Filters */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by customer, service, or staff…"
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | AppointmentStatus)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusFilters.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No appointments found"
              description={appointments.length === 0 ? "No appointments yet." : "Try adjusting your search or filters."}
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isOwner && <TableHead>Customer</TableHead>}
                      <TableHead>Service</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Date & time</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((apt) => (
                      <TableRow key={apt.id}>
                        {isOwner && (
                          <TableCell>
                            <div>
                              <p className="font-medium">{apt.customer_name}</p>
                              <p className="text-xs text-muted-foreground">{apt.customer_email}</p>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>{apt.service_name}</TableCell>
                        <TableCell>{apt.staff_name}</TableCell>
                        <TableCell>
                          <p className="text-sm">{formatAppointmentDate(apt.start_time)}</p>
                          <p className="text-xs text-muted-foreground">{formatTime(apt.start_time)}</p>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(apt.price)}</TableCell>
                        <TableCell><StatusBadge status={apt.status} /></TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {isOwner && apt.status === 'pending' && (
                                <Button size="sm" variant="outline" onClick={() => handleApprove(apt)}>Approve</Button>
                              )}
                              {canManage(apt) && (
                                <Button size="sm" variant="outline" onClick={() => setRescheduling(apt)}>
                                  <CalendarClock className="mr-1 h-3.5 w-3.5" /> Reschedule
                                </Button>
                              )}
                              {canManage(apt) && <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="text-destructive">Cancel</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will cancel {apt.customer_name}'s {apt.service_name} on {formatAppointmentDate(apt.start_time)} at {formatTime(apt.start_time)}. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Keep appointment</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => handleCancel(apt)}
                                    >
                                      Yes, cancel it
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>}
                            </div>
                          </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {filtered.map((apt) => (
                  <div key={apt.id} className="rounded-lg border border-border/60 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        {isOwner && <p className="font-medium">{apt.customer_name}</p>}
                        <p className="text-sm text-muted-foreground">{apt.service_name} · {apt.staff_name}</p>
                      </div>
                      <StatusBadge status={apt.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{formatAppointmentDate(apt.start_time)} · {formatTime(apt.start_time)}</p>
                      <p className="text-sm font-medium">{formatCurrency(apt.price)}</p>
                    </div>
                    {canManage(apt) && (
                      <div className="mt-3 flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setRescheduling(apt)}>
                          <CalendarClock className="mr-1 h-3.5 w-3.5" /> Reschedule
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive">Cancel</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will cancel the {apt.service_name} appointment on {formatAppointmentDate(apt.start_time)} at {formatTime(apt.start_time)}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep appointment</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleCancel(apt)}>
                                Yes, cancel it
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination placeholder */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {filtered.length} appointments
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" disabled>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" disabled>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <RescheduleDialog
        appointment={rescheduling}
        open={rescheduling !== null}
        onOpenChange={(open) => { if (!open) setRescheduling(null); }}
        onRescheduled={handleRescheduled}
      />
    </PageContainer>
  );
}
