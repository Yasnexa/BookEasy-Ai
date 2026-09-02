'use client';

import { useMemo } from 'react';
import { CalendarCheck, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { PageHeader, PageContainer, EmptyState } from '@/components/dashboard/shared';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockAppointments } from '@/lib/mock-data';
import { formatTime, formatCurrency } from '@/lib/format';

export default function SchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0);

  const myAppointments = mockAppointments.filter((a) => a.staff_id === 'st1');

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const today = new Date();
    today.setDate(today.getDate() + weekOffset * 7);
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay());
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekOffset]);

  const getAppointmentsForDay = (day: Date) =>
    myAppointments
      .filter((a) => new Date(a.start_time).toDateString() === day.toDateString())
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  return (
    <PageContainer>
      <PageHeader
        title="My schedule"
        description="Your appointment calendar at Luxe Hair Studio."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>Today</Button>
            <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
        {weekDays.map((day) => {
          const dayAppointments = getAppointmentsForDay(day);
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <Card key={day.toISOString()} className={`border-border/60 ${isToday ? 'border-primary ring-1 ring-primary/20' : ''}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              <span className="block text-xs font-normal text-muted-foreground">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className="text-lg">{day.getDate()}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dayAppointments.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No appointments</p>
            ) : (
              dayAppointments.map((apt) => (
                <div key={apt.id} className="rounded-lg border border-border/60 p-2">
                  <p className="text-xs font-medium">{formatTime(apt.start_time)}</p>
                  <p className="truncate text-xs text-muted-foreground">{apt.customer_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{apt.service_name}</p>
                  <div className="mt-1">
                    <StatusBadge status={apt.status} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
