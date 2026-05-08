import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, ChevronDown, Star, Clock, ShoppingBag, Tag, HelpCircle, Leaf, Zap, SlidersHorizontal, X, Search, Navigation } from 'lucide-react';
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

const SEARCH_SUGGESTIONS = ['Pizza', 'Biryani', 'Burger', 'Chinese', 'North Indian', 'Desserts'];

// Fly-to-cart animation overlay
function CartFlyAnimation({ items }: { items: { id: string; name: string; x: number; y: number }[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[999]">
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute animate-fly-to-cart"
          style={{ left: item.x, top: item.y }}
        >
          <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
            +1
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CustomerHome() {
  const navigate = useNavigate();
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>('Select Location');
  const [locationLoading, setLocationLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'distance' | 'time'>('rating');
  // Smart Filters
  const [filterVeg, setFilterVeg] = useState(false);
  const [filterHighRating, setFilterHighRating] = useState(false);
  const [filterFastDelivery, setFilterFastDelivery] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  // Cart animation
  const [flyAnimations, setFlyAnimations] = useState<{ id: string; name: string; x: number; y: number }[]>([]);

  const user = useAuthStore((state) => state.user);
  const cartItems = useCartStore((state) => state.items);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadKitchens();
    loadBanners();
  }, []);

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await res.json();
      const addr = data.address;
      return (
        addr.suburb ||
        addr.neighbourhood ||
        addr.city_district ||
        addr.town ||
        addr.city ||
        'Current Location'
      );
    } catch {
      return 'Current Location';
    }
  };

  const handleGetLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      const label = await reverseGeocode(location.lat, location.lng);
      setLocationLabel(label);
      toast.success(`📍 Location set to ${label}`);
    } catch {
      toast.error('Location access denied. Please enable GPS.');
    } finally {
      setLocationLoading(false);
    }
  }, []);

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
      setKitchens([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBanners = async () => {
    try {
      const { data } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true })
        .limit(5);
      setBanners(data || []);
    } catch {}
  };

  const triggerCartAnimation = (e: React.MouseEvent, itemName: string) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const id = `${Date.now()}-${Math.random()}`;
    setFlyAnimations((prev) => [...prev, { id, name: itemName, x: rect.x, y: rect.y }]);
    setTimeout(() => {
      setFlyAnimations((prev) => prev.filter((a) => a.id !== id));
    }, 700);
  };

  const activeFilterCount = [filterVeg, filterHighRating, filterFastDelivery].filter(Boolean).length;

  const filteredKitchens = kitchens
    .filter((kitchen) => {
      const matchesSearch =
        !searchQuery ||
        kitchen.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kitchen.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kitchen.categories?.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = !selectedCategory || kitchen.categories?.includes(selectedCategory);
      const matchesRating = !filterHighRating || kitchen.rating >= 4.0;
      const matchesFast = !filterFastDelivery || parseInt(kitchen.delivery_time) <= 30;
      return matchesSearch && matchesCategory && matchesRating && matchesFast;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'time') return parseInt(a.delivery_time) - parseInt(b.delivery_time);
      if (sortBy === 'distance' && userLocation && a.lat && a.lng && b.lat && b.lng) {
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
        return distA - distB;
      }
      return 0;
    });

  const topRatedKitchens = kitchens.filter((k) => k.rating >= 4.0).slice(0, 6);
  const hasActiveFilters = filterVeg || filterHighRating || filterFastDelivery || selectedCategory || searchQuery;

  return (
    <div className="min-h-screen bg-[#f0f0f5] pb-20">
      {/* Cart fly animation */}
      <CartFlyAnimation items={flyAnimations} />

      {/* Top Nav - Swiggy style */}
      <div className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-white text-xl font-bold">🍔</span>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm">
              <Link to="/signup?role=kitchen_owner" className="flex items-center gap-2 font-medium hover:text-primary transition">
                <ShoppingBag className="h-4 w-4" />
                <span>Partner with us</span>
              </Link>
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
                    <span className="font-bold text-primary text-sm">{user.username?.charAt(0).toUpperCase()}</span>
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

      {/* Delivery Location + Search */}
      <header className="bg-white sticky top-[60px] z-40 border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          {/* Location bar */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🍔</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">DELIVER TO</p>
                <button
                  onClick={handleGetLocation}
                  disabled={locationLoading}
                  className="flex items-center gap-1.5 text-sm font-bold hover:text-primary transition-colors group"
                >
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="underline decoration-dotted underline-offset-2">
                    {locationLoading ? 'Detecting...' : locationLabel}
                  </span>
                  {locationLoading ? (
                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ChevronDown className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
                  )}
                </button>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGetLocation}
              disabled={locationLoading}
              className="hidden md:flex items-center gap-1.5 border-primary text-primary hover:bg-primary/5"
            >
              <Navigation className="h-4 w-4" />
              Use GPS
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for restaurants or dishes"
              className="h-12 pl-10 pr-4 text-base rounded-xl border-2 focus:border-primary shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Banners */}
      {banners.length > 0 && (
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex gap-4 overflow-x-scroll scrollbar-hide">
              {banners.map((banner) => (
                <div key={banner.id} className="flex-shrink-0 w-full md:w-[600px] rounded-2xl overflow-hidden shadow-lg cursor-pointer">
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
                      {banner.description && <p className="text-sm opacity-90">{banner.description}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category Carousel */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <h2 className="text-xl font-bold mb-4">What's on your mind?</h2>
          <div ref={categoryScrollRef} className="flex gap-4 overflow-x-scroll scrollbar-hide pb-2">
            {FOOD_CATEGORIES.map((category) => (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(selectedCategory === category.name ? null : category.name)}
                className={`flex flex-col items-center gap-2 min-w-[80px] transition-transform ${
                  selectedCategory === category.name ? 'scale-105' : 'hover:scale-105'
                }`}
              >
                <div className={`w-16 h-16 rounded-full ${category.color} flex items-center justify-center shadow-md ${
                  selectedCategory === category.name ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}>
                  <span className="text-3xl">{category.emoji}</span>
                </div>
                <span className={`text-xs font-medium text-center leading-tight ${
                  selectedCategory === category.name ? 'text-primary font-bold' : ''
                }`}>
                  {category.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Top Rated - only when not searching */}
        {!searchQuery && !selectedCategory && !hasActiveFilters && topRatedKitchens.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                Top Rated Near You
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topRatedKitchens.map((kitchen) => (
                <RestaurantCard key={kitchen.id} kitchen={kitchen} userLocation={userLocation} onCartClick={triggerCartAnimation} />
              ))}
            </div>
          </section>
        )}

        {/* Smart Filters Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-medium transition-all ${
                activeFilterCount > 0 ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Quick filter chips */}
            <button
              onClick={() => setFilterVeg(!filterVeg)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-medium transition-all ${
                filterVeg ? 'border-green-600 bg-green-50 text-green-700' : 'border-border hover:border-green-400'
              }`}
            >
              <Leaf className="h-4 w-4" />
              Pure Veg
            </button>

            <button
              onClick={() => setFilterHighRating(!filterHighRating)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-medium transition-all ${
                filterHighRating ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-border hover:border-yellow-400'
              }`}
            >
              <Star className="h-4 w-4" />
              Rating 4.0+
            </button>

            <button
              onClick={() => setFilterFastDelivery(!filterFastDelivery)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-medium transition-all ${
                filterFastDelivery ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-border hover:border-blue-400'
              }`}
            >
              <Zap className="h-4 w-4" />
              Fast Delivery (&lt;30 min)
            </button>

            {/* Sort */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border rounded-full text-sm bg-white font-medium focus:outline-none focus:border-primary"
              >
                <option value="rating">Top Rated</option>
                <option value="distance">Nearest</option>
                <option value="time">Fastest</option>
              </select>
            </div>
          </div>

          {/* Active filter summary */}
          {hasActiveFilters && (
            <div className="mt-3 pt-3 border-t flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Active:</span>
              {selectedCategory && (
                <span
                  onClick={() => setSelectedCategory(null)}
                  className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full cursor-pointer hover:bg-primary/20"
                >
                  {selectedCategory} <X className="h-3 w-3" />
                </span>
              )}
              {filterVeg && (
                <span onClick={() => setFilterVeg(false)} className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full cursor-pointer">
                  Pure Veg <X className="h-3 w-3" />
                </span>
              )}
              {filterHighRating && (
                <span onClick={() => setFilterHighRating(false)} className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full cursor-pointer">
                  4.0+ Rating <X className="h-3 w-3" />
                </span>
              )}
              {filterFastDelivery && (
                <span onClick={() => setFilterFastDelivery(false)} className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full cursor-pointer">
                  Fast Delivery <X className="h-3 w-3" />
                </span>
              )}
              <button
                onClick={() => {
                  setFilterVeg(false);
                  setFilterHighRating(false);
                  setFilterFastDelivery(false);
                  setSelectedCategory(null);
                  setSearchQuery('');
                }}
                className="text-xs text-red-500 hover:underline ml-auto"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* All Restaurants */}
        <section>
          <h2 className="text-2xl font-bold mb-4">
            {selectedCategory ? `${selectedCategory} Restaurants` : searchQuery ? `Results for "${searchQuery}"` : 'All Restaurants'}
            {filteredKitchens.length > 0 && (
              <span className="text-base font-normal text-muted-foreground ml-2">({filteredKitchens.length})</span>
            )}
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-56 bg-white rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredKitchens.length === 0 ? (
            <EmptyState
              searchQuery={searchQuery}
              onSuggestionClick={(s) => setSearchQuery(s)}
              onClear={() => {
                setSearchQuery('');
                setSelectedCategory(null);
                setFilterVeg(false);
                setFilterHighRating(false);
                setFilterFastDelivery(false);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredKitchens.map((kitchen) => (
                <RestaurantCard key={kitchen.id} kitchen={kitchen} userLocation={userLocation} onCartClick={triggerCartAnimation} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Floating Cart */}
      {cartItems.length > 0 && (
        <Link to="/customer/checkout">
          <button className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary text-white shadow-2xl flex items-center justify-center z-40 hover:scale-105 transition-transform">
            <div className="relative">
              <ShoppingBag className="h-6 w-6" />
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-400 text-black text-xs font-bold rounded-full flex items-center justify-center">
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

// ──── Empty State Component ────
function EmptyState({
  searchQuery,
  onSuggestionClick,
  onClear,
}: {
  searchQuery: string;
  onSuggestionClick: (s: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-10 text-center border shadow-sm">
      <div className="text-7xl mb-4">🔍</div>
      <h3 className="text-xl font-bold mb-2 text-foreground">
        {searchQuery ? `No results for "${searchQuery}"` : 'No restaurants found'}
      </h3>
      <p className="text-muted-foreground mb-6">
        {searchQuery
          ? 'Try a different keyword or browse categories below'
          : 'Try adjusting your filters or search for something else'}
      </p>

      {/* Suggestions */}
      <div className="mb-6">
        <p className="text-sm font-medium text-muted-foreground mb-3">Try searching for:</p>
        <div className="flex gap-2 flex-wrap justify-center">
          {SEARCH_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSuggestionClick(s)}
              className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={onClear} variant="outline" className="border-primary text-primary hover:bg-primary/5">
        <X className="h-4 w-4 mr-2" />
        Clear All Filters
      </Button>
    </div>
  );
}

// ──── Restaurant Card ────
function RestaurantCard({
  kitchen,
  userLocation,
  onCartClick,
}: {
  kitchen: Kitchen;
  userLocation: { lat: number; lng: number } | null;
  onCartClick: (e: React.MouseEvent, name: string) => void;
}) {
  const distance =
    userLocation && kitchen.lat && kitchen.lng
      ? calculateDistance(userLocation.lat, userLocation.lng, kitchen.lat, kitchen.lng)
      : null;

  const isFast = parseInt(kitchen.delivery_time) <= 30;

  return (
    <Link to={`/customer/kitchen/${kitchen.id}`}>
      <div className="bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-md transition-all group">
        <div className="relative h-44">
          {kitchen.image_url ? (
            <img
              src={kitchen.image_url}
              alt={kitchen.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center">
              <span className="text-6xl">🍽️</span>
            </div>
          )}

          {/* Overlay badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {isFast && (
              <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Fast
              </span>
            )}
          </div>

          {/* Discount tag */}
          <div className="absolute bottom-3 left-3 bg-[#ff5200] text-white text-xs font-bold px-2 py-1 rounded-lg">
            40% OFF upto ₹120
          </div>

          {!kitchen.is_open && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-bold text-lg tracking-wide">CLOSED</span>
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-bold text-base mb-1 truncate">{kitchen.name}</h3>

          <div className="flex items-center gap-3 text-sm mb-2">
            <div className="flex items-center gap-1 bg-green-600 text-white px-2 py-0.5 rounded-md">
              <Star className="h-3 w-3 fill-white" />
              <span className="font-bold text-xs">{kitchen.rating.toFixed(1)}</span>
            </div>
            <span className="text-muted-foreground">•</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{kitchen.delivery_time}</span>
            </div>
            {distance && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{formatDistance(distance)}</span>
                </div>
              </>
            )}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-1">
            {kitchen.categories?.join(', ') || kitchen.description}
          </p>

          {/* Bottom offer row */}
          <div className="mt-3 pt-3 border-t flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <span className="text-xs text-green-600 font-medium">Flat 10% off with bank offers</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
