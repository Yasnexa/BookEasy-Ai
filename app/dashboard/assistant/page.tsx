'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Send, CalendarCheck, Clock, Check, X, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, PageContainer } from '@/components/dashboard/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { ChatMessage, TimeSlot } from '@/lib/types';
import { supabase } from '@/lib/supabase-client';

const suggestedPrompts = [
  'I want a haircut tomorrow at 2 PM',
  'Book a hair coloring session this weekend',
  'Show me available salons',
  'I want a beard trim',
];

type BookingProposal = {
  business_id: string;
  business_name: string;
  service_id: string;
  service_name: string;
  duration_minutes: number;
  price: number;
  staff_id: string;
  staff_name: string;
  date: string;
};

type AssistantResponse = {
  message?: string;
  error?: string;
  suggested_slots?: TimeSlot[];
  booking_proposal?: BookingProposal;
  pending_action?: 'book' | 'confirm' | null;
};

function createMessage(role: ChatMessage['role'], content: string, extra: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    created_at: new Date().toISOString(),
    ...extra,
  };
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-welcome',
      role: 'assistant',
      content: "Hi! I'm your AI Appointment Assistant. Tell me what you need — for example, \"I want a haircut tomorrow at 2 PM\" — and I'll find available slots for you.",
      created_at: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<BookingProposal & { slot: TimeSlot } | null>(null);
  const [booking, setBooking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  const callAssistant = useCallback(async (nextMessages: ChatMessage[], confirmBooking?: BookingProposal & { slot: TimeSlot }) => {
    const { data, error } = await supabase.functions.invoke<AssistantResponse>('ai-appointment-assistant', {
      body: {
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
        confirm_booking: confirmBooking ? { ...confirmBooking, start_time: confirmBooking.slot.start_time, end_time: confirmBooking.slot.end_time } : undefined,
      },
    });
    if (error) throw new Error(error.message || 'The assistant is temporarily unavailable.');
    if (!data || typeof data !== 'object') throw new Error('The assistant returned an invalid response.');
    if (data.error) throw new Error(data.error);
    return data;
  }, []);

  const applyAssistantResponse = useCallback((data: AssistantResponse) => {
    const slots = Array.isArray(data.suggested_slots) ? data.suggested_slots.filter((slot) => slot && typeof slot.start_time === 'string' && typeof slot.end_time === 'string') : [];
    const proposal = data.booking_proposal;
    setMessages((prev) => [...prev, createMessage('assistant', data.message || 'I could not find a response for that request.', {
      suggested_slots: slots,
      pending_action: data.pending_action || null,
    })]);
    if (proposal && slots.length > 0) {
      const selectedSlot = slots.length === 1 && data.pending_action === 'confirm' ? slots[0] : null;
      setPendingBooking(selectedSlot ? { ...proposal, slot: selectedSlot } : { ...proposal, slot: slots[0] });
    } else if (!proposal) {
      setPendingBooking(null);
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || thinking) return;
    const userMessage = createMessage('user', text.trim());
    const nextMessages = [...messages, userMessage];
    const confirmsPendingBooking = pendingBooking && /\b(yes|haan|han|confirm|book|krdo|kardo|kar do|done)\b/i.test(text);
    setMessages(nextMessages);
    setInput('');
    setThinking(true);
    try {
      const data = await callAssistant(nextMessages, confirmsPendingBooking ? pendingBooking : undefined);
      if (confirmsPendingBooking) {
        setMessages((prev) => [...prev, createMessage('assistant', data.message || 'Your appointment was booked successfully.')]);
        setPendingBooking(null);
      } else {
        applyAssistantResponse(data);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The assistant is temporarily unavailable.';
      setMessages((prev) => [...prev, createMessage('assistant', message)]);
      toast.error(message);
    } finally {
      setThinking(false);
    }
  }, [applyAssistantResponse, callAssistant, messages, pendingBooking, thinking]);

  const handleSlotSelect = useCallback((slot: TimeSlot) => {
    if (!pendingBooking) return;
    const userMessage = createMessage('user', `${new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit' }).format(new Date(slot.start_time))} works for me`);
    setMessages((prev) => [...prev, userMessage, createMessage('assistant', `Great! Shall I confirm your **${pendingBooking.service_name}** appointment at **${pendingBooking.business_name}** on ${pendingBooking.date} at ${new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit' }).format(new Date(slot.start_time))} with **${pendingBooking.staff_name}**? Click "Confirm booking" below.`, { pending_action: 'confirm' })]);
    setPendingBooking((previous) => previous ? { ...previous, slot } : null);
  }, [pendingBooking]);

  const handleConfirmBooking = useCallback(async () => {
    if (!pendingBooking || booking) return;
    setBooking(true);
    setThinking(true);
    try {
      const data = await callAssistant(messages, pendingBooking);
      setMessages((prev) => [...prev, createMessage('assistant', data.message || 'Your appointment was booked successfully.')]);
      setPendingBooking(null);
      toast.success('Appointment booked successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'I could not complete the booking.';
      setMessages((prev) => [...prev, createMessage('assistant', message)]);
      toast.error(message);
    } finally {
      setBooking(false);
      setThinking(false);
    }
  }, [booking, callAssistant, messages, pendingBooking]);

  const hasConfirmAction = messages.some((message) => message.pending_action === 'confirm') && pendingBooking !== null;

  return (
    <PageContainer>
      <PageHeader title="AI Appointment Assistant" description="Book, reschedule, and cancel appointments using natural language." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="flex flex-col border-border/60" style={{ height: '600px' }}>
            <CardContent className="flex flex-1 flex-col p-0">
              <div className="flex items-center gap-3 border-b border-border/60 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></div>
                <div><p className="font-semibold">AI Assistant</p><p className="flex items-center gap-1 text-xs text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Online</p></div>
                <Badge variant="secondary" className="ml-auto text-xs">Beta</Badge>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                      {msg.role === 'assistant' && <div className="mb-1 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /><span className="text-xs text-muted-foreground">AI Assistant</span></div>}
                      <div className={`rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-muted'}`}>
                        <p className="whitespace-pre-line">{msg.content}</p>
                        {msg.suggested_slots && msg.suggested_slots.length > 0 && <div className="mt-3 flex flex-wrap gap-2">
                          {msg.suggested_slots.map((slot) => <button key={slot.start_time} onClick={() => handleSlotSelect(slot)} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:bg-accent"><Clock className="h-3 w-3 text-primary" />{new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit' }).format(new Date(slot.start_time))}</button>)}
                        </div>}
                      </div>
                    </div>
                  </div>
                ))}
                {thinking && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3"><div className="flex gap-1"><span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '0ms' }} /><span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '150ms' }} /><span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '300ms' }} /></div></div></div>}
              </div>

              {hasConfirmAction && <div className="border-t border-border/60 p-3"><Button onClick={handleConfirmBooking} disabled={booking} className="w-full">{booking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Booking…</> : <><Check className="mr-2 h-4 w-4" /> Confirm booking</>}</Button></div>}

              <div className="border-t border-border/60 p-4"><form onSubmit={(event) => { event.preventDefault(); void sendMessage(input); }} className="flex gap-2"><input type="text" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Type your message…" className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /><Button type="submit" size="icon" disabled={!input.trim() || thinking}><Send className="h-4 w-4" /></Button></form></div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/60"><CardContent className="p-5"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Try saying…</h3><div className="space-y-2">{suggestedPrompts.map((prompt) => <button key={prompt} onClick={() => void sendMessage(prompt)} className="block w-full rounded-lg border border-border/60 p-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/40 hover:text-foreground">"{prompt}"</button>)}</div></CardContent></Card>
          <Alert><Info className="h-4 w-4" /><AlertTitle>How the assistant works</AlertTitle><AlertDescription>The AI Assistant understands natural language requests like "I want a haircut tomorrow at 2 PM." It finds the right service, checks availability, and books your appointment — all saved to your account.</AlertDescription></Alert>
          <Card className="border-border/60"><CardContent className="p-5"><h3 className="mb-3 text-sm font-semibold">What it can do</h3><div className="space-y-3">{[{ icon: CalendarCheck, label: 'Book new appointments' }, { icon: Clock, label: 'Suggest available time slots' }, { icon: X, label: 'Cancel appointments' }, { icon: Sparkles, label: 'Find the right business' }].map((cap) => <div key={cap.label} className="flex items-center gap-3 text-sm"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground"><cap.icon className="h-4 w-4" /></div><span className="text-muted-foreground">{cap.label}</span></div>)}</div></CardContent></Card>
        </div>
      </div>
    </PageContainer>
  );
}
