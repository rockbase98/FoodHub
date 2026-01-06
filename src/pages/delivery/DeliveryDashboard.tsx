import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bike, LogOut, Package, DollarSign, MapPin } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { DeliveryPartner, Order } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';
import { authService } from '../../lib/authService';

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [partner, setPartner] = useState<DeliveryPartner | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPartnerData();
    const interval = setInterval(loadAvailableOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadPartnerData = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_partners')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          navigate('/delivery/register');
          return;
        }
        throw error;
      }

      setPartner(data);
      await loadAvailableOrders();
      await loadActiveOrder();
    } catch (error: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableOrders = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'ready')
        .is('delivery_partner_id', null)
        .order('created_at', { ascending: true })
        .limit(10);

      setAvailableOrders(data || []);
    } catch (error: any) {
      console.error('Failed to load orders:', error);
    }
  };

  const loadActiveOrder = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('delivery_partner_id', user?.id)
        .in('status', ['picked_up', 'out_for_delivery'])
        .single();

      setActiveOrder(data);
    } catch (error: any) {
      setActiveOrder(null);
    }
  };

  const toggleOnlineStatus = async () => {
    if (!partner) return;

    try {
      const { error } = await supabase
        .from('delivery_partners')
        .update({ is_online: !partner.is_online })
        .eq('id', partner.id);

      if (error) throw error;
      setPartner({ ...partner, is_online: !partner.is_online });
      toast.success(partner.is_online ? 'You are offline' : 'You are online');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const acceptOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ delivery_partner_id: user?.id, status: 'picked_up' })
        .eq('id', orderId);

      if (error) throw error;

      await supabase.from('deliveries').insert({
        order_id: orderId,
        delivery_partner_id: user?.id,
        status: 'accepted',
      });

      toast.success('Order accepted');
      navigate(`/delivery/active/${orderId}`);
    } catch (error: any) {
      toast.error(error.message);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!partner) return null;

  if (partner.status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
            <Bike className="h-10 w-10 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Approval Pending</h2>
          <p className="text-muted-foreground mb-6">Your registration is under review</p>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>
      </div>
    );
  }

  if (partner.status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Bike className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Registration Rejected</h2>
          <p className="text-muted-foreground mb-6">Your application was not approved</p>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Delivery Dashboard</h1>
              <p className="text-sm text-muted-foreground">{user?.username}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/delivery/history">
                <Button variant="ghost" size="sm">History</Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Status Card */}
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-1">Status</h3>
              <p className="text-sm text-muted-foreground">
                {partner.is_online ? 'Available for deliveries' : 'Offline'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{partner.is_online ? 'Online' : 'Offline'}</span>
              <Switch checked={partner.is_online} onCheckedChange={toggleOnlineStatus} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(partner.earnings)}</p>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
              </div>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{partner.total_deliveries}</p>
                <p className="text-sm text-muted-foreground">Completed Deliveries</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Order */}
        {activeOrder && (
          <div>
            <h2 className="font-semibold text-lg mb-4">Active Delivery</h2>
            <Link to={`/delivery/active/${activeOrder.id}`}>
              <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-lg p-6">
                <p className="font-semibold text-lg mb-2">{activeOrder.order_number}</p>
                <p className="opacity-90">{formatCurrency(activeOrder.total)}</p>
                <Button className="mt-4 bg-white text-primary hover:bg-white/90">
                  View Details →
                </Button>
              </div>
            </Link>
          </div>
        )}

        {/* Available Orders */}
        {!activeOrder && partner.is_online && (
          <div>
            <h2 className="font-semibold text-lg mb-4">Available Orders ({availableOrders.length})</h2>
            {availableOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No orders available</p>
            ) : (
              <div className="space-y-4">
                {availableOrders.map(order => (
                  <div key={order.id} className="bg-card border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold">{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.items.length} items • {formatCurrency(order.total)}
                        </p>
                      </div>
                      <Badge>Ready</Badge>
                    </div>
                    <Button onClick={() => acceptOrder(order.id)} className="w-full gradient-primary">
                      Accept Delivery
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
