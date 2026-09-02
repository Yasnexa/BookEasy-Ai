'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { UserRole, Profile } from '@/lib/types';
import { supabase } from '@/lib/supabase-client';

interface AuthState {
  user: Profile | null;
  loading: boolean;
  hasSession: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; user: Profile | null }>;
  signUp: (email: string, password: string, fullName: string, role: UserRole, phone?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[auth] profile fetch error:', error.message);
      return null;
    }
    console.log('[auth] profile fetch result:', data);
    return data as Profile | null;
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('[auth] init getSession:', { session: !!session, userId: session?.user?.id, error: error?.message });
      if (!mounted) return;

      if (session?.user) {
        setHasSession(true);
        const profile = await fetchProfile(session.user.id);
        if (mounted) {
          setUser(profile);
          console.log('[auth] init set user:', profile?.role);
        }
      }
      if (mounted) setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[auth] onAuthStateChange:', { event, userId: session?.user?.id });
      (async () => {
        if (event === 'SIGNED_OUT' || (!session?.user && event !== 'INITIAL_SESSION')) {
          console.log('[auth] clearing user (signed out / no session)');
          setUser(null);
          setHasSession(false);
          setLoading(false);
          return;
        }
        if (!session?.user) return;
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
          setHasSession(true);
          const profile = await fetchProfile(session.user.id);
          if (mounted && profile) {
            setUser(profile);
            setLoading(false);
            console.log('[auth] onAuthStateChange set user:', profile.role);
          } else if (mounted) {
            console.warn('[auth] onAuthStateChange: profile null, not overwriting existing user');
            setLoading(false);
          }
        }
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    console.log('[auth] signIn called for:', email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log('[auth] signInWithPassword result:', {
      user: !!data.user,
      session: !!data.session,
      userId: data.user?.id,
      error: error?.message,
    });

    if (error) {
      return { error: error.message, user: null };
    }

    let profile: Profile | null = null;
    if (data.user) {
      setHasSession(true);
      profile = await fetchProfile(data.user.id);
      if (!profile) {
        console.warn('[auth] profile not found, building fallback from auth user metadata');
        profile = {
          id: data.user.id,
          email: data.user.email || email,
          full_name: data.user.user_metadata?.full_name || email.split('@')[0] || 'User',
          phone: data.user.user_metadata?.phone || null,
          role: (data.user.user_metadata?.role as UserRole) || 'customer',
          avatar_url: null,
          created_at: new Date().toISOString(),
        };
      }
      setUser(profile);
      setLoading(false);
      console.log('[auth] signIn set user:', profile.role, 'redirect route: /dashboard');
    }

    return { error: null, user: profile };
  };

  const signUp = async (email: string, password: string, fullName: string, role: UserRole, phone?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          phone: phone || null,
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user && data.session === null) {
      return { error: 'Check your email to confirm your account before signing in.' };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setHasSession(false);
  };

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await fetchProfile(session.user.id);
      if (profile) setUser(profile);
    }
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, loading, hasSession, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
