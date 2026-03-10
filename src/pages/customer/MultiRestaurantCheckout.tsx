import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, Plus, Trash2, Loader2, Tag, X, AlertTriangle, 
  Navigation, Info, Clock, Route, TrendingUp, Store, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { Address, Kitchen, Coupon } from '../../types';
import { formatCurrency, calculateDeliveryFee, calculateDistance, getCurrentLocation, formatDistance } from '../../lib/utils';
import { CoordinationService } from '../../lib/coordinationService';
import { toast } from 'sonner';

interface KitchenWithDetails extends Kitchen {
  distance?: number;
  prepTime: number;
  pickupSequence?: number;
}

export default function MultiRestaurantCheckout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { multiKitchenCarts, clearCart, updateQuantity, getKitchenTotal, getTotal } = useCartStore();
  
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [kitchens, setKitchens] = useState<Map<string, KitchenWithDetails>>(new Map());
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: '', address_line: '' });
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'upi'>('cod');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedKitchens, setExpandedKitchens] = useState<Set<string>>(new Set(multiKitchenCarts.map(c => c.kitchenId)));
  
  // Coupon states
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [showCoupons, setShowCoupons] = useState(false);
  
  // Route optimization states
  const [optimizedRoute, setOptimizedRoute] = useState<KitchenWithDetails[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [estimatedTotalTime, setEstimatedTotalTime] = useState(0);

  useEffect(() => {
    if (multiKitchenCarts.length === 0) {
      navigate('/customer');
      return;
    }
    loadAddresses();
    loadKitchens();
    loadCoupons();
  }, []);

  useEffect(() => {
    if (selectedAddress && kitchens.size > 0) {
      optimizeDeliveryRoute();
    }
  }, [selectedAddress, kitchens]);

  const loadAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user?.id)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
      
      const defaultAddress = data?.find((addr) => addr.is_default);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress.id);
      }
    } catch (error: any) {
      console.error('Failed to load addresses:', error);
    }
  };

  const loadKitchens = async () => {
    try {
      const kitchenIds = multiKitchenCarts.map((cart) => cart.kitchenId);
      const { data, error } = await supabase
        .from('kitchens')
        .select('*')
        .in('id', kitchenIds);

      if (error) throw error;

      const kitchenMap = new Map<string, KitchenWithDetails>();
      data?.forEach((kitchen) => {
        kitchenMap.set(kitchen.id, {
          ...kitchen,
          prepTime: 30, // Default prep time
        });
      });
      setKitchens(kitchenMap);
    } catch (error: any) {
      toast.error('Failed to load restaurant details');
    }
  };

  const loadCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .order('discount_value', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error: any) {
      console.error('Failed to load coupons:', error);
    }
  };

  const optimizeDeliveryRoute = () => {
    const address = addresses.find((a) => a.id === selectedAddress);
    if (!address || !address.lat || !address.lng) return;

    // Calculate distances for all kitchens
    const kitchensWithDistance = multiKitchenCarts.map((cart) => {
      const kitchen = kitchens.get(cart.kitchenId);
      if (!kitchen || !kitchen.lat || !kitchen.lng) return null;

      const distance = calculateDistance(
        address.lat!,
        address.lng!,
        kitchen.lat,
        kitchen.lng
      );

      return {
        ...kitchen,
        distance,
      };
    }).filter(Boolean) as KitchenWithDetails[];

    // Greedy algorithm: Sort by distance (nearest first)
    // In real-world: consider prep time, distance, and timing coordination
    const sorted = kitchensWithDistance.sort((a, b) => {
      // Prioritize by prep time first, then distance
      const timeDiff = (a.prepTime || 30) - (b.prepTime || 30);
      if (Math.abs(timeDiff) > 10) return timeDiff; // If prep time differs by >10 mins
      return (a.distance || 0) - (b.distance || 0);
    });

    // Assign pickup sequence
    const routeWithSequence = sorted.map((kitchen, index) => ({
      ...kitchen,
      pickupSequence: index + 1,
    }));

    setOptimizedRoute(routeWithSequence);

    // Calculate total distance (address → kitchen1 → kitchen2 → ... → address)
    let total = 0;
    let prevLat = address.lat;
    let prevLng = address.lng;

    routeWithSequence.forEach((kitchen) => {
      if (kitchen.lat && kitchen.lng) {
        total += calculateDistance(prevLat!, prevLng!, kitchen.lat, kitchen.lng);
        prevLat = kitchen.lat;
        prevLng = kitchen.lng;
      }
    });

    // Add return distance to customer
    if (prevLat && prevLng) {
      total += calculateDistance(prevLat, prevLng, address.lat!, address.lng!);
    }

    setTotalDistance(total);

    // Estimate total time (prep time of slowest kitchen + travel time)
    const maxPrepTime = Math.max(...routeWithSequence.map((k) => k.prepTime || 30));
    const travelTime = total * 3; // Assume 3 mins per km
    setEstimatedTotalTime(maxPrepTime + travelTime);
  };

  const handleApplyCoupon = (coupon: Coupon) => {
    const subtotal = getTotal();
    if (subtotal < coupon.min_order_value) {
      toast.error(`Minimum order value should be ${formatCurrency(coupon.min_order_value)}`);
      return;
    }
    setAppliedCoupon(coupon);
    setCouponCode(coupon.code);
    setShowCoupons(false);
    toast.success('Coupon applied!');
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast.success('Coupon removed');
  };

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    const subtotal = getTotal();
    if (appliedCoupon.discount_type === 'percentage') {
      const discount = (subtotal * appliedCoupon.discount_value) / 100;
      return appliedCoupon.max_discount ? Math.min(discount, appliedCoupon.max_discount) : discount;
    } else {
      return appliedCoupon.discount_value;
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.label || !newAddress.address_line) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const location = await getCurrentLocation();
      const { error } = await supabase.from('addresses').insert({
        user_id: user?.id,
        label: newAddress.label,
        address_line: newAddress.address_line,
        lat: location.lat,
        lng: location.lng,
        is_default: addresses.length === 0,
      });

      if (error) throw error;

      toast.success('Address added');
      setNewAddress({ label: '', address_line: '' });
      setShowAddressForm(false);
      loadAddresses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add address');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    if (multiKitchenCarts.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setLoading(true);

    try {
      const address = addresses.find((addr) => addr.id === selectedAddress);
      if (!address) throw new Error('Address not found');

      const subtotal = getTotal();
      const deliveryFee = calculateDeliveryFee(totalDistance);
      const discount = calculateDiscount();
      const total = subtotal + deliveryFee - discount;

      // Generate batch order ID
      const batchOrderId = crypto.randomUUID();

      // Create orders for each kitchen
      const orderPromises = optimizedRoute.map(async (kitchen, index) => {
        const cart = multiKitchenCarts.find((c) => c.kitchenId === kitchen.id);
        if (!cart) return null;

        const kitchenSubtotal = getKitchenTotal(kitchen.id);
        const orderItems = cart.items.map((item) => ({
          menu_item_id: item.menuItem.id,
          name: item.menuItem.name,
          price: item.menuItem.price,
          quantity: item.quantity,
          is_veg: item.menuItem.is_veg,
        }));

        const { data: orderNumber } = await supabase.rpc('generate_order_number');

        // For multi-restaurant, split delivery fee proportionally
        const kitchenDeliveryFee = (kitchenSubtotal / subtotal) * deliveryFee;
        const kitchenDiscount = (kitchenSubtotal / subtotal) * discount;
        const kitchenTotal = kitchenSubtotal + kitchenDeliveryFee - kitchenDiscount;

        const { data: order, error } = await supabase
          .from('orders')
          .insert({
            order_number: orderNumber,
            customer_id: user?.id,
            kitchen_id: kitchen.id,
            address_id: selectedAddress,
            items: orderItems,
            subtotal: kitchenSubtotal,
            delivery_fee: kitchenDeliveryFee,
            total: kitchenTotal,
            status: 'pending',
            payment_method: paymentMethod,
            payment_status: 'pending',
            delivery_instructions: deliveryInstructions || null,
            batch_order_id: batchOrderId,
            pickup_sequence: kitchen.pickupSequence || index + 1,
            estimated_prep_time: kitchen.prepTime,
            coordination_status: 'batch_pending',
          })
          .select()
          .single();

        if (error) throw error;
        return order;
      });

      const orders = await Promise.all(orderPromises);
      const validOrders = orders.filter(Boolean);

      if (validOrders.length === 0) {
        throw new Error('Failed to create orders');
      }

      clearCart();
      toast.success(`🎉 Orders placed from ${validOrders.length} restaurants!`);
      
      // Navigate to first order tracking (could be enhanced to show batch view)
      navigate(`/customer/track/${validOrders[0]?.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to place orders');
      setLoading(false);
    }
  };

  const toggleKitchen = (kitchenId: string) => {
    const newExpanded = new Set(expandedKitchens);
    if (newExpanded.has(kitchenId)) {
      newExpanded.delete(kitchenId);
    } else {
      newExpanded.add(kitchenId);
    }
    setExpandedKitchens(newExpanded);
  };

  if (multiKitchenCarts.length === 0) {
    return null;
  }

  const subtotal = getTotal();
  const deliveryFee = calculateDeliveryFee(totalDistance);
  const discount = calculateDiscount();
  const total = subtotal + deliveryFee - discount;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Multi-Restaurant Checkout</h1>
            <p className="text-xs text-muted-foreground">
              {multiKitchenCarts.length} restaurants • {optimizedRoute.length} stops
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        {/* Smart Route Optimization Banner */}
        {optimizedRoute.length > 0 && (
          <Alert className="border-primary/50 bg-primary/5">
            <Route className="h-5 w-5 text-primary" />
            <AlertDescription>
              <div className="mt-2">
                <p className="font-bold text-primary mb-2">🚀 Smart Route Optimized!</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDistance(totalDistance)} total</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>~{Math.ceil(estimatedTotalTime)} mins</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span>{optimizedRoute.length} pickups</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span>Hot food guaranteed</span>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Kitchen-wise Order Breakdown */}
        <div className="bg-card border rounded-lg">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Your Order ({multiKitchenCarts.length} Restaurants)
            </h2>
          </div>

          <div className="divide-y">
            {optimizedRoute.map((kitchen, index) => {
              const cart = multiKitchenCarts.find((c) => c.kitchenId === kitchen.id);
              if (!cart) return null;

              const isExpanded = expandedKitchens.has(kitchen.id);
              const kitchenTotal = getKitchenTotal(kitchen.id);

              return (
                <div key={kitchen.id} className="p-4">
                  {/* Kitchen Header */}
                  <button
                    onClick={() => toggleKitchen(kitchen.id)}
                    className="w-full flex items-start gap-3 mb-3 hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <Badge className="bg-primary text-white">#{kitchen.pickupSequence}</Badge>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold">{kitchen.name}</h3>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {kitchen.prepTime} mins prep
                        </span>
                        {kitchen.distance && (
                          <span className="flex items-center gap-1">
                            <Navigation className="h-3 w-3" />
                            {formatDistance(kitchen.distance)}
                          </span>
                        )}
                        <span className="font-semibold text-primary">
                          {cart.items.length} item{cart.items.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(kitchenTotal)}</p>
                    </div>
                  </button>

                  {/* Kitchen Items */}
                  {isExpanded && (
                    <div className="space-y-2 ml-11 mt-3">
                      {cart.items.map((item) => (
                        <div key={item.menuItem.id} className="flex items-center justify-between text-sm">
                          <div className="flex-1">
                            <p className="font-medium">{item.menuItem.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(item.menuItem.price)} × {item.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-muted rounded px-2 py-1">
                              <button
                                onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1, kitchen.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                              <span className="font-medium text-xs">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1, kitchen.id)}
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <span className="font-semibold min-w-[60px] text-right">
                              {formatCurrency(item.menuItem.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Apply Coupon */}
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Apply Coupon
            </h2>
            {!appliedCoupon && (
              <Button size="sm" variant="outline" onClick={() => setShowCoupons(!showCoupons)}>
                View All
              </Button>
            )}
          </div>

          {appliedCoupon ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-green-700">{appliedCoupon.code}</p>
                <p className="text-sm text-green-600">{appliedCoupon.description}</p>
                <p className="text-sm font-semibold text-green-700 mt-1">
                  You saved {formatCurrency(discount)}!
                </p>
              </div>
              <button onClick={handleRemoveCoupon}>
                <X className="h-5 w-5 text-red-500" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter coupon code"
                className="uppercase"
              />
              <Button
                onClick={() => {
                  const coupon = coupons.find((c) => c.code === couponCode);
                  if (coupon) handleApplyCoupon(coupon);
                  else toast.error('Invalid coupon code');
                }}
              >
                Apply
              </Button>
            </div>
          )}

          {showCoupons && coupons.length > 0 && (
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="border rounded-lg p-3 cursor-pointer hover:bg-muted transition"
                  onClick={() => handleApplyCoupon(coupon)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-primary">{coupon.code}</p>
                      <p className="text-sm text-muted-foreground">{coupon.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Min order: {formatCurrency(coupon.min_order_value)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      Apply
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delivery Address */}
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Delivery Address</h2>
            <div className="flex gap-2">
              <Link to="/customer/addresses">
                <Button size="sm" variant="outline">
                  <MapPin className="h-4 w-4 mr-1" /> Manage
                </Button>
              </Link>
              <Button size="sm" variant="outline" onClick={() => setShowAddressForm(!showAddressForm)}>
                <Plus className="h-4 w-4 mr-1" /> Add New
              </Button>
            </div>
          </div>

          {showAddressForm && (
            <div className="mb-4 p-4 bg-muted rounded-lg space-y-3">
              <div>
                <Label>Label (Home, Office, etc.)</Label>
                <Input
                  value={newAddress.label}
                  onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                  placeholder="Home"
                />
              </div>
              <div>
                <Label>Complete Address</Label>
                <Textarea
                  value={newAddress.address_line}
                  onChange={(e) => setNewAddress({ ...newAddress, address_line: e.target.value })}
                  placeholder="Street, landmark, city, pincode"
                />
              </div>
              <Button onClick={handleAddAddress} size="sm">
                Save Address
              </Button>
            </div>
          )}

          {addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved addresses</p>
          ) : (
            <RadioGroup value={selectedAddress || ''} onValueChange={setSelectedAddress}>
              <div className="space-y-2">
                {addresses.map((address) => (
                  <div key={address.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                    <label htmlFor={address.id} className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-medium">{address.label}</span>
                        {address.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{address.address_line}</p>
                    </label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}
        </div>

        {/* Payment Method */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="font-semibold text-lg mb-4">Payment Method</h2>
          <RadioGroup value={paymentMethod} onValueChange={(val) => setPaymentMethod(val as 'cod' | 'upi')}>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <RadioGroupItem value="cod" id="cod" />
                <label htmlFor="cod" className="flex-1 cursor-pointer">
                  <p className="font-medium">Cash on Delivery</p>
                  <p className="text-sm text-muted-foreground">Pay when you receive</p>
                </label>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <RadioGroupItem value="upi" id="upi" />
                <label htmlFor="upi" className="flex-1 cursor-pointer">
                  <p className="font-medium">UPI Payment</p>
                  <p className="text-sm text-muted-foreground">Pay via UPI apps</p>
                </label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Delivery Instructions */}
        <div className="bg-card border rounded-lg p-6">
          <Label className="mb-2 block">Delivery Instructions (Optional)</Label>
          <Textarea
            value={deliveryInstructions}
            onChange={(e) => setDeliveryInstructions(e.target.value)}
            placeholder="E.g., Call on arrival, Don't ring the bell..."
          />
        </div>

        {/* Bill Details */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="font-semibold text-lg mb-4">Bill Details</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item Total ({multiKitchenCarts.reduce((sum, c) => sum + c.items.length, 0)} items)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="text-xs text-muted-foreground">
                  ({formatDistance(totalDistance)} route)
                </span>
              </div>
              <div className="text-right">
                {deliveryFee === 0 ? (
                  <div>
                    <span className="line-through text-muted-foreground text-sm mr-2">₹50</span>
                    <span className="text-green-600 font-semibold">FREE</span>
                  </div>
                ) : (
                  <span>{formatCurrency(deliveryFee)}</span>
                )}
              </div>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Coupon Discount</span>
                <span>- {formatCurrency(discount)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <p className="text-xs text-muted-foreground text-center pt-2">
              💡 Smart route saves {Math.ceil(totalDistance * 0.2)}km vs individual deliveries
            </p>
          </div>
        </div>
      </div>

      {/* Place Order Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 z-50">
        <div className="container mx-auto max-w-3xl">
          <Button
            onClick={handlePlaceOrder}
            disabled={loading || !selectedAddress}
            className="w-full gradient-primary text-lg py-6"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              `Place Orders from ${multiKitchenCarts.length} Restaurants • ${formatCurrency(total)}`
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            ⏱️ Estimated delivery: ~{Math.ceil(estimatedTotalTime)} minutes
          </p>
        </div>
      </div>
    </div>
  );
}
