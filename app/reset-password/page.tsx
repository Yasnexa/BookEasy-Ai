'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        // User clicked the reset link and has a valid session
      }
    });
  }, []);

  const validate = () => {
    const e: typeof errors = {};
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

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Password reset! You can now sign in.');
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password for your account." showBack={false}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="password" type="password" placeholder="••••••••" className="pl-10" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} />
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm new password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="confirm" type="password" placeholder="••••••••" className="pl-10" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={!!errors.confirm} />
          </div>
          {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
        </div>

        {password.length >= 6 && confirm === password && (
          <div className="flex items-center gap-2 text-sm text-success">
            <Check className="h-4 w-4" /> Passwords match
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>
    </AuthLayout>
  );
}
