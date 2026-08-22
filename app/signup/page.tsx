'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import type { UserRole } from '@/lib/types';
import { Mail, Lock, User, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

const roles: { value: UserRole; label: string; description: string }[] = [
  { value: 'customer', label: 'Customer', description: 'Book and manage appointments' },
  { value: 'business_owner', label: 'Business Owner', description: 'Manage your business and staff' },
];

export default function SignupPage() {
  const router = useRouter();
  const { signUp, user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole>('customer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && !authLoading) {
      console.log('[signup] user confirmed in context, redirecting to /dashboard. role:', user.role);
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName) e.fullName = 'Name is required';
    if (!email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Use at least 6 characters';
    if (confirm !== password) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const { error } = await signUp(email, password, fullName, role, phone || undefined);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Account created! Welcome to BookEasy AI.');
    console.log('[signup] signUp complete, waiting for context to sync...');
  };

  return (
    <AuthLayout title="Create your BookEasy AI account" subtitle="Start free — no credit card needed.">
      {/* Role selection */}
      <div className="mb-6">
        <Label className="mb-3 block">I want to…</Label>
        <div className="grid grid-cols-2 gap-3">
          {roles.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={cn(
                'rounded-xl border p-4 text-left transition-all',
                role === r.value
                  ? 'border-primary bg-accent ring-1 ring-primary/30'
                  : 'border-border hover:border-primary/40'
              )}
            >
              <span className="block text-sm font-semibold">{r.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{r.description}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Staff and Super Admin accounts are created by business owners and platform admins.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="fullName" placeholder="Jane Doe" className="pl-10" value={fullName} onChange={(e) => setFullName(e.target.value)} aria-invalid={!!errors.fullName} />
          </div>
          {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="email" type="email" placeholder="you@example.com" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="phone" type="tel" placeholder="(415) 555-0100" className="pl-10" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="password" type="password" placeholder="••••••••" className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} />
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="confirm" type="password" placeholder="••••••••" className="pl-10" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={!!errors.confirm} />
            </div>
            {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <button onClick={() => router.push('/login')} className="font-medium text-primary hover:underline">
          Sign in
        </button>
      </p>
    </AuthLayout>
  );
}
