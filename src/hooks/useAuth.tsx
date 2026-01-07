import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { AuthUser } from '../types';
import { User } from '@supabase/supabase-js';

async function mapSupabaseUser(user: User): Promise<AuthUser> {
  // First try to get role from user_metadata
  let role = user.user_metadata?.role || 'customer';
  
  // If not in metadata, fetch from user_profiles table
  if (!user.user_metadata?.role) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile?.role) {
      role = profile.role;
    }
  }
  
  return {
    id: user.id,
    email: user.email!,
    username: user.user_metadata?.username || user.email!.split('@')[0],
    avatar: user.user_metadata?.avatar_url,
    role,
    phone: user.user_metadata?.phone,
  };
}

export function useAuth() {
  const { user, loading, login, logout, setLoading } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (mounted && session?.user) {
        const authUser = await mapSupabaseUser(session.user);
        login(authUser);
      }
      if (mounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        const authUser = await mapSupabaseUser(session.user);
        login(authUser);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        logout();
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        const authUser = await mapSupabaseUser(session.user);
        login(authUser);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [login, logout, setLoading]);

  return { user, loading };
}
