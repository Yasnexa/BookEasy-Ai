'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import type { Plan, BillingCurrency } from '@/lib/types';

const CURRENCY_STORAGE_KEY = 'bookeasy_billing_currency';

const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || '';
const PADDLE_STARTER_PRICE_ID = process.env.NEXT_PUBLIC_PADDLE_STARTER_PRICE_ID || '';
const PADDLE_PRO_PRICE_ID = process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID || '';

if (typeof window !== 'undefined') {
  console.log('[paddle] env check:', {
    hasClientToken: Boolean(PADDLE_CLIENT_TOKEN),
    hasStarterPriceId: Boolean(PADDLE_STARTER_PRICE_ID),
    hasProPriceId: Boolean(PADDLE_PRO_PRICE_ID),
  });
}

const PRICE_IDS: Record<string, string> = {
  starter: PADDLE_STARTER_PRICE_ID,
  pro: PADDLE_PRO_PRICE_ID,
};

export function PricingSection() {
  const { user } = useAuth();
  const [currency, setCurrency] = useState<BillingCurrency>('pkr');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

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

  useEffect(() => {
    if (!PADDLE_CLIENT_TOKEN) {
      console.warn('[paddle] NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not set. Paddle checkout will not be available. Add it to the .env file (not just Bolt Secrets).');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        console.log('[paddle] initializing in sandbox mode...');
        const paddleInstance = await initializePaddle({
          environment: 'sandbox',
          token: PADDLE_CLIENT_TOKEN,
        });
        if (cancelled) return;
        if (paddleInstance) {
          setPaddle(paddleInstance);
          console.log('[paddle] initialized successfully');
        } else {
          console.error('[paddle] initializePaddle returned undefined');
        }
      } catch (err) {
        console.error('[paddle] initialization failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const openCheckout = useCallback(
    (planName: string) => {
      const priceId = PRICE_IDS[planName];
      if (!paddle) {
        console.error('[paddle] cannot open checkout: Paddle SDK not initialized. Check that NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is set in .env');
        return;
      }
      if (!priceId) {
        console.error(`[paddle] cannot open checkout: no price ID configured for plan "${planName}". Check NEXT_PUBLIC_PADDLE_${planName.toUpperCase()}_PRICE_ID in .env`);
        return;
      }

      setCheckoutLoading(planName);
      try {
        console.log(`[paddle] opening checkout for ${planName} with priceId: ${priceId}`, user?.email ? `email: ${user.email}` : 'no email prefill');
        paddle.Checkout.open({
          items: [{ priceId, quantity: 1 }],
          ...(user?.email ? { customer: { email: user.email } } : {}),
        });
      } catch (err) {
        console.error('[paddle] checkout open error:', err);
      } finally {
        setCheckoutLoading(null);
      }
    },
    [paddle, user],
  );

  const handlePlanClick = useCallback(
    (planName: string) => {
      if (planName === 'free') return;
      if (!PADDLE_CLIENT_TOKEN || !PRICE_IDS[planName]) {
        return;
      }
      openCheckout(planName);
    },
    [openCheckout],
  );

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
  const paddleConfigured = Boolean(PADDLE_CLIENT_TOKEN && PADDLE_STARTER_PRICE_ID && PADDLE_PRO_PRICE_ID);

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
          : plans.map((plan) => {
              const isFree = plan.name === 'free';
              const isPaid = plan.name in PRICE_IDS;
              const showPaddleButton = isPaid && paddleConfigured;

              return (
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
                    {isFree ? (
                      <Button
                        className="mt-8 w-full"
                        variant="outline"
                        asChild
                      >
                        <Link href="/signup">Start free</Link>
                      </Button>
                    ) : showPaddleButton ? (
                      <Button
                        className="mt-8 w-full"
                        variant={plan.name === highlightedPlan ? 'default' : 'outline'}
                        disabled={checkoutLoading === plan.name}
                        onClick={() => handlePlanClick(plan.name)}
                      >
                        {checkoutLoading === plan.name ? 'Opening checkout...' : 'Choose plan'}
                      </Button>
                    ) : (
                      <Button
                        className="mt-8 w-full"
                        variant={plan.name === highlightedPlan ? 'default' : 'outline'}
                        asChild
                      >
                        <Link href="/signup">Choose plan</Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
      </div>
    </div>
  );
}
