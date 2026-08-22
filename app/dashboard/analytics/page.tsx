'use client';

import { useMemo } from 'react';
import { TrendingUp, DollarSign, CalendarCheck, Users, Star } from 'lucide-react';
import { PageHeader, PageContainer } from '@/components/dashboard/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockAppointments, mockCustomers } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/format';

export default function AnalyticsPage() {
  const appointments = mockAppointments.filter((a) => a.business_id === 'b1');

  const totalRevenue = appointments
    .filter((a) => a.status === 'completed')
    .reduce((sum, a) => sum + a.price, 0);

  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const cancelledCount = appointments.filter((a) => a.status === 'cancelled' || a.status === 'no_show').length;
  const completionRate = completedCount + cancelledCount > 0
    ? Math.round((completedCount / (completedCount + cancelledCount)) * 100)
    : 0;

  const customerCount = mockCustomers.filter((c) => c.business_id === 'b1').length;

  // Revenue by day (last 7 days mock)
  const revenueData = [
    { day: 'Mon', revenue: 340 },
    { day: 'Tue', revenue: 520 },
    { day: 'Wed', revenue: 280 },
    { day: 'Thu', revenue: 610 },
    { day: 'Fri', revenue: 780 },
    { day: 'Sat', revenue: 920 },
    { day: 'Sun', revenue: 210 },
  ];
  const maxRevenue = Math.max(...revenueData.map((d) => d.revenue));

  // Service breakdown
  const serviceBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    appointments.forEach((a) => {
      const existing = map.get(a.service_name) || { count: 0, revenue: 0 };
      map.set(a.service_name, {
        count: existing.count + 1,
        revenue: existing.revenue + (a.status === 'completed' ? a.price : 0),
      });
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  }, []);

  const stats = [
    { label: 'Total revenue', value: formatCurrency(totalRevenue), icon: DollarSign, trend: '+12%' },
    { label: 'Total appointments', value: String(appointments.length), icon: CalendarCheck, trend: '+8%' },
    { label: 'Completion rate', value: `${completionRate}%`, icon: TrendingUp, trend: '+3%' },
    { label: 'Active customers', value: String(customerCount), icon: Users, trend: '+2' },
  ];

  return (
    <PageContainer>
      <PageHeader title="Analytics" description="Track your business performance and trends." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <stat.icon className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="text-xs text-success">{stat.trend}</Badge>
              </div>
              <p className="mt-4 text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Revenue chart */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Revenue (last 7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-end justify-between gap-2">
              {revenueData.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-md bg-primary transition-all hover:bg-primary/80"
                      style={{ height: `${(d.revenue / maxRevenue) * 100}%` }}
                      title={`${formatCurrency(d.revenue)}`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{d.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Service breakdown */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Service performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {serviceBreakdown.map((s) => {
              const maxCount = Math.max(...serviceBreakdown.map((x) => x.count));
              return (
                <div key={s.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground">{s.count} bookings · {formatCurrency(s.revenue)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary/70"
                      style={{ width: `${(s.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Customer satisfaction */}
      <Card className="mt-6 border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Customer satisfaction</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center">
                <Star className="h-8 w-8 fill-warning text-warning" />
                <span className="text-3xl font-bold">4.8</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Average rating</p>
            </div>
            <div className="text-center">
              <span className="text-3xl font-bold">124</span>
              <p className="mt-1 text-sm text-muted-foreground">Total reviews</p>
            </div>
            <div className="text-center">
              <span className="text-3xl font-bold">94%</span>
              <p className="mt-1 text-sm text-muted-foreground">Would recommend</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
