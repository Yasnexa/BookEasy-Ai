'use client';

import { CreditCard, TrendingUp, DollarSign } from 'lucide-react';
import { PageHeader, PageContainer } from '@/components/dashboard/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { mockBusinesses } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/format';

const planPrices: Record<string, number> = { free: 0, starter: 29, pro: 79, enterprise: 199 };

export default function SubscriptionsPage() {
  const subscriptions = mockBusinesses.map((b) => ({
    id: `sub-${b.id}`,
    business: b.name,
    plan: b.subscription_plan,
    status: b.subscription_status,
    amount: planPrices[b.subscription_plan] || 0,
    period: 'monthly',
  }));

  const totalMRR = subscriptions.reduce((sum, s) => sum + s.amount, 0);

  const stats = [
    { label: 'Monthly recurring revenue', value: formatCurrency(totalMRR), icon: DollarSign },
    { label: 'Active subscriptions', value: String(subscriptions.filter((s) => s.status === 'active').length), icon: CreditCard },
    { label: 'Trials', value: String(subscriptions.filter((s) => s.status === 'trialing').length), icon: TrendingUp },
    { label: 'Annual run rate', value: formatCurrency(totalMRR * 12), icon: TrendingUp },
  ];

  return (
    <PageContainer>
      <PageHeader title="Subscriptions" description="Manage business subscription plans and billing." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/60">
            <CardContent className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Business subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.business}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{sub.plan}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={sub.status === 'active' ? 'text-success' : sub.status === 'trialing' ? 'text-warning' : ''}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(sub.amount)}/mo</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{sub.period}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline">Manage</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
