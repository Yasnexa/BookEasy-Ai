'use client';

import Link from 'next/link';
import {
  CalendarCheck,
  Sparkles,
  Clock,
  Users,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  Scissors,
  MessageSquare,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const features = [
  {
    icon: CalendarCheck,
    title: 'Smart Appointment Booking',
    description: 'Customers book in seconds. Real-time availability, automated confirmations, and zero double-bookings.',
  },
  {
    icon: Users,
    title: 'Staff & Schedule Management',
    description: 'Add staff, set working hours, and assign services. Each stylist sees only their own calendar.',
  },
  {
    icon: BarChart3,
    title: 'Business Analytics',
    description: 'Track revenue, bookings, no-shows, and customer trends with a clean, actionable dashboard.',
  },
  {
    icon: Bell,
    title: 'Automated Reminders',
    description: 'Reduce no-shows with automatic SMS and email reminders to customers before appointments.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access',
    description: 'Owners, staff, and customers each see only what they need. Secure by design, ready for RLS.',
  },
  {
    icon: Zap,
    title: 'AI Appointment Assistant',
    description: 'Customers say what they want in plain language. The assistant finds the right slot and books it.',
  },
];

const steps = [
  {
    icon: Users,
    step: '01',
    title: 'Set up your business',
    description: 'Create your profile, add your services, and invite your staff. Takes less than 10 minutes.',
  },
  {
    icon: CalendarCheck,
    step: '02',
    title: 'Share your booking link',
    description: 'Customers browse available services and pick a time that works — no phone calls needed.',
  },
  {
    icon: Sparkles,
    step: '03',
    title: 'Let AI handle the rest',
    description: 'The AI assistant understands natural requests and manages bookings, reschedules, and cancellations.',
  },
];

const customerBenefits = [
  'Book appointments 24/7, no phone calls',
  'See real-time availability instantly',
  'Reschedule or cancel with one tap',
  'Automatic reminders so you never forget',
  'Chat with the AI assistant in plain English',
];

const ownerBenefits = [
  'Reduce no-shows with automated reminders',
  'Fill empty slots with smart availability',
  'Track revenue and growth in one dashboard',
  'Manage multiple staff and services easily',
  'Let AI handle booking requests for you',
];

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'For solo professionals just getting started.',
    features: ['1 staff member', 'Up to 3 services', 'Online booking page', 'Basic dashboard', 'Email reminders'],
    cta: 'Start free',
    highlighted: false,
  },
  {
    name: 'Starter',
    price: '$29',
    period: '/mo',
    description: 'For small businesses growing their bookings.',
    features: ['Up to 5 staff', 'Unlimited services', 'SMS + email reminders', 'Analytics dashboard', 'Customer management', 'AI Assistant (beta)'],
    cta: 'Start 14-day trial',
    highlighted: true,
  },
  {
    name: 'Pro',
    price: '$79',
    period: '/mo',
    description: 'For busy salons with multiple locations.',
    features: ['Unlimited staff', 'Multi-location support', 'Advanced analytics', 'Custom branding', 'Priority support', 'AI Assistant (full)'],
    cta: 'Start 14-day trial',
    highlighted: false,
  },
];

const faqs = [
  {
    q: 'What types of businesses is BookEasy AI for?',
    a: 'BookEasy AI is designed for appointment-based businesses — hair salons, barbershops, beauty lounges, nail studios, spas, and similar service businesses. If you take appointments, BookEasy AI works for you.',
  },
  {
    q: 'How does the AI Appointment Assistant work?',
    a: 'Customers describe what they want in plain language — for example, "I want a haircut tomorrow evening." The assistant understands the service, checks availability, suggests open slots, and can book, reschedule, or cancel the appointment. The full AI backend is coming soon; the interface is ready today.',
  },
  {
    q: 'Can my staff see only their own appointments?',
    a: 'Yes. Each staff member has their own login and sees only the appointments assigned to them. Business owners see everything for their business. Access is controlled by role.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. BookEasy AI runs in the browser on desktop, tablet, and mobile. Your customers get a public booking link — no app required.',
  },
  {
    q: 'Can I try it before paying?',
    a: 'Yes. The Free plan lets you run a solo business indefinitely. Paid plans include a 14-day free trial with no credit card required.',
  },
  {
    q: 'Is my business data secure?',
    a: 'BookEasy AI is built on Supabase with row-level security. Business owners can only access their own data, staff see only what is assigned to them, and customers see only their own appointments.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-accent/40 via-background to-background" />
        <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6 gap-1.5 rounded-full px-4 py-1.5 text-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI-Powered Appointment Management
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Book appointments <span className="text-primary">smarter</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              BookEasy AI is the modern booking and business management platform for salons, barbers, and beauty businesses. Less admin, more clients.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild className="h-12 px-8 text-base">
                <Link href="/signup">Start free — no card needed</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
                <Link href="/login">View demo dashboard</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Trusted by salons, barbers, and beauty businesses
            </p>
          </div>

          {/* Hero preview card */}
          <div className="mx-auto mt-16 max-w-5xl">
            <Card className="overflow-hidden border-border/60 shadow-2xl">
              <CardContent className="p-0">
                <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-destructive/60" />
                  <div className="h-3 w-3 rounded-full bg-warning/70" />
                  <div className="h-3 w-3 rounded-full bg-success/70" />
                  <span className="ml-3 text-xs text-muted-foreground">bookeasy.ai/dashboard</span>
                </div>
                <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Today's revenue", value: '$1,240', icon: BarChart3, trend: '+12%' },
                    { label: 'Appointments', value: '18', icon: CalendarCheck, trend: '+3' },
                    { label: 'New customers', value: '6', icon: Users, trend: '+2' },
                    { label: 'Avg. rating', value: '4.8', icon: Sparkles, trend: '★' },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-border/60 bg-card p-4">
                      <div className="flex items-center justify-between">
                        <stat.icon className="h-5 w-5 text-primary" />
                        <span className="text-xs font-medium text-success">{stat.trend}</span>
                      </div>
                      <p className="mt-3 text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="px-6 pb-6">
                  <div className="rounded-xl border border-border/60 bg-card p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">AI Appointment Assistant</span>
                      <Badge variant="secondary" className="ml-auto text-xs">Beta</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground">
                        I want a haircut tomorrow evening
                      </div>
                      <div className="w-fit max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2 text-sm">
                        I found 3 open slots for a haircut tomorrow evening. Would 5:00 PM with Maria work?
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to run your bookings
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From the first booking to a full calendar — BookEasy AI handles it all.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="border-border/60 transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-muted/30 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Get from sign-up to your first booking in three simple steps.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.step} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <step.icon className="h-8 w-8" />
                </div>
                <span className="mt-4 block text-sm font-bold text-primary">{step.step}</span>
                <h3 className="mt-1 text-xl font-semibold">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits split */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-2xl font-bold">For customers</h3>
              </div>
              <ul className="mt-6 space-y-4">
                {customerBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Scissors className="h-5 w-5" />
                </div>
                <h3 className="text-2xl font-bold">For business owners</h3>
              </div>
              <ul className="mt-6 space-y-4">
                {ownerBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* AI Assistant */}
      <section id="ai-assistant" className="bg-muted/30 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge variant="secondary" className="mb-4 gap-1.5 rounded-full px-3 py-1 text-xs">
                <Sparkles className="h-3 w-3 text-primary" /> AI Appointment Assistant
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Just say what you want
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                No more scrolling through calendars. Customers describe their request in plain language and the AI assistant finds the right service, checks availability, and books the appointment — or reschedules and cancels when plans change.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Understands natural language requests',
                  'Suggests available time slots',
                  'Books, reschedules, and cancels appointments',
                  'Learns customer preferences over time',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button asChild size="lg">
                  <Link href="/signup">Try the AI Assistant</Link>
                </Button>
              </div>
            </div>
            <Card className="border-border/60 shadow-xl">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">AI Assistant</p>
                    <p className="text-xs text-success">● Online</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    I want a haircut tomorrow evening
                  </div>
                  <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm">
                    I can help with that! I found <strong>Classic Haircut</strong> at Luxe Hair Studio. Here are tomorrow's evening slots:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['4:00 PM', '5:00 PM', '6:00 PM'].map((slot) => (
                      <span key={slot} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium">
                        {slot}
                      </span>
                    ))}
                  </div>
                  <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    5:00 PM works
                  </div>
                  <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm">
                    <span className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" /> Booked! Tomorrow at 5:00 PM with Maria.
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, transparent pricing</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free. Upgrade when you grow. No hidden fees, cancel anytime.
            </p>
          </div>
          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={plan.highlighted ? 'border-primary shadow-lg ring-1 ring-primary/20' : 'border-border/60'}
              >
                <CardContent className="p-6">
                  {plan.highlighted && (
                    <Badge className="mb-4 w-fit">Most popular</Badge>
                  )}
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-8 w-full"
                    variant={plan.highlighted ? 'default' : 'outline'}
                    asChild
                  >
                    <Link href="/signup">{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-muted/30 py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Frequently asked questions</h2>
          </div>
          <Accordion type="single" collapsible className="mt-12">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base font-medium">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground shadow-xl sm:px-16">
            <div className="absolute inset-0 -z-10 opacity-20">
              <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full bg-white blur-3xl" />
              <div className="absolute right-1/4 bottom-0 h-64 w-64 rounded-full bg-white blur-3xl" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to book smarter?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/90">
              Join BookEasy AI today. Set up your business in minutes and let your customers book online — anytime, anywhere.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" variant="secondary" asChild className="h-12 px-8 text-base">
                <Link href="/signup">Get started free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground px-8 text-base">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
