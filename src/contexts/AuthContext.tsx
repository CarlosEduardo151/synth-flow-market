import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone?: string, birthDate?: string, cpf?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        
        // Handle token refresh error - force re-login
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Show welcome notification on sign in
        if (event === 'SIGNED_IN' && session?.user) {
          const userName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0];
          toast.success(`Bem-vindo(a), ${userName}! 👋`, {
            description: 'Login realizado com sucesso',
          });
        }
      }
    );

    // Check for existing session and refresh if needed
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // Clear any stale session data
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        if (session) {
          // Check if token is about to expire (within 5 minutes)
          const expiresAt = session.expires_at;
          const now = Math.floor(Date.now() / 1000);
          const fiveMinutes = 5 * 60;
          
          if (expiresAt && (expiresAt - now) < fiveMinutes) {
            console.log('Token expiring soon, refreshing...');
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('Error refreshing session:', refreshError);
              toast.error('Sessão expirada. Por favor, faça login novamente.');
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
            } else if (refreshData.session) {
              setSession(refreshData.session);
              setUser(refreshData.session.user);
            }
          } else {
            setSession(session);
            setUser(session.user);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Session initialization error:', err);
        setLoading(false);
      }
    };

    initSession();

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phone?: string, birthDate?: string, cpf?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    // Update profile with additional data
    if (!error && data.user) {
      try {
        await supabase
          .from('profiles')
          .update({
            phone: phone || null,
            birth_date: birthDate || null,
            cpf: cpf || null,
          })
          .eq('user_id', data.user.id);
      } catch (profileError) {
        console.error('Error updating profile:', profileError);
      }
    }

    // SECURITY: Admin roles should ONLY be assigned via database admin panel or secure backend process
    // NEVER auto-assign admin roles based on email in client-side code
    // This is a CRITICAL security vulnerability that allows privilege escalation

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}