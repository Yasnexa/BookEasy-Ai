'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { BusinessProvider } from '@/lib/business-context';
import { ThemeProvider } from '@/lib/theme-context';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BusinessProvider>
          {children}
          <Toaster position="top-right" richColors />
        </BusinessProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
