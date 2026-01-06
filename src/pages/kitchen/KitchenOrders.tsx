import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Order } from '../../types';
import { formatCurrency, getOrderStatusColor, getOrderStatusText } from '../../lib/utils';
import { toast } from 'sonner';

export default function KitchenOrders() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [kitchenId, setKitchenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      const { data: kitchen } = await supabase.from('kitchens').select('id').eq('owner_id', user?.id).single();
      if (!kitchen) return;

      setKitchenId(kitchen.id);

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('kitchen_id', kitchen.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
      if (error) throw error;
      toast.success(`Order ${status}`);
      loadOrders();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/kitchen')}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Orders</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <div>
          <h2 className="font-semibold text-lg mb-4">Active Orders ({activeOrders.length})</h2>
          {activeOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No active orders</p>
          ) : (
            <div className="space-y-4">
              {activeOrders.map(order => (
                <div key={order.id} className="bg-card border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-lg">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge className={getOrderStatusColor(order.status)}>{getOrderStatusText(order.status)}</Badge>
                  </div>

                  <div className="space-y-1 mb-3">
                    {order.items.map((item, i) => (
                      <p key={i} className="text-sm">{item.quantity}x {item.name}</p>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="font-bold">{formatCurrency(order.total)}</span>
                    <div className="flex gap-2">
                      {order.status === 'pending' && (
                        <>
                          <Button size="sm" variant="destructive" onClick={() => updateOrderStatus(order.id, 'cancelled')}>
                            Reject
                          </Button>
                          <Button size="sm" className="gradient-primary" onClick={() => updateOrderStatus(order.id, 'accepted')}>
                            Accept
                          </Button>
                        </>
                      )}
                      {order.status === 'accepted' && (
                        <Button size="sm" onClick={() => updateOrderStatus(order.id, 'preparing')}>
                          Start Preparing
                        </Button>
                      )}
                      {order.status === 'preparing' && (
                        <Button size="sm" onClick={() => updateOrderStatus(order.id, 'ready')}>
                          Mark Ready
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-semibold text-lg mb-4">Completed Orders</h2>
          {completedOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No completed orders</p>
          ) : (
            <div className="space-y-4">
              {completedOrders.slice(0, 10).map(order => (
                <div key={order.id} className="bg-card border rounded-lg p-4 opacity-60">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={getOrderStatusColor(order.status)}>{getOrderStatusText(order.status)}</Badge>
                      <p className="font-bold mt-1">{formatCurrency(order.total)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
