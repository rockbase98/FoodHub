import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { supabase } from '../../lib/supabase';
import { Order, Kitchen, Address } from '../../types';
import { formatCurrency, getOrderStatusText } from '../../lib/utils';
import { toast } from 'sonner';

export default function ActiveDelivery() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      const { data: orderData, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (error) throw error;
      setOrder(orderData);

      const [kitchenRes, addressRes] = await Promise.all([
        supabase.from('kitchens').select('*').eq('id', orderData.kitchen_id).single(),
        supabase.from('addresses').select('*').eq('id', orderData.address_id).single(),
      ]);

      if (kitchenRes.data) setKitchen(kitchenRes.data);
      if (addressRes.data) setAddress(addressRes.data);
    } catch (error: any) {
      toast.error('Failed to load order');
      navigate('/delivery');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
      if (error) throw error;

      await supabase.from('deliveries').update({ status }).eq('order_id', orderId);

      toast.success(`Status updated to ${status}`);
      
      if (status === 'delivered') {
        const { error: paymentError } = await supabase
          .from('orders')
          .update({ payment_status: 'completed' })
          .eq('id', orderId);

        if (paymentError) console.error(paymentError);
        
        navigate('/delivery');
      } else {
        loadOrderDetails();
      }
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

  if (!order) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/delivery')}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Active Delivery</h1>
            <p className="text-sm text-muted-foreground">{order.order_number}</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        {/* Status Card */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-lg p-6">
          <p className="text-sm opacity-90 mb-1">Current Status</p>
          <p className="text-2xl font-bold mb-4">{getOrderStatusText(order.status)}</p>
          <p className="text-3xl font-bold">{formatCurrency(order.total)}</p>
        </div>

        {/* Pickup Location */}
        {kitchen && (
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-start gap-3 mb-3">
              <MapPin className="h-5 w-5 text-primary mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Pickup from</h3>
                <p className="font-medium">{kitchen.name}</p>
                <p className="text-sm text-muted-foreground">{kitchen.address}</p>
              </div>
              {order.status === 'ready' && (
                <Badge className="bg-yellow-500">Ready for Pickup</Badge>
              )}
            </div>
          </div>
        )}

        {/* Delivery Address */}
        {address && (
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-green-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Deliver to</h3>
                <p className="font-medium">{address.label}</p>
                <p className="text-sm text-muted-foreground">{address.address_line}</p>
              </div>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-card border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Order Items</h3>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{item.quantity}x {item.name}</span>
                <span>{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-4">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Payment: {order.payment_method === 'cod' ? 'Cash on Delivery' : 'UPI'}
            </p>
          </div>
        </div>

        {/* Delivery Instructions */}
        {order.delivery_instructions && (
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-2">Delivery Instructions</h3>
            <p className="text-sm text-muted-foreground">{order.delivery_instructions}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {order.status === 'ready' && (
            <Button onClick={() => updateStatus('picked_up')} className="w-full gradient-primary py-6 text-lg">
              Confirm Pickup
            </Button>
          )}
          {order.status === 'picked_up' && (
            <Button onClick={() => updateStatus('out_for_delivery')} className="w-full gradient-primary py-6 text-lg">
              Start Delivery
            </Button>
          )}
          {order.status === 'out_for_delivery' && (
            <Button onClick={() => updateStatus('delivered')} className="w-full gradient-success py-6 text-lg">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Mark as Delivered
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
