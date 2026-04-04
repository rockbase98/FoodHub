import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, Navigation2, ChevronRight, Clock,
  ShoppingBag, CheckCircle2, XCircle, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Order } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';

/* ── Order stage pipeline ───────────────────────────────────── */
const STAGES = [
  { key: 'pending',          label: 'Placed',      emoji: '📝', short: 'Order Placed'       },
  { key: 'accepted',         label: 'Accepted',    emoji: '✅', short: 'Kitchen Accepted'    },
  { key: 'preparing',        label: 'Preparing',   emoji: '👨‍🍳', short: 'Being Prepared'      },
  { key: 'ready',            label: 'Ready',       emoji: '🎉', short: 'Ready for Pickup'    },
  { key: 'picked_up',        label: 'Picked Up',   emoji: '🛵', short: 'Rider Picked Up'     },
  { key: 'out_for_delivery', label: 'On the Way',  emoji: '🚀', short: 'Out for Delivery'    },
  { key: 'delivered',        label: 'Delivered',   emoji: '🏠', short: 'Delivered!'          },
];

const CANCELLED_STAGE = { key: 'cancelled', label: 'Cancelled', emoji: '❌', short: 'Order Cancelled' };

function getStageIndex(status: string) {
  return STAGES.findIndex((s) => s.key === status);
}

/* ── Stage colors ────────────────────────────────────────────── */
function stageColor(idx: number, current: number): { bg: string; line: string; text: string; ring: string } {
  if (idx < current)  return { bg: '#22C55E', line: '#22C55E', text: '#fff',   ring: 'rgba(34,197,94,0.2)'  };
  if (idx === current) return { bg: '#FF6B35', line: '#FF6B35', text: '#fff',   ring: 'rgba(255,107,53,0.25)' };
  return               { bg: '#E5E7EB', line: '#E5E7EB',  text: '#9CA3AF', ring: 'transparent'          };
}

/* ── Relative time ───────────────────────────────────────────── */
function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/* ══════════════════════════════════════════════════════════════ */
export default function CustomerOrders() {
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<'active' | 'past'>('active');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadOrders(); }, []);

  /* Poll active orders */
  useEffect(() => {
    const iv = setInterval(() => {
      if (tab === 'active') loadOrders(true);
    }, 15_000);
    return () => clearInterval(iv);
  }, [tab]);

  const loadOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders').select('*')
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch { if (!silent) toast.error('Failed to load orders'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders(true);
    toast.success('Orders refreshed');
  };

  const activeOrders = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const pastOrders   = orders.filter((o) => ['delivered', 'cancelled'].includes(o.status));
  const shown        = tab === 'active' ? activeOrders : pastOrders;

  return (
    <div className="min-h-screen" style={{ background: '#f5f5f5' }}>

      {/* ══ HERO HEADER ════════════════════════════════════════════ */}
      <div
        className="relative pb-0"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, #FF8C42 0%, #FF6B35 55%, #E84A1A 100%)',
          minHeight: 160,
        }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-3 right-6 w-28 h-28 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-10 left-2 w-20 h-20 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)' }} />

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-6 pb-3">
          <div>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">FoodHub</p>
            <h1 className="font-black text-2xl text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              My Orders
            </h1>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-9 h-9 rounded-full flex items-center justify-center tap-highlight"
            style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)' }}
          >
            <RefreshCw
              className={`h-4 w-4 text-white ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 px-4 pb-4">
          {[
            { label: 'Total',   value: orders.length,       emoji: '📦' },
            { label: 'Active',  value: activeOrders.length, emoji: '🔥' },
            { label: 'Done',    value: pastOrders.filter((o) => o.status === 'delivered').length, emoji: '✅' },
          ].map(({ label, value, emoji }) => (
            <div key={label} className="rounded-2xl p-2.5 text-center"
              style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <span className="text-base block mb-0.5">{emoji}</span>
              <p className="text-white font-black text-lg leading-none">{value}</p>
              <p className="text-white/60 text-[10px] font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Tab switcher */}
        <div className="mx-4 mb-0">
          <div className="flex rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
            {(['active', 'past'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2.5 text-xs font-bold tap-highlight transition-all"
                style={{
                  background: tab === t ? 'rgba(255,255,255,0.95)' : 'transparent',
                  color: tab === t ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.8)',
                  borderRadius: tab === t ? 14 : 0,
                  margin: tab === t ? 2 : 0,
                }}
              >
                {t === 'active' ? `🔥 Active (${activeOrders.length})` : `📜 Past (${pastOrders.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Wave */}
        <svg viewBox="0 0 430 36" preserveAspectRatio="none" className="w-full" style={{ height: 28, display: 'block' }}>
          <path d="M0 36 Q215 0 430 36 L430 36 L0 36 Z" fill="#f5f5f5" />
        </svg>
      </div>

      {/* ══ CONTENT ════════════════════════════════════════════════ */}
      <div className="pb-32 px-4 pt-2">
        {loading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-52 rounded-3xl skeleton" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <div className="space-y-3 pt-2">
            {shown.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══ ORDER CARD ═══════════════════════════════════════════════════ */
function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const isActive    = !['delivered', 'cancelled'].includes(order.status);
  const isCancelled = order.status === 'cancelled';
  const stageIdx    = getStageIndex(order.status);
  const stages      = isCancelled
    ? STAGES.slice(0, 2).concat([CANCELLED_STAGE as typeof STAGES[0]])
    : STAGES;
  const displayStageIdx = isCancelled ? stages.length - 1 : stageIdx;

  /* Show 3 relevant stages around the current one */
  const visibleStages = isCancelled
    ? stages
    : STAGES.slice(Math.max(0, stageIdx - 1), stageIdx + 3);

  const itemCount = Array.isArray(order.items) ? order.items.length : 0;

  return (
    <div
      className="bg-white rounded-3xl overflow-hidden shadow-sm"
      style={{
        border: isActive ? '1.5px solid rgba(255,107,53,0.2)' : '1.5px solid #f0f0f0',
        boxShadow: isActive ? '0 4px 20px rgba(255,107,53,0.08)' : '0 2px 12px rgba(0,0,0,0.04)',
      }}
    >
      {/* ── Card header ── */}
      <div
        className="px-4 pt-4 pb-3"
        onClick={() => setExpanded((p) => !p)}
        style={{ cursor: 'pointer' }}
      >
        <div className="flex items-start justify-between gap-2">
          {/* Left */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-black text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {order.order_number}
              </p>
              {isActive && (
                <span
                  className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,107,53,0.1)', color: '#FF6B35' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" style={{ animation: 'ping-dot 1s ease-in-out infinite' }} />
                  LIVE
                </span>
              )}
              {isCancelled && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                  CANCELLED
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(order.created_at)} · {itemCount} item{itemCount !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Right: amount + chevron */}
          <div className="text-right flex-shrink-0">
            <p className="font-black text-base" style={{ color: 'hsl(var(--primary))' }}>
              {formatCurrency(order.total)}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium">
              {order.payment_method?.toUpperCase() || 'COD'}
            </p>
          </div>
        </div>

        {/* Current status pill */}
        <div className="mt-2 flex items-center gap-2">
          {!isCancelled ? (
            <>
              <span className="text-lg">
                {STAGES[stageIdx]?.emoji || '📦'}
              </span>
              <div>
                <p className="font-semibold text-xs">{STAGES[stageIdx]?.short || 'Processing'}</p>
                {stageIdx < STAGES.length - 1 && !isCancelled && (
                  <p className="text-[10px] text-muted-foreground">
                    Next: {STAGES[stageIdx + 1]?.short}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <span className="text-lg">❌</span>
              <p className="font-semibold text-xs text-red-500">Order Cancelled</p>
            </>
          )}
          <div className="flex-1" />
          <span className="text-[10px] text-muted-foreground">
            {expanded ? '▲ Less' : '▼ Timeline'}
          </span>
        </div>
      </div>

      {/* ── Progress bar ── */}
      {!isCancelled && (
        <div className="px-4 pb-3">
          <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.max(5, ((stageIdx) / (STAGES.length - 1)) * 100)}%`,
                background: 'linear-gradient(90deg, #FF6B35, #FF8E53)',
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-muted-foreground font-medium">Placed</span>
            <span className="text-[9px] text-muted-foreground font-medium">Delivered</span>
          </div>
        </div>
      )}

      {/* ── Expanded Timeline ── */}
      {expanded && (
        <div
          className="px-4 pb-4"
          style={{ animation: 'ob-fade-in 0.3s ease', borderTop: '1px solid #f5f5f5' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-3 mb-3">
            Order Timeline
          </p>
          <div className="relative">
            {/* Vertical line */}
            <div
              className="absolute left-[19px] top-0 bottom-0 w-0.5"
              style={{ background: '#F3F4F6' }}
            />
            {/* Filled progress line */}
            <div
              className="absolute left-[19px] top-0 w-0.5 transition-all duration-700"
              style={{
                background: 'linear-gradient(to bottom, #22C55E, #FF6B35)',
                height: isCancelled
                  ? '100%'
                  : `${Math.min(100, (stageIdx / (STAGES.length - 1)) * 100)}%`,
              }}
            />

            <div className="space-y-0">
              {STAGES.map((stage, idx) => {
                const colors  = stageColor(idx, stageIdx);
                const isDone  = idx < stageIdx;
                const isCur   = idx === stageIdx;
                const isFuture = idx > stageIdx;

                return (
                  <div key={stage.key} className="flex items-start gap-3 relative" style={{ minHeight: 44 }}>
                    {/* Circle */}
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all duration-300"
                      style={{
                        background: isFuture ? '#F9FAFB' : colors.bg,
                        border: `2px solid ${isFuture ? '#E5E7EB' : colors.bg}`,
                        boxShadow: isCur ? `0 0 0 6px ${colors.ring}` : 'none',
                        fontSize: isFuture ? 14 : 18,
                        opacity: isFuture ? 0.45 : 1,
                      }}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 text-white" strokeWidth={2.5} />
                      ) : (
                        <span style={{ lineHeight: 1 }}>{stage.emoji}</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1.5 pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className="font-semibold text-xs leading-tight"
                          style={{
                            color: isFuture ? '#9CA3AF' : isCur ? '#FF6B35' : isDone ? '#111' : '#9CA3AF',
                            fontWeight: isCur ? 700 : isDone ? 600 : 400,
                          }}
                        >
                          {stage.short}
                        </p>
                        {(isDone || isCur) && (
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {isDone ? timeAgo(order.created_at) : 'Now'}
                          </span>
                        )}
                      </div>
                      {isCur && !isFuture && (
                        <p className="text-[10px] text-primary font-medium mt-0.5">
                          In progress…
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Cancelled terminal stage */}
              {isCancelled && (
                <div className="flex items-start gap-3 relative" style={{ minHeight: 44 }}>
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10"
                    style={{ background: '#FEE2E2', border: '2px solid #FCA5A5', fontSize: 18 }}>
                    <XCircle className="h-4 w-4 text-red-500" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 pt-1.5">
                    <p className="font-semibold text-xs text-red-500">Order Cancelled</p>
                    {order.kitchen_rejection_reason && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Reason: {order.kitchen_rejection_reason}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items preview */}
          {Array.isArray(order.items) && order.items.length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid #f5f5f5' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Items Ordered
              </p>
              <div className="space-y-1.5">
                {order.items.slice(0, 3).map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={item.is_veg !== false ? 'veg-badge' : 'non-veg-badge'} />
                    <span className="text-xs font-medium flex-1 truncate">
                      {item.quantity}× {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <p className="text-[10px] text-muted-foreground ml-6">
                    +{order.items.length - 3} more items
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Footer actions ── */}
      <div
        className="flex items-center gap-2.5 px-4 pb-4"
        style={{ borderTop: expanded ? '1px solid #f5f5f5' : 'none', paddingTop: expanded ? 12 : 0 }}
      >
        {/* Track button (active orders) */}
        {isActive && (
          <Link to={`/customer/track/${order.id}`} className="flex-[2] tap-highlight">
            <div
              className="flex items-center justify-center gap-2 rounded-2xl font-bold text-sm"
              style={{
                background: 'linear-gradient(135deg, #FF6B35, #FF8E53)',
                color: '#fff',
                height: 44,
                minHeight: 44,
                boxShadow: '0 6px 20px rgba(255,107,53,0.3)',
                animation: 'track-glow 2s ease-in-out infinite',
              }}
            >
              <Navigation2 className="h-4 w-4" />
              Track Live
            </div>
          </Link>
        )}

        {/* Review button (delivered) */}
        {order.status === 'delivered' && (
          <Link to={`/customer/review?orderId=${order.id}`} className="flex-1 tap-highlight">
            <div
              className="flex items-center justify-center gap-1.5 rounded-2xl font-semibold text-xs"
              style={{
                background: '#FFF7F0',
                color: '#FF6B35',
                height: 44,
                minHeight: 44,
                border: '1.5px solid rgba(255,107,53,0.2)',
              }}
            >
              ⭐ Rate Order
            </div>
          </Link>
        )}

        {/* View details (past / always) */}
        <Link
          to={`/customer/track/${order.id}`}
          className={`${isActive ? 'flex-1' : 'flex-[2]'} tap-highlight`}
        >
          <div
            className="flex items-center justify-center gap-1.5 rounded-2xl font-semibold text-xs"
            style={{
              background: '#F9FAFB',
              color: '#374151',
              height: 44,
              minHeight: 44,
              border: '1.5px solid #E5E7EB',
            }}
          >
            Details <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </Link>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes track-glow {
          0%,100% { box-shadow: 0 6px 20px rgba(255,107,53,0.3); }
          50%      { box-shadow: 0 6px 28px rgba(255,107,53,0.55); }
        }
        @keyframes ping-dot {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(1.5); }
        }
        @keyframes ob-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ══ EMPTY STATE ═════════════════════════════════════════════════ */
function EmptyState({ tab }: { tab: 'active' | 'past' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 shadow-sm"
        style={{ background: tab === 'active' ? '#FFF7F0' : '#F9FAFB' }}
      >
        {tab === 'active'
          ? <Package className="h-10 w-10 text-primary" />
          : <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        }
      </div>
      <p className="font-black text-base mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {tab === 'active' ? 'No active orders' : 'No past orders yet'}
      </p>
      <p className="text-sm text-muted-foreground mb-6 max-w-[220px] leading-relaxed">
        {tab === 'active'
          ? 'Hungry? Browse restaurants and place your first order!'
          : 'Your completed orders will appear here.'}
      </p>
      <Link to="/customer" className="tap-highlight">
        <div
          className="flex items-center gap-2 px-6 rounded-2xl font-bold text-sm"
          style={{
            background: 'linear-gradient(135deg, #FF6B35, #FF8E53)',
            color: '#fff',
            height: 48,
            minHeight: 48,
            boxShadow: '0 8px 24px rgba(255,107,53,0.3)',
          }}
        >
          Browse Restaurants 🍽️
        </div>
      </Link>
    </div>
  );
}
