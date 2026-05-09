import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Package, CheckCircle2, Bike, Phone, Star, ChefHat, Truck, Map, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { supabase } from '../../lib/supabase';
import { Order, Kitchen, Address, Delivery } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';
import DeliveryMap from '../../components/features/DeliveryMap';

interface DeliveryPartnerProfile {
  id: string;
  username: string;
  phone?: string;
}

export default function OrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [riderProfile, setRiderProfile] = useState<DeliveryPartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapExpanded, setMapExpanded] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadOrderDetails(true);

    // Poll every 10 seconds for live updates
    pollRef.current = setInterval(() => {
      loadOrderDetails(false);
    }, 10000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [orderId]);

  const loadOrderDetails = async (showLoader = false) => {
    if (showLoader) setLoading(true);
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
        supabase.from('deliveries').select('*').eq('order_id', orderId).maybeSingle(),
      ]);

      if (kitchenRes.data) setKitchen(kitchenRes.data);
      if (addressRes.data) setAddress(addressRes.data);
      if (deliveryRes.data) {
        setDelivery(deliveryRes.data);

        // Load rider profile
        if (deliveryRes.data.delivery_partner_id) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('id, username, phone')
            .eq('id', deliveryRes.data.delivery_partner_id)
            .single();
          if (profile) setRiderProfile(profile);
        }
      }

      setLastUpdated(new Date());

      // Stop polling if delivered or cancelled
      if (orderData.status === 'delivered' || orderData.status === 'cancelled') {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch (error: any) {
      console.error('Failed to load order:', error);
    } finally {
      if (showLoader) setLoading(false);
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
        <div className="text-center">
          <p className="text-lg font-bold mb-2">Order not found</p>
          <Button onClick={() => navigate('/customer/orders')} variant="outline">Back to Orders</Button>
        </div>
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

  const showMap = ['picked_up', 'out_for_delivery', 'accepted', 'preparing', 'ready'].includes(order.status);
  const isLiveTracking = ['picked_up', 'out_for_delivery'].includes(order.status);

  return (
    <div className="min-h-screen bg-[#f0f0f5] pb-6">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/customer/orders')} className="hover:scale-110 transition-transform">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Track Order</h1>
            <p className="text-sm text-muted-foreground">{order.order_number}</p>
          </div>
          {lastUpdated && (
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Last updated</p>
              <p className="text-xs font-medium text-green-600">
                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          )}
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
          {/* Live indicator */}
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <div className="flex flex-col items-center gap-1">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <span className="text-[10px] font-bold opacity-80">LIVE</span>
            </div>
          )}
        </div>

        {/* ── LIVE MAP SECTION ── */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <button
            onClick={() => setMapExpanded(!mapExpanded)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isLiveTracking ? 'bg-green-100' : 'bg-blue-100'}`}>
                <Map className={`h-4 w-4 ${isLiveTracking ? 'text-green-600' : 'text-blue-600'}`} />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">
                  {isLiveTracking ? 'Live Delivery Tracking' : 'Delivery Map'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isLiveTracking
                    ? 'Updates every 10 seconds'
                    : showMap
                    ? 'Restaurant & delivery route'
                    : 'Available after pickup'}
                </p>
              </div>
              {isLiveTracking && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            {mapExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {mapExpanded && (
            <div className="px-4 pb-4">
              <DeliveryMap
                kitchenLat={kitchen?.lat}
                kitchenLng={kitchen?.lng}
                customerLat={address?.lat}
                customerLng={address?.lng}
                riderLat={delivery?.current_lat}
                riderLng={delivery?.current_lng}
                kitchenName={kitchen?.name}
                customerAddress={address?.address_line}
                orderStatus={order.status}
              />
              {/* Route info strip */}
              <div className="mt-3 flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 flex-shrink-0">
                  <span className="text-sm">🍽️</span>
                  <span className="text-xs font-medium text-green-700 max-w-[100px] truncate">{kitchen?.name || 'Restaurant'}</span>
                </div>
                <div className="text-muted-foreground flex-shrink-0">
                  <span className="text-lg">→</span>
                </div>
                {delivery?.current_lat && (
                  <>
                    <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5 flex-shrink-0">
                      <span className="text-sm">🏍️</span>
                      <span className="text-xs font-medium text-orange-700">
                        {riderProfile?.username || 'Rider'}
                      </span>
                    </div>
                    <div className="text-muted-foreground flex-shrink-0">
                      <span className="text-lg">→</span>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5 flex-shrink-0">
                  <span className="text-sm">📍</span>
                  <span className="text-xs font-medium text-blue-700 max-w-[100px] truncate">{address?.label || 'You'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rider Info Card - show when assigned */}
        {delivery && riderProfile && (
          <div className="bg-white rounded-2xl p-5 border shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center text-2xl flex-shrink-0 shadow-md">
                🏍️
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Delivery Partner</p>
                <p className="font-bold text-base">{riderProfile.username}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs text-muted-foreground">4.8 • 250+ deliveries</span>
                </div>
              </div>
              {riderProfile.phone && (
                <a href={`tel:${riderProfile.phone}`}>
                  <button className="w-11 h-11 rounded-full bg-green-50 border border-green-200 flex items-center justify-center hover:bg-green-100 transition-colors">
                    <Phone className="h-5 w-5 text-green-600" />
                  </button>
                </a>
              )}
            </div>
            {delivery.current_lat && delivery.current_lng && (
              <div className="mt-3 pt-3 border-t flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-600 font-semibold">Location updated live</span>
                <span className="text-xs text-muted-foreground ml-auto">every 10s</span>
              </div>
            )}
          </div>
        )}

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
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                {kitchen.image_url ? (
                  <img src={kitchen.image_url} alt={kitchen.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center">
                    <span className="text-2xl">🍽️</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base mb-0.5">{kitchen.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">{kitchen.address}</p>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Address */}
        {address && (
          <div className="bg-white rounded-2xl p-5 border shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-blue-600" />
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
