import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Package, CheckCircle2, Bike, Phone, Star, ChefHat, Truck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { supabase } from '../../lib/supabase';
import { Order, Kitchen, Address, Delivery } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';

export default function OrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrderDetails();
    const interval = setInterval(loadOrderDetails, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      const [kitchenRes, addressRes, deliveryRes] = await Promise.all([
        supabase.from('kitchens').select('*').eq('id', orderData.kitchen_id).single(),
        supabase.from('addresses').select('*').eq('id', orderData.address_id).single(),
        supabase.from('deliveries').select('*').eq('order_id', orderId).single(),
      ]);

      if (kitchenRes.data) setKitchen(kitchenRes.data);
      if (addressRes.data) setAddress(addressRes.data);
      if (deliveryRes.data) setDelivery(deliveryRes.data);
    } catch (error: any) {
      console.error('Failed to load order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Order not found</p>
      </div>
    );
  }

  const statusSteps = [
    { key: 'pending', label: 'Order Placed', desc: 'Your order has been received', icon: Package, emoji: '📋', color: 'bg-orange-500' },
    { key: 'accepted', label: 'Order Confirmed', desc: 'Restaurant accepted your order', icon: CheckCircle2, emoji: '✅', color: 'bg-green-500' },
    { key: 'preparing', label: 'Kitchen is Cooking', desc: 'Chef is preparing your food', icon: ChefHat, emoji: '👨‍🍳', color: 'bg-yellow-500' },
    { key: 'ready', label: 'Ready for Pickup', desc: 'Your food is packed & ready', icon: CheckCircle2, emoji: '📦', color: 'bg-teal-500' },
    { key: 'picked_up', label: 'Picked Up', desc: 'Delivery partner has the order', icon: Bike, emoji: '🛵', color: 'bg-blue-500' },
    { key: 'out_for_delivery', label: 'Out for Delivery', desc: 'On the way to your address', icon: Truck, emoji: '🚀', color: 'bg-purple-500' },
    { key: 'delivered', label: 'Delivered!', desc: 'Enjoy your meal 🎉', icon: CheckCircle2, emoji: '🎉', color: 'bg-green-600' },
  ];

  const currentStepIndex = statusSteps.findIndex((step) => step.key === order.status);
  const progressPercent = currentStepIndex >= 0 ? (currentStepIndex / (statusSteps.length - 1)) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#f0f0f5] pb-6">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/customer/orders')} className="hover:scale-110 transition-transform">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Track Order</h1>
            <p className="text-sm text-muted-foreground">{order.order_number}</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        {/* ETA Banner */}
        <div className="bg-primary text-white rounded-2xl p-5 flex items-center gap-4">
          <div className="text-5xl">
            {statusSteps[currentStepIndex]?.emoji || '📋'}
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold">{statusSteps[currentStepIndex]?.label || 'Processing'}</p>
            <p className="text-sm opacity-90">{statusSteps[currentStepIndex]?.desc}</p>
            {order.status !== 'delivered' && order.status !== 'cancelled' && (
              <div className="flex items-center gap-1.5 mt-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Est. {kitchen?.delivery_time || '30-40 mins'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-base">Order Progress</h2>
            <span className="text-sm text-primary font-semibold">{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 mb-6">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Step Timeline */}
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-muted" />
            <div
              className="absolute left-5 top-0 w-0.5 bg-primary transition-all duration-700"
              style={{ height: `${progressPercent}%` }}
            />

            <div className="space-y-5 relative">
              {statusSteps.map((step, index) => {
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isPending = index > currentStepIndex;

                return (
                  <div key={step.key} className={`flex items-start gap-4 transition-all duration-300 ${isPending ? 'opacity-40' : ''}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all duration-500 ${
                      isCompleted ? 'bg-primary text-white shadow-md'
                      : isCurrent ? `${step.color} text-white shadow-lg ring-4 ring-primary/20 animate-pulse`
                      : 'bg-muted text-muted-foreground'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <span className="text-base">{step.emoji}</span>
                      )}
                    </div>
                    <div className="flex-1 pt-1.5">
                      <p className={`font-semibold leading-tight ${
                        isCurrent ? 'text-primary text-base' : isCompleted ? 'text-foreground' : 'text-muted-foreground text-sm'
                      }`}>
                        {step.label}
                      </p>
                      {(isCompleted || isCurrent) && (
                        <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                      )}
                      {isCurrent && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                          <span className="text-xs text-primary font-semibold">Currently here</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Restaurant Details */}
        {kitchen && (
          <div className="bg-white rounded-2xl p-5 border shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center flex-shrink-0">
                <span className="text-3xl">🍽️</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base mb-1">{kitchen.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">{kitchen.address}</p>
              </div>
              <button className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Phone className="h-5 w-5 text-primary" />
              </button>
            </div>
          </div>
        )}

        {/* Delivery Address */}
        {address && (
          <div className="bg-white rounded-2xl p-5 border shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide mb-1">
                  Delivery Address
                </h3>
                <p className="font-semibold mb-0.5">{address.label}</p>
                <p className="text-sm text-muted-foreground">{address.address_line}</p>
              </div>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white rounded-2xl p-5 border shadow-sm">
          <h3 className="font-bold text-base mb-4">Order Items</h3>
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-start">
                <div className="flex items-start gap-2">
                  {item.is_veg ? (
                    <div className="veg-badge mt-1" />
                  ) : (
                    <div className="non-veg-badge mt-1" />
                  )}
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                </div>
                <p className="font-bold">{formatCurrency(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bill Details */}
        <div className="bg-white rounded-2xl p-5 border shadow-sm">
          <h3 className="font-bold text-base mb-4">Bill Details</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Item Total</span>
              <span className="font-medium">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span className="font-medium">{formatCurrency(order.delivery_fee)}</span>
            </div>
            <div className="border-t pt-2.5 flex justify-between">
              <span className="font-bold text-base">To Pay</span>
              <span className="font-bold text-lg text-primary">{formatCurrency(order.total)}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="font-semibold">
                {order.payment_method === 'cod' ? '💵 Cash on Delivery' : '📱 UPI Payment'}
              </span>
            </div>
          </div>
        </div>

        {/* Rate Order Button - Only show when delivered */}
        {order.status === 'delivered' && (
          <Button
            onClick={() => navigate('/customer/review', { state: { orderId: order.id, kitchenId: order.kitchen_id } })}
            className="w-full gradient-primary text-lg py-6 flex items-center justify-center gap-2"
          >
            <Star className="h-5 w-5" />
            Rate this Order
          </Button>
        )}
      </div>
    </div>
  );
}
