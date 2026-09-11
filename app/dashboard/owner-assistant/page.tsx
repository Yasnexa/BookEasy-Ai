'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Send, Loader2, TrendingUp, CalendarDays, Users, DollarSign, Info } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, PageContainer } from '@/components/dashboard/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase-client';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

type OwnerResponse = {
  message?: string;
  error?: string;
};

const suggestedPrompts = [
  'Aaj ki appointments dikhao',
  'Kal kitni bookings hain?',
  'Is week revenue kitna hai?',
  'Sabse zyada booked service konsi hai?',
  'Tayyab ki appointments dikhao',
  'Staff schedule dikhao',
  'Facial ki current price kya hai?',
  'Inactive staff dikhao',
];

function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    created_at: new Date().toISOString(),
  };
}

export default function OwnerAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-welcome',
      role: 'assistant',
      content: "Assalam-o-alaikum! Main aap ke business ka AI Assistant hoon. Poochein aaj ki appointments, revenue, staff schedule, ya service prices ke baare mein kuch bhi.",
      created_at: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  const callAssistant = useCallback(async (nextMessages: ChatMessage[]) => {
    const { data, error } = await supabase.functions.invoke<OwnerResponse>('ai-appointment-assistant', {
      body: {
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
        mode: 'owner',
      },
    });
    if (error) throw new Error(error.message || 'The assistant is temporarily unavailable.');
    if (!data || typeof data !== 'object') throw new Error('The assistant returned an invalid response.');
    if (data.error) throw new Error(data.error);
    return data;
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || thinking) return;
    const userMessage = createMessage('user', text.trim());
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setThinking(true);
    try {
      const data = await callAssistant(nextMessages);
      setMessages((prev) => [...prev, createMessage('assistant', data.message || 'I could not process that request.')]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The assistant is temporarily unavailable.';
      setMessages((prev) => [...prev, createMessage('assistant', message)]);
      toast.error(message);
    } finally {
      setThinking(false);
    }
  }, [callAssistant, messages, thinking]);

  return (
    <PageContainer>
      <PageHeader title="Business AI Assistant" description="Ask about appointments, revenue, staff, and services in natural language." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="flex flex-col border-border/60" style={{ height: '600px' }}>
            <CardContent className="flex flex-1 flex-col p-0">
              <div className="flex items-center gap-3 border-b border-border/60 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></div>
                <div><p className="font-semibold">Business AI Assistant</p><p className="flex items-center gap-1 text-xs text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Online</p></div>
                <Badge variant="secondary" className="ml-auto text-xs">Owner</Badge>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                      {msg.role === 'assistant' && <div className="mb-1 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /><span className="text-xs text-muted-foreground">AI Assistant</span></div>}
                      <div className={`rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-muted'}`}>
                        <p className="whitespace-pre-line">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {thinking && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3"><div className="flex gap-1"><span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '0ms' }} /><span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '150ms' }} /><span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '300ms' }} /></div></div></div>}
              </div>

              <div className="border-t border-border/60 p-4"><form onSubmit={(event) => { event.preventDefault(); void sendMessage(input); }} className="flex gap-2"><input type="text" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Type your message…" className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /><Button type="submit" size="icon" disabled={!input.trim() || thinking}><Send className="h-4 w-4" /></Button></form></div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/60"><CardContent className="p-5"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Try saying…</h3><div className="space-y-2">{suggestedPrompts.map((prompt) => <button key={prompt} onClick={() => void sendMessage(prompt)} className="block w-full rounded-lg border border-border/60 p-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/40 hover:text-foreground">&ldquo;{prompt}&rdquo;</button>)}</div></CardContent></Card>
          <Alert><Info className="h-4 w-4" /><AlertTitle>How it works</AlertTitle><AlertDescription>The Business AI Assistant understands English, Urdu, and Roman Urdu. It only accesses your business data and respects your existing permissions.</AlertDescription></Alert>
          <Card className="border-border/60"><CardContent className="p-5"><h3 className="mb-3 text-sm font-semibold">What it can do</h3><div className="space-y-3">{[{ icon: CalendarDays, label: 'View today\'s and tomorrow\'s appointments' }, { icon: DollarSign, label: 'Check revenue (today, this week, this month)' }, { icon: Users, label: 'View staff schedules and appointments' }, { icon: TrendingUp, label: 'Find most-booked services' }].map((cap) => <div key={cap.label} className="flex items-center gap-3 text-sm"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground"><cap.icon className="h-4 w-4" /></div><span className="text-muted-foreground">{cap.label}</span></div>)}</div></CardContent></Card>
        </div>
      </div>
    </PageContainer>
  );
}
