'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarCheck,
  Clock,
  Sparkles,
  Search,
  ChevronRight,
  Star,
  MapPin,
} from 'lucide-react';
import { PageHeader, PageContainer, EmptyState } from '@/components/dashboard/shared';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatAppointmentDate, formatTime } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { fetchAppointmentsByCustomer, fetchApprovedBusinesses } from '@/lib/api';
import type { Appointment, Business } from '@/lib/types';

export function CustomerDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [recommended, setRecommended] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [appts, businesses] = await Promise.all([
      fetchAppointmentsByCustomer(user.id),
      fetchApprovedBusinesses(),
    ]);
    setAppointments(appts);
    setRecommended(businesses.slice(0, 3));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const now = new Date();
  const upcoming = appointments
    .filter((a) => new Date(a.start_time) > now && ['pending', 'confirmed'].includes(a.status))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const past = appointments.filter(
    (a) => new Date(a.start_time) <= now || ['completed', 'cancelled', 'no_show'].includes(a.status)
  );

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
        title={`Hello, ${user?.full_name.split(' ')[0]}`}
        description="Manage your appointments and discover new businesses."
        action={
          <Button asChild>
            <Link href="/dashboard/search">
              <Search className="mr-2 h-4 w-4" /> Find a business
            </Link>
          </Button>
        }
      />

      {/* Upcoming appointments */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-border/60">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">Upcoming appointments</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/appointments">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <EmptyState
                  icon={CalendarCheck}
                  title="No upcoming appointments"
                  description="Browse businesses and book your next appointment in seconds."
                  action={
                    <Button asChild size="sm">
                      <Link href="/dashboard/search">Find a business</Link>
    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {upcoming.map((apt) => (
                    <div key={apt.id} className="rounded-lg border border-border/60 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{apt.service_name}</p>
                          <p className="text-sm text-muted-foreground">{apt.staff_name}</p>
                        </div>
                        <StatusBadge status={apt.status} />
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <CalendarCheck className="h-4 w-4" /> {formatAppointmentDate(apt.start_time)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" /> {formatTime(apt.start_time)}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="outline" size="sm">Reschedule</Button>
                        <Button variant="ghost" size="sm" className="text-destructive">Cancel</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past appointments */}
          {past.length > 0 && (
            <Card className="mt-6 border-border/60">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Past appointments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {past.slice(0, 4).map((apt) => (
                  <div key={apt.id} className="flex items-center gap-4 rounded-lg border border-border/60 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{apt.service_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{formatAppointmentDate(apt.start_time)} · {formatTime(apt.start_time)}</p>
                    </div>
                    <StatusBadge status={apt.status} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* AI Assistant card */}
          <Card className="border-primary/30 bg-accent/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">AI Appointment Assistant</p>
                  <p className="text-xs text-muted-foreground">Book with natural language</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Just say what you want — "I want a haircut tomorrow evening" — and the assistant finds the right slot.
              </p>
              <Button className="mt-4 w-full" asChild>
                <Link href="/dashboard/assistant">Open assistant</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recommended businesses */}
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Recommended for you</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommended.length === 0 ? (
                <p className="text-sm text-muted-foreground">No businesses available yet.</p>
              ) : (
                recommended.map((b) => (
                  <Link
                    key={b.id}
                    href={`/dashboard/search/business?business=${b.slug}`}
                    className="block rounded-lg border border-border/60 p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{b.name}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {b.city}
                        </p>
                      </div>
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Star className="h-3 w-3 fill-current text-warning" /> {b.rating}
                      </Badge>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
