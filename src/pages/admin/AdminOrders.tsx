import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Package, Bike, XCircle, MapPin, User } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { supabase } from '../../lib/supabase';
import { Order } from '../../types';
import { formatCurrency, getOrderStatusColor, getOrderStatusText } from '../../lib/utils';
import { toast } from 'sonner';

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [availableRiders, setAvailableRiders] = useState<any[]>([]);
  const [assigningRider, setAssigningRider] = useState(false);
  const [selectedRiderId, setSelectedRiderId] = useState<string>('');

  useEffect(() => {
    loadOrders();
    loadAvailableRiders();
    const interval = setInterval(() => {
      loadOrders();
      loadAvailableRiders();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          kitchens:kitchen_id(name, address),
          user_profiles:customer_id(username, email, phone),
          addresses:address_id(label, address_line),
          deliveries(id, delivery_partner_id, status)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableRiders = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_partners')
        .select('*, user_profiles!inner(*)')
        .eq('is_approved', true)
        .eq('is_online', true);

      if (error) throw error;
      setAvailableRiders(data || []);
    } catch (error: any) {
      console.error('Failed to load riders:', error);
    }
  };

  const handleAssignRider = async () => {
    if (!selectedOrder || !selectedRiderId) {
      toast.error('Please select a rider');
      return;
    }

    setAssigningRider(true);
    try {
      // Update order with delivery partner
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          delivery_partner_id: selectedRiderId,
          status: 'ready' 
        })
        .eq('id', selectedOrder.id);

      if (orderError) throw orderError;

      // Create delivery record
      const { error: deliveryError } = await supabase
        .from('deliveries')
        .insert({
          order_id: selectedOrder.id,
          delivery_partner_id: selectedRiderId,
          status: 'assigned',
        });

      if (deliveryError && deliveryError.code !== '23505') { // Ignore duplicate key error
        throw deliveryError;
      }

      toast.success('Rider assigned successfully!');
      setSelectedOrder(null);
      setSelectedRiderId('');
      loadOrders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign rider');
    } finally {
      setAssigningRider(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Order cancelled');
      loadOrders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel order');
    }
  };

  const handleChangeStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      toast.success(`Order status updated to ${newStatus}`);
      loadOrders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === 'all') return true;
    if (filter === 'active') return !['delivered', 'cancelled'].includes(o.status);
    if (filter === 'completed') return ['delivered', 'cancelled'].includes(o.status);
    return true;
  });

  const activeCount = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;
  const completedCount = orders.filter((o) => ['delivered', 'cancelled'].includes(o.status)).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">All Orders</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('all')}
          >
            All ({orders.length})
          </Badge>
          <Badge
            variant={filter === 'active' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('active')}
          >
            Active ({activeCount})
          </Badge>
          <Badge
            variant={filter === 'completed' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('completed')}
          >
            Completed ({completedCount})
          </Badge>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No orders found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order: any) => (
              <div key={order.id} className="bg-card border rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{order.order_number}</h3>
                      <Badge className={getOrderStatusColor(order.status)}>
                        {getOrderStatusText(order.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                      <Clock className="h-3 w-3" />
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                    {order.kitchens && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {order.kitchens.name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{formatCurrency(order.total)}</p>
                    <p className="text-xs text-muted-foreground">{order.items.length} items</p>
                  </div>
                </div>

                {/* Customer & Delivery Info */}
                <div className="grid md:grid-cols-2 gap-4 mb-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">CUSTOMER</p>
                    <p className="font-medium flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {order.user_profiles?.username || 'Unknown'}
                    </p>
                    <p className="text-sm text-muted-foreground">{order.user_profiles?.email}</p>
                    {order.user_profiles?.phone && (
                      <p className="text-sm text-muted-foreground">{order.user_profiles.phone}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">DELIVERY ADDRESS</p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {order.addresses?.label || 'Not set'}
                    </p>
                    <p className="text-sm text-muted-foreground">{order.addresses?.address_line}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-semibold mb-2">Order Items:</p>
                  <div className="space-y-1">
                    {order.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Admin Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {/* Status Change */}
                  {!['delivered', 'cancelled'].includes(order.status) && (
                    <Select
                      value={order.status}
                      onValueChange={(value) => handleChangeStatus(order.id, value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Change Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="preparing">Preparing</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="picked_up">Picked Up</SelectItem>
                        <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {/* Assign Rider Button */}
                  {!order.delivery_partner_id && order.status !== 'cancelled' && order.status !== 'delivered' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedOrder(order)}
                      className="flex items-center gap-1"
                    >
                      <Bike className="h-4 w-4" />
                      Assign Rider
                    </Button>
                  )}

                  {/* View Tracking */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/customer/track/${order.id}`)}
                  >
                    View Tracking
                  </Button>

                  {/* Cancel Order */}
                  {!['delivered', 'cancelled'].includes(order.status) && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancelOrder(order.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel Order
                    </Button>
                  )}
                </div>

                {/* Show assigned rider */}
                {order.deliveries && order.deliveries.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-semibold text-green-700 flex items-center gap-1">
                      <Bike className="h-4 w-4" />
                      Rider Assigned - Status: {order.deliveries[0].status}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Rider Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Delivery Partner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Order: <span className="font-semibold">{selectedOrder?.order_number}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Available online riders: {availableRiders.length}
              </p>
            </div>

            <Select value={selectedRiderId} onValueChange={setSelectedRiderId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a rider" />
              </SelectTrigger>
              <SelectContent>
                {availableRiders.map((rider) => (
                  <SelectItem key={rider.id} value={rider.user_id}>
                    <div className="flex items-center gap-2">
                      <Bike className="h-4 w-4" />
                      <div>
                        <p className="font-medium">{rider.user_profiles.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {rider.total_deliveries} deliveries • {rider.vehicle_type}
                        </p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {availableRiders.length === 0 && (
              <p className="text-sm text-yellow-600">No riders are currently online</p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleAssignRider}
                disabled={!selectedRiderId || assigningRider}
                className="gradient-primary"
              >
                {assigningRider ? 'Assigning...' : 'Assign Rider'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
