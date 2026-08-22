'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Loader2, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  fetchWorkingHours,
  fetchAppointmentsByStaff,
  generateTimeSlots,
  rescheduleAppointment,
} from '@/lib/api';
import type { Appointment, WorkingHours, TimeSlot } from '@/lib/types';

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
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

interface RescheduleDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRescheduled: () => void;
}

export function RescheduleDialog({ appointment, open, onOpenChange, onRescheduled }: RescheduleDialogProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);

  const loadWorkingHours = useCallback(async () => {
    if (!appointment?.staff_id) return;
    const wh = await fetchWorkingHours(appointment.staff_id);
    setWorkingHours(wh);
  }, [appointment?.staff_id]);

  useEffect(() => {
    if (open) {
      setWeekOffset(0);
      setSelectedDate(null);
      setSelectedSlot(null);
      setSlots([]);
      loadWorkingHours();
    }
  }, [open, loadWorkingHours]);

  useEffect(() => {
    const generateSlots = async () => {
      if (!selectedDate || !appointment) {
        setSlots([]);
        return;
      }
      setLoadingSlots(true);
      const existingAppts = await fetchAppointmentsByStaff(
        appointment.staff_id,
        selectedDate,
        appointment.id
      );
      const generated = generateTimeSlots(
        workingHours,
        selectedDate,
        appointment.duration_minutes,
        existingAppts
      );
      setSlots(generated);
      setLoadingSlots(false);
    };
    generateSlots();
  }, [selectedDate, appointment, workingHours]);

  const isDateAvailable = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return false;
    const dayOfWeek = date.getDay();
    return workingHours.some(
      (h) => h.day_of_week === dayOfWeek && h.is_working
    );
  };

  const handleConfirm = async () => {
    if (!appointment || !selectedSlot) return;
    setSubmitting(true);
    const ok = await rescheduleAppointment(
      appointment.id,
      selectedSlot.start_time,
      selectedSlot.end_time
    );
    setSubmitting(false);
    if (ok) {
      toast.success('Appointment rescheduled.');
      onOpenChange(false);
      onRescheduled();
    } else {
      toast.error('Failed to reschedule. The selected time may have been booked.');
    }
  };

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" /> Reschedule appointment
          </DialogTitle>
          <DialogDescription>
            {appointment.service_name} with {appointment.staff_name} — currently {new Date(appointment.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at {formatSlotLabel(appointment.start_time)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
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

          <div className="grid grid-cols-7 gap-2">
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
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <span className="text-xs">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className="text-base font-bold">{day.getDate()}</span>
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <>
              <Separator />
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
                        className={`rounded-lg border py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
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
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!selectedSlot || submitting}>
            {submitting ? 'Rescheduling…' : 'Confirm reschedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
