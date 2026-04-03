import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowRight, Mail, Lock } from 'lucide-react';
import { authService } from '../lib/authService';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';
import { AuthUser } from '../types';
import { supabase } from '../lib/supabase';
import { getCurrentLocation } from '../lib/utils';

async function mapSupabaseUser(user: User): Promise<AuthUser> {
  let role = user.user_metadata?.role || 'customer';
  if (!user.user_metadata?.role) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role) role = profile.role;
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

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [focused, setFocused]   = useState<string | null>(null);
  const navigate = useNavigate();
  const login    = useAuthStore((s) => s.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user     = await authService.signInWithPassword(email, password);
      const authUser = await mapSupabaseUser(user);
      login(authUser);

      // Background location update
      if (authUser.role === 'customer' || authUser.role === 'delivery_partner') {
        getCurrentLocation().then(async (loc) => {
          const { data: existing } = await supabase
            .from('addresses').select('id')
            .eq('user_id', user.id).limit(1);
          if (!existing || existing.length === 0) {
            await supabase.from('addresses').insert({
              user_id: user.id, label: 'Home',
              address_line: `Location: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`,
              lat: loc.lat, lng: loc.lng, is_default: true,
            });
          } else {
            await supabase.from('addresses')
              .update({ lat: loc.lat, lng: loc.lng })
              .eq('user_id', user.id).eq('is_default', true);
          }
          if (authUser.role === 'delivery_partner') {
            await supabase.from('delivery_partners')
              .update({ current_lat: loc.lat, current_lng: loc.lng })
              .eq('user_id', user.id);
          }
        }).catch(() => {});
      }

      switch (authUser.role) {
        case 'customer':        navigate('/customer'); break;
        case 'kitchen_owner':   navigate('/kitchen'); break;
        case 'delivery_partner':navigate('/delivery'); break;
        case 'admin':           navigate('/admin'); break;
        default:                navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">

      {/* ── Hero section ─────────────────────────────────────── */}
      <div
        className="relative flex flex-col items-center justify-end flex-shrink-0"
        style={{
          minHeight: '42%',
          background: 'radial-gradient(ellipse at 50% 30%, #FF8C42 0%, #FF6B35 50%, #E84A1A 100%)',
        }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-4 left-6 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.13) 0%, transparent 70%)' }} />
        <div className="absolute bottom-12 right-4 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.09) 0%, transparent 70%)' }} />

        {/* Back link */}
        <Link
          to="/"
          className="absolute top-6 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full tap-highlight"
          style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 600, minHeight: 32 }}
        >
          ← Back
        </Link>

        {/* Brand mark */}
        <div className="flex flex-col items-center pb-10 pt-16 gap-3">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl"
            style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.32)', backdropFilter: 'blur(12px)' }}
          >
            <span style={{ fontSize: 42, lineHeight: 1 }}>🍽️</span>
          </div>
          <div className="text-center">
            <h1 className="font-black leading-none" style={{ color: '#fff', fontSize: 30, fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.02em' }}>
              FoodHub
            </h1>
            <p className="font-medium mt-1" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, letterSpacing: '0.12em' }}>
              WELCOME BACK
            </p>
          </div>
        </div>

        {/* Wave */}
        <svg viewBox="0 0 430 56" preserveAspectRatio="none" className="w-full" style={{ height: 48, display: 'block', marginBottom: -1 }}>
          <path d="M0 56 Q215 0 430 56 L430 56 L0 56 Z" fill="hsl(var(--background))" />
        </svg>
      </div>

      {/* ── Form card (slide-up) ─────────────────────────────── */}
      <div
        className="flex-1 flex flex-col px-5 pt-4 pb-8 bg-background overflow-y-auto"
        style={{ animation: 'ob-fade-in 0.45s cubic-bezier(0.34,1.26,0.64,1) both' }}
      >
        <div className="mb-6">
          <h2 className="font-bold text-xl" style={{ fontFamily: 'Poppins, sans-serif' }}>Sign in to your account</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Enter your credentials to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 flex-1">

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 ml-0.5">Email address</label>
            <div className={`flex items-center gap-3 rounded-2xl border px-4 transition-all duration-200 ${focused === 'email' ? 'border-primary ring-2 ring-primary/15 bg-white' : 'border-border bg-muted/40'}`} style={{ height: 52 }}>
              <Mail className="h-4 w-4 flex-shrink-0" style={{ color: focused === 'email' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                placeholder="your@email.com"
                required
                className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                style={{ fontSize: 15, minHeight: 'unset' }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 ml-0.5">Password</label>
            <div className={`flex items-center gap-3 rounded-2xl border px-4 transition-all duration-200 ${focused === 'pass' ? 'border-primary ring-2 ring-primary/15 bg-white' : 'border-border bg-muted/40'}`} style={{ height: 52 }}>
              <Lock className="h-4 w-4 flex-shrink-0" style={{ color: focused === 'pass' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused('pass')}
                onBlur={() => setFocused(null)}
                placeholder="••••••••"
                required
                className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                style={{ fontSize: 15, minHeight: 'unset' }}
              />
              <button type="button" onClick={() => setShowPass((p) => !p)} className="tap-highlight flex-shrink-0" style={{ minHeight: 'unset', minWidth: 'unset', padding: 4 }}>
                {showPass ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
          </div>

          {/* Location hint */}
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 px-0.5">
            <span>📍</span> Your location updates automatically for accurate delivery
          </p>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 font-bold rounded-2xl tap-highlight mt-2"
            style={{
              background: loading ? '#ccc' : 'linear-gradient(135deg, #FF6B35, #E84A1A)',
              color: '#fff', height: 54, fontSize: 15,
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 8px 24px rgba(255,107,53,0.35)',
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
            ) : (
              <>Sign In <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary font-bold tap-highlight" style={{ textDecoration: 'none' }}>
              Create Account
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes ob-fade-in {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
