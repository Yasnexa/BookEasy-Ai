'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { PageHeader, PageContainer } from '@/components/dashboard/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockBusinesses, mockAppointments } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

export function AdminDashboard() {
  const { user } = useAuth();

  const stats = [
    { label: 'Total businesses', value: String(mockBusinesses.length), icon: Building2, trend: '+1 this week' },
    { label: 'Pending approvals', value: String(mockBusinesses.filter((b) => b.status === 'pending').length), icon: Clock, trend: 'Awaiting review' },
    { label: 'Total users', value: '1,284', icon: Users, trend: '+34 this week' },
    { label: 'Monthly revenue', value: formatCurrency(12480), icon: DollarSign, trend: '+18%' },
  ];

  const recentBusinesses = mockBusinesses.slice(0, 4);
  const pendingBusinesses = mockBusinesses.filter((b) => b.status === 'pending');

  return (
    <PageContainer>
      <PageHeader
        title="Platform overview"
        description="Monitor and manage all businesses, users, and subscriptions."
        action={
          <Button variant="outline" asChild>
            <Link href="/dashboard/businesses">Manage businesses</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <stat.icon className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="text-xs">{stat.trend}</Badge>
              </div>
              <p className="mt-4 text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Pending approvals */}
        <div className="lg:col-span-2">
          <Card className="border-border/60">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">Pending business approvals</CardTitle>
              <Badge variant="secondary" className="gap-1">
                <AlertTriangle className="h-3 w-3 text-warning" /> {pendingBusinesses.length} pending
              </Badge>
            </CardHeader>
            <CardContent>
              {pendingBusinesses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No businesses awaiting approval.</p>
              ) : (
                <div className="space-y-3">
                  {pendingBusinesses.map((b) => (
                    <div key={b.id} className="flex items-center gap-4 rounded-lg border border-border/60 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{b.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{b.category} · {b.city}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">Review</Button>
                        <Button size="sm">Approve</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent businesses */}
          <Card className="mt-6 border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">All businesses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentBusinesses.map((b) => (
                <div key={b.id} className="flex items-center gap-4 rounded-lg border border-border/60 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{b.category} · {b.city}</p>
                  </div>
                  <Badge
                    variant={b.status === 'approved' ? 'default' : 'secondary'}
                    className={
                      b.status === 'pending'
                        ? 'bg-warning/10 text-warning'
                        : b.status === 'suspended'
                        ? 'bg-destructive/10 text-destructive'
                        : ''
                    }
                  >
                    {b.status}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
              <Link
                href="/dashboard/businesses"
                className="flex items-center justify-center gap-1 pt-2 text-sm text-primary hover:underline"
              >
                View all businesses <ChevronRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Platform health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active businesses</span>
                  <span className="font-medium">3 / 4</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-success" style={{ width: '75%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Trial conversions</span>
                  <span className="font-medium">62%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: '62%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Monthly churn</span>
                  <span className="font-medium">3.2%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-destructive" style={{ width: '3%' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { text: 'Sharp Cuts Barbershop registered', time: '2h ago' },
                { text: 'Luxe Hair Studio upgraded to Pro', time: '5h ago' },
                { text: 'New customer: David Lee', time: '1d ago' },
                { text: 'The Gentleman Barber renewed subscription', time: '2d ago' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
