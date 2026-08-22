'use client';

import { useState } from 'react';
import { Save, Bell, Globe, Shield } from 'lucide-react';
import { PageHeader, PageContainer } from '@/components/dashboard/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth-context';

export default function SettingsPage() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState({
    emailBooking: true,
    emailReminder: true,
    smsReminder: false,
    newCustomer: true,
    weeklyReport: true,
  });

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 600);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        description="Manage your account and business preferences."
        action={
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving…' : 'Save changes'}
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Account settings */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" defaultValue={user?.full_name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={user?.email} disabled />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" defaultValue={user?.phone || ''} />
            </div>
          </CardContent>
        </Card>

        {/* Notification settings */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" /> Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'emailBooking', label: 'Email me when a new booking is made', desc: 'Get notified for every new appointment' },
              { key: 'emailReminder', label: 'Email reminders to customers', desc: 'Send automatic email reminders before appointments' },
              { key: 'smsReminder', label: 'SMS reminders to customers', desc: 'Send automatic SMS reminders (uses credits)' },
              { key: 'newCustomer', label: 'New customer alerts', desc: 'Notify me when a new customer books for the first time' },
              { key: 'weeklyReport', label: 'Weekly summary report', desc: 'Receive a weekly performance report every Monday' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={notifications[item.key as keyof typeof notifications]}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, [item.key]: checked }))
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Booking settings */}
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" /> Booking preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="buffer">Buffer between appointments (min)</Label>
                <Input id="buffer" type="number" defaultValue="15" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="advance">Max advance booking (days)</Label>
                <Input id="advance" type="number" defaultValue="60" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minCancel">Min cancellation notice (hours)</Label>
                <Input id="minCancel" type="number" defaultValue="24" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" defaultValue="America/Los_Angeles" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
