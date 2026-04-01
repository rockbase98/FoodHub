import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChefHat, UtensilsCrossed, Package, Star, TrendingUp,
  LogOut, Bell, IndianRupee, Clock, CheckCircle2, ArrowRight,
  Flame, ShoppingBag
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Kitchen, Order } from '../../types';
import { toast } from 'sonner';
import { authService } from '../../lib/authService';
import { formatCurrency } from '../../lib/utils';

export default function KitchenDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const prevPendingCount = useRef(0);

  useEffect(() => {
    loadKitchenData();
    const interval = setInterval(loadOrders, 8000);
    return () => clearInterval(interval);
  }, []);

  const loadKitchenData = async () => {
    try {
      const { data, error } = await supabase
        .from('kitchens')
        .select('*')
        .eq('owner_id', user?.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          navigate('/kitchen/register');
          return;
        }
        throw error;
      }

      setKitchen(data);
      await loadOrders(data.id);
    } catch {
      toast.error('Failed to load kitchen data');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async (kId?: string) => {
    try {
      const { data: kitchenData } = await supabase
        .from('kitchens')
        .select('id')
        .eq('owner_id', user?.id)
        .single();

      if (!kitchenData) return;
      const kitchenId = kId || kitchenData.id;

      // Active orders
      const { data: activeData } = await supabase
        .from('orders')
        .select('*')
        .eq('kitchen_id', kitchenId)
        .in('status', ['pending', 'accepted', 'preparing', 'ready'])
        .order('created_at', { ascending: false });

      const newOrders = activeData || [];
      const newPending = newOrders.filter(o => o.status === 'pending').length;

      // Notify if new orders arrived
      if (prevPendingCount.current > 0 && newPending > prevPendingCount.current) {
        toast.success(`🔔 ${newPending - prevPendingCount.current} new order(s) received!`);
      }
      prevPendingCount.current = newPending;
      setOrders(newOrders);

      // Today's orders for stats
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayData } = await supabase
        .from('orders')
        .select('*')
        .eq('kitchen_id', kitchenId)
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false });

      setTodayOrders(todayData || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  };

  const toggleKitchenStatus = async () => {
    if (!kitchen || togglingStatus) return;
    setTogglingStatus(true);
    try {
      const { error } = await supabase
        .from('kitchens')
        .update({ is_open: !kitchen.is_open })
        .eq('id', kitchen.id);

      if (error) throw error;
      setKitchen({ ...kitchen, is_open: !kitchen.is_open });
      toast.success(kitchen.is_open ? '🔴 Kitchen is now closed' : '🟢 Kitchen is now open!');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      logout();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-3 shadow-xl animate-pulse">
            <ChefHat className="h-8 w-8 text-white" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Loading kitchen...</p>
        </div>
      </div>
    );
  }

  if (!kitchen) return null;

  if (kitchen.status === 'pending') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-5">
        <div className="w-20 h-20 rounded-3xl bg-amber-100 flex items-center justify-center mb-5 shadow-md">
          <Clock className="h-10 w-10 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold mb-2">Under Review</h2>
        <p className="text-sm text-muted-foreground text-center mb-8 leading-relaxed">
          Your kitchen is being reviewed by our team. You'll get notified once approved — usually within 24 hours.
        </p>
        <div className="w-full max-w-xs space-y-3">
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      </div>
    );
  }

  if (kitchen.status === 'rejected') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-5">
        <div className="w-20 h-20 rounded-3xl bg-red-100 flex items-center justify-center mb-5 shadow-md">
          <ChefHat className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">Registration Rejected</h2>
        <p className="text-sm text-muted-foreground text-center mb-8 leading-relaxed">
          Your kitchen registration was not approved. Please contact support for more information.
        </p>
        <Button variant="outline" className="w-full max-w-xs" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>
    );
  }

  // Compute stats
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => ['accepted', 'preparing'].includes(o.status));
  const todayRevenue = todayOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total), 0);
  const todayOrderCount = todayOrders.filter(o => o.status !== 'cancelled').length;
  const hasPending = pendingOrders.length > 0;

  const recentOrder = pendingOrders[0] || orders[0];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="mobile-header bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight line-clamp-1">{kitchen.name}</h1>
              <p className="text-xs text-muted-foreground">Kitchen Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {hasPending && (
              <div className="relative">
                <Bell className="h-5 w-5 text-primary" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {pendingOrders.length}
                </span>
              </div>
            )}
            <Button variant="ghost" size="icon" className="h-9 w-9 ml-1" onClick={handleLogout}>
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-4">

        {/* ── Open / Close CTA ── */}
        <div
          className={`rounded-2xl p-4 flex items-center justify-between shadow-md transition-all duration-300 ${
            kitchen.is_open
              ? 'bg-gradient-to-r from-green-500 to-emerald-500'
              : 'bg-gradient-to-r from-gray-500 to-gray-600'
          }`}
        >
          <div>
            <p className="text-white font-bold text-lg leading-tight">
              {kitchen.is_open ? 'Kitchen is Open' : 'Kitchen is Closed'}
            </p>
            <p className="text-white/80 text-xs mt-0.5">
              {kitchen.is_open ? 'Accepting new orders now' : 'Not accepting orders'}
            </p>
          </div>
          <button
            onClick={toggleKitchenStatus}
            disabled={togglingStatus}
            className={`relative w-16 h-8 rounded-full transition-all duration-300 shadow-inner flex-shrink-0 ${
              kitchen.is_open ? 'bg-white/30' : 'bg-white/20'
            }`}
          >
            <span
              className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center ${
                kitchen.is_open ? 'left-9' : 'left-1'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${kitchen.is_open ? 'bg-green-500' : 'bg-gray-400'}`} />
            </span>
          </button>
        </div>

        {/* ── Pending Alert ── */}
        {hasPending && (
          <Link to="/kitchen/orders">
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5 flex items-center gap-3 animate-fade-in">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Flame className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-orange-900 text-sm">
                  {pendingOrders.length} order{pendingOrders.length > 1 ? 's' : ''} waiting!
                </p>
                <p className="text-xs text-orange-700 mt-0.5 truncate">
                  Tap to accept — customers are waiting
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <ArrowRight className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </Link>
        )}

        {/* ── Today's Stats ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 px-0.5">
            Today's Performance
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {/* Orders */}
            <div className="bg-card border rounded-2xl p-3 card-shadow text-center">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-2">
                <ShoppingBag className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-xl font-bold leading-none">{todayOrderCount}</p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight">Orders</p>
            </div>

            {/* Revenue */}
            <div className="bg-card border rounded-2xl p-3 card-shadow text-center">
              <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-2">
                <IndianRupee className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-base font-bold leading-none">
                {todayRevenue >= 1000
                  ? `${(todayRevenue / 1000).toFixed(1)}k`
                  : `₹${Math.round(todayRevenue)}`}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight">Revenue</p>
            </div>

            {/* Rating */}
            <div className="bg-card border rounded-2xl p-3 card-shadow text-center">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-2">
                <Star className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-xl font-bold leading-none">
                {Number(kitchen.rating) > 0 ? Number(kitchen.rating).toFixed(1) : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight">Rating</p>
            </div>
          </div>

          {/* Secondary stats row */}
          <div className="grid grid-cols-2 gap-2.5 mt-2.5">
            <div className="bg-card border rounded-2xl p-3 flex items-center gap-2.5 card-shadow">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-bold">{preparingOrders.length}</p>
                <p className="text-[10px] text-muted-foreground">In Kitchen</p>
              </div>
            </div>
            <div className="bg-card border rounded-2xl p-3 flex items-center gap-2.5 card-shadow">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold">{kitchen.total_ratings}</p>
                <p className="text-[10px] text-muted-foreground">Reviews</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 px-0.5">
            Quick Actions
          </p>
          <div className="space-y-2.5">
            {/* Accept Orders */}
            <Link to="/kitchen/orders">
              <div className="bg-card border rounded-2xl p-4 flex items-center gap-4 card-shadow tap-highlight">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-md flex-shrink-0">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">Manage Orders</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Accept, prepare & track orders</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {hasPending && (
                    <span className="min-w-[22px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {pendingOrders.length}
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Link>

            {/* Menu Management */}
            <Link to="/kitchen/menu">
              <div className="bg-card border rounded-2xl p-4 flex items-center gap-4 card-shadow tap-highlight">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md flex-shrink-0">
                  <UtensilsCrossed className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">Menu Management</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Add, edit or remove items</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            </Link>

            {/* Kitchen Profile */}
            <Link to="/kitchen/register">
              <div className="bg-card border rounded-2xl p-4 flex items-center gap-4 card-shadow tap-highlight">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md flex-shrink-0">
                  <ChefHat className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">Kitchen Profile</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Update info & documents</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            </Link>
          </div>
        </div>

        {/* ── Recent Order Preview ── */}
        {recentOrder && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 px-0.5">
              Latest Order
            </p>
            <Link to="/kitchen/orders">
              <div className="bg-card border rounded-2xl p-4 card-shadow tap-highlight">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-sm">{recentOrder.order_number}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(recentOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      recentOrder.status === 'pending'
                        ? 'bg-orange-100 text-orange-700'
                        : recentOrder.status === 'preparing'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {recentOrder.status === 'pending'
                      ? '⏳ Pending'
                      : recentOrder.status === 'preparing'
                      ? '🔥 Preparing'
                      : recentOrder.status === 'ready'
                      ? '✅ Ready'
                      : recentOrder.status}
                  </span>
                </div>
                <div className="space-y-1 mb-3">
                  {recentOrder.items.slice(0, 2).map((item: any, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      {item.quantity}× {item.name}
                    </p>
                  ))}
                  {recentOrder.items.length > 2 && (
                    <p className="text-xs text-muted-foreground">
                      +{recentOrder.items.length - 2} more item{recentOrder.items.length - 2 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2.5 border-t">
                  <span className="font-bold text-sm">{formatCurrency(recentOrder.total)}</span>
                  <span className="text-xs text-primary font-semibold flex items-center gap-1">
                    View Orders <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* ── Kitchen Info Footer ── */}
        <div className="bg-muted/50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-card border flex items-center justify-center flex-shrink-0">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{kitchen.address}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {kitchen.delivery_time || '30-40 mins'} delivery • {kitchen.delivery_radius || 10} km radius
            </p>
          </div>
          <Badge
            className={`text-[10px] flex-shrink-0 ${
              kitchen.is_approved
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-amber-100 text-amber-700 border-amber-200'
            }`}
            variant="outline"
          >
            {kitchen.is_approved ? 'Verified' : 'Pending'}
          </Badge>
        </div>
      </div>
    </div>
  );
}
