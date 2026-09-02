'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CalendarCheck, Clock, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { PageHeader, PageContainer, EmptyState } from '@/components/dashboard/shared';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockAppointments } from '@/lib/mock-data';
import { formatAppointmentDate, formatTime, formatCurrency } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

export function StaffDashboard() {
  const { user } = useAuth();

  const myAppointments = useMemo(
    () =>
      mockAppointments
        .filter((a) => a.staff_id === 'st1') // Maria Rodriguez
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    []
  );

  const now = new Date();
  const today = myAppointments.filter((a) => {
    const d = new Date(a.start_time);
    return d.toDateString() === now.toDateString();
  });

  const upcoming = myAppointments.filter(
    (a) => new Date(a.start_time) > now && ['pending', 'confirmed'].includes(a.status)
  );

  const completed = myAppointments.filter((a) => a.status === 'completed');
  const cancelled = myAppointments.filter((a) => a.status === 'cancelled' || a.status === 'no_show');

  const stats = [
    { label: "Today's appointments", value: String(today.length), icon: CalendarCheck },
    { label: 'Upcoming', value: String(upcoming.length), icon: Clock },
    { label: 'Completed', value: String(completed.length), icon: CheckCircle2 },
    { label: 'Cancelled / no-show', value: String(cancelled.length), icon: XCircle },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={`Hi, ${user?.full_name.split(' ')[0]}`}
        description="Here's your schedule and appointments at Luxe Hair Studio."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-border/60">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">Today's schedule</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/schedule">Full schedule</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {today.length === 0 ? (
                <EmptyState
                  icon={CalendarCheck}
                  title="No appointments today"
                  description="Enjoy your day — you have nothing scheduled."
                />
              ) : (
                <div className="space-y-3">
                  {today.map((apt) => (
                    <div key={apt.id} className="rounded-lg border border-border/60 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{apt.customer_name}</p>
                          <p className="text-sm text-muted-foreground">{apt.service_name}</p>
                        </div>
                        <StatusBadge status={apt.status} />
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" /> {formatTime(apt.start_time)} ({apt.duration_minutes} min)
                        </span>
                        <span>{formatCurrency(apt.price)}</span>
                      </div>
                      {apt.status === 'confirmed' && (
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline">Mark completed</Button>
                          <Button size="sm" variant="ghost" className="text-destructive">Cancel</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Upcoming this week</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
              ) : (
                upcoming.slice(0, 5).map((apt) => (
                  <div key={apt.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{apt.customer_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatAppointmentDate(apt.start_time)} · {formatTime(apt.start_time)}
                      </p>
                    </div>
                    <StatusBadge status={apt.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Your performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completion rate</span>
                <span className="text-sm font-medium">96%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">This month's revenue</span>
                <span className="text-sm font-medium">{formatCurrency(2480)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg. rating</span>
                <span className="flex items-center gap-1 text-sm font-medium">
                  4.9 <TrendingUp className="h-3 w-3 text-success" />
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
