'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Star,
  MapPin,
  Phone,
  Clock,
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  Sparkles,
  Store,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/dashboard/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatTime } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import {
  fetchBusinessBySlug,
  fetchServicesByBusiness,
  fetchStaffByBusiness,
  fetchWorkingHoursForStaff,
  fetchAppointmentsByStaff,
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

function BusinessBookingPage({ initialSlug, publicPage = false }: { initialSlug?: string; publicPage?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const slug = initialSlug ?? params.get('business');

  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
      toast.error('Business not found.');
      router.push('/dashboard/search');
      return;
    }
    setBusiness(biz);
    const [svcs, stf] = await Promise.all([
      fetchServicesByBusiness(biz.id),
      fetchStaffByBusiness(biz.id),
    ]);
    setServices(svcs);
    setStaff(stf);

    // Load working hours for all active staff
    const activeStaffIds = stf.filter((s) => s.active).map((s) => s.id);
    if (activeStaffIds.length > 0) {
      const wh = await fetchWorkingHoursForStaff(activeStaffIds);
      setWorkingHours(wh);
    }

    setLoading(false);
  }, [slug, router]);

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

  // Check if a date is selectable (not in past, and staff is working that day)
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

  const handleConfirm = async () => {
    if (!user || !business || !selectedService || !selectedStaff || !selectedDate || !selectedSlot) return;

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
      <PageContainer>
        <Button variant="ghost" onClick={() => router.push('/dashboard/search')}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to search
        </Button>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Store className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Business not found.</p>
        </div>
      </PageContainer>
    );
  }

  const brandStyle = {
    '--business-primary': business.primary_color || '#111827',
    '--business-secondary': business.secondary_color || '#f8fafc',
    '--business-accent': business.accent_color || '#c59d5f',
  } as CSSProperties;

  return (
    <div style={publicPage ? brandStyle : undefined} className={publicPage ? 'min-h-screen bg-[var(--business-secondary)]' : undefined}>
    <PageContainer>
      <button
        onClick={() => router.push('/dashboard/search')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to search
      </button>

      {/* Business header */}
      <Card className={`mb-6 overflow-hidden border-border/60 ${publicPage ? 'shadow-xl' : ''}`}>
        {business.cover_url ? (
          <img
            src={business.cover_url}
            alt={`${business.name} cover`}
            className="h-40 w-full object-cover"
            onError={(e) => {
              (e.currentTarget.parentElement as HTMLElement).classList.add('bg-gradient-to-br', 'from-primary/20', 'via-accent/40', 'to-primary/10');
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="h-40 bg-gradient-to-br from-primary/20 via-accent/40 to-primary/10" />
        )}
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              {business.logo_url ? (
                <img
                  src={business.logo_url}
                  alt={`${business.name} logo`}
                  className="-mt-12 h-20 w-20 rounded-2xl border-4 border-card object-cover"
                  onError={(e) => {
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <div
                className={`-mt-12 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-card bg-primary/10 text-3xl font-bold text-primary ${business.logo_url ? 'hidden' : 'flex'}`}
              >
                {business.name[0]}
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={publicPage ? { color: 'var(--business-primary)' } : undefined}>{business.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-warning text-warning" /> {business.rating} ({business.review_count} reviews)
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {business.address}, {business.city}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" /> {business.phone}
                  </span>
                </div>
                {business.description && (
                  <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{business.description}</p>
                )}
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" /> Open now
            </Badge>
          </div>
        </CardContent>
      </Card>

      {publicPage && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Card className="border-black/10 bg-white/80">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--business-accent)' }}>About</p>
              <h2 className="mt-2 text-xl font-semibold" style={{ color: 'var(--business-primary)' }}>A place made for your next visit</h2>
              <p className="mt-2 text-sm leading-6 text-black/60">{business.description || `${business.name} offers a thoughtful, professional experience in ${business.city}.`}</p>
            </CardContent>
          </Card>
          <Card className="border-black/10 bg-white/80">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--business-accent)' }}>Contact</p>
              <div className="mt-3 space-y-2 text-sm text-black/70">
                <p>{business.address}, {business.city}</p>
                <p>{business.phone}</p>
                {business.email && <p>{business.email}</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Booking flow */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-border/60">
            <CardContent className="p-6">
              {/* Step indicator */}
              <div className="mb-6 flex items-center gap-2">
                {steps.map((s, i) => (
                  <div key={s} className="flex flex-1 items-center gap-2">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                        i <= step
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {i < step ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`text-sm font-medium ${i <= step ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {s}
                    </span>
                    {i < steps.length - 1 && <div className={`h-px flex-1 ${i < step ? 'bg-primary' : 'bg-border'}`} />}
                  </div>
                ))}
              </div>

              <Separator className="mb-6" />

              {/* Step 0: Service */}
              {step === 0 && (
                <div>
                  <h3 className="mb-4 font-semibold">Choose a service</h3>
                  {services.length === 0 ? (
                    <p className="text-sm text-muted-foreground">This business hasn't added any services yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {services.map((service) => (
                        <button
                          key={service.id}
                          onClick={() => setSelectedService(service)}
                          className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-all ${
                            selectedService?.id === service.id
                              ? 'border-primary bg-accent ring-1 ring-primary/30'
                              : 'border-border hover:border-primary/40'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{service.name}</p>
                            {service.description && <p className="text-sm text-muted-foreground">{service.description}</p>}
                            <div className="mt-1 flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{service.duration_minutes} min</Badge>
                              {service.category && <Badge variant="secondary" className="text-xs">{service.category}</Badge>}
                            </div>
                          </div>
                          <span className="text-lg font-bold">{formatCurrency(service.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Staff */}
              {step === 1 && (
                <div>
                  <h3 className="mb-4 font-semibold">Choose a staff member</h3>
                  {staff.length === 0 ? (
                    <p className="text-sm text-muted-foreground">This business hasn't added any staff yet.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {staff.map((member) => (
                        <button
                          key={member.id}
                          onClick={() => setSelectedStaff(member)}
                          className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                            selectedStaff?.id === member.id
                              ? 'border-primary bg-accent ring-1 ring-primary/30'
                              : 'border-border hover:border-primary/40'
                          }`}
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {member.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium">{member.full_name}</p>
                            <p className="text-xs text-muted-foreground">{member.role_title}</p>
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
                  <h3 className="mb-4 font-semibold">Pick a date and time</h3>
                  <div className="mb-4 flex items-center justify-between">
                    <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset - 1)} disabled={weekOffset === 0}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
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
                          className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border hover:border-primary/40'
                          }`}
                        >
                          <span className="text-xs">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                          <span className="text-lg font-bold">{day.getDate()}</span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedDate && (
                    <div>
                      <p className="mb-3 text-sm font-medium">
                        Available times for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </p>
                      {loadingSlots ? (
                        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading available times…
                        </div>
                      ) : slots.length === 0 ? (
                        <p className="py-4 text-sm text-muted-foreground">No available time slots for this date.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {slots.map((slot, idx) => (
                            <button
                              key={idx}
                              disabled={!slot.available}
                              onClick={() => setSelectedSlot(slot)}
                              className={`rounded-lg border py-2 text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                                selectedSlot?.start_time === slot.start_time
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : slot.available
                                    ? 'border-border hover:border-primary/40'
                                    : 'border-border line-through'
                              }`}
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
                  <h3 className="mb-4 font-semibold">Review and confirm</h3>
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border/60 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <CalendarCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{selectedService?.name}</p>
                          <p className="text-sm text-muted-foreground">{formatCurrency(selectedService?.price || 0)} · {selectedService?.duration_minutes} min</p>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Business</span>
                          <span className="font-medium">{business.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Staff</span>
                          <span className="font-medium">{selectedStaff?.full_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date</span>
                          <span className="font-medium">{selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Time</span>
                          <span className="font-medium">{selectedSlot && formatSlotLabel(selectedSlot.start_time)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration</span>
                          <span className="font-medium">{selectedService?.duration_minutes} minutes</span>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex justify-between">
                        <span className="font-medium">Total</span>
                        <span className="text-lg font-bold">{formatCurrency(selectedService?.price || 0)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
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
                  <Button onClick={handleNext} disabled={
                    (step === 0 && !selectedService) ||
                    (step === 1 && !selectedStaff) ||
                    (step === 2 && (!selectedDate || !selectedSlot))
                  }>
                    Continue <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleConfirm} disabled={submitting}>
                    <Check className="mr-2 h-4 w-4" /> {submitting ? 'Booking…' : 'Confirm booking'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary sidebar */}
        <div>
          <Card className="border-border/60 sticky top-20">
            <CardContent className="p-5">
              <h3 className="mb-4 font-semibold">Booking summary</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Business</p>
                  <p className="font-medium">{business.name}</p>
                </div>
                {selectedService && (
                  <div>
                    <p className="text-xs text-muted-foreground">Service</p>
                    <p className="font-medium">{selectedService.name}</p>
                  </div>
                )}
                {selectedStaff && (
                  <div>
                    <p className="text-xs text-muted-foreground">Staff</p>
                    <p className="font-medium">{selectedStaff.full_name}</p>
                  </div>
                )}
                {selectedDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium">{selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  </div>
                )}
                {selectedSlot && (
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="font-medium">{formatSlotLabel(selectedSlot.start_time)}</p>
                  </div>
                )}
                {selectedService && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-medium">Total</span>
                      <span className="text-lg font-bold">{formatCurrency(selectedService.price)}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-4 rounded-lg bg-accent/40 p-3">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Prefer to book with natural language? Use the AI Assistant.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
    {publicPage && <footer className="border-t border-black/10 py-8 text-center text-sm text-black/60">Powered by BookEasy AI</footer>}
    </div>
  );
}

export default function BusinessProfilePage() {
  return <BusinessBookingPage />;
}
