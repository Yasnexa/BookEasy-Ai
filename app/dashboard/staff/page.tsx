'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Pencil, Trash2, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, PageContainer, EmptyState } from '@/components/dashboard/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/auth-context';
import {
  fetchBusinessByOwner,
  fetchAllStaffByBusiness,
  createStaff,
  updateStaff,
  deleteStaff,
} from '@/lib/api';
import type { Staff } from '@/lib/types';

export default function StaffPage() {
  const { user } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', role_title: '', bio: '' });

  const loadStaff = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const biz = await fetchBusinessByOwner(user.id);
    if (!biz) {
      setLoading(false);
      return;
    }
    setBusinessId(biz.id);
    const members = await fetchAllStaffByBusiness(biz.id);
    setStaff(members);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const openAdd = () => {
    setEditing(null);
    setForm({ full_name: '', email: '', phone: '', role_title: '', bio: '' });
    setDialogOpen(true);
  };

  const openEdit = (member: Staff) => {
    setEditing(member);
    setForm({
      full_name: member.full_name,
      email: member.email,
      phone: member.phone || '',
      role_title: member.role_title,
      bio: member.bio || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !businessId) return;

    if (editing) {
      const { data, error } = await updateStaff(editing.id, {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || null,
        role_title: form.role_title,
        bio: form.bio || null,
      });
      if (error) {
        toast.error(`Failed to save: ${error}`);
        return;
      }
      if (data) {
        setStaff((prev) => prev.map((s) => (s.id === editing.id ? data : s)));
      }
    } else {
      const { data, error } = await createStaff(businessId, {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || undefined,
        role_title: form.role_title || undefined,
        bio: form.bio || undefined,
      });
      if (error) {
        toast.error(`Failed to add staff: ${error}`);
        return;
      }
      if (data) {
        setStaff((prev) => [...prev, data]);
      }
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteStaff(id);
    if (error) {
      toast.error(`Failed to remove staff: ${error}`);
      return;
    }
    setStaff((prev) => prev.filter((s) => s.id !== id));
    toast.success('Staff member removed.');
  };

  const toggleActive = async (member: Staff) => {
    const { data, error } = await updateStaff(member.id, { active: !member.active });
    if (error) {
      toast.error(`Failed to update: ${error}`);
      return;
    }
    if (data) {
      setStaff((prev) => prev.map((s) => (s.id === member.id ? data : s)));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Staff"
        description="Manage your team members, their roles, and availability."
        action={
          <Button onClick={openAdd} disabled={!businessId}>
            <Plus className="mr-2 h-4 w-4" /> Add staff
          </Button>
        }
      />

      {!businessId ? (
        <EmptyState
          icon={Users}
          title="No business found"
          description="Create your business first before adding staff."
        />
      ) : staff.length === 0 ? (
        <Card className="border-border/60">
          <CardContent>
            <EmptyState
              icon={Users}
              title="No staff members"
              description="Add your first staff member to start assigning appointments."
              action={<Button onClick={openAdd} size="sm"><Plus className="mr-2 h-4 w-4" /> Add staff</Button>}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => (
            <Card key={member.id} className="border-border/60">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {member.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <p className="font-semibold">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground">{member.role_title}</p>
                    </div>
                  </div>
                  <Switch checked={member.active} onCheckedChange={() => toggleActive(member)} aria-label="Toggle active" />
                </div>

                {member.bio && <p className="mt-3 text-sm text-muted-foreground">{member.bio}</p>}

                <div className="mt-4 space-y-1.5 text-sm">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> {member.email}
                  </p>
                  {member.phone && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> {member.phone}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                  <Badge variant={member.active ? 'secondary' : 'outline'} className={member.active ? 'text-success' : ''}>
                    {member.active ? 'Active' : 'Inactive'}
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(member)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove this staff member?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {member.full_name} will no longer have access. Existing appointments are not affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDelete(member.id)}>
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit staff member' : 'Add a staff member'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the details for this team member.' : 'Invite a new team member to your business.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" placeholder="Jane Doe" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="jane@salon.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" placeholder="(415) 555-0100" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role_title">Role / title</Label>
              <Input id="role_title" placeholder="Senior Stylist" value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Input id="bio" placeholder="Short bio or specialization" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save changes' : 'Add staff'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
