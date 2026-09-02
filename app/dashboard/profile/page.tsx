'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, PageContainer } from '@/components/dashboard/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { roleLabels } from '@/lib/nav-config';
import { updateProfile } from '@/lib/api';

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setPhone(user.phone || '');
    }
  }, [user]);

  const initials = (fullName || user?.full_name || '?')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    const updated = await updateProfile(user.id, { full_name: fullName, phone });
    if (updated) {
      await refreshUser();
      toast.success('Profile updated successfully.');
    } else {
      toast.error('Failed to update profile. Please try again.');
    }
    setSaving(false);
  }, [user, fullName, phone, refreshUser]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Profile"
        description="Manage your personal information."
        action={
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving…' : 'Save changes'}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/60">
          <CardContent className="p-6 text-center">
            <Avatar className="mx-auto h-20 w-20">
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <h3 className="mt-4 font-semibold">{fullName || user.full_name}</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <Badge className="mt-3">{roleLabels[user.role]}</Badge>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCircle className="h-4 w-4" /> Personal information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user.email} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
