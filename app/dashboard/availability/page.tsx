'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, PageContainer, EmptyState } from '@/components/dashboard/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import {
  fetchBusinessByOwner,
  fetchAllStaffByBusiness,
  fetchWorkingHours,
  saveWorkingHours,
} from '@/lib/api';
import type { Staff, WorkingHours } from '@/lib/types';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type DayConfig = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
};

export default function AvailabilityPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [hours, setHours] = useState<Record<number, DayConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadStaff = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const biz = await fetchBusinessByOwner(user.id);
    if (!biz) {
      setLoading(false);
      return;
    }
    const members = await fetchAllStaffByBusiness(biz.id);
    const active = members.filter((s) => s.active);
    setStaff(active);
    if (active.length > 0 && !selectedStaffId) {
      setSelectedStaffId(active[0].id);
    }
    setLoading(false);
  }, [user, selectedStaffId]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const loadHours = useCallback(async () => {
    if (!selectedStaffId) return;
    const existing = await fetchWorkingHours(selectedStaffId);
    const map: Record<number, DayConfig> = {};
    for (let i = 0; i < 7; i++) {
      const dayHours = existing.find((h) => h.day_of_week === i);
      if (dayHours) {
        map[i] = {
          day_of_week: i,
          start_time: dayHours.start_time,
          end_time: dayHours.end_time,
          is_working: dayHours.is_working,
        };
      } else {
        map[i] = {
          day_of_week: i,
          start_time: '09:00',
          end_time: '17:00',
          is_working: false,
        };
      }
    }
    setHours(map);
  }, [selectedStaffId]);

  useEffect(() => {
    loadHours();
  }, [loadHours]);

  const updateDay = (dayOfWeek: number, field: 'start_time' | 'end_time' | 'is_working', value: string | boolean) => {
    setHours((prev) => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!selectedStaffId) return;
    setSaving(true);
    const hoursArray = Object.values(hours).filter((h) => h.is_working);
    const { error } = await saveWorkingHours(selectedStaffId, hoursArray);
    setSaving(false);
    if (error) {
      toast.error(`Failed to save: ${error}`);
    } else {
      toast.success('Working hours saved.');
    }
  };

  const selectedStaff = staff.find((s) => s.id === selectedStaffId);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <PageContainer>
        <PageHeader title="Availability" description="Set working hours for each staff member." />
        <EmptyState
          icon={Clock}
          title="No active staff"
          description="Add staff members first, then configure their working hours here."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Availability"
        description="Set working hours for each staff member."
        action={
          <Button onClick={handleSave} disabled={saving || !selectedStaffId}>
            <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving…' : 'Save changes'}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Staff selector */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Staff members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {staff.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedStaffId(member.id)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  selectedStaffId === member.id
                    ? 'border-primary bg-accent'
                    : 'border-border hover:bg-accent/40'
                }`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {member.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{member.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{member.role_title}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Working hours */}
        <div className="lg:col-span-2">
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">
                Working hours — {selectedStaff?.full_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {days.map((day, idx) => {
                const dayHours = hours[idx];
                const isWorking = dayHours?.is_working ?? false;
                return (
                  <div key={day} className="flex flex-col gap-3 rounded-lg border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={isWorking}
                        onCheckedChange={(checked) => updateDay(idx, 'is_working', checked)}
                        aria-label={`Toggle ${day}`}
                      />
                      <span className="text-sm font-medium">{day}</span>
                    </div>
                    {isWorking && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={dayHours?.start_time || '09:00'}
                          onChange={(e) => updateDay(idx, 'start_time', e.target.value)}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={dayHours?.end_time || '17:00'}
                          onChange={(e) => updateDay(idx, 'end_time', e.target.value)}
                          className="w-32"
                        />
                      </div>
                    )}
                    {!isWorking && (
                      <span className="text-sm text-muted-foreground">Day off</span>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
