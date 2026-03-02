import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Star, Clock, MapPin, Plus, Minus, ShoppingCart, Info, AlertTriangle, Navigation } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { supabase } from '../../lib/supabase';
import { Kitchen, MenuItem, Address } from '../../types';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, calculateDistance, formatDistance } from '../../lib/utils';
import { toast } from 'sonner';

export default function KitchenDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { items, addItem, updateQuantity, kitchenId, getTotal } = useCartStore();
  
  // Delivery radius validation
  const [userAddress, setUserAddress] = useState<Address | null>(null);
  const [distanceFromKitchen, setDistanceFromKitchen] = useState<number | null>(null);
  const [isOutOfRange, setIsOutOfRange] = useState(false);
  const [nearbyKitchens, setNearbyKitchens] = useState<Kitchen[]>([]);

  useEffect(() => {
    loadKitchenData();
    if (user) {
      loadUserDefaultAddress();
    }
  }, [id, user]);

  useEffect(() => {
    if (kitchen && userAddress && kitchen.lat && kitchen.lng && userAddress.lat && userAddress.lng) {
      const distance = calculateDistance(
        kitchen.lat,
        kitchen.lng,
        userAddress.lat,
        userAddress.lng
      );
      setDistanceFromKitchen(distance);
      
      const deliveryRadius = kitchen.delivery_radius || 10;
      if (distance > deliveryRadius) {
        setIsOutOfRange(true);
        loadNearbyKitchens(userAddress.lat, userAddress.lng, deliveryRadius);
      } else {
        setIsOutOfRange(false);
      }
    }
  }, [kitchen, userAddress]);

  const loadKitchenData = async () => {
    try {
      const [kitchenRes, menuRes] = await Promise.all([
        supabase.from('kitchens').select('*').eq('id', id).single(),
        supabase.from('menu_items').select('*').eq('kitchen_id', id).eq('is_available', true),
      ]);

      if (kitchenRes.error) throw kitchenRes.error;
      if (menuRes.error) throw menuRes.error;

      setKitchen(kitchenRes.data);
      setMenuItems(menuRes.data || []);
    } catch (error: any) {
      toast.error('Failed to load restaurant');
      navigate('/customer');
    } finally {
      setLoading(false);
    }
  };

  const loadUserDefaultAddress = async () => {
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_default', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setUserAddress(data);
    } catch (error: any) {
      console.error('Failed to load user address:', error);
    }
  };

  const loadNearbyKitchens = async (lat: number, lng: number, maxRadius: number) => {
    try {
      const { data, error } = await supabase
        .from('kitchens')
        .select('*')
        .eq('is_approved', true)
        .eq('is_open', true)
        .neq('id', id);

      if (error) throw error;

      const kitchensWithDistance = (data || [])
        .map((k) => ({
          ...k,
          distance: k.lat && k.lng ? calculateDistance(lat, lng, k.lat, k.lng) : null,
        }))
        .filter((k) => k.distance !== null && k.distance <= (k.delivery_radius || 10))
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, 3);

      setNearbyKitchens(kitchensWithDistance);
    } catch (error: any) {
      console.error('Failed to load nearby kitchens:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!kitchen) {
    return null;
  }

  const categories = Array.from(new Set(menuItems.map((item) => item.category)));
  const filteredItems = selectedCategory
    ? menuItems.filter((item) => item.category === selectedCategory)
    : menuItems;

  const cartItemsForKitchen = kitchenId === kitchen.id ? items : [];
  const cartTotal = getTotal();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Banner Image */}
      <div className="relative h-64 bg-gradient-to-br from-orange-400 to-pink-400">
        {kitchen.image_url ? (
          <img src={kitchen.image_url} alt={kitchen.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-8xl">🍽️</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Back Button */}
        <button
          onClick={() => navigate('/customer')}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Restaurant Info */}
      <div className="bg-card -mt-6 mx-4 rounded-t-3xl shadow-xl relative z-10">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold mb-2">{kitchen.name}</h1>
          <p className="text-muted-foreground mb-4 line-clamp-2">{kitchen.description}</p>
          
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5 bg-success text-white px-3 py-1.5 rounded-xl">
              <Star className="h-4 w-4 fill-white" />
              <span className="font-bold">{kitchen.rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{kitchen.delivery_time}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                {kitchen.address}
              </span>
            </div>
          </div>

          {!kitchen.is_open && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Currently Closed</span>
            </div>
          )}

          {/* Delivery Radius Warning */}
          {isOutOfRange && distanceFromKitchen && (
            <div className="mt-3 space-y-3">
              <Alert className="border-destructive/50 bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <AlertDescription className="mt-2">
                  <p className="font-bold text-destructive mb-2">
                    ⚠️ Out of Delivery Range
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">
                    This restaurant delivers within <strong>{kitchen.delivery_radius || 10} km</strong>
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your location is <strong>{distanceFromKitchen.toFixed(1)} km</strong> away
                  </p>
                  <div className="flex gap-2">
                    <Link to="/customer/addresses">
                      <Button size="sm" variant="outline" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        Change Address
                      </Button>
                    </Link>
                    {nearbyKitchens.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          const element = document.getElementById('nearby-alternatives');
                          element?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        View Alternatives
                      </Button>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {/* Nearby Alternatives */}
              {nearbyKitchens.length > 0 && (
                <div id="nearby-alternatives" className="bg-card border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-primary" />
                    Available Nearby ({nearbyKitchens.length})
                  </h3>
                  <div className="space-y-2">
                    {nearbyKitchens.map((nearby) => {
                      const distance = nearby.distance as number;
                      return (
                        <Link
                          key={nearby.id}
                          to={`/customer/kitchen/${nearby.id}`}
                          className="block p-3 border rounded-lg hover:bg-muted transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-orange-400 to-pink-400 flex-shrink-0">
                              {nearby.image_url ? (
                                <img
                                  src={nearby.image_url}
                                  alt={nearby.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-lg">🍽️</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm">{nearby.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {formatDistance(distance)}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  <Star className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />
                                  {nearby.rating.toFixed(1)}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Delivers in</p>
                              <p className="text-xs font-semibold">{nearby.delivery_time}</p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Distance & Delivery Fee Info */}
          {!isOutOfRange && distanceFromKitchen !== null && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700">
                  <Navigation className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {formatDistance(distanceFromKitchen)} away
                  </span>
                </div>
                <div className="text-sm text-green-600">
                  {distanceFromKitchen <= 2 ? (
                    <span className="font-semibold">🎉 Free Delivery!</span>
                  ) : (
                    <span>Delivery: {formatCurrency(20 + Math.ceil(distanceFromKitchen - 2) * 8)}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Category Tabs */}
        {categories.length > 0 && (
          <div className="sticky top-0 z-20 bg-card border-b">
            <div className="px-6 py-3 overflow-x-auto no-scrollbar">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                    !selectedCategory
                      ? 'bg-primary text-white shadow-lg'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  All Items
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                      selectedCategory === category
                        ? 'bg-primary text-white shadow-lg'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <div className="p-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No items available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const cartItem = cartItemsForKitchen.find((ci) => ci.menuItem.id === item.id);
                const quantity = cartItem?.quantity || 0;

                return (
                  <div
                    key={item.id}
                    className="bg-background rounded-2xl p-4 border card-shadow hover:card-shadow-lg transition-shadow"
                  >
                    <div className="flex gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Veg/Non-Veg Badge */}
                        <div className="mb-2">
                          {item.is_veg ? (
                            <div className="veg-badge" />
                          ) : (
                            <div className="non-veg-badge" />
                          )}
                        </div>

                        <h3 className="font-bold text-base mb-1 line-clamp-1">{item.name}</h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <p className="text-lg font-bold text-primary">{formatCurrency(item.price)}</p>
                      </div>

                      {/* Image & Add Button */}
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-orange-200 to-pink-200 flex items-center justify-center">
                              <span className="text-2xl">{item.is_veg ? '🥗' : '🍗'}</span>
                            </div>
                          )}
                        </div>

                        {/* Add/Update Quantity */}
                        {!kitchen.is_open ? (
                          <Badge variant="secondary" className="text-xs">Closed</Badge>
                        ) : quantity === 0 ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              if (!user) {
                                toast.error('Please login to add items');
                                navigate('/login');
                                return;
                              }
                              addItem(item, kitchen.id);
                              toast.success(`${item.name} added!`);
                            }}
                            className="gradient-primary rounded-lg font-bold shadow-md px-6"
                          >
                            ADD
                          </Button>
                        ) : (
                          <div className="flex items-center gap-0 bg-primary text-white rounded-lg shadow-lg">
                            <button
                              onClick={() => updateQuantity(item.id, quantity - 1)}
                              className="px-3 py-1.5 hover:bg-primary/90 transition-colors"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="font-bold min-w-[30px] text-center">{quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, quantity + 1)}
                              className="px-3 py-1.5 hover:bg-primary/90 transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Cart Footer */}
      {cartItemsForKitchen.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-2xl z-50 safe-area-bottom">
          <div className="container mx-auto px-4 py-4">
            <button
              onClick={() => navigate('/customer/checkout')}
              className="w-full h-14 gradient-primary rounded-xl flex items-center justify-between px-6 shadow-lg hover:shadow-xl transition-all"
            >
              <div className="flex items-center gap-3 text-white">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="font-bold">{cartItemsForKitchen.length}</span>
                </div>
                <span className="text-sm font-medium">
                  {cartItemsForKitchen.length} {cartItemsForKitchen.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-white">
                <div className="text-right">
                  <p className="text-lg font-bold">{formatCurrency(cartTotal)}</p>
                  <p className="text-xs opacity-90">Total</p>
                </div>
                <ShoppingCart className="h-5 w-5" />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
