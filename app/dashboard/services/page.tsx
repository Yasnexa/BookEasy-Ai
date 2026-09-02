'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Scissors, Pencil, Trash2, Search } from 'lucide-react';
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
  fetchServicesByBusiness,
  createService,
  updateService,
  deleteService,
} from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import type { Service } from '@/lib/types';

export default function ServicesPage() {
  const { user } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({ name: '', description: '', duration: '45', price: '45', category: '' });

  const loadServices = useCallback(async () => {
    if (!user) return;
    const biz = await fetchBusinessByOwner(user.id);
    if (!biz) {
      setLoading(false);
      return;
    }
    setBusinessId(biz.id);
    const svcs = await fetchServicesByBusiness(biz.id);
    setServices(svcs);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', description: '', duration: '45', price: '45', category: '' });
    setDialogOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description || '',
      duration: String(service.duration_minutes),
      price: String(service.price),
      category: service.category || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !businessId) return;

    if (editing) {
      const { data, error } = await updateService(editing.id, {
        name: form.name,
        description: form.description || null,
        duration_minutes: parseInt(form.duration) || 45,
        price: parseFloat(form.price) || 0,
        category: form.category || null,
      });
      if (error) {
        toast.error(`Failed to save service: ${error}`);
        return;
      }
      if (data) {
        setServices((prev) => prev.map((s) => (s.id === editing.id ? data : s)));
      }
    } else {
      const { data, error } = await createService(businessId, {
        name: form.name,
        description: form.description || undefined,
        duration_minutes: parseInt(form.duration) || 45,
        price: parseFloat(form.price) || 0,
        category: form.category || undefined,
      });
      if (error) {
        toast.error(`Failed to create service: ${error}`);
        return;
      }
      if (data) {
        setServices((prev) => [...prev, data]);
      }
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteService(id);
    if (error) {
      toast.error(`Failed to delete service: ${error}`);
      return;
    }
    setServices((prev) => prev.filter((s) => s.id !== id));
    toast.success('Service deleted.');
  };

  const toggleActive = async (service: Service) => {
    const { data, error } = await updateService(service.id, { active: !service.active });
    if (error) {
      toast.error(`Failed to update service: ${error}`);
      return;
    }
    if (data) {
      setServices((prev) => prev.map((s) => (s.id === service.id ? data : s)));
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
        title="Services"
        description="Manage the services your business offers."
        action={
          <Button onClick={openAdd} disabled={!businessId}>
            <Plus className="mr-2 h-4 w-4" /> Add service
          </Button>
        }
      />

      {!businessId ? (
        <EmptyState
          icon={Scissors}
          title="No business found"
          description="Create your business first before adding services."
        />
      ) : (
        <Card className="border-border/60">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-4 relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search services…"
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={Scissors}
                title="No services yet"
                description="Add your first service so customers can book it online."
                action={
                  <Button onClick={openAdd} size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Add service
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((service) => (
                  <div key={service.id} className="rounded-xl border border-border/60 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        <Scissors className="h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={service.active}
                          onCheckedChange={() => toggleActive(service)}
                          aria-label="Toggle active"
                        />
                      </div>
                    </div>
                    <h3 className="mt-3 font-semibold">{service.name}</h3>
                    {service.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      {service.category && (
                        <Badge variant="secondary" className="text-xs">{service.category}</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{service.duration_minutes} min</Badge>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-lg font-bold">{formatCurrency(service.price)}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(service)}>
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
                              <AlertDialogTitle>Delete this service?</AlertDialogTitle>
                              <AlertDialogDescription>
                                &ldquo;{service.name}&rdquo; will be removed. Existing appointments are not affected.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDelete(service.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit service' : 'Add a new service'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the details of this service.' : 'Fill in the details for your new service.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Service name</Label>
              <Input id="name" placeholder="e.g. Classic Haircut" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" placeholder="Brief description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (min)</Label>
                <Input id="duration" type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input id="price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" placeholder="Hair" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
            </div>
          </div>
            <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save changes' : 'Add service'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
