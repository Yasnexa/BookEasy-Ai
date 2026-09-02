'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Store, Upload, Plus, AlertCircle, Loader2, ImageIcon, ExternalLink, Eye, Copy, Check, RotateCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, PageContainer } from '@/components/dashboard/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth-context';
import { useBusiness } from '@/lib/business-context';
import { fetchBusinessByOwner, updateBusiness, createBusiness, uploadBusinessImage, slugify } from '@/lib/api';
import type { Business } from '@/lib/types';

const categories = ['Hair Salon', 'Barber', 'Beauty', 'Spa', 'Nails'];

function contrastRatio(foreground: string, background: string): number {
  const toLinear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  };
  const luminance = (hex: string) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return 0;
    const red = toLinear(parseInt(hex.slice(1, 3), 16));
    const green = toLinear(parseInt(hex.slice(3, 5), 16));
    const blue = toLinear(parseInt(hex.slice(5, 7), 16));
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

export default function BusinessProfilePage() {
  const { user, loading } = useAuth();
  const { refreshBusiness } = useBusiness();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Hair Salon',
    address: '',
    city: '',
    phone: '',
    email: '',
    primary_color: '#111827',
    secondary_color: '#f8fafc',
    accent_color: '#c59d5f',
    heading_color: '#0f172a',
    body_color: '#334155',
    muted_color: '#64748b',
    button_text_color: '#ffffff',
    button_hover_bg_color: '#0d9488',
    button_hover_text_color: '#ffffff',
    nav_text_color: '#475569',
    card_text_color: '#1e293b',
  });

  const defaultBranding = {
    primary_color: '#111827',
    secondary_color: '#f8fafc',
    accent_color: '#c59d5f',
    heading_color: '#0f172a',
    body_color: '#334155',
    muted_color: '#64748b',
    button_text_color: '#ffffff',
    button_hover_bg_color: '#0d9488',
    button_hover_text_color: '#ffffff',
    nav_text_color: '#475569',
    card_text_color: '#1e293b',
  };

  const loadBusiness = useCallback(async () => {
    if (!user) return;
    setLoadingBusiness(true);
    const b = await fetchBusinessByOwner(user.id);
    setBusiness(b);
    if (b) {
      setForm({
        name: b.name,
        description: b.description || '',
        category: b.category,
        address: b.address,
        city: b.city,
        phone: b.phone,
        email: b.email || '',
        primary_color: b.primary_color || '#111827',
        secondary_color: b.secondary_color || '#f8fafc',
        accent_color: b.accent_color || '#c59d5f',
        heading_color: b.heading_color || '#0f172a',
        body_color: b.body_color || '#334155',
        muted_color: b.muted_color || '#64748b',
        button_text_color: b.button_text_color || '#ffffff',
        button_hover_bg_color: b.button_hover_bg_color || '#0d9488',
        button_hover_text_color: b.button_hover_text_color || '#ffffff',
        nav_text_color: b.nav_text_color || '#475569',
        card_text_color: b.card_text_color || '#1e293b',
      });
    }
    setLoadingBusiness(false);
  }, [user]);

  useEffect(() => {
    loadBusiness();
  }, [loadBusiness]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);

    if (business) {
      const updated = await updateBusiness(business.id, {
        name: form.name,
        description: form.description || null,
        category: form.category,
        address: form.address,
        city: form.city,
        phone: form.phone,
        email: form.email || null,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        accent_color: form.accent_color,
        heading_color: form.heading_color,
        body_color: form.body_color,
        muted_color: form.muted_color,
        button_text_color: form.button_text_color,
        button_hover_bg_color: form.button_hover_bg_color,
        button_hover_text_color: form.button_hover_text_color,
        nav_text_color: form.nav_text_color,
        card_text_color: form.card_text_color,
      });
      if (updated) {
        setBusiness(updated);
        await refreshBusiness();
        toast.success('Business profile updated successfully.');
      } else {
        toast.error('Failed to update business. Please try again.');
      }
    } else {
      const { data: created, error } = await createBusiness(user.id, {
        name: form.name,
        description: form.description || undefined,
        category: form.category,
        address: form.address,
        city: form.city,
        phone: form.phone,
        email: form.email || undefined,
      });
      if (created) {
        setBusiness(created);
        await refreshBusiness();
        toast.success('Business created successfully.');
      } else {
        toast.error(error ? `Failed to create business: ${error}` : 'Failed to create business. Please try again.');
      }
    }
    setSaving(false);
  }, [user, business, form]);

  const handleImageUpload = async (file: File, kind: 'logo' | 'cover') => {
    if (!business) {
      toast.error('Save your business profile first before uploading images.');
      return;
    }

    if (kind === 'logo') setUploadingLogo(true);
    else setUploadingCover(true);

    const { url, error } = await uploadBusinessImage(business.id, file, kind);

    if (error || !url) {
      toast.error(error || 'Failed to upload image. Please try again.');
      if (kind === 'logo') setUploadingLogo(false);
      else setUploadingCover(false);
      return;
    }

    const updated = await updateBusiness(business.id, {
      [kind === 'logo' ? 'logo_url' : 'cover_url']: url,
    });

    if (updated) {
      setBusiness(updated);
      await refreshBusiness();
      toast.success(`${kind === 'logo' ? 'Logo' : 'Cover image'} uploaded successfully.`);
    } else {
      toast.error('Image uploaded, but failed to save to your profile. Please try again.');
    }

    if (kind === 'logo') setUploadingLogo(false);
    else setUploadingCover(false);
  };

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file, 'logo');
    e.target.value = '';
  };

  const onCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file, 'cover');
    e.target.value = '';
  };

  const websiteSlug = business?.slug || slugify(form.name) || 'your-business';
  const websiteUrl = `https://${websiteSlug}.bookeasy.ai`;
  const websiteHref = process.env.NODE_ENV === 'development' ? `/${websiteSlug}` : websiteUrl;

  const copyWebsiteLink = async () => {
    await navigator.clipboard.writeText(websiteUrl);
    setCopiedLink(true);
    toast.success('Website link copied.');
    window.setTimeout(() => setCopiedLink(false), 1800);
  };

  if (loading || loadingBusiness) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Business profile"
        description="Manage your public business information."
        action={
          <div className="flex gap-2">
            {business && (
              <>
                <Button variant="outline" onClick={copyWebsiteLink}>
                  {copiedLink ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copiedLink ? 'Copied' : 'Copy Website Link'}
                </Button>
                <Button variant="outline" asChild>
                  <a href={websiteHref} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> View My Website
                  </a>
                </Button>
              </>
            )}
            <Button onClick={handleSave} disabled={saving || !form.name}>
              <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        }
      />

      {!business && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No business yet</AlertTitle>
          <AlertDescription>
            Fill in the details below and save to create your business profile. Customers will be able to find and book with you.
          </AlertDescription>
        </Alert>
      )}

      <input
        ref={logoInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={onLogoChange}
        className="hidden"
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={onCoverChange}
        className="hidden"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">{business ? 'Basic information' : 'Create your business'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Business name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Luxe Hair Studio" />
                <p className="text-xs text-muted-foreground">
                  Your website address: <span className="font-medium text-foreground">{websiteUrl}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tell customers about your business…" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(415) 555-0100" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main Street" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="San Francisco" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Business email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="hello@yourbusiness.com" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Website branding</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-muted-foreground"
                  onClick={() => setForm((prev) => ({ ...prev, ...defaultBranding }))}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset to default
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-xs text-muted-foreground">
                Each color controls a specific part of your public website independently.
                Changing one never affects the others.
              </p>

              {([
                ['primary_color', 'Primary Color', 'Main CTA buttons, primary highlights, important interactive elements'],
                ['secondary_color', 'Secondary Color', 'Secondary UI elements, secondary buttons, supporting visuals (not text)'],
                ['accent_color', 'Accent Color', 'Small highlights, badges, decorative accents'],
                ['heading_color', 'Heading Text Color', 'Business name, section headings, service names, titles'],
                ['body_color', 'Body Text Color', 'Paragraph text, business description, general content'],
                ['muted_color', 'Muted Text Color', 'Small descriptions, metadata, secondary information'],
                ['button_text_color', 'Button Text Color', 'Text shown on buttons in their normal state'],
                ['button_hover_bg_color', 'Button Hover Background', 'Button background when hovered'],
                ['button_hover_text_color', 'Button Hover Text Color', 'Button text when hovered'],
                ['nav_text_color', 'Navigation Text Color', 'About, Services, Team, Contact links'],
                ['card_text_color', 'Card Text Color', 'Text inside service, team, and info cards'],
              ] as const).map(([key, label, desc]) => {
                const contrastPair = key === 'button_text_color'
                  ? [form.button_text_color, form.primary_color] as const
                  : key === 'button_hover_text_color'
                  ? [form.button_hover_text_color, form.button_hover_bg_color] as const
                  : key === 'nav_text_color'
                  ? [form.nav_text_color, '#ffffff'] as const
                  : key === 'card_text_color'
                  ? [form.card_text_color, '#ffffff'] as const
                  : key === 'heading_color'
                  ? [form.heading_color, '#ffffff'] as const
                  : key === 'body_color'
                  ? [form.body_color, '#ffffff'] as const
                  : key === 'muted_color'
                  ? [form.muted_color, '#ffffff'] as const
                  : null;
                const lowContrast = contrastPair && contrastPair.every((color) => /^#[0-9a-fA-F]{6}$/.test(color))
                  ? contrastRatio(...contrastPair) < 3
                  : false;
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form[key]}
                          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                          className="h-9 w-10 cursor-pointer rounded-md border border-input bg-background p-1"
                          aria-label={`${label} picker`}
                        />
                        <input
                          type="text"
                          value={form[key]}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setForm({ ...form, [key]: v });
                          }}
                          className="h-9 w-24 rounded-md border border-input bg-background px-2 font-mono text-xs"
                          aria-label={`${label} hex value`}
                        />
                      </div>
                    </div>
                    {lowContrast && (
                      <p className="flex items-center gap-1.5 text-xs text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5" /> Low contrast — text may be difficult to read.
                      </p>
                    )}
                  </div>
                );
              })}

              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Live preview</p>
                <div
                  className="overflow-hidden rounded-lg border border-border/60"
                  style={{ backgroundColor: form.secondary_color }}
                >
                  <div
                    className="px-3 py-2"
                    style={{ backgroundColor: '#ffffff' }}
                  >
                    <nav className="flex items-center gap-3 text-xs font-medium" style={{ color: form.nav_text_color }}>
                      <span>About</span><span>Services</span><span>Team</span><span>Contact</span>
                    </nav>
                  </div>
                  <div className="px-3 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: form.accent_color }}>About</p>
                    <p className="text-sm font-bold" style={{ color: form.heading_color }}>{form.name || 'Your Business'}</p>
                    <p className="mt-1 text-xs" style={{ color: form.body_color }}>{form.description || 'A professional experience in your city.'}</p>
                    <div className="mt-2 rounded border p-2" style={{ borderColor: '#e2e8f0', backgroundColor: '#ffffff' }}>
                      <p className="text-xs font-semibold" style={{ color: form.card_text_color }}>Service name</p>
                      <p className="text-[10px]" style={{ color: form.muted_color }}>Service description and details</p>
                    </div>
                    <button
                      className="mt-2 rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm transition-all hover:-translate-y-0.5"
                      style={{ backgroundColor: form.primary_color, color: form.button_text_color }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = form.button_hover_bg_color;
                        e.currentTarget.style.color = form.button_hover_text_color;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = form.primary_color;
                        e.currentTarget.style.color = form.button_text_color;
                      }}
                    >
                      Book an Appointment
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Logo & cover</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo */}
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-6">
                {business?.logo_url ? (
                  <img src={business.logo_url} alt="Business logo" className="h-20 w-20 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Store className="h-8 w-8" />
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={!business || uploadingLogo}
                >
                  {uploadingLogo ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</>
                  ) : (
                    <><Upload className="mr-2 h-4 w-4" /> {business?.logo_url ? 'Change logo' : 'Upload logo'}</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">JPG, PNG, or WebP · 5 MB max</p>
              </div>

              {/* Cover */}
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-6">
                {business?.cover_url ? (
                  <img src={business.cover_url} alt="Cover image" className="h-24 w-full rounded-lg object-cover" />
                ) : (
                  <div className="flex h-24 w-full items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={!business || uploadingCover}
                >
                  {uploadingCover ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</>
                  ) : (
                    <><Upload className="mr-2 h-4 w-4" /> {business?.cover_url ? 'Change cover' : 'Upload cover'}</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">JPG, PNG, or WebP · 5 MB max</p>
              </div>

              {!business && (
                <p className="text-center text-xs text-muted-foreground">
                  Save your business profile first to enable image uploads.
                </p>
              )}
            </CardContent>
          </Card>

          {business && (
            <Card className="border-border/60">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Website preview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-muted-foreground">This is what your customers see when they visit your public booking page.</p>
                <div className="overflow-hidden rounded-lg border border-border/60">
                  <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {business.logo_url ? (
                        <img src={business.logo_url} alt="Logo" className="h-6 w-6 rounded object-cover shrink-0" />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold" style={{ backgroundColor: `${form.primary_color}15`, color: form.primary_color }}>
                          {form.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="truncate text-xs font-semibold" style={{ color: form.primary_color }}>{form.name}</span>
                    </div>
                    <a href={`/${business.slug}`} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                      <Eye className="h-3 w-3" /> Open
                    </a>
                  </div>
                  <div
                    className="h-20"
                    style={{
                      background: business.cover_url
                        ? `url(${business.cover_url}) center/cover`
                        : `linear-gradient(135deg, ${form.primary_color}20, ${form.accent_color}40, ${form.primary_color}10)`,
                    }}
                  />
                  <div className="space-y-2 p-3">
                    <div className="flex items-center gap-2">
                      {business.logo_url ? (
                        <img src={business.logo_url} alt="Logo" className="-mt-6 h-10 w-10 rounded-lg border-2 border-card object-cover" />
                      ) : (
                        <div className="-mt-6 flex h-10 w-10 items-center justify-center rounded-lg border-2 border-card text-sm font-bold" style={{ backgroundColor: `${form.primary_color}15`, color: form.primary_color }}>
                          {form.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-bold" style={{ color: form.primary_color }}>{form.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{form.description || `${form.name} offers a professional experience in ${form.city}.`}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="rounded px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: form.accent_color }}>Book now</span>
                      <span className="text-xs text-muted-foreground">{form.city}</span>
                    </div>
                  </div>
                </div>
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <ExternalLink className="h-4 w-4" /> View My Public Website
                </a>
              </CardContent>
            </Card>
          )}

          {business && (
            <Card className="border-border/60">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Subscription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <Badge>{business.subscription_plan}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="secondary" className="text-success">{business.subscription_status}</Badge>
                </div>
                <Button variant="outline" className="mt-2 w-full">Manage subscription</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
