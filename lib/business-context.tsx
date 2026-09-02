'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { fetchBusinessByOwner } from '@/lib/api';
import type { Business } from '@/lib/types';

interface BusinessContextValue {
  business: Business | null;
  loading: boolean;
  refreshBusiness: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshBusiness = useCallback(async () => {
    if (!user) {
      setBusiness(null);
      setLoading(false);
      return;
    }
    if (user.role !== 'business_owner') {
      setBusiness(null);
      setLoading(false);
      return;
    }
    const biz = await fetchBusinessByOwner(user.id);
    setBusiness(biz);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refreshBusiness();
  }, [refreshBusiness]);

  return (
    <BusinessContext.Provider value={{ business, loading, refreshBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider');
  return ctx;
}
