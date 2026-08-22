'use client';

import { useState } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { PageHeader, PageContainer, EmptyState } from '@/components/dashboard/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockNotifications } from '@/lib/mock-data';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(mockNotifications);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const remove = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <PageContainer>
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
        action={
          unreadCount > 0 && (
            <Button variant="outline" onClick={markAllRead}>
              <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
            </Button>
          )
        }
      />

      {notifications.length === 0 ? (
        <Card className="border-border/60">
          <CardContent>
            <EmptyState
              icon={Bell}
              title="No notifications"
              description="You're all caught up. New notifications will appear here."
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60">
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 p-4 transition-colors ${!n.read ? 'bg-accent/30' : ''}`}
                >
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-muted-foreground/30' : 'bg-primary'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      <Badge variant="outline" className="text-xs capitalize">{n.type}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {!n.read && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => markRead(n.id)} aria-label="Mark as read">
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(n.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
