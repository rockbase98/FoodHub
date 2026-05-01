import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store, Bike, Package, LogOut, Users, DollarSign,
  Activity, Percent, TrendingUp, ChevronRight, RefreshCw,
  ShieldCheck, Plus, Clock, CheckCircle2, XCircle, Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';
import { authService } from '../../lib/authService';

/* ── Status config ─────────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: React.ElementType }> = {
  pending:          { label: 'Pending',     bg: '#FFF7ED', color: '#EA580C', icon: Clock         },
  accepted:         { label: 'Accepted',    bg: '#EFF6FF', color: '#2563EB', icon: CheckCircle2  },
  preparing:        { label: 'Preparing',   bg: '#F5F3FF', color: '#7C3AED', icon: Activity      },
  ready:            { label: 'Ready',       bg: '#ECFDF5', color: '#059669', icon: CheckCircle2  },
  picked_up:        { label: 'Picked Up',   bg: '#FFF7ED', color: '#D97706', icon: Bike          },
  out_for_delivery: { label: 'On the Way',  bg: '#EFF6FF', color: '#0284C7', icon: Bike          },
  delivered:        { label: 'Delivered',   bg: '#F0FDF4', color: '#16A34A', icon: CheckCircle2  },
  cancelled:        { label: 'Cancelled',   bg: '#FEF2F2', color: '#DC2626', icon: XCircle       },
};

function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/* ══════════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const { logout } = useAuthStore();
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalKitchens:   0,
    pendingKitchens: 0,
    totalRiders:     0,
    pendingRiders:   0,
    totalOrders:     0,
    totalRevenue:    0,
    todayRevenue:    0,
    totalCustomers:  0,
    activeOrders:    0,
    onlineRiders:    0,
    deliveredToday:  0,
  });

  useEffect(() => { loadStats(); }, []);

  const loadStats = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);

      const [kitchens, riders, orders, customers] = await Promise.all([
        supabase.from('kitchens').select('*', { count: 'exact' }),
        supabase.from('delivery_partners').select('*', { count: 'exact' }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('*', { count: 'exact' }).eq('role', 'customer'),
      ]);

      const allOrders       = orders.data || [];
      const pendingKitchens = kitchens.data?.filter((k) => k.status === 'pending').length ?? 0;
      const pendingRiders   = riders.data?.filter((r) => r.status === 'pending').length ?? 0;
      const onlineRiders    = riders.data?.filter((r) => r.is_online).length ?? 0;
      const totalRevenue    = allOrders.reduce((s, o) => s + Number(o.total || 0), 0);
      const activeOrders    = allOrders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;

      const todayOrders   = allOrders.filter((o) => new Date(o.created_at) >= today);
      const todayRevenue  = todayOrders.reduce((s, o) => s + Number(o.total || 0), 0);
      const deliveredToday = todayOrders.filter((o) => o.status === 'delivered').length;

      setStats({
        totalKitchens:   kitchens.count ?? 0,
        pendingKitchens,
        totalRiders:     riders.count ?? 0,
        pendingRiders,
        totalOrders:     allOrders.length,
        totalRevenue,
        todayRevenue,
        totalCustomers:  customers.count ?? 0,
        activeOrders,
        onlineRiders,
        deliveredToday,
      });

      setRecentOrders(allOrders.slice(0, 10));
    } catch {
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await authService.signOut();
    logout();
  };

  const handleRefresh = async () => {
    await loadStats(true);
    toast.success('Dashboard refreshed');
  };

  /* ── Secondary metrics ──────────────────────────────────────── */
  const SECONDARY_METRICS = [
    { label: 'Total Revenue',   value: formatCurrency(stats.totalRevenue),   emoji: '💰', color: '#FF6B35' },
    { label: 'Total Kitchens',  value: stats.totalKitchens,                  emoji: '🏪', color: '#7C3AED' },
    { label: 'Total Riders',    value: stats.totalRiders,                    emoji: '🛵', color: '#0D9488' },
    { label: 'Customers',       value: stats.totalCustomers,                 emoji: '👥', color: '#2563EB' },
    { label: 'Online Riders',   value: stats.onlineRiders,                   emoji: '🟢', color: '#16A34A' },
    { label: 'Delivered Today', value: stats.deliveredToday,                 emoji: '✅', color: '#059669' },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#F5F5F5' }}>

      {/* ══ HERO SECTION ══════════════════════════════════════════ */}
      <div
        className="relative"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, #FF8C42 0%, #FF6B35 50%, #E84A1A 100%)',
          paddingBottom: 56,
        }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-4 right-6 w-36 h-36 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-12 left-2 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)' }} />
        <div className="absolute top-20 right-14 w-16 h-16 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)' }} />

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-6 pb-3">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <ShieldCheck className="h-3.5 w-3.5 text-white/70" />
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">FoodHub Admin</p>
            </div>
            <h1 className="font-black text-xl text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Command Center
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-9 h-9 rounded-full flex items-center justify-center tap-highlight"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)' }}
            >
              <RefreshCw className={`h-4 w-4 text-white ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-full flex items-center justify-center tap-highlight"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)' }}
            >
              <LogOut className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* ── Primary hero metrics ── */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        ) : (
          <div className="px-4">
            {/* Today's Revenue — the dominant metric */}
            <div
              className="rounded-3xl p-5 mb-3"
              style={{
                background: 'rgba(255,255,255,0.14)',
                border: '1.5px solid rgba(255,255,255,0.22)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">
                    Today's Revenue
                  </p>
                  <p
                    className="text-white font-black leading-none"
                    style={{ fontSize: 38, fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.02em' }}
                  >
                    {formatCurrency(stats.todayRevenue)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <TrendingUp className="h-3.5 w-3.5 text-green-300" />
                    <p className="text-white/70 text-xs font-medium">
                      {stats.deliveredToday} orders delivered today
                    </p>
                  </div>
                </div>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  <DollarSign className="h-7 w-7 text-white" strokeWidth={2} />
                </div>
              </div>
            </div>

            {/* 2-column flanking stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Orders', value: stats.totalOrders, sublabel: `${stats.activeOrders} active now`, emoji: '📦', color: '#34D399' },
                { label: 'Active Riders', value: stats.onlineRiders, sublabel: `of ${stats.totalRiders} total`, emoji: '🛵', color: '#60A5FA' },
              ].map(({ label, value, sublabel, emoji, color }) => (
                <div
                  key={label}
                  className="rounded-2xl p-3.5"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span className="text-xl">{emoji}</span>
                  <p
                    className="text-white font-black text-2xl mt-1 leading-none"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    {value}
                  </p>
                  <p className="text-white/80 text-xs font-semibold mt-0.5">{label}</p>
                  <p className="text-white/50 text-[10px] font-medium mt-0.5">{sublabel}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wave */}
        <svg viewBox="0 0 430 48" preserveAspectRatio="none"
          className="absolute bottom-0 left-0 right-0 w-full" style={{ height: 40 }}>
          <path d="M0 48 Q215 0 430 48 L430 48 L0 48 Z" fill="#F5F5F5" />
        </svg>
      </div>

      {/* ══ SCROLLABLE CONTENT ═════════════════════════════════════ */}
      <div className="pb-32">

        {/* ── SECONDARY METRICS (horizontal scroll) ─────────────── */}
        <section className="pt-4">
          <div className="px-4 mb-3 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Platform Overview
            </p>
          </div>
          <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-1">
            {SECONDARY_METRICS.map(({ label, value, emoji, color }) => (
              <div
                key={label}
                className="flex-shrink-0 rounded-2xl p-3.5 bg-white shadow-sm"
                style={{
                  border: '1px solid #F0F0F0',
                  minWidth: 110,
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 text-lg"
                  style={{ background: `${color}15` }}
                >
                  {emoji}
                </div>
                <p
                  className="font-black text-lg leading-none"
                  style={{ fontFamily: 'Poppins, sans-serif', color: '#1A1A1A' }}
                >
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── QUICK ACTIONS ─────────────────────────────────────── */}
        <section className="px-4 pt-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Quick Actions
          </p>

          {/* Primary approval actions */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Approve Kitchens */}
            <Link to="/admin/kitchens" className="tap-highlight">
              <div
                className="rounded-2xl p-4 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #FF6B35, #FF8E53)',
                  boxShadow: '0 8px 24px rgba(255,107,53,0.3)',
                }}
              >
                {/* Pending badge */}
                {stats.pendingKitchens > 0 && (
                  <span
                    className="absolute top-3 right-3 min-w-[22px] h-[22px] px-1 rounded-full bg-white text-primary text-[10px] font-black flex items-center justify-center leading-none"
                    style={{ animation: 'badge-pulse 2s ease-in-out infinite' }}
                  >
                    {stats.pendingKitchens}
                  </span>
                )}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(255,255,255,0.22)' }}
                >
                  <Store className="h-5.5 w-5.5 text-white" style={{ width: 22, height: 22 }} />
                </div>
                <p className="text-white font-black text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Approve<br />Kitchens
                </p>
                <p className="text-white/70 text-[10px] font-medium mt-0.5">
                  {stats.pendingKitchens > 0
                    ? `${stats.pendingKitchens} awaiting review`
                    : 'All approved'}
                </p>
              </div>
            </Link>

            {/* Approve Riders */}
            <Link to="/admin/riders" className="tap-highlight">
              <div
                className="rounded-2xl p-4 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #0D9488, #0F766E)',
                  boxShadow: '0 8px 24px rgba(13,148,136,0.3)',
                }}
              >
                {stats.pendingRiders > 0 && (
                  <span
                    className="absolute top-3 right-3 min-w-[22px] h-[22px] px-1 rounded-full bg-white text-teal-700 text-[10px] font-black flex items-center justify-center leading-none"
                    style={{ animation: 'badge-pulse 2s ease-in-out infinite 0.3s' }}
                  >
                    {stats.pendingRiders}
                  </span>
                )}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(255,255,255,0.22)' }}
                >
                  <Bike className="h-5.5 w-5.5 text-white" style={{ width: 22, height: 22 }} />
                </div>
                <p className="text-white font-black text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Approve<br />Riders
                </p>
                <p className="text-white/70 text-[10px] font-medium mt-0.5">
                  {stats.pendingRiders > 0
                    ? `${stats.pendingRiders} awaiting review`
                    : 'All approved'}
                </p>
              </div>
            </Link>
          </div>

          {/* Secondary action row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { to: '/admin/orders',      icon: Package,  label: 'All Orders',    bg: '#EFF6FF', color: '#2563EB', emoji: '📦' },
              { to: '/admin/coupons',     icon: Percent,  label: 'Coupons',       bg: '#FFF7ED', color: '#EA580C', emoji: '🏷️' },
              { to: '/admin/add-kitchen', icon: Plus,     label: 'Add Kitchen',   bg: '#F0FDF4', color: '#16A34A', emoji: '➕' },
            ].map(({ to, icon: Icon, label, bg, color, emoji }) => (
              <Link to={to} key={to} className="tap-highlight">
                <div
                  className="rounded-2xl py-4 px-3 flex flex-col items-center text-center gap-2 bg-white shadow-sm"
                  style={{ border: '1px solid #F0F0F0' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: bg }}
                  >
                    <Icon className="h-5 w-5" style={{ color }} />
                  </div>
                  <p className="text-xs font-bold text-[#1A1A1A] leading-tight">{label}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── RECENT ORDERS ─────────────────────────────────────── */}
        <section className="px-4 pt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Recent Orders
            </p>
            <Link
              to="/admin/orders"
              className="flex items-center gap-0.5 text-xs font-semibold text-primary tap-highlight"
            >
              See all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl skeleton" />)}
            </div>
          ) : recentOrders.length === 0 ? (
            <div
              className="bg-white rounded-3xl p-8 flex flex-col items-center text-center shadow-sm"
              style={{ border: '1px solid #F0F0F0' }}
            >
              <span className="text-4xl mb-2">📭</span>
              <p className="font-bold text-sm">No orders yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Orders will appear here once customers start ordering.</p>
            </div>
          ) : (
            <div
              className="bg-white rounded-3xl overflow-hidden shadow-sm"
              style={{ border: '1px solid #F0F0F0' }}
            >
              {recentOrders.map((order, idx) => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG['pending'];
                const StatusIcon = cfg.icon;
                return (
                  <div
                    key={order.id}
                    className="flex items-center gap-3 px-4 py-3.5 tap-highlight"
                    style={{ borderBottom: idx < recentOrders.length - 1 ? '1px solid #F5F5F5' : 'none' }}
                  >
                    {/* Status icon circle */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: cfg.bg }}
                    >
                      <StatusIcon className="h-4.5 w-4.5" style={{ width: 18, height: 18, color: cfg.color }} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-xs truncate">{order.order_number}</p>
                        <span
                          className="flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {timeAgo(order.created_at)}
                        {order.payment_method && (
                          <> · <span className="font-medium uppercase">{order.payment_method}</span></>
                        )}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="flex-shrink-0 text-right">
                      <p className="font-black text-sm" style={{ color: '#FF6B35' }}>
                        {formatCurrency(order.total)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── PLATFORM HEALTH ────────────────────────────────────── */}
        <section className="px-4 pt-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Platform Health
          </p>
          <div
            className="bg-white rounded-3xl overflow-hidden shadow-sm"
            style={{ border: '1px solid #F0F0F0' }}
          >
            {[
              {
                label: 'Kitchen Approval Rate',
                value: stats.totalKitchens > 0
                  ? `${Math.round(((stats.totalKitchens - stats.pendingKitchens) / stats.totalKitchens) * 100)}%`
                  : '—',
                bar: stats.totalKitchens > 0
                  ? ((stats.totalKitchens - stats.pendingKitchens) / stats.totalKitchens) * 100
                  : 0,
                color: '#FF6B35',
                emoji: '🏪',
              },
              {
                label: 'Rider Approval Rate',
                value: stats.totalRiders > 0
                  ? `${Math.round(((stats.totalRiders - stats.pendingRiders) / stats.totalRiders) * 100)}%`
                  : '—',
                bar: stats.totalRiders > 0
                  ? ((stats.totalRiders - stats.pendingRiders) / stats.totalRiders) * 100
                  : 0,
                color: '#0D9488',
                emoji: '🛵',
              },
              {
                label: 'Order Delivery Rate',
                value: stats.totalOrders > 0
                  ? `${Math.round((stats.deliveredToday / Math.max(stats.totalOrders, 1)) * 100 * 10)}%`
                  : '—',
                bar: stats.totalOrders > 0 ? Math.min(100, (stats.deliveredToday / Math.max(stats.totalOrders, 1)) * 100 * 10) : 0,
                color: '#2563EB',
                emoji: '📦',
              },
            ].map(({ label, value, bar, color, emoji }, idx, arr) => (
              <div
                key={label}
                className="px-4 py-3.5"
                style={{ borderBottom: idx < arr.length - 1 ? '1px solid #F5F5F5' : 'none' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{emoji}</span>
                    <p className="text-xs font-semibold text-[#1A1A1A]">{label}</p>
                  </div>
                  <p className="text-xs font-black" style={{ color }}>{value}</p>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, bar)}%`, background: color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes badge-pulse {
          0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0.5); }
          50%      { transform: scale(1.1); box-shadow: 0 0 0 4px rgba(255,255,255,0); }
        }
      `}</style>
    </div>
  );
}
