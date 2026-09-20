'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase-client';
import type { Plan, BillingCurrency } from '@/lib/types';

const CURRENCY_STORAGE_KEY = 'bookeasy_billing_currency';

export function PricingSection() {
  const [currency, setCurrency] = useState<BillingCurrency>('pkr');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(CURRENCY_STORAGE_KEY) : null;
    if (stored === 'pkr' || stored === 'usd') setCurrency(stored);
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (!error && data) {
        setPlans(data as unknown as Plan[]);
      }
      setLoading(false);
    })();
  }, []);

  const toggleCurrency = () => {
    const next = currency === 'pkr' ? 'usd' : 'pkr';
    setCurrency(next);
    if (typeof window !== 'undefined') localStorage.setItem(CURRENCY_STORAGE_KEY, next);
  };

  const formatPrice = (plan: Plan) => {
    if (currency === 'pkr') {
      return plan.price_pkr === 0 ? 'PKR 0' : `PKR ${plan.price_pkr.toLocaleString('en-PK')}`;
    }
    return plan.price_usd === 0 ? '$0' : `$${plan.price_usd}`;
  };

  const highlightedPlan = 'starter';

  return (
    <div>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, transparent pricing</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Start free. Upgrade when you grow. No hidden fees, cancel anytime.
        </p>
      </div>

      <div className="mt-8 flex items-center justify-center gap-3">
        <span className={`text-sm font-medium ${currency === 'pkr' ? 'text-foreground' : 'text-muted-foreground'}`}>PKR</span>
        <button
          onClick={toggleCurrency}
          className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary/20 transition-colors hover:bg-primary/30"
          aria-label="Toggle currency"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-primary transition-transform ${currency === 'usd' ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
        <span className={`text-sm font-medium ${currency === 'usd' ? 'text-foreground' : 'text-muted-foreground'}`}>USD</span>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {loading
          ? [0, 1, 2].map((i) => (
              <Card key={i} className="border-border/60">
                <CardContent className="p-6">
                  <div className="h-6 w-24 animate-pulse rounded bg-muted" />
                  <div className="mt-4 h-10 w-32 animate-pulse rounded bg-muted" />
                  <div className="mt-6 space-y-3">
                    {[0, 1, 2, 3].map((j) => (
                      <div key={j} className="h-4 w-full animate-pulse rounded bg-muted" />
                    ))}
                  </div>
                  <div className="mt-8 h-10 w-full animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))
          : plans.map((plan) => (
              <Card
                key={plan.id}
                className={plan.name === highlightedPlan ? 'border-primary shadow-lg ring-1 ring-primary/20' : 'border-border/60'}
              >
                <CardContent className="p-6">
                  {plan.name === highlightedPlan && (
                    <Badge className="mb-4 w-fit">Most popular</Badge>
                  )}
                  <h3 className="text-xl font-bold">{plan.display_name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{formatPrice(plan)}</span>
                    <span className="text-muted-foreground">/{plan.billing_interval === 'monthly' ? 'mo' : 'yr'}</span>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {(plan.features as string[]).map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-8 w-full"
                    variant={plan.name === highlightedPlan ? 'default' : 'outline'}
                    asChild
                  >
                    <Link href="/signup">{plan.name === 'free' ? 'Start free' : 'Choose plan'}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
