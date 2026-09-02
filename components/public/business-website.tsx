'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  Star,
  MapPin,
  Phone,
  Mail,
  Clock,
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  Loader2,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import {
  fetchBusinessBySlug,
  fetchServicesByBusiness,
  fetchStaffByBusiness,
  fetchWorkingHoursForStaff,
  fetchAppointmentsByStaff,
  fetchReviewSummaryByBusiness,
  generateTimeSlots,
  createAppointment,
} from '@/lib/api';
import type { Business, Service, Staff, WorkingHours, TimeSlot } from '@/lib/types';

const steps = ['Service', 'Staff', 'Date & time', 'Confirm'] as const;

function getWeekDays(offset: number) {
  const days: Date[] = [];
  const today = new Date();
  today.setDate(today.getDate() + offset * 7);
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay());
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatSlotLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function BusinessWebsite({ slug }: { slug: string }) {
  const router = useRouter();
  const { user } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [reviewSummary, setReviewSummary] = useState<{ average: number; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Booking flow state
  const [bookingOpen, setBookingOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);

  const loadData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    const biz = await fetchBusinessBySlug(slug);
    if (!biz) {
      setLoading(false);
      return;
    }
    setBusiness(biz);
    const [svcs, stf, reviews] = await Promise.all([
      fetchServicesByBusiness(biz.id),
      fetchStaffByBusiness(biz.id),
      fetchReviewSummaryByBusiness(biz.id),
    ]);
    setServices(svcs);
    setStaff(stf);
    setReviewSummary(reviews);

    const activeStaffIds = stf.filter((s) => s.active).map((s) => s.id);
    if (activeStaffIds.length > 0) {
      const wh = await fetchWorkingHoursForStaff(activeStaffIds);
      setWorkingHours(wh);
    }

    setLoading(false);
  }, [slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Generate slots when date or staff changes
  useEffect(() => {
    const generateSlots = async () => {
      if (!selectedDate || !selectedStaff || !selectedService) {
        setSlots([]);
        return;
      }
      setLoadingSlots(true);
      const staffHours = workingHours.filter((h) => h.staff_id === selectedStaff.id);
      const existingAppts = await fetchAppointmentsByStaff(selectedStaff.id, selectedDate);
      const generated = generateTimeSlots(
        staffHours,
        selectedDate,
        selectedService.duration_minutes,
        existingAppts
      );
      setSlots(generated);
      setLoadingSlots(false);
    };
    generateSlots();
  }, [selectedDate, selectedStaff, selectedService, workingHours]);

  const isDateAvailable = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return false;
    if (!selectedStaff) return true;
    const dayOfWeek = date.getDay();
    const staffHours = workingHours.filter(
      (h) => h.staff_id === selectedStaff.id && h.day_of_week === dayOfWeek && h.is_working
    );
    return staffHours.length > 0;
  };

  const handleNext = () => {
    if (step === 0 && !selectedService) return;
    if (step === 1 && !selectedStaff) return;
    if (step === 2 && (!selectedDate || !selectedSlot)) return;
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const startBooking = (service?: Service) => {
    if (service) setSelectedService(service);
    setBookingOpen(true);
    setStep(0);
  };

  const handleConfirm = async () => {
    if (!user) {
      toast.error('Please sign in to book an appointment.');
      router.push(`/login?redirect=/${slug}`);
      return;
    }
    if (!business || !selectedService || !selectedStaff || !selectedDate || !selectedSlot) return;

    setSubmitting(true);
    const result = await createAppointment({
      business_id: business.id,
      service_id: selectedService.id,
      staff_id: selectedStaff.id,
      customer_id: user.id,
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
      duration_minutes: selectedService.duration_minutes,
      price: selectedService.price,
    });
    setSubmitting(false);

    if (result) {
      toast.success('Appointment booked! Check your appointments page for details.');
      router.push('/dashboard/appointments');
    } else {
      toast.error('Failed to book appointment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/20 px-4 text-center">
        <h1 className="text-2xl font-bold">Business not found</h1>
        <p className="mt-2 text-[var(--business-muted)]">The business you're looking for doesn't exist or isn't available.</p>
        <Button className="mt-6" onClick={() => router.push('/dashboard/search')}>
          Browse businesses
        </Button>
      </div>
    );
  }

  const primaryColor = business.primary_color || '#111827';
  const secondaryColor = business.secondary_color || '#f8fafc';
  const accentColor = business.accent_color || '#c59d5f';
  const headingColor = business.heading_color || '#0f172a';
  const bodyColor = business.body_color || '#334155';
  const mutedColor = business.muted_color || '#64748b';
  const buttonTextColor = business.button_text_color || '#ffffff';
  const buttonHoverBackground = business.button_hover_bg_color || '#0d9488';
  const buttonHoverText = business.button_hover_text_color || '#ffffff';
  const navTextColor = business.nav_text_color || '#475569';
  const cardTextColor = business.card_text_color || '#1e293b';

  const brandStyle = {
    '--business-primary': primaryColor,
    '--business-secondary': secondaryColor,
    '--business-accent': accentColor,
    '--business-heading': headingColor,
    '--business-body': bodyColor,
    '--business-muted': mutedColor,
    '--business-button-text': buttonTextColor,
    '--business-button-hover-bg': buttonHoverBackground,
    '--business-button-hover-text': buttonHoverText,
    '--business-nav-text': navTextColor,
    '--business-card-text': cardTextColor,
  } as CSSProperties;

  const hasReviews = reviewSummary && reviewSummary.count > 0;
  const ratingDisplay = hasReviews ? reviewSummary!.average.toFixed(1) : null;
  const reviewCountDisplay = hasReviews ? reviewSummary!.count : null;

  const highlights = [
    { icon: CalendarCheck, label: 'Online booking', desc: 'Book anytime, 24/7' },
    { icon: Users, label: 'Professional team', desc: `${staff.length} expert${staff.length === 1 ? '' : 's'}` },
    { icon: ShieldCheck, label: 'Trusted business', desc: 'Verified on BookEasy' },
  ].filter((h) => {
    if (h.icon === Users && staff.length === 0) return false;
    return true;
  });

  return (
    <div style={brandStyle} className="business-theme min-h-screen scroll-smooth overflow-x-hidden bg-[var(--business-secondary)] text-[var(--business-body)]">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative">
        {/* Cover background */}
        <div className="relative h-[28rem] w-full overflow-hidden sm:h-[34rem] md:h-[38rem]">
          {business.cover_url ? (
            <img
              src={business.cover_url}
              alt={`${business.name} cover`}
              className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-[1.02]"
              onError={(e) => {
                (e.currentTarget.parentElement as HTMLElement).style.background = `linear-gradient(135deg, ${primaryColor}cc, ${accentColor}88)`;
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div
              className="h-full w-full"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
        </div>

        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-8 sm:px-6 sm:pb-10 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 text-white">
              <div className="flex items-end gap-4">
                {business.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt={`${business.name} logo`}
                    className="h-20 w-20 shrink-0 rounded-2xl border-4 border-white object-cover shadow-2xl sm:h-24 sm:w-24"
                    onError={(e) => {
                      (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden');
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}
                <div
                  className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-white text-3xl font-bold shadow-2xl sm:h-24 sm:w-24 ${business.logo_url ? 'hidden' : 'flex'}`}
                  style={{ backgroundColor: primaryColor, color: buttonTextColor }}
                >
                  {business.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 pb-1">
                  <Badge className="mb-2 border-white/30 bg-white/15 text-white backdrop-blur-sm">{business.category}</Badge>
                  <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-[var(--business-heading)] sm:text-5xl">{business.name}</h1>
                </div>
              </div>
              <div className="mt-5 flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/85">
                {ratingDisplay && (
                  <span className="flex items-center gap-1.5 font-medium text-white">
                    <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                    {ratingDisplay} <span className="text-white/70">({reviewCountDisplay} reviews)</span>
                  </span>
                )}
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {business.address}, {business.city}</span>
                <a href={`tel:${business.phone}`} className="flex items-center gap-1.5 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><Phone className="h-4 w-4" /> {business.phone}</a>
                {business.email && <a href={`mailto:${business.email}`} className="flex items-center gap-1.5 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><Mail className="h-4 w-4" /> {business.email}</a>}
              </div>
            </div>
            <Button
              size="lg"
              onClick={() => startBooking()}
              className="business-button h-12 shrink-0 rounded-xl px-6 font-semibold shadow-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
              style={{ backgroundColor: primaryColor, color: buttonTextColor }}
            >
              <CalendarCheck className="mr-2 h-5 w-5" /> Book an Appointment
            </Button>
          </div>
        </div>
      </section>

      {/* ── Navigation bar ──────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <nav className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1 text-sm font-medium">
            <a href="#about" className="cursor-pointer text-[var(--business-nav-text)] underline-offset-8 transition-all duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-accent)] focus-visible:ring-offset-2">About</a>
            <a href="#services" className="cursor-pointer text-[var(--business-nav-text)] underline-offset-8 transition-all duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-accent)] focus-visible:ring-offset-2">Services</a>
            {staff.length > 0 && (
              <a href="#team" className="cursor-pointer text-[var(--business-nav-text)] underline-offset-8 transition-all duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-accent)] focus-visible:ring-offset-2">Team</a>
            )}
            <a href="#contact" className="cursor-pointer text-[var(--business-nav-text)] underline-offset-8 transition-all duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-accent)] focus-visible:ring-offset-2">Contact</a>
          </nav>
          <Button size="sm" onClick={() => startBooking()} className="business-button cursor-pointer rounded-lg font-semibold shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-offset-2" style={{ backgroundColor: primaryColor, color: buttonTextColor }}>
            Book Now
          </Button>
        </div>
      </div>

      {/* ── About ───────────────────────────────────────────── */}
      {business.description && (
        <section id="about" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentColor }}>
                About
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: headingColor }}>
                Welcome to {business.name}
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--business-body)]">
                {business.description}
              </p>
            </div>
            <div className="space-y-3">
              {highlights.map((h) => (
                <div key={h.label} className="group flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${accentColor}20` }}
                  >
                    <h.icon className="h-5 w-5" style={{ color: accentColor }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--business-card-text)]">{h.label}</p>
                    <p className="text-xs text-[var(--business-muted)]">{h.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Services ─────────────────────────────────────────── */}
      {services.length > 0 && (
        <section id="services" className="border-y border-slate-200/70 bg-white/60 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentColor }}>
                Our Services
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: headingColor }}>
                What we offer
              </h2>
              <p className="mt-2 text-sm text-[var(--business-muted)]">
                Choose from our range of professional services and book online in minutes.
              </p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <Card
                  key={service.id}
                  className="group flex flex-col rounded-2xl border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
                >
                  <CardContent className="flex flex-1 flex-col p-6">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-semibold text-[var(--business-card-text)]">{service.name}</h3>
                      {service.category && (
                        <Badge variant="outline" className="shrink-0 text-xs">{service.category}</Badge>
                      )}
                    </div>
                    {service.description && (
                      <p className="mt-2 flex-1 text-sm text-[var(--business-card-text)]">{service.description}</p>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm text-[var(--business-muted)]">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" /> {formatDuration(service.duration_minutes)}
                        </span>
                        <span className="text-lg font-bold" style={{ color: headingColor }}>
                          {formatCurrency(service.price)}
                        </span>
                      </div>
                    </div>
                    <Button
                      className="mt-5 w-full cursor-pointer rounded-lg font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-offset-2"
                      variant="outline"
                      onClick={() => startBooking(service)}
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      Book Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Staff / Team ────────────────────────────────────── */}
      {staff.length > 0 && (
        <section id="team" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentColor }}>
              Our Team
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: headingColor }}>
              Meet the professionals
            </h2>
            <p className="mt-2 text-sm text-[var(--business-muted)]">
              Experienced and dedicated staff ready to serve you.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {staff.map((member) => (
              <Card key={member.id} className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.full_name}
                        className="h-16 w-16 rounded-full object-cover"
                        onError={(e) => {
                          (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden');
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold ${member.avatar_url ? 'hidden' : 'flex'}`}
                      style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                    >
                      {getInitials(member.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold text-[var(--business-card-text)]">{member.full_name}</h3>
                      <p className="text-sm text-[var(--business-muted)]">{member.role_title}</p>
                    </div>
                  </div>
                  {member.bio && (
                    <p className="mt-3 text-sm text-[var(--business-muted)]">{member.bio}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── Contact / Location ──────────────────────────────── */}
      <section id="contact" className="border-y border-slate-200/70 bg-white/60 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentColor }}>
              Contact & Location
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: headingColor }}>
              Get in touch
            </h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex items-start gap-3 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${accentColor}20` }}>
                  <MapPin className="h-5 w-5" style={{ color: accentColor }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--business-card-text)]">Address</p>
                  <p className="mt-1 text-sm text-[var(--business-muted)]">{business.address}, {business.city}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex items-start gap-3 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${accentColor}20` }}>
                  <Phone className="h-5 w-5" style={{ color: accentColor }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--business-card-text)]">Phone</p>
                  <a href={`tel:${business.phone}`} className="mt-1 block text-sm text-[var(--business-body)] underline-offset-4 transition-colors hover:text-[var(--business-heading)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-accent)]">{business.phone}</a>
                </div>
              </CardContent>
            </Card>
            {business.email && (
              <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="flex items-start gap-3 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${accentColor}20` }}>
                    <Mail className="h-5 w-5" style={{ color: accentColor }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--business-card-text)]">Email</p>
                    <a href={`mailto:${business.email}`} className="mt-1 block break-all text-sm text-[var(--business-body)] underline-offset-4 transition-colors hover:text-[var(--business-heading)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-accent)]">{business.email}</a>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* ── Booking CTA ─────────────────────────────────────── */}
      {!bookingOpen && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <Card
            className="overflow-hidden rounded-3xl border-0 shadow-2xl"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
          >
            <CardContent className="flex flex-col items-center justify-between gap-6 p-8 text-center sm:flex-row sm:p-10 sm:text-left">
              <div>
                <h2 className="text-xl font-bold text-white sm:text-2xl">Ready to book your appointment?</h2>
                <p className="mt-1 text-sm text-white/80">Choose a service, pick a time, and you're all set.</p>
              </div>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => startBooking()}
                className="shrink-0 rounded-xl font-semibold shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
              >
                <CalendarCheck className="mr-2 h-5 w-5" /> Book Now
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Booking Flow ────────────────────────────────────── */}
      {bookingOpen && (
        <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Card className="border-border/60 shadow-lg">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold" style={{ color: headingColor }}>
                  Book at {business.name}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setBookingOpen(false)}>
                  Close
                </Button>
              </div>

              {/* Step indicator */}
              <div className="mb-6 flex items-center gap-2">
                {steps.map((s, i) => (
                  <div key={s} className="flex flex-1 items-center gap-2">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors"
                      style={i <= step ? { backgroundColor: primaryColor, color: '#fff' } : undefined}
                    >
                      {i < step ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`text-sm font-medium ${i <= step ? 'text-[var(--business-heading)]' : 'text-[var(--business-muted)]'}`}>
                      {s}
                    </span>
                    {i < steps.length - 1 && <div className={`h-px flex-1 ${i < step ? '' : 'bg-border'}`} style={i < step ? { backgroundColor: primaryColor } : undefined} />}
                  </div>
                ))}
              </div>

              <Separator className="mb-6" />

              {/* Step 0: Service */}
              {step === 0 && (
                <div>
                  <h3 className="mb-4 font-semibold text-[var(--business-heading)]">Choose a service</h3>
                  {services.length === 0 ? (
                    <p className="text-sm text-[var(--business-muted)]">This business hasn't added any services yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {services.map((service) => (
                        <button
                          key={service.id}
                          onClick={() => setSelectedService(service)}
                          className={`flex w-full cursor-pointer items-center gap-4 rounded-lg border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-accent)] focus-visible:ring-offset-2 ${
                            selectedService?.id === service.id
                              ? 'ring-1'
                              : 'border-border hover:border-primary/40'
                          }`}
                          style={selectedService?.id === service.id ? { borderColor: primaryColor, backgroundColor: `${accentColor}15` } : undefined}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[var(--business-card-text)]">{service.name}</p>
                            {service.description && <p className="text-sm text-[var(--business-muted)]">{service.description}</p>}
                            <div className="mt-1 flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{formatDuration(service.duration_minutes)}</Badge>
                              {service.category && <Badge variant="secondary" className="text-xs">{service.category}</Badge>}
                            </div>
                          </div>
                          <span className="text-lg font-bold text-[var(--business-heading)]">{formatCurrency(service.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Staff */}
              {step === 1 && (
                <div>
                  <h3 className="mb-4 font-semibold text-[var(--business-heading)]">Choose a staff member</h3>
                  {staff.length === 0 ? (
                    <p className="text-sm text-[var(--business-muted)]">This business hasn't added any staff yet.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {staff.map((member) => (
                        <button
                          key={member.id}
                          onClick={() => setSelectedStaff(member)}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--business-accent)] focus-visible:ring-offset-2 ${
                            selectedStaff?.id === member.id ? 'ring-1' : 'border-border hover:border-primary/40'
                          }`}
                          style={selectedStaff?.id === member.id ? { borderColor: primaryColor, backgroundColor: `${accentColor}15` } : undefined}
                        >
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={member.full_name}
                              className="h-12 w-12 rounded-full object-cover"
                              onError={(e) => {
                                (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden');
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : null}
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold ${member.avatar_url ? 'hidden' : 'flex'}`}
                            style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                          >
                            {getInitials(member.full_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--business-card-text)]">{member.full_name}</p>
                            <p className="text-xs text-[var(--business-muted)]">{member.role_title}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Date & time */}
              {step === 2 && (
                <div>
                  <h3 className="mb-4 font-semibold text-[var(--business-heading)]">Pick a date and time</h3>
                  <div className="mb-4 flex items-center justify-between">
                    <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset - 1)} disabled={weekOffset === 0}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-[var(--business-body)]">
                      {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mb-6 grid grid-cols-7 gap-2">
                    {weekDays.map((day) => {
                      const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
                      const isAvailable = isDateAvailable(day);
                      const isSelected = selectedDate?.toDateString() === day.toDateString();
                      return (
                        <button
                          key={day.toISOString()}
                          disabled={isPast || !isAvailable}
                          onClick={() => { setSelectedDate(day); setSelectedSlot(null); }}
                          className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
                            isSelected ? 'text-white' : 'border-border hover:border-primary/40'
                          }`}
                          style={isSelected ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
                        >
                          <span className="text-xs">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                          <span className="text-lg font-bold">{day.getDate()}</span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedDate && (
                    <div>
                      <p className="mb-3 text-sm font-medium text-[var(--business-body)]">
                        Available times for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </p>
                      {loadingSlots ? (
                        <div className="flex items-center gap-2 py-4 text-sm text-[var(--business-muted)]">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading available times…
                        </div>
                      ) : slots.length === 0 ? (
                        <p className="py-4 text-sm text-[var(--business-muted)]">No available time slots for this date.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {slots.map((slot, idx) => (
                            <button
                              key={idx}
                              disabled={!slot.available}
                              onClick={() => setSelectedSlot(slot)}
                              className={`rounded-lg border py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
                                selectedSlot?.start_time === slot.start_time ? 'text-white' : slot.available ? 'border-border hover:border-primary/40' : 'border-border line-through'
                              }`}
                              style={selectedSlot?.start_time === slot.start_time ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
                            >
                              {formatSlotLabel(slot.start_time)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Confirm */}
              {step === 3 && (
                <div>
                  <h3 className="mb-4 font-semibold text-[var(--business-heading)]">Review and confirm</h3>
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border/60 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${primaryColor}15` }}>
                          <CalendarCheck className="h-5 w-5" style={{ color: headingColor }} />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--business-card-text)]">{selectedService?.name}</p>
                          <p className="text-sm text-[var(--business-muted)]">{formatCurrency(selectedService?.price || 0)} · {formatDuration(selectedService?.duration_minutes || 0)}</p>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[var(--business-muted)]">Business</span>
                          <span className="font-medium text-[var(--business-card-text)]">{business.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--business-muted)]">Staff</span>
                          <span className="font-medium text-[var(--business-card-text)]">{selectedStaff?.full_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--business-muted)]">Date</span>
                          <span className="font-medium text-[var(--business-card-text)]">{selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--business-muted)]">Time</span>
                          <span className="font-medium text-[var(--business-card-text)]">{selectedSlot && formatSlotLabel(selectedSlot.start_time)}</span>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex justify-between">
                        <span className="font-medium text-[var(--business-heading)]">Total</span>
                        <span className="text-lg font-bold text-[var(--business-heading)]">{formatCurrency(selectedService?.price || 0)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--business-muted)]">
                      By confirming, you agree to the cancellation policy. You can reschedule or cancel up to 24 hours before the appointment.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="mt-6 flex justify-between">
                <Button variant="ghost" onClick={handleBack} disabled={step === 0}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                {step < 3 ? (
                  <Button
                    onClick={handleNext}
                    disabled={
                      (step === 0 && !selectedService) ||
                      (step === 1 && !selectedStaff) ||
                      (step === 2 && (!selectedDate || !selectedSlot))
                    }
                    style={{ backgroundColor: primaryColor, color: buttonTextColor }}
                  >
                    Continue <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleConfirm} disabled={submitting} style={{ backgroundColor: primaryColor, color: buttonTextColor }}>
                    <Check className="mr-2 h-4 w-4" /> {submitting ? 'Booking…' : 'Confirm booking'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-border/40 py-8 text-center">
        <p className="text-sm text-[var(--business-muted)]">
          {business.name} is powered by{' '}
          <span className="font-medium text-[var(--business-heading)]">BookEasy AI</span>
        </p>
      </footer>
    </div>
  );
}
