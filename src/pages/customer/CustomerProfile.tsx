import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon, Phone, Mail, LogOut, ChevronRight,
  MapPin, ShoppingBag, Settings, Shield, Star,
  Package, Heart, Edit3, Check, X, Loader2
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../lib/authService';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

/* ── Loyalty tier helper ─────────────────────────────────────── */
function getLoyaltyTier(orders: number): { label: string; emoji: string; color: string; bg: string } {
  if (orders >= 50) return { label: 'Platinum',  emoji: '💎', color: '#6366F1', bg: 'rgba(99,102,241,0.15)' };
  if (orders >= 20) return { label: 'Gold',      emoji: '🥇', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)'  };
  if (orders >= 5)  return { label: 'Silver',    emoji: '🥈', color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' };
  return              { label: 'New Member', emoji: '🌟', color: '#FF6B35', bg: 'rgba(255,107,53,0.15)'  };
}

/* ── Menu item row ─────────────────────────────────────────────── */
interface MenuItem {
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  color: string;
  bg: string;
  onClick: () => void;
  badge?: string;
}

function MenuRow({ item, isLast }: { item: MenuItem; isLast: boolean }) {
  return (
    <button
      onClick={item.onClick}
      className="w-full flex items-center gap-4 px-4 py-3.5 tap-highlight hover:bg-[#FFF9F5] transition-colors active:scale-[0.99]"
      style={{ borderBottom: isLast ? 'none' : '1px solid #F5F5F5' }}
    >
      {/* Icon circle */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
        style={{ background: item.bg }}
      >
        <item.icon className="h-5 w-5" style={{ color: item.color }} />
      </div>

      {/* Label */}
      <div className="flex-1 text-left">
        <p className="font-semibold text-sm text-[#1A1A1A]">{item.label}</p>
        {item.sublabel && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{item.sublabel}</p>
        )}
      </div>

      {/* Badge + Arrow */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {item.badge && (
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,107,53,0.12)', color: '#FF6B35' }}
          >
            {item.badge}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-[#C4C4C4]" />
      </div>
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export default function CustomerProfile() {
  const navigate    = useNavigate();
  const { user, updateUser, logout } = useAuthStore();

  const [orderCount,    setOrderCount]    = useState(0);
  const [savedCount,    setSavedCount]    = useState(0);
  const [addressCount,  setAddressCount]  = useState(0);
  const [editing,       setEditing]       = useState(false);
  const [loggingOut,    setLoggingOut]    = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [username,      setUsername]      = useState(user?.username || '');
  const [phone,         setPhone]         = useState(user?.phone || '');
  const [focusedField,  setFocusedField]  = useState<string | null>(null);

  const tier = getLoyaltyTier(orderCount);

  /* ── Load stats ── */
  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      const [ordersRes, addrRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', user.id),
        supabase.from('addresses').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      setOrderCount(ordersRes.count ?? 0);
      setSavedCount(Math.floor((ordersRes.count ?? 0) * 0.4)); // approx saved items
      setAddressCount(addrRes.count ?? 0);
    })();
  }, [user?.id]);

  /* ── Save profile ── */
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await authService.updateProfile(user.id, { username, phone });
      updateUser({ username, phone });
      toast.success('Profile updated!');
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  /* ── Logout ── */
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authService.signOut();
      logout();
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message);
      setLoggingOut(false);
    }
  };

  /* ── Avatar initials ── */
  const initials = (user?.username || user?.email || 'U')
    .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  /* ── Menu items ── */
  const MENU_ITEMS: MenuItem[] = [
    {
      icon: UserIcon,
      label: 'Account',
      sublabel: 'Edit name, phone & email',
      color: '#FF6B35',
      bg: 'rgba(255,107,53,0.1)',
      onClick: () => setEditing(true),
    },
    {
      icon: MapPin,
      label: 'Addresses',
      sublabel: `${addressCount} saved location${addressCount !== 1 ? 's' : ''}`,
      color: '#10B981',
      bg: 'rgba(16,185,129,0.1)',
      onClick: () => navigate('/customer/addresses'),
    },
    {
      icon: Package,
      label: 'Orders',
      sublabel: `${orderCount} order${orderCount !== 1 ? 's' : ''} placed`,
      color: '#6366F1',
      bg: 'rgba(99,102,241,0.1)',
      onClick: () => navigate('/customer/orders'),
    },
    {
      icon: Settings,
      label: 'Settings',
      sublabel: 'Notifications & preferences',
      color: '#64748B',
      bg: 'rgba(100,116,139,0.1)',
      onClick: () => toast('Settings coming soon!', { icon: '⚙️' }),
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#F5F5F5' }}>

      {/* ══ HERO SECTION ══════════════════════════════════════════════ */}
      <div
        className="relative"
        style={{
          background: 'linear-gradient(170deg, #FF8C42 0%, #FF6B35 45%, #E84A1A 100%)',
          paddingBottom: 72,
        }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-6 right-4 w-36 h-36 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.13) 0%, transparent 70%)' }} />
        <div className="absolute top-16 left-0 w-28 h-28 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)' }} />
        <div className="absolute bottom-12 right-10 w-20 h-20 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)' }} />

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-6 pb-4">
          <div>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">FoodHub</p>
            <h1 className="font-black text-xl text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              My Profile
            </h1>
          </div>
          {/* Edit shortcut */}
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center tap-highlight"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)' }}
            >
              <Edit3 className="h-4 w-4 text-white" />
            </button>
          )}
        </div>

        {/* ── Avatar + Name ── */}
        <div className="flex flex-col items-center gap-3 px-4 pb-2">
          {/* Avatar ring */}
          <div
            className="relative"
            style={{
              padding: 3,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2))',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-black"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))',
                border: '2px solid rgba(255,255,255,0.35)',
                backdropFilter: 'blur(8px)',
                color: '#fff',
                fontFamily: 'Poppins, sans-serif',
                letterSpacing: '-0.02em',
              }}
            >
              {initials}
            </div>
            {/* Online dot */}
            <div
              className="absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full"
              style={{ background: '#22C55E', border: '2.5px solid #FF6B35', boxShadow: '0 2px 6px rgba(34,197,94,0.5)' }}
            />
          </div>

          {/* Name */}
          <div className="text-center">
            <h2
              className="font-black text-white leading-tight"
              style={{ fontSize: 22, fontFamily: 'Poppins, sans-serif' }}
            >
              {user?.username || 'Food Lover'}
            </h2>
            <p className="text-white/65 text-xs mt-0.5 font-medium">{user?.email}</p>
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-2 mt-1">
            {/* Member since */}
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <Star className="h-3 w-3 text-white/80 fill-white/80" />
              <span className="text-[11px] font-semibold text-white/90">Member Since 2024</span>
            </div>

            {/* Loyalty tier */}
            <div
              className="flex items-center gap-1 px-3 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.9)', border: '1.5px solid rgba(255,255,255,0.95)' }}
            >
              <span style={{ fontSize: 12 }}>{tier.emoji}</span>
              <span className="text-[11px] font-bold" style={{ color: tier.color }}>{tier.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ STATS STRIP ════════════════════════════════════════════════ */}
      <div className="px-4" style={{ marginTop: -48 }}>
        <div
          className="rounded-3xl overflow-hidden shadow-xl"
          style={{
            background: 'rgba(255,255,255,0.97)',
            border: '1px solid rgba(255,255,255,0.9)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="grid grid-cols-3 divide-x divide-[#F5F5F5]">
            {[
              { value: orderCount, label: 'Orders',    emoji: '📦' },
              { value: savedCount, label: 'Saved',     emoji: '❤️' },
              { value: addressCount, label: 'Addresses', emoji: '📍' },
            ].map(({ value, label, emoji }) => (
              <div key={label} className="py-4 flex flex-col items-center gap-1">
                <span className="text-base">{emoji}</span>
                <p
                  className="font-black text-[22px] leading-none"
                  style={{ fontFamily: 'Poppins, sans-serif', color: '#1A1A1A' }}
                >
                  {value}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ EDIT FORM (slide-in when editing) ══════════════════════════ */}
      {editing && (
        <div
          className="mx-4 mt-4 bg-white rounded-3xl overflow-hidden shadow-sm"
          style={{
            border: '1.5px solid rgba(255,107,53,0.15)',
            animation: 'profile-slide-in 0.35s cubic-bezier(0.34,1.2,0.64,1)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: '1px solid #F5F5F5', background: '#FFFAF7' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,107,53,0.1)' }}>
                <Edit3 className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-bold text-sm">Edit Profile</span>
            </div>
            <button onClick={() => { setEditing(false); setUsername(user?.username || ''); setPhone(user?.phone || ''); }}>
              <X className="h-4.5 w-4.5 text-muted-foreground tap-highlight" style={{ width: 18, height: 18 }} />
            </button>
          </div>

          {/* Fields */}
          <div className="px-4 py-4 space-y-3">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 ml-0.5 text-[#555]">Full Name</label>
              <div
                className="flex items-center gap-3 rounded-2xl border px-4 transition-all duration-200"
                style={{
                  height: 50,
                  borderColor: focusedField === 'name' ? '#FF6B35' : '#E5E7EB',
                  background: focusedField === 'name' ? '#fff' : '#FAFAFA',
                  boxShadow: focusedField === 'name' ? '0 0 0 3px rgba(255,107,53,0.1)' : 'none',
                }}
              >
                <UserIcon className="h-4 w-4 flex-shrink-0"
                  style={{ color: focusedField === 'name' ? '#FF6B35' : '#9CA3AF' }} />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Your full name"
                  className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 ml-0.5 text-[#555]">Phone Number</label>
              <div
                className="flex items-center gap-3 rounded-2xl border px-4 transition-all duration-200"
                style={{
                  height: 50,
                  borderColor: focusedField === 'phone' ? '#FF6B35' : '#E5E7EB',
                  background: focusedField === 'phone' ? '#fff' : '#FAFAFA',
                  boxShadow: focusedField === 'phone' ? '0 0 0 3px rgba(255,107,53,0.1)' : 'none',
                }}
              >
                <Phone className="h-4 w-4 flex-shrink-0"
                  style={{ color: focusedField === 'phone' ? '#FF6B35' : '#9CA3AF' }} />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="+91 9876543210"
                  type="tel"
                  className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 ml-0.5 text-[#555]">Email (read-only)</label>
              <div
                className="flex items-center gap-3 rounded-2xl border px-4"
                style={{ height: 50, borderColor: '#E5E7EB', background: '#F3F4F6' }}
              >
                <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span className="text-sm text-muted-foreground font-medium truncate">{user?.email}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 px-4 pb-4">
            <button
              onClick={() => { setEditing(false); setUsername(user?.username || ''); setPhone(user?.phone || ''); }}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl font-semibold text-sm tap-highlight"
              style={{
                height: 48, background: '#F5F5F5', color: '#6B7280',
                border: '1.5px solid #E5E7EB',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-[2] flex items-center justify-center gap-2 rounded-2xl font-bold text-sm tap-highlight"
              style={{
                height: 48,
                background: saving ? '#ccc' : 'linear-gradient(135deg, #FF6B35, #E84A1A)',
                color: '#fff',
                border: 'none',
                boxShadow: saving ? 'none' : '0 6px 18px rgba(255,107,53,0.3)',
              }}
            >
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                : <><Check className="h-4 w-4" /> Save Changes</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ══ MENU LIST ═══════════════════════════════════════════════════ */}
      <div
        className="mx-4 mt-4 bg-white rounded-3xl overflow-hidden shadow-sm"
        style={{ border: '1px solid #F0F0F0' }}
      >
        {/* Section label */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quick Access</p>
        </div>

        {MENU_ITEMS.map((item, idx) => (
          <MenuRow key={item.label} item={item} isLast={idx === MENU_ITEMS.length - 1} />
        ))}
      </div>

      {/* ══ ACCOUNT INFO CARD ══════════════════════════════════════════ */}
      <div
        className="mx-4 mt-4 rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #FFF9F5, #FFF3EE)',
          border: '1.5px solid rgba(255,107,53,0.12)',
        }}
      >
        <div className="px-4 py-4 flex items-center gap-4">
          {/* Icon */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8E53)' }}
          >
            <Shield className="h-6 w-6 text-white" />
          </div>
          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-[#1A1A1A]">
              {tier.emoji} {tier.label} Account
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {orderCount < 5
                ? `${5 - orderCount} more orders to reach Silver`
                : orderCount < 20
                ? `${20 - orderCount} more orders to reach Gold`
                : orderCount < 50
                ? `${50 - orderCount} more orders to reach Platinum`
                : 'You\'ve reached the highest tier!'}
            </p>
          </div>
          {/* Tier badge */}
          <div
            className="flex-shrink-0 px-2.5 py-1 rounded-full"
            style={{ background: tier.bg, border: `1.5px solid ${tier.color}30` }}
          >
            <span className="text-[10px] font-black" style={{ color: tier.color }}>{tier.label.toUpperCase()}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-4">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,107,53,0.12)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, orderCount < 5
                  ? (orderCount / 5) * 100
                  : orderCount < 20
                  ? ((orderCount - 5) / 15) * 100
                  : orderCount < 50
                  ? ((orderCount - 20) / 30) * 100
                  : 100)}%`,
                background: `linear-gradient(90deg, ${tier.color}80, ${tier.color})`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ══ LOGOUT BUTTON ═══════════════════════════════════════════════ */}
      <div className="px-4 mt-4 pb-32">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2.5 rounded-3xl font-bold text-sm tap-highlight transition-all"
          style={{
            height: 54,
            background: loggingOut ? '#FFF3EE' : '#FFFFFF',
            color: '#FF4444',
            border: '2px solid rgba(255,68,68,0.2)',
            boxShadow: '0 4px 16px rgba(255,68,68,0.06)',
          }}
        >
          {loggingOut ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Signing out…</>
          ) : (
            <><LogOut className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} /> Sign Out</>
          )}
        </button>

        {/* Version label */}
        <p className="text-center text-[10px] text-muted-foreground/50 font-medium mt-4">
          FoodHub v1.0 · Powered by Cloud Kitchens
        </p>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes profile-slide-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
