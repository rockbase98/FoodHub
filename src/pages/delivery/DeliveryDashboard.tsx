import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LogOut, Package, Wallet, Clock, MapPin, ChevronRight,
  Bike, CheckCircle2, XCircle, History, Navigation2,
  TrendingUp, Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { DeliveryPartner, Order } from '../../types';
import { formatCurrency, formatDistance, calculateDistance } from '../../lib/utils';
import { toast } from 'sonner';
import { authService } from '../../lib/authService';

/* ── Countdown ring ─────────────────────────────────────────── */
const COUNTDOWN_SECONDS = 30;
const RING_R = 22;
const RING_CIRC = 2 * Math.PI * RING_R;

function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const progress = seconds / total;
  const dash = RING_CIRC * progress;
  const color =
    seconds > total * 0.5 ? '#22C55E' :
    seconds > total * 0.25 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 56, height: 56 }}>
      <svg width={56} height={56} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        {/* Track */}
        <circle cx={28} cy={28} r={RING_R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={4} />
        {/* Progress */}
        <circle
          cx={28} cy={28} r={RING_R}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${RING_CIRC}`}
          style={{ transition: 'stroke-dasharray 1s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span className="font-black text-sm z-10" style={{ color }}>{seconds}</span>
    </div>
  );
}

/* ── Incoming order card ────────────────────────────────────── */
function IncomingOrderCard({
  order,
  onAccept,
  onDecline,
}: {
  order: Order;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const declined = useRef(false);

  useEffect(() => {
    const iv = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(iv);
          if (!declined.current) {
            declined.current = true;
            onDecline(order.id);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [order.id, onDecline]);

  const itemCount = Array.isArray(order.items) ? order.items.length : 0;

  return (
    <div
      className="mx-4 rounded-3xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '2px solid rgba(255,255,255,0.25)',
        backdropFilter: 'blur(16px)',
        animation: 'pulse-border 1.4s ease-in-out infinite',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Zap className="h-4 w-4 text-green-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">New Order!</p>
            <p className="text-white/60 text-[10px] font-medium">{order.order_number}</p>
          </div>
        </div>
        <CountdownRing seconds={seconds} total={COUNTDOWN_SECONDS} />
      </div>

      {/* Details */}
      <div className="px-4 pb-3 space-y-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-white/60" />
            <span className="text-white/80 text-xs font-medium">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-white/60" />
            <span className="text-white/80 text-xs font-medium">{formatCurrency(order.delivery_fee || 0)} fee</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-white/60" />
            <span className="text-white/80 text-xs font-medium">~2.4 km</span>
          </div>
        </div>

        <div
          className="rounded-xl px-3 py-2 text-xs font-medium"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)' }}
        >
          💰 Total order value: <span className="font-bold text-white">{formatCurrency(order.total)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 px-4 pb-4">
        <button
          onClick={() => { declined.current = true; onDecline(order.id); }}
          className="flex-1 flex items-center justify-center gap-2 rounded-2xl font-bold text-sm tap-highlight"
          style={{
            background: 'rgba(239,68,68,0.2)',
            border: '1.5px solid rgba(239,68,68,0.4)',
            color: '#FCA5A5',
            height: 48,
            minHeight: 48,
          }}
        >
          <XCircle className="h-4 w-4" /> Decline
        </button>
        <button
          onClick={() => { declined.current = true; onAccept(order.id); }}
          className="flex-[2] flex items-center justify-center gap-2 rounded-2xl font-bold text-sm tap-highlight"
          style={{
            background: 'linear-gradient(135deg, #22C55E, #16A34A)',
            color: '#fff',
            height: 48,
            minHeight: 48,
            boxShadow: '0 6px 20px rgba(34,197,94,0.4)',
          }}
        >
          <CheckCircle2 className="h-4 w-4" /> Accept
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
export default function DeliveryDashboard() {
  const navigate  = useNavigate();
  const user      = useAuthStore((s) => s.user);
  const storeLogout = useAuthStore((s) => s.logout);

  const [partner,         setPartner]         = useState<DeliveryPartner | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrder,     setActiveOrder]     = useState<Order | null>(null);
  const [recentDeliveries,setRecentDeliveries]= useState<Order[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [toggling,        setToggling]        = useState(false);
  const [todayEarnings,   setTodayEarnings]   = useState(0);
  const [weekEarnings,    setWeekEarnings]    = useState(0);
  const declinedIds = useRef<Set<string>>(new Set());

  /* ── Load data ── */
  useEffect(() => {
    loadAll();
    const iv = setInterval(loadAvailableOrders, 5000);
    return () => clearInterval(iv);
  }, []);

  const loadAll = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_partners').select('*').eq('user_id', user?.id).single();
      if (error?.code === 'PGRST116') { navigate('/delivery/register'); return; }
      if (error) throw error;
      setPartner(data);
      await Promise.all([loadAvailableOrders(), loadActiveOrder(), loadRecentDeliveries(data)]);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  };

  const loadAvailableOrders = async () => {
    const { data } = await supabase.from('orders').select('*')
      .eq('status', 'ready').is('delivery_partner_id', null)
      .order('created_at', { ascending: true }).limit(5);
    setAvailableOrders((data || []).filter((o) => !declinedIds.current.has(o.id)));
  };

  const loadActiveOrder = async () => {
    const { data } = await supabase.from('orders').select('*')
      .eq('delivery_partner_id', user?.id)
      .in('status', ['picked_up', 'out_for_delivery']).maybeSingle();
    setActiveOrder(data || null);
  };

  const loadRecentDeliveries = async (p: DeliveryPartner) => {
    const { data } = await supabase.from('orders').select('*')
      .eq('delivery_partner_id', user?.id).eq('status', 'delivered')
      .order('updated_at', { ascending: false }).limit(5);

    const orders = data || [];
    setRecentDeliveries(orders);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const week  = new Date(); week.setDate(week.getDate() - 7);

    const todayTotal = orders
      .filter((o) => new Date(o.updated_at || o.created_at) >= today)
      .reduce((s, o) => s + (Number(o.delivery_fee) || 0), 0);
    const weekTotal  = orders
      .filter((o) => new Date(o.updated_at || o.created_at) >= week)
      .reduce((s, o) => s + (Number(o.delivery_fee) || 0), 0);

    setTodayEarnings(todayTotal);
    setWeekEarnings(weekTotal);
  };

  /* ── Toggle online ── */
  const toggleOnline = async () => {
    if (!partner || toggling) return;
    setToggling(true);
    const next = !partner.is_online;
    const { error } = await supabase.from('delivery_partners')
      .update({ is_online: next }).eq('id', partner.id);
    if (!error) {
      setPartner({ ...partner, is_online: next });
      toast.success(next ? '🟢 You are now Online!' : '🔴 You are Offline');
    }
    setToggling(false);
  };

  /* ── Accept order ── */
  const acceptOrder = async (orderId: string) => {
    const { error } = await supabase.from('orders')
      .update({ delivery_partner_id: user?.id, status: 'picked_up' }).eq('id', orderId);
    if (error) { toast.error(error.message); return; }
    await supabase.from('deliveries').insert({
      order_id: orderId, delivery_partner_id: user?.id, status: 'accepted',
    });
    toast.success('Order accepted! 🛵');
    navigate(`/delivery/active/${orderId}`);
  };

  /* ── Decline order ── */
  const declineOrder = useCallback((orderId: string) => {
    declinedIds.current.add(orderId);
    setAvailableOrders((prev) => prev.filter((o) => o.id !== orderId));
    toast('Order declined', { icon: '⏩' });
  }, []);

  /* ── Logout ── */
  const handleLogout = async () => {
    await authService.signOut();
    storeLogout();
  };

  /* ─── States: loading / pending / rejected ─────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Bike className="h-7 w-7 text-white" />
          </div>
          <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" style={{ borderWidth: 3 }} />
        </div>
      </div>
    );
  }

  if (!partner) return null;

  if (partner.status === 'pending') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background text-center">
        <div className="w-20 h-20 rounded-3xl bg-amber-100 flex items-center justify-center mb-4 shadow-md">
          <Clock className="h-10 w-10 text-amber-500" />
        </div>
        <h2 className="font-black text-xl mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Approval Pending
        </h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-xs">
          Our team is reviewing your documents. You'll be notified once approved.
        </p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl border font-semibold text-sm tap-highlight"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    );
  }

  if (partner.status === 'rejected') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background text-center">
        <div className="w-20 h-20 rounded-3xl bg-red-100 flex items-center justify-center mb-4 shadow-md">
          <XCircle className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="font-black text-xl mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Registration Rejected
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          Your application was not approved. Please contact support.
        </p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl border font-semibold text-sm tap-highlight"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    );
  }

  const isOnline = partner.is_online;

  return (
    <div className="min-h-screen" style={{ background: '#f5f5f5' }}>

      {/* ══ HERO SECTION ═══════════════════════════════════════════ */}
      <div
        className="relative pb-6"
        style={{
          background: isOnline
            ? 'radial-gradient(ellipse at 30% 20%, #FF8C42 0%, #FF6B35 50%, #E84A1A 100%)'
            : 'radial-gradient(ellipse at 30% 20%, #374151 0%, #1F2937 60%, #111827 100%)',
          transition: 'background 0.6s ease',
          minHeight: 280,
        }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-4 right-6 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-8 left-2 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)' }} />

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-4 pt-6 pb-2">
          <div>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">FoodHub Rider</p>
            <h1
              className="font-black text-lg text-white leading-tight"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Hey, {user?.username?.split(' ')[0] || 'Rider'} 👋
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/delivery/history"
              className="w-9 h-9 rounded-full flex items-center justify-center tap-highlight"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <History className="h-4 w-4 text-white" />
            </Link>
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-full flex items-center justify-center tap-highlight"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <LogOut className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* ── Online / Offline toggle ── */}
        <div className="mx-4 mt-4">
          <div
            className="rounded-2xl p-4 flex items-center justify-between"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(12px)' }}
          >
            <div>
              <p className="text-white font-black text-base" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {isOnline ? '🟢 Online' : '🔴 Offline'}
              </p>
              <p className="text-white/65 text-xs mt-0.5 font-medium">
                {isOnline ? 'Receiving new orders' : 'Go online to start earning'}
              </p>
            </div>
            {/* Toggle switch */}
            <button
              onClick={toggleOnline}
              disabled={toggling}
              className="relative rounded-full transition-all tap-highlight"
              style={{
                width: 60, height: 32,
                background: isOnline ? '#22C55E' : 'rgba(255,255,255,0.2)',
                border: `2px solid ${isOnline ? '#16A34A' : 'rgba(255,255,255,0.3)'}`,
                cursor: toggling ? 'not-allowed' : 'pointer',
                minHeight: 32, minWidth: 60,
                transition: 'background 0.3s ease',
              }}
            >
              <span
                className="absolute top-0.5 rounded-full bg-white shadow-md transition-all duration-300"
                style={{
                  width: 24, height: 24,
                  left: isOnline ? 32 : 2,
                }}
              />
            </button>
          </div>
        </div>

        {/* ── Earnings strip ── */}
        <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
          {[
            { label: 'Today',   value: formatCurrency(todayEarnings), icon: '☀️' },
            { label: 'This Week', value: formatCurrency(weekEarnings), icon: '📅' },
            { label: 'Total',   value: formatCurrency(partner.earnings || 0), icon: '💰' },
          ].map(({ label, value, icon }) => (
            <div
              key={label}
              className="rounded-2xl p-3 flex flex-col items-center text-center"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
            >
              <span className="text-base mb-0.5">{icon}</span>
              <p className="text-white font-black text-sm leading-tight">{value}</p>
              <p className="text-white/55 text-[9px] font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Wave */}
        <svg viewBox="0 0 430 48" preserveAspectRatio="none" className="absolute bottom-0 left-0 right-0 w-full" style={{ height: 40 }}>
          <path d="M0 48 Q215 0 430 48 L430 48 L0 48 Z" fill="#f5f5f5" />
        </svg>
      </div>

      {/* ══ SCROLLABLE CONTENT ═════════════════════════════════════ */}
      <div className="pb-32">

        {/* ── STATS ROW ─────────────────────────────────────────── */}
        <div className="px-4 pt-4 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8E53)' }}>
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-black text-lg leading-none">{partner.total_deliveries || 0}</p>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Total Drops</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-black text-lg leading-none">4.8 ⭐</p>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Your Rating</p>
            </div>
          </div>
        </div>

        {/* ── ACTIVE DELIVERY (sticky card) ─────────────────────── */}
        {activeOrder && (
          <div className="px-4 pt-4">
            <Link to={`/delivery/active/${activeOrder.id}`} className="block tap-highlight">
              <div
                className="rounded-3xl p-4 flex items-center gap-4"
                style={{
                  background: 'linear-gradient(135deg, #FF6B35, #FF8E53)',
                  boxShadow: '0 8px 28px rgba(255,107,53,0.35)',
                }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Bike className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">Active Delivery</p>
                  <p className="text-white font-black text-sm">{activeOrder.order_number}</p>
                  <p className="text-white/80 text-xs mt-0.5">{formatCurrency(activeOrder.total)} · Tap to track</p>
                </div>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <ChevronRight className="h-5 w-5 text-white" />
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* ── INCOMING ORDER REQUESTS ───────────────────────────── */}
        {!activeOrder && isOnline && availableOrders.length > 0 && (
          <div className="pt-4">
            {/* Section header */}
            <div className="px-4 mb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" style={{ animation: 'ping-dot 1s ease-in-out infinite' }} />
              <p className="font-bold text-sm">New Order Requests</p>
              <span className="text-xs text-muted-foreground font-medium ml-auto">
                {availableOrders.length} available
              </span>
            </div>

            {/* Cards (show first pending order with timer) */}
            <IncomingOrderCard
              key={availableOrders[0].id}
              order={availableOrders[0]}
              onAccept={acceptOrder}
              onDecline={declineOrder}
            />

            {/* More orders peek */}
            {availableOrders.length > 1 && (
              <div className="mx-4 mt-2 px-4 py-2.5 rounded-2xl bg-white flex items-center justify-between shadow-sm">
                <p className="text-xs text-muted-foreground font-medium">
                  +{availableOrders.length - 1} more order{availableOrders.length > 2 ? 's' : ''} waiting
                </p>
                <span className="text-[10px] font-bold text-primary">Next up</span>
              </div>
            )}
          </div>
        )}

        {/* ── OFFLINE / NO ORDERS STATE ─────────────────────────── */}
        {!activeOrder && (!isOnline || availableOrders.length === 0) && (
          <div className="px-4 pt-4">
            <div className="bg-white rounded-3xl p-6 flex flex-col items-center text-center shadow-sm">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: isOnline ? '#F0FFF4' : '#F9FAFB' }}
              >
                {isOnline
                  ? <Navigation2 className="h-8 w-8 text-green-500" />
                  : <Bike className="h-8 w-8 text-muted-foreground" />
                }
              </div>
              <p className="font-bold text-base mb-1">
                {isOnline ? 'Waiting for orders…' : 'You are Offline'}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
                {isOnline
                  ? 'Stay put — new orders will pop up here automatically every 5 seconds.'
                  : 'Flip the toggle above to go online and start receiving delivery requests.'
                }
              </p>
            </div>
          </div>
        )}

        {/* ── RECENT DELIVERIES ─────────────────────────────────── */}
        {recentDeliveries.length > 0 && (
          <section className="px-4 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm flex items-center gap-1.5">
                <History className="h-4 w-4 text-muted-foreground" />
                Recent Deliveries
              </h2>
              <Link
                to="/delivery/history"
                className="text-xs text-primary font-semibold flex items-center gap-0.5 tap-highlight"
              >
                See all <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="bg-white rounded-3xl overflow-hidden shadow-sm divide-y">
              {recentDeliveries.map((order, idx) => (
                <div key={order.id} className="flex items-center gap-3 px-4 py-3.5">
                  {/* Index circle */}
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-xs"
                    style={{ background: idx === 0 ? 'linear-gradient(135deg, #FF6B35, #FF8E53)' : '#F3F4F6', color: idx === 0 ? '#fff' : '#6B7280' }}
                  >
                    {idx === 0 ? '🏆' : `#${idx + 1}`}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(order.updated_at || order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>

                  {/* Earning */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm text-green-600">
                      +{formatCurrency(Number(order.delivery_fee) || 0)}
                    </p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                      Delivered
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── QUICK LINKS ───────────────────────────────────────── */}
        <div className="px-4 pt-4 grid grid-cols-2 gap-3">
          <Link to="/delivery/history" className="tap-highlight">
            <div className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                <History className="h-4.5 w-4.5 text-violet-600" style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <p className="font-bold text-sm">History</p>
                <p className="text-[10px] text-muted-foreground">All your deliveries</p>
              </div>
            </div>
          </Link>
          <div className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Navigation2 className="h-4.5 w-4.5 text-blue-600" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <p className="font-bold text-sm">{partner.vehicle_type || 'Bike'}</p>
              <p className="text-[10px] text-muted-foreground">{partner.vehicle_number || 'Vehicle'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes pulse-border {
          0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); border-color: rgba(255,255,255,0.3); }
          50%      { box-shadow: 0 0 0 6px rgba(34,197,94,0);  border-color: rgba(34,197,94,0.6);   }
        }
        @keyframes ping-dot {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.6; transform: scale(1.4); }
        }
        .animate-slide-in-up {
          animation: slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1);
        }
      `}</style>
    </div>
  );
}
