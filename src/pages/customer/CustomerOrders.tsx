import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Clock, ChevronRight } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import BottomNav from '../../components/layout/BottomNav';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Order } from '../../types';
import { formatCurrency, getOrderStatusColor, getOrderStatusText } from '../../lib/utils';
import { toast } from 'sonner';

export default function CustomerOrders() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const pastOrders = orders.filter((o) => ['delivered', 'cancelled'].includes(o.status));

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">My Orders</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-8">Start ordering delicious food now!</p>
            <Link to="/customer">
              <button className="gradient-primary text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all">
                Browse Restaurants
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* Active Orders */}
            {activeOrders.length > 0 && (
              <section>
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  Active Orders
                </h2>
                <div className="space-y-3">
                  {activeOrders.map((order) => (
                    <OrderCard key={order.id} order={order} isActive />
                  ))}
                </div>
              </section>
            )}

            {/* Past Orders */}
            {pastOrders.length > 0 && (
              <section>
                <h2 className="font-bold text-lg mb-4">Past Orders</h2>
                <div className="space-y-3">
                  {pastOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function OrderCard({ order, isActive }: { order: Order; isActive?: boolean }) {
  return (
    <Link to={`/customer/track/${order.id}`}>
      <div className={`bg-card rounded-2xl p-5 border card-shadow hover:card-shadow-lg transition-all ${
        isActive ? 'ring-2 ring-primary/20' : ''
      }`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-bold text-lg mb-1">{order.order_number}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {new Date(order.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
          <Badge className={getOrderStatusColor(order.status)}>
            {getOrderStatusText(order.status)}
          </Badge>
        </div>

        <div className="space-y-1.5 mb-4">
          {order.items.slice(0, 2).map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              {item.is_veg ? (
                <div className="veg-badge" />
              ) : (
                <div className="non-veg-badge" />
              )}
              <p className="text-sm font-medium">
                {item.quantity}x {item.name}
              </p>
            </div>
          ))}
          {order.items.length > 2 && (
            <p className="text-sm text-muted-foreground ml-6">
              +{order.items.length - 2} more items
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Total Amount</p>
            <p className="font-bold text-lg">{formatCurrency(order.total)}</p>
          </div>
          <div className="flex items-center gap-2 text-primary">
            <span className="font-semibold text-sm">
              {isActive ? 'Track Order' : 'View Details'}
            </span>
            <ChevronRight className="h-5 w-5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
