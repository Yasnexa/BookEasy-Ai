'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarCheck,
  DollarSign,
  Users,
  Plus,
  TrendingUp,
  ChevronRight,
  Store,
  ExternalLink,
  Scissors,
  Star,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import {
  PageHeader,
  PageContainer,
  EmptyState,
  ErrorState,
  Skeleton,
  StatSkeleton,
  AppointmentRowSkeleton,
} from '@/components/dashboard/shared';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatAppointmentDate, formatTime, formatCurrency } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import { useBusiness } from '@/lib/business-context';
import {
  fetchAppointmentsByBusiness,
  fetchServicesByBusiness,
  fetchStaffByBusiness,
  fetchReviewSummaryByBusiness,
} from '@/lib/api';
import type { Appointment, Service, Staff } from '@/lib/types';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function BusinessDashboard() {
  const { user } = useAuth();
  const { business, loading: loadingBusiness } = useBusiness();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [reviewSummary, setReviewSummary] = useState<{ average: number; count: number } | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    if (!user || !business) return;
    setLoadingData(true);
    setError(false);
    try {
      const [appts, svcs, stf, reviews] = await Promise.all([
        fetchAppointmentsByBusiness(business.id),
        fetchServicesByBusiness(business.id),
        fetchStaffByBusiness(business.id),
        fetchReviewSummaryByBusiness(business.id),
      ]);
      setAppointments(appts);
      setServices(svcs);
      setStaff(stf);
      setReviewSummary(reviews);
    } catch (e) {
      console.error('[dashboard] loadData error:', e);
      setError(true);
    } finally {
      setLoadingData(false);
    }
  }, [user, business]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loading = loadingBusiness || (loadingData && !!business);
  const ownerFirst = user?.full_name.split(' ')[0] ?? 'there';

  const now = new Date();
  const todayAppointments = appointments
    .filter((a) => new Date(a.start_time).toDateString() === now.toDateString())
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const upcoming = appointments
    .filter((a) => new Date(a.start_time) > now && ['pending', 'confirmed', 'rescheduled'].includes(a.status))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const completed = appointments.filter((a) => a.status === 'completed');

  const todayRevenue = todayAppointments
    .filter((a) => a.status === 'completed' || a.status === 'confirmed')
    .reduce((sum, a) => sum + a.price, 0);

  const monthRevenue = appointments
    .filter((a) => {
      const d = new Date(a.start_time);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear() &&
        (a.status === 'completed' || a.status === 'confirmed')
      );
    })
    .reduce((sum, a) => sum + a.price, 0);

  const weekAppointments = appointments.filter((a) => {
    const d = new Date(a.start_time);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return d >= weekStart && d < weekEnd;
  });

  const uniqueCustomers = new Map<string, { full_name: string; total_visits: number; last_visit: string }>();
  appointments.forEach((a) => {
    if (!uniqueCustomers.has(a.customer_id)) {
      uniqueCustomers.set(a.customer_id, {
        full_name: a.customer_name,
        total_visits: 1,
        last_visit: a.start_time,
      });
    } else {
      const c = uniqueCustomers.get(a.customer_id)!;
      c.total_visits += 1;
      if (new Date(a.start_time) > new Date(c.last_visit)) c.last_visit = a.start_time;
    }
  });

  const resolvedAppointments = appointments.filter(
    (appointment) => !['pending', 'confirmed', 'rescheduled'].includes(appointment.status)
  );
  const completionRate =
    resolvedAppointments.length > 0
      ? Math.round((completed.length / resolvedAppointments.length) * 100)
      : null;

  const recentActivity = [...appointments]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const websiteHref =
    process.env.NODE_ENV === 'development' && business
      ? `/${business.slug}`
      : business
        ? `https://${business.slug}.bookeasy.ai`
        : '#';

  if (loading) {
    return (
      <PageContainer>
        <div className="mb-6 space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <AppointmentRowSkeleton key={i} />
            ))}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorState
          title="Could not load your dashboard"
          description="Something went wrong while loading your business data. Please try again."
          onRetry={loadData}
        />
      </PageContainer>
    );
  }

  if (!business) {
    return (
      <PageContainer>
        <PageHeader
          title={`${getGreeting()}, ${ownerFirst}`}
          description="Set up your business to start accepting appointments."
        />
        <EmptyState
          icon={Store}
          title="No business yet"
          description="Create your business profile to start accepting appointments from customers."
          action={
            <Button asChild>
              <Link href="/dashboard/business">Create your business</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const primaryColor = business.primary_color;
  const accentColor = business.accent_color;

  const kpis = [
    {
      label: "Today's Appointments",
      value: String(todayAppointments.length),
      icon: CalendarCheck,
      sub: `${upcoming.length} upcoming`,
    },
    {
      label: "Today's Revenue",
      value: formatCurrency(todayRevenue),
      icon: DollarSign,
      sub: `${formatCurrency(monthRevenue)} this month`,
    },
    {
      label: 'Total Customers',
      value: String(uniqueCustomers.size),
      icon: Users,
      sub: `${weekAppointments.length} appts this week`,
    },
    {
      label: 'Completion Rate',
      value: completionRate !== null ? `${completionRate}%` : '—',
      icon: TrendingUp,
      sub: completionRate !== null ? `${completed.length} completed` : 'No history yet',
    },
  ];

  const quickActions = [
    { label: 'New Appointment', href: '/dashboard/appointments', icon: Plus, primary: true },
    { label: 'Manage Services', href: '/dashboard/services', icon: Scissors, primary: false },
    { label: 'Manage Staff', href: '/dashboard/staff', icon: Users, primary: false },
    { label: 'View Business Page', href: websiteHref, icon: ExternalLink, primary: false, external: true },
  ];

  const snapshot = [
    { label: 'Active Services', value: String(services.length), icon: Scissors, href: '/dashboard/services' },
    { label: 'Active Staff', value: String(staff.length), icon: Users, href: '/dashboard/staff' },
    { label: 'Customers', value: String(uniqueCustomers.size), icon: Users, href: '/dashboard/customers' },
    {
      label: 'Business Rating',
      value:
        reviewSummary && reviewSummary.count > 0
          ? reviewSummary.average.toFixed(1)
          : 'No ratings yet',
      icon: Star,
      href: '/dashboard/business',
    },
  ];

  return (
    <PageContainer>
      {/* Welcome + Quick Actions */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()}, {ownerFirst}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with {business.name} today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) =>
            action.external ? (
              <Button key={action.label} variant={action.primary ? 'default' : 'outline'} asChild>
                <a href={action.href} target="_blank" rel="noopener noreferrer">
                  <action.icon className="mr-2 h-4 w-4" /> {action.label}
                </a>
              </Button>
            ) : (
              <Button key={action.label} variant={action.primary ? 'default' : 'outline'} asChild>
                <Link href={action.href}>
                  <action.icon className="mr-2 h-4 w-4" /> {action.label}
                </Link>
              </Button>
            )
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border/60 transition-shadow hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                >
                  <kpi.icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-2xl font-bold">{kpi.value}</p>
              <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left column: Today's Schedule + Upcoming */}
        <div className="space-y-6 lg:col-span-2">
          {/* Today's Schedule */}
          <Card className="border-border/60">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">Today&apos;s Schedule</CardTitle>
              <Link
                href="/dashboard/appointments"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {todayAppointments.length === 0 ? (
                <EmptyState
                  icon={CalendarCheck}
                  title="No appointments scheduled for today"
                  description="Your schedule is clear. Enjoy the breather, or add a new appointment."
                  action={
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/dashboard/appointments">
                        <Plus className="mr-2 h-4 w-4" /> New appointment
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {todayAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center gap-4 rounded-lg border border-border/60 p-3 transition-colors hover:bg-accent/40"
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}
                      >
                        <span className="text-xs font-semibold leading-none">
                          {formatTime(apt.start_time).split(' ')[0]}
                        </span>
                        <span className="text-[10px] leading-none opacity-70">
                          {formatTime(apt.start_time).split(' ')[1]}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{apt.customer_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {apt.service_name} · {apt.staff_name}
                        </p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-sm font-medium">{formatCurrency(apt.price)}</p>
                      </div>
                      <StatusBadge status={apt.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card className="border-border/60">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">Upcoming Appointments</CardTitle>
              <Link
                href="/dashboard/appointments"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="No upcoming appointments"
                  description="New booking requests and confirmed appointments will appear here."
                  action={
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/dashboard/appointments">View all appointments</Link>
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {upcoming.slice(0, 5).map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center gap-4 rounded-lg border border-border/60 p-3 transition-colors hover:bg-accent/40"
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                      >
                        <span className="text-xs font-semibold leading-none">
                          {new Date(apt.start_time).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-base font-bold leading-none">
                          {new Date(apt.start_time).getDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{apt.customer_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {apt.service_name} · {apt.staff_name}
                        </p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-sm font-medium">{formatTime(apt.start_time)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatAppointmentDate(apt.start_time).split(',')[0]}
                        </p>
                      </div>
                      <StatusBadge status={apt.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Business Snapshot + Profile Preview + Recent Activity */}
        <div className="space-y-6">
          {/* Business Snapshot */}
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Business Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {snapshot.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <item.icon className="h-5 w-5" style={{ color: primaryColor }} />
                  <div>
                    <p className="text-xl font-bold">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Public Business Page Preview */}
          <Card className="border-border/60 overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Your Public Booking Page</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div
                className="h-20"
                style={{
                  background: business.cover_url
                    ? `url(${business.cover_url}) center/cover`
                    : `linear-gradient(135deg, ${primaryColor}25, ${accentColor}40, ${primaryColor}10)`,
                }}
              />
              <div className="p-4">
                <div className="flex items-center gap-3">
                  {business.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt={`${business.name} logo`}
                      className="-mt-8 h-12 w-12 rounded-xl border-2 border-card object-cover shadow-sm"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div
                      className="-mt-8 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-card text-lg font-bold shadow-sm"
                      style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                    >
                      {business.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold" style={{ color: primaryColor }}>
                      {business.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {business.category} · {business.city}
                    </p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                  {business.description || `${business.name} offers a professional experience in ${business.city}.`}
                </p>
                <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                  <a href={websiteHref} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-3.5 w-3.5" /> View public page
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivity.map((apt) => (
                  <div key={apt.id} className="flex items-start gap-3">
                    <div
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}
                    >
                      <CalendarCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">
                        {apt.customer_name} booked {apt.service_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatAppointmentDate(apt.start_time)} · {formatTime(apt.start_time)}
                      </p>
                    </div>
                    <StatusBadge status={apt.status} />
                  </div>
                ))}
                <Link
                  href="/dashboard/appointments"
                  className="flex items-center justify-center gap-1 pt-2 text-xs font-medium text-primary hover:underline"
                >
                  All appointments <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Analytics Preview */}
          <Card className="border-border/60">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">Analytics Preview</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Appointments this week</span>
                <span className="text-sm font-bold">{weekAppointments.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Revenue this month</span>
                <span className="text-sm font-bold">{formatCurrency(monthRevenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total appointments</span>
                <span className="text-sm font-bold">{appointments.length}</span>
              </div>
              <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                <Link href="/dashboard/analytics">
                  <BarChartIcon /> View full analytics
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

function BarChartIcon() {
  return <TrendingUp className="mr-2 h-3.5 w-3.5" />;
}
