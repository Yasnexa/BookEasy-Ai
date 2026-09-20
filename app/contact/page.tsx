'use client';

import { useState } from 'react';
import { Mail, MessageSquare, Send, MapPin } from 'lucide-react';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const SUPPORT_EMAIL = 'support@bookeasy.ai';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Configuration error');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/contact-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Something went wrong');
      }

      setStatus('success');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      setStatus('error');
      setErrorMsg('We could not send your message right now. Please email us directly at support@bookeasy.ai');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Contact BookEasy AI</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Have a question about subscriptions, billing, technical support, or anything else? We are here to help.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {/* Contact info */}
          <div className="space-y-6">
            <Card className="border-border/60">
              <CardContent className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Mail className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">Email us</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  For subscriptions, billing, or technical support.
                </p>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                >
                  {SUPPORT_EMAIL}
                </a>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">Response time</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  We typically respond within 1-2 business days.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">Business hours</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Monday to Friday, 9:00 AM to 6:00 PM (PKT).
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-2">
            <Card className="border-border/60">
              <CardContent className="p-6">
                {status === 'success' ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
                      <Send className="h-7 w-7" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">Message sent</h3>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      Thank you for reaching out. We will get back to you soon at the email you provided.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-6"
                      onClick={() => setStatus('idle')}
                    >
                      Send another message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          required
                          maxLength={100}
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="Your full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          maxLength={200}
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        required
                        maxLength={200}
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        placeholder="What is this about?"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        required
                        maxLength={5000}
                        rows={6}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        placeholder="Tell us how we can help..."
                      />
                    </div>

                    {status === 'error' && errorMsg && (
                      <p className="text-sm text-destructive">{errorMsg}</p>
                    )}

                    <Button type="submit" disabled={status === 'sending'} className="w-full sm:w-auto">
                      {status === 'sending' ? 'Sending...' : 'Send message'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
