'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CreditCard, Calendar, Receipt, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/dashboard/shared';
import { supabase } from '@/lib/supabase-client';
import { useBusiness } from '@/lib/business-context';
import type { Subscription, Payment, Plan, BillingCurrency } from '@/lib/types';

const CURRENCY_STORAGE_KEY = 'bookeasy_billing_currency';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatAmount(amount: number, currency: BillingCurrency): string {
  if (currency === 'pkr') return `PKR ${amount.toLocaleString('en-PK')}`;
  return `$${amount.toFixed(2)}`;
}

export function BillingSection() {
  const { business } = useBusiness();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBillingData = useCallback(async () => {
    if (!business) {
      setLoading(false);
      return;
    }
    const [subRes, paymentsRes, plansRes] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .maybeSingle(),
      supabase
        .from('payments')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ]);

    if (subRes.data) setSubscription(subRes.data as unknown as Subscription);
    if (paymentsRes.data) setPayments(paymentsRes.data as unknown as Payment[]);
    if (plansRes.data) setPlans(plansRes.data as unknown as Plan[]);
    setLoading(false);
  }, [business]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  if (loading) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Billing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-5 w-48 animate-pulse rounded bg-muted" />
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!business) {
    return null;
  }

  const currentPlanName = subscription?.plan || business.subscription_plan || 'free';
  const currentPlan = plans.find((p) => p.plan_key === currentPlanName);
  const subStatus = subscription?.status || business.subscription_status || 'trialing';

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4" /> Billing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current plan summary */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current plan</p>
            <p className="mt-1 text-lg font-semibold capitalize">{currentPlanName}</p>
            {currentPlan && (
              <p className="text-sm text-muted-foreground">
                {currentPlan.price_pkr === 0
                  ? 'Free forever'
                  : `PKR ${currentPlan.price_pkr.toLocaleString('en-PK')} / $${currentPlan.price_usd} per month`}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-border/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subscription status</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant="secondary"
                className={subStatus === 'active' ? 'text-success' : subStatus === 'trialing' ? 'text-warning' : ''}
              >
                {subStatus}
              </Badge>
            </div>
            {subscription?.billing_currency && (
              <p className="mt-2 text-sm text-muted-foreground">
                Billing currency: <span className="font-medium uppercase">{subscription.billing_currency}</span>
              </p>
            )}
          </div>
          <div className="rounded-lg border border-border/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Billing period</p>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{formatDate(subscription?.current_period_start || null)} — {formatDate(subscription?.current_period_end || null)}</span>
            </div>
          </div>
          <div className="rounded-lg border border-border/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment provider</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {subscription?.payment_provider ? (
                <span className="font-medium capitalize">{subscription.payment_provider}</span>
              ) : (
                'Not connected yet'
              )}
            </p>
          </div>
        </div>

        {/* Upgrade button */}
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-accent/30 p-4">
          <div>
            <p className="text-sm font-medium">Want more features?</p>
            <p className="text-xs text-muted-foreground">Upgrade to Starter or Pro to unlock more.</p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href="/#pricing">
              Change plan <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Payment history */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Payment history</h4>
          </div>
          {payments.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No payments yet"
              description="When you upgrade to a paid plan, your payment history will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 pr-4 font-medium">Amount</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Provider</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-border/40">
                      <td className="py-3 pr-4">{formatDate(payment.paid_at || payment.created_at)}</td>
                      <td className="py-3 pr-4 font-medium">{formatAmount(payment.amount, payment.currency)}</td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant="secondary"
                          className={payment.status === 'succeeded' ? 'text-success' : payment.status === 'failed' ? 'text-destructive' : ''}
                        >
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 capitalize text-muted-foreground">{payment.payment_provider || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
