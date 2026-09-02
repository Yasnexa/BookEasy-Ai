'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase-client';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email');
      return;
    }
    setError('');
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (resetError) {
      toast.error(resetError.message);
      return;
    }

    setSent(true);
    toast.success('Reset link sent');
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="We sent a password reset link to your inbox." showBack={false}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We sent an email to <span className="font-medium text-foreground">{email}</span>. Click the link inside to reset your password.
          </p>
          <p className="text-sm text-muted-foreground">
            Didn't get it? Check your spam folder, or{' '}
            <button onClick={() => setSent(false)} className="font-medium text-primary hover:underline">
              try a different email
            </button>
            .
          </p>
          <Button variant="outline" className="w-full" onClick={() => router.push('/login')}>
            Back to sign in
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter your email and we'll send you a reset link.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="email" type="email" placeholder="you@example.com" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered your password?{' '}
        <button onClick={() => router.push('/login')} className="font-medium text-primary hover:underline">
          Sign in
        </button>
      </p>
    </AuthLayout>
  );
}
