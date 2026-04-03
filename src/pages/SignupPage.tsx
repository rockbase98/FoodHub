import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowRight, Mail, Lock, User as UserIcon, Phone, ChevronLeft } from 'lucide-react';
import { authService } from '../lib/authService';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import { UserRole, AuthUser } from '../types';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getCurrentLocation } from '../lib/utils';

/* ── Helpers ─────────────────────────────────────────────────── */
async function mapSupabaseUser(user: User): Promise<AuthUser> {
  let role = user.user_metadata?.role || 'customer';
  if (!user.user_metadata?.role) {
    const { data: profile } = await supabase
      .from('user_profiles').select('role').eq('id', user.id).single();
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

/* ── Role config ─────────────────────────────────────────────── */
const ROLES: { value: UserRole; label: string; emoji: string; desc: string; color: string; bg: string }[] = [
  { value: 'customer',         label: 'Customer',      emoji: '🛍️', desc: 'Order food online',     color: '#FF6B35', bg: '#FFF3EE' },
  { value: 'kitchen_owner',    label: 'Kitchen Owner', emoji: '👨‍🍳', desc: 'Sell your food',        color: '#7C3AED', bg: '#F5F0FF' },
  { value: 'delivery_partner', label: 'Rider',         emoji: '🛵', desc: 'Deliver & earn',        color: '#0D9488', bg: '#F0FFFE' },
];

/* ── Step indicator ──────────────────────────────────────────── */
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width:  i === current ? 24 : 8,
            height: 8,
            borderRadius: 4,
            background: i <= current ? 'hsl(var(--primary))' : '#e0e0e0',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

/* ── 4-box OTP input ─────────────────────────────────────────── */
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const handleKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      refs[idx - 1].current?.focus();
      onChange(value.slice(0, idx - 1));
    }
  };

  const handleChange = (idx: number, v: string) => {
    const digit = v.replace(/\D/g, '').slice(-1);
    const arr   = value.split('');
    arr[idx]    = digit;
    const next  = arr.join('').slice(0, 4);
    onChange(next);
    if (digit && idx < 3) refs[idx + 1].current?.focus();
  };

  return (
    <div className="flex gap-3 justify-center my-2">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onFocus={(e) => e.target.select()}
          className="text-center font-bold text-xl rounded-2xl border-2 outline-none transition-all duration-200 bg-muted/40"
          style={{
            width: 60, height: 64,
            fontSize: 24,
            borderColor: value[i] ? 'hsl(var(--primary))' : 'hsl(var(--border))',
            background: value[i] ? 'hsl(var(--primary) / 0.08)' : 'hsl(var(--muted) / 0.4)',
            color: 'hsl(var(--foreground))',
            minHeight: 'unset',
            minWidth: 'unset',
          }}
        />
      ))}
    </div>
  );
}

/* ── Styled input wrapper ────────────────────────────────────── */
function FormInput({
  icon: Icon, type = 'text', value, onChange, placeholder, required, focused, onFocus, onBlur, rightEl, ...rest
}: {
  icon: React.ElementType; type?: string; value: string; onChange: (v: string) => void;
  placeholder: string; required?: boolean; focused: boolean;
  onFocus: () => void; onBlur: () => void; rightEl?: React.ReactNode;
  [k: string]: any;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-4 transition-all duration-200 ${focused ? 'border-primary ring-2 ring-primary/15 bg-white' : 'border-border bg-muted/40'}`} style={{ height: 52 }}>
      <Icon className="h-4 w-4 flex-shrink-0" style={{ color: focused ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
        style={{ fontSize: 15, minHeight: 'unset' }}
        {...rest}
      />
      {rightEl}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
export default function SignupPage() {
  const [step, setStep]         = useState<'role' | 'info' | 'verify'>('role');
  const [role, setRole]         = useState<UserRole>('customer');
  const [email, setEmail]       = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp]           = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [focused, setFocused]   = useState<string | null>(null);
  const navigate = useNavigate();
  const login    = useAuthStore((s) => s.login);

  /* Step helpers */
  const STEPS = ['role', 'info', 'verify'];
  const stepIdx = STEPS.indexOf(step);

  const selectedRole = ROLES.find((r) => r.value === role)!;

  /* Send OTP */
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.sendOtp(email);
      toast.success('OTP sent to your email!');
      setStep('verify');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  /* Verify + Signup */
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) { toast.error('Enter all 4 digits'); return; }
    setLoading(true);
    try {
      const user     = await authService.verifyOtpAndSetup(email, otp, password, username, role, phone);
      const authUser = await mapSupabaseUser(user);
      login(authUser);

      // Background location capture
      const locToast = toast.loading('📍 Capturing location…', { duration: Infinity });
      try {
        const loc = await getCurrentLocation();
        if (role === 'customer' || role === 'delivery_partner') {
          await supabase.from('addresses').insert({
            user_id: user.id, label: 'Home',
            address_line: `Location: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`,
            lat: loc.lat, lng: loc.lng, is_default: true,
          });
        }
        if (role === 'delivery_partner') {
          const { data: ep } = await supabase.from('delivery_partners').select('id').eq('user_id', user.id).single();
          if (ep) await supabase.from('delivery_partners').update({ current_lat: loc.lat, current_lng: loc.lng }).eq('user_id', user.id);
        }
        toast.dismiss(locToast);
        toast.success('Location saved!', { icon: '📍' });
      } catch {
        toast.dismiss(locToast);
      }

      await new Promise((r) => setTimeout(r, 800));
      switch (role) {
        case 'customer':         navigate('/customer'); break;
        case 'kitchen_owner':    navigate('/kitchen/register'); break;
        case 'delivery_partner': navigate('/delivery/register'); break;
        default:                 navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message || 'Signup failed');
      setLoading(false);
    }
  };

  /* ── Hero gradient based on selected role ── */
  const heroGrad = `radial-gradient(ellipse at 50% 30%, ${selectedRole.color}CC 0%, ${selectedRole.color} 60%, ${selectedRole.color}DD 100%)`;

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div
        className="relative flex flex-col items-center justify-end flex-shrink-0"
        style={{ minHeight: '36%', background: heroGrad, transition: 'background 0.5s ease' }}
      >
        <div className="absolute top-4 left-6 w-28 h-28 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.13) 0%, transparent 70%)' }} />
        <div className="absolute bottom-10 right-6 w-20 h-20 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)' }} />

        {/* Back button */}
        {step !== 'role' ? (
          <button
            onClick={() => setStep(step === 'verify' ? 'info' : 'role')}
            className="absolute top-6 left-4 flex items-center gap-1 px-3 py-1.5 rounded-full tap-highlight"
            style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 600, minHeight: 32 }}
          >
            <ChevronLeft className="h-3 w-3" /> Back
          </button>
        ) : (
          <Link to="/login"
            className="absolute top-6 left-4 flex items-center gap-1 px-3 py-1.5 rounded-full tap-highlight"
            style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 600, minHeight: 32 }}
          >
            <ChevronLeft className="h-3 w-3" /> Login
          </Link>
        )}

        {/* Brand + Role emoji */}
        <div className="flex flex-col items-center pb-8 pt-14 gap-2">
          <div
            className="w-18 h-18 rounded-3xl flex items-center justify-center shadow-2xl"
            style={{ width: 68, height: 68, background: 'rgba(255,255,255,0.22)', border: '2px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(12px)', transition: 'all 0.4s ease' }}
          >
            <span style={{ fontSize: 36, lineHeight: 1, transition: 'all 0.3s ease' }}>{selectedRole.emoji}</span>
          </div>
          <div className="text-center mt-1">
            <h1 className="font-black leading-none" style={{ color: '#fff', fontSize: 26, fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.02em' }}>
              FoodHub
            </h1>
            <p className="font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, letterSpacing: '0.06em' }}>
              {step === 'role' ? 'JOIN AS' : step === 'verify' ? 'VERIFY EMAIL' : `SIGNING UP AS ${selectedRole.label.toUpperCase()}`}
            </p>
          </div>
        </div>

        {/* Wave */}
        <svg viewBox="0 0 430 56" preserveAspectRatio="none" className="w-full" style={{ height: 44, display: 'block', marginBottom: -1 }}>
          <path d="M0 56 Q215 0 430 56 L430 56 L0 56 Z" fill="hsl(var(--background))" />
        </svg>
      </div>

      {/* ── Form area ────────────────────────────────────────── */}
      <div
        key={step}
        className="flex-1 flex flex-col px-5 pt-3 pb-8 bg-background overflow-y-auto"
        style={{ animation: 'su-slide-up 0.38s cubic-bezier(0.34,1.2,0.64,1) both' }}
      >
        {/* Step dots */}
        <StepDots current={stepIdx} total={3} />

        {/* ── STEP 1: ROLE SELECTION ── */}
        {step === 'role' && (
          <div className="flex-1 flex flex-col">
            <div className="mb-5">
              <h2 className="font-bold text-xl" style={{ fontFamily: 'Poppins, sans-serif' }}>Choose your role</h2>
              <p className="text-sm text-muted-foreground mt-0.5">How will you use FoodHub?</p>
            </div>

            <div className="space-y-3 flex-1">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className="w-full tap-highlight"
                  style={{ minHeight: 'unset', minWidth: 'unset', padding: 0 }}
                >
                  <div
                    className="flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200"
                    style={{
                      borderColor: role === r.value ? r.color : 'hsl(var(--border))',
                      background: role === r.value ? r.bg : 'white',
                      boxShadow: role === r.value ? `0 4px 16px ${r.color}25` : '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    {/* Emoji circle */}
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                      style={{ background: role === r.value ? `${r.color}22` : '#f5f5f5', transition: 'all 0.2s' }}
                    >
                      <span style={{ fontSize: 30 }}>{r.emoji}</span>
                    </div>

                    {/* Text */}
                    <div className="flex-1 text-left">
                      <p className="font-bold text-sm" style={{ color: role === r.value ? r.color : 'hsl(var(--foreground))' }}>{r.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                    </div>

                    {/* Radio */}
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200"
                      style={{ borderColor: role === r.value ? r.color : '#ddd', background: role === r.value ? r.color : 'transparent' }}
                    >
                      {role === r.value && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep('info')}
              className="w-full flex items-center justify-center gap-2 font-bold rounded-2xl tap-highlight mt-6"
              style={{
                background: `linear-gradient(135deg, ${selectedRole.color}, ${selectedRole.color}CC)`,
                color: '#fff', height: 54, fontSize: 15,
                border: 'none', cursor: 'pointer',
                boxShadow: `0 8px 24px ${selectedRole.color}40`,
              }}
            >
              Continue as {selectedRole.label} <ArrowRight className="h-4 w-4" />
            </button>

            <p className="text-center text-sm text-muted-foreground mt-5">
              Already have an account?{' '}
              <Link to="/login" className="font-bold tap-highlight" style={{ color: selectedRole.color }}>Sign in</Link>
            </p>
          </div>
        )}

        {/* ── STEP 2: INFO FORM ── */}
        {step === 'info' && (
          <form onSubmit={handleSendOtp} className="flex-1 flex flex-col">
            <div className="mb-5">
              <h2 className="font-bold text-xl" style={{ fontFamily: 'Poppins, sans-serif' }}>Your details</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Fill in your information below</p>
            </div>

            <div className="space-y-3 flex-1">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 ml-0.5">Full Name</label>
                <FormInput
                  icon={UserIcon}
                  value={username}
                  onChange={setUsername}
                  placeholder="e.g. Rahul Sharma"
                  required
                  focused={focused === 'name'}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 ml-0.5">Email address</label>
                <FormInput
                  icon={Mail}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="your@email.com"
                  required
                  focused={focused === 'email'}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 ml-0.5">Phone number</label>
                <FormInput
                  icon={Phone}
                  type="tel"
                  value={phone}
                  onChange={setPhone}
                  placeholder="+91 9876543210"
                  required
                  focused={focused === 'phone'}
                  onFocus={() => setFocused('phone')}
                  onBlur={() => setFocused(null)}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 ml-0.5">Create password</label>
                <FormInput
                  icon={Lock}
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={setPassword}
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                  focused={focused === 'pass'}
                  onFocus={() => setFocused('pass')}
                  onBlur={() => setFocused(null)}
                  rightEl={
                    <button type="button" onClick={() => setShowPass((p) => !p)} style={{ minHeight: 'unset', minWidth: 'unset', padding: 4 }} className="tap-highlight flex-shrink-0">
                      {showPass ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  }
                />
              </div>

              {/* Location hint */}
              {(role === 'customer' || role === 'delivery_partner') && (
                <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: `${selectedRole.color}10` }}>
                  <span className="text-base flex-shrink-0 mt-0.5">📍</span>
                  <p className="text-xs leading-relaxed" style={{ color: selectedRole.color }}>
                    Your location will be detected automatically after signup for accurate delivery matching.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 font-bold rounded-2xl tap-highlight mt-5"
              style={{
                background: loading ? '#ccc' : `linear-gradient(135deg, ${selectedRole.color}, ${selectedRole.color}CC)`,
                color: '#fff', height: 54, fontSize: 15,
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : `0 8px 24px ${selectedRole.color}35`,
              }}
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending OTP…</> : <>Send OTP to Email <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        )}

        {/* ── STEP 3: OTP VERIFY ── */}
        {step === 'verify' && (
          <form onSubmit={handleVerify} className="flex-1 flex flex-col">
            <div className="mb-5">
              <h2 className="font-bold text-xl" style={{ fontFamily: 'Poppins, sans-serif' }}>Verify your email</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                We sent a 4-digit code to{' '}
                <span className="font-semibold text-foreground">{email}</span>
              </p>
            </div>

            {/* OTP boxes */}
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-3 text-center">Enter 4-digit OTP</label>
              <OtpInput value={otp} onChange={setOtp} />

              {/* Resend */}
              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await authService.sendOtp(email);
                      toast.success('OTP resent!');
                      setOtp('');
                    } catch (e: any) { toast.error(e.message); }
                  }}
                  className="text-xs font-semibold tap-highlight"
                  style={{ color: selectedRole.color, minHeight: 'unset', minWidth: 'unset', padding: '4px 8px', background: 'transparent', border: 'none' }}
                >
                  Didn't receive it? Resend OTP
                </button>
              </div>

              {/* Summary card */}
              <div className="mt-6 p-4 rounded-2xl border" style={{ background: `${selectedRole.color}08`, borderColor: `${selectedRole.color}25` }}>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Account summary</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 14 }}>{selectedRole.emoji}</span>
                    <p className="text-sm font-semibold">{username || 'Your name'}</p>
                    <span
                      className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${selectedRole.color}20`, color: selectedRole.color }}
                    >
                      {selectedRole.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3 w-3" /> {email}
                  </p>
                  {phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Phone className="h-3 w-3" /> {phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 4}
              className="w-full flex items-center justify-center gap-2 font-bold rounded-2xl tap-highlight mt-5"
              style={{
                background: loading || otp.length < 4 ? '#ccc' : `linear-gradient(135deg, ${selectedRole.color}, ${selectedRole.color}CC)`,
                color: '#fff', height: 54, fontSize: 15,
                border: 'none', cursor: loading || otp.length < 4 ? 'not-allowed' : 'pointer',
                boxShadow: loading || otp.length < 4 ? 'none' : `0 8px 24px ${selectedRole.color}35`,
                transition: 'all 0.2s ease',
              }}
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</> : <>Verify & Create Account 🎉</>}
            </button>

            <p className="text-center text-xs text-muted-foreground mt-4">
              By signing up you agree to FoodHub's Terms & Privacy Policy.
            </p>
          </form>
        )}
      </div>

      <style>{`
        @keyframes su-slide-up {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
