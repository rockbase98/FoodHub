import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Plus, Trash2, Loader2, Tag, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { Address, Kitchen, Coupon } from '../../types';
import { formatCurrency, calculateDeliveryFee, calculateDistance, getCurrentLocation } from '../../lib/utils';
import { toast } from 'sonner';

export default function Checkout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { items, kitchenId, clearCart, updateQuantity, getTotal } = useCartStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: '', address_line: '' });
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'upi'>('cod');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Coupon states
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [showCoupons, setShowCoupons] = useState(false);

  useEffect(() => {
    if (items.length === 0 || !kitchenId) {
      navigate('/customer');
      return;
    }
    loadAddresses();
    loadKitchen();
    loadCoupons();
  }, [kitchenId]);

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

  const loadKitchen = async () => {
    try {
      const { data, error } = await supabase
        .from('kitchens')
        .select('*')
        .eq('id', kitchenId)
        .single();

      if (error) throw error;
      setKitchen(data);
    } catch (error: any) {
      toast.error('Failed to load kitchen details');
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

    if (!kitchen) {
      toast.error('Kitchen information not available');
      return;
    }

    setLoading(true);

    try {
      const address = addresses.find((addr) => addr.id === selectedAddress);
      if (!address) throw new Error('Address not found');

      const subtotal = getTotal();
      const distance = kitchen.lat && kitchen.lng && address.lat && address.lng
        ? calculateDistance(kitchen.lat, kitchen.lng, address.lat, address.lng)
        : 5;
      const deliveryFee = calculateDeliveryFee(distance);
      const discount = calculateDiscount();
      const total = subtotal + deliveryFee - discount;

      const orderItems = items.map((item) => ({
        menu_item_id: item.menuItem.id,
        name: item.menuItem.name,
        price: item.menuItem.price,
        quantity: item.quantity,
        is_veg: item.menuItem.is_veg,
      }));

      const { data: orderNumber } = await supabase.rpc('generate_order_number');

      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: user?.id,
          kitchen_id: kitchenId,
          address_id: selectedAddress,
          items: orderItems,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          status: 'pending',
          payment_method: paymentMethod,
          payment_status: 'pending',
          delivery_instructions: deliveryInstructions || null,
        })
        .select()
        .single();

      if (error) throw error;

      clearCart();
      toast.success('Order placed successfully!');
      navigate(`/customer/track/${order.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order');
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  const subtotal = getTotal();
  const selectedAddr = addresses.find((addr) => addr.id === selectedAddress);
  const distance = kitchen && kitchen.lat && kitchen.lng && selectedAddr?.lat && selectedAddr?.lng
    ? calculateDistance(kitchen.lat, kitchen.lng, selectedAddr.lat, selectedAddr.lng)
    : 5;
  const deliveryFee = calculateDeliveryFee(distance);
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
          <h1 className="text-xl font-bold">Checkout</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        {/* Cart Items */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="font-semibold text-lg mb-4">Order Items</h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.menuItem.id} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{item.menuItem.name}</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(item.menuItem.price)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-muted rounded px-2 py-1">
                    <button onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <span className="font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}>
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="font-semibold min-w-[80px] text-right">
                    {formatCurrency(item.menuItem.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))}
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
                  const coupon = coupons.find(c => c.code === couponCode);
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
                    <Button size="sm" variant="outline">Apply</Button>
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
            <Button size="sm" variant="outline" onClick={() => setShowAddressForm(!showAddressForm)}>
              <Plus className="h-4 w-4 mr-1" /> Add New
            </Button>
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
            placeholder="E.g., Ring the bell twice, Leave at door..."
          />
        </div>

        {/* Bill Details */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="font-semibold text-lg mb-4">Bill Details</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span>{formatCurrency(deliveryFee)}</span>
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
              `Place Order • ${formatCurrency(total)}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
