import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ChevronDown, Star, Clock, Percent, TrendingUp, ShoppingBag, Tag, HelpCircle } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import BottomNav from '../../components/layout/BottomNav';
import { supabase } from '../../lib/supabase';
import { Kitchen, Banner } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { formatCurrency, getCurrentLocation, calculateDistance, formatDistance } from '../../lib/utils';

import { toast } from 'sonner';

const FOOD_CATEGORIES = [
  { name: 'Pizza', emoji: '🍕', color: 'bg-red-50' },
  { name: 'Biryani', emoji: '🍛', color: 'bg-orange-50' },
  { name: 'Burger', emoji: '🍔', color: 'bg-yellow-50' },
  { name: 'Chinese', emoji: '🥢', color: 'bg-red-50' },
  { name: 'North Indian', emoji: '🫓', color: 'bg-orange-50' },
  { name: 'South Indian', emoji: '🥥', color: 'bg-green-50' },
  { name: 'Desserts', emoji: '🍰', color: 'bg-pink-50' },
  { name: 'Beverages', emoji: '🥤', color: 'bg-blue-50' },
  { name: 'Cloud Kitchen', emoji: '☁️', color: 'bg-purple-50' },
];

export default function CustomerHome() {
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filterVeg, setFilterVeg] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState<'rating' | 'distance' | 'time'>('rating');
  const [locationLoading, setLocationLoading] = useState(false);
  const user = useAuthStore((state) => state.user);
  const cartItems = useCartStore((state) => state.items);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const bannerScrollRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    loadKitchens();
    loadBanners();
    loadUserLocation();
  }, []);

  const loadUserLocation = async () => {
    setLocationLoading(true);
    try {
      toast.loading('Getting your location...');
      const location = await getCurrentLocation();
      setUserLocation(location);
      toast.dismiss();
      toast.success(`Location updated: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);
      
      // Save location to user's default address if logged in
      if (user) {
        try {
          const { data: existingAddress } = await supabase
            .from('addresses')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_default', true)
            .single();

          if (existingAddress) {
            await supabase
              .from('addresses')
              .update({
                lat: location.lat,
                lng: location.lng,
                address_line: `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}`,
              })
              .eq('id', existingAddress.id);
          } else {
            await supabase.from('addresses').insert({
              user_id: user.id,
              label: 'Current Location',
              address_line: `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}`,
              lat: location.lat,
              lng: location.lng,
              is_default: true,
            });
          }
        } catch (dbError) {
          console.error('Failed to save location to database:', dbError);
        }
      }
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || 'Failed to get location');
      console.error('Location error:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const loadKitchens = async () => {
    try {
      const { data, error } = await supabase
        .from('kitchens')
        .select('*')
        .eq('is_approved', true)
        .order('rating', { ascending: false });

      if (error) throw error;
      setKitchens(data || []);
    } catch (error: any) {
      console.error('Failed to load kitchens:', error);
      toast.error('Failed to load restaurants');
      setKitchens([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true })
        .limit(5);

      if (error) throw error;
      setBanners(data || []);
    } catch (error: any) {
      console.error('Failed to load banners:', error);
    }
  };

  const filteredKitchens = kitchens
    .filter((kitchen) => {
      const matchesSearch =
        kitchen.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kitchen.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || kitchen.categories?.includes(selectedCategory);
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'time') {
        const timeA = parseInt(a.delivery_time.split('-')[0]);
        const timeB = parseInt(b.delivery_time.split('-')[0]);
        return timeA - timeB;
      }
      if (sortBy === 'distance' && userLocation && a.lat && a.lng && b.lat && b.lng) {
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
        return distA - distB;
      }
      return 0;
    });

  const topRatedKitchens = kitchens.filter((k) => k.rating >= 4.0).slice(0, 6);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top Navigation Bar - Swiggy Style */}
      <div className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo & Other Dropdown */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-white text-xl font-bold">🍔</span>
                </div>
                <button className="flex items-center gap-1 text-sm font-semibold hover:text-primary">
                  <span>Other</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Right Menu */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              <Link to="/signup?role=kitchen_owner" className="flex items-center gap-2 font-medium hover:text-primary transition">
                <ShoppingBag className="h-4 w-4" />
                <span>Swiggy Corporate</span>
              </Link>
              <button className="flex items-center gap-2 font-medium hover:text-primary transition">
                <span>Search</span>
              </button>
              <button className="flex items-center gap-2 font-medium hover:text-primary transition relative">
                <Tag className="h-4 w-4" />
                <span>Offers</span>
                <span className="absolute -top-1 -right-1 bg-yellow-400 text-[8px] font-bold px-1 rounded text-black">NEW</span>
              </button>
              <button className="flex items-center gap-2 font-medium hover:text-primary transition">
                <HelpCircle className="h-4 w-4" />
                <span>Help</span>
              </button>
              <Link to={user ? '/customer/profile' : '/login'} className="flex items-center gap-2 font-medium hover:text-primary transition">
                {user ? (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary">{user.username?.charAt(0).toUpperCase()}</span>
                  </div>
                ) : (
                  <span>Sign In</span>
                )}
              </Link>
              {cartItems.length > 0 && (
                <Link to="/customer/checkout" className="flex items-center gap-2 font-medium hover:text-primary transition relative">
                  <ShoppingBag className="h-4 w-4" />
                  <span>Cart</span>
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {cartItems.length}
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Header with Delivery Location */}
      <header className="bg-card sticky top-[64px] z-40 border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          {/* Delivery Location Bar - Swiggy Style */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🍔</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-xs font-bold text-orange-600 uppercase tracking-wide">DELIVER TO</span>
                </div>
                <button 
                  onClick={loadUserLocation}
                  disabled={locationLoading}
                  className="flex items-center gap-1.5 text-sm font-bold hover:text-primary transition-colors group disabled:opacity-50"
                >
                  {locationLoading ? (
                    <>
                      <span className="underline decoration-dotted underline-offset-2">Getting location...</span>
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    </>
                  ) : (
                    <>
                      <span className="underline decoration-dotted underline-offset-2">
                        {userLocation 
                          ? `📍 ${userLocation.lat.toFixed(2)}, ${userLocation.lng.toFixed(2)}` 
                          : '📍 Get Current Location'}
                      </span>
                      <ChevronDown className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for restaurants or dishes"
              className="h-12 pl-4 pr-4 text-base rounded-xl border-2 focus:border-primary shadow-sm"
            />
          </div>
        </div>
      </header>

      {/* Banners Section */}
      {banners.length > 0 && (
        <div className="bg-card border-b">
          <div className="container mx-auto px-4 py-4">
            <div ref={bannerScrollRef} className="flex gap-4 overflow-x-scroll scrollbar-hide">
              {banners.map((banner) => (
                <div key={banner.id} className="flex-shrink-0 w-full md:w-[600px] rounded-2xl overflow-hidden shadow-lg cursor-pointer card-hover">
                  <div className="relative h-48 bg-gradient-to-r from-orange-400 to-pink-400">
                    {banner.image_url ? (
                      <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-6xl">🎉</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <h3 className="text-2xl font-bold mb-1">{banner.title}</h3>
                      {banner.description && (
                        <p className="text-sm opacity-90">{banner.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category Carousel */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">What's on your mind?</h2>
          </div>
          <div ref={categoryScrollRef} className="flex gap-4 overflow-x-scroll scrollbar-hide pb-2">
            {FOOD_CATEGORIES.map((category) => (
              <button
                key={category.name}
                onClick={() =>
                  setSelectedCategory(selectedCategory === category.name ? null : category.name)
                }
                className={`flex flex-col items-center gap-2 min-w-[80px] transition-transform ${
                  selectedCategory === category.name ? 'scale-105' : 'hover:scale-105'
                }`}
              >
                <div
                  className={`w-16 h-16 rounded-full ${category.color} flex items-center justify-center shadow-md ${
                    selectedCategory === category.name ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                >
                  <span className="text-3xl">{category.emoji}</span>
                </div>
                <span className={`text-xs font-medium text-center ${
                  selectedCategory === category.name ? 'text-primary font-semibold' : 'text-foreground'
                }`}>
                  {category.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Top Rated Section */}
        {!searchQuery && !selectedCategory && topRatedKitchens.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Top restaurant chains
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topRatedKitchens.map((kitchen) => (
                <RestaurantCard key={kitchen.id} kitchen={kitchen} userLocation={userLocation} />
              ))}
            </div>
          </section>
        )}

        {/* Filter & Sort */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 border rounded-lg text-sm bg-card"
            >
              <option value="rating">Rating</option>
              <option value="distance">Distance</option>
              <option value="time">Delivery Time</option>
            </select>
          </div>
        </div>

        {/* All Restaurants */}
        <section>
          <h2 className="text-2xl font-bold mb-4">
            {selectedCategory ? `${selectedCategory} Restaurants` : 'All Restaurants'}
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 bg-muted rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredKitchens.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <span className="text-5xl">🔍</span>
              </div>
              <h3 className="text-xl font-bold mb-2">No matches found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your search or filters</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredKitchens.map((kitchen) => (
                <RestaurantCard key={kitchen.id} kitchen={kitchen} userLocation={userLocation} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Floating Cart Badge */}
      {cartItems.length > 0 && (
        <Link to="/customer/checkout">
          <button className="fixed bottom-20 right-4 w-14 h-14 rounded-full gradient-primary text-white shadow-2xl flex items-center justify-center z-40 animate-bounce">
            <div className="relative">
              <ShoppingBag className="h-6 w-6" />
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-accent text-white text-xs font-bold rounded-full flex items-center justify-center">
                {cartItems.length}
              </span>
            </div>
          </button>
        </Link>
      )}

      <BottomNav />
    </div>
  );
}

function PromotedKitchenCard({
  kitchen,
  userLocation,
}: {
  kitchen: Kitchen;
  userLocation: { lat: number; lng: number } | null;
}) {
  const distance =
    userLocation && kitchen.lat && kitchen.lng
      ? calculateDistance(userLocation.lat, userLocation.lng, kitchen.lat, kitchen.lng)
      : null;

  return (
    <Link to={`/customer/kitchen/${kitchen.id}`}>
      <div className="bg-card rounded-2xl overflow-hidden border card-shadow-lg card-hover">
        <div className="flex gap-4 p-4">
          <div className="relative w-32 h-32 rounded-xl overflow-hidden flex-shrink-0">
            {kitchen.image_url ? (
              <img src={kitchen.image_url} alt={kitchen.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center">
                <span className="text-4xl">🍽️</span>
              </div>
            )}
            <div className="discount-badge">50% OFF</div>
            {!kitchen.is_open && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-sm font-bold">CLOSED</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg mb-1 truncate">{kitchen.name}</h3>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{kitchen.description}</p>
            <div className="flex items-center gap-3 text-sm mb-2">
              <div className="flex items-center gap-1 bg-success text-white px-2 py-0.5 rounded-lg">
                <Star className="h-3 w-3 fill-white" />
                <span className="font-semibold">{kitchen.rating.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{kitchen.delivery_time}</span>
              </div>
              {distance && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{formatDistance(distance)}</span>
                </div>
              )}
            </div>
            {kitchen.categories && kitchen.categories.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {kitchen.categories.slice(0, 2).map((cat) => (
                  <Badge key={cat} variant="secondary" className="text-xs">
                    {cat}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function RestaurantCard({
  kitchen,
  userLocation,
}: {
  kitchen: Kitchen;
  userLocation: { lat: number; lng: number } | null;
}) {
  const distance =
    userLocation && kitchen.lat && kitchen.lng
      ? calculateDistance(userLocation.lat, userLocation.lng, kitchen.lat, kitchen.lng)
      : null;

  return (
    <Link to={`/customer/kitchen/${kitchen.id}`}>
      <div className="bg-card rounded-2xl overflow-hidden border card-shadow card-hover">
        <div className="relative h-40">
          {kitchen.image_url ? (
            <img src={kitchen.image_url} alt={kitchen.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center">
              <span className="text-5xl">🍽️</span>
            </div>
          )}
          {!kitchen.is_open && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-bold">CLOSED</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-bold text-lg mb-1 truncate">{kitchen.name}</h3>
          <div className="flex items-center gap-3 text-sm mb-2">
            <div className="flex items-center gap-1 bg-success text-white px-2 py-0.5 rounded-lg">
              <Star className="h-3 w-3 fill-white" />
              <span className="font-semibold">{kitchen.rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{kitchen.delivery_time}</span>
            </div>
            {distance && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{formatDistance(distance)}</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">{kitchen.description}</p>
        </div>
      </div>
    </Link>
  );
}


