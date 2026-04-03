import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Search, Star, Clock, ChevronRight,
  ShoppingBag, Flame, TrendingUp, Leaf, X, SlidersHorizontal,
  Navigation2, ChevronDown
} from 'lucide-react';
import NotificationBell from '../../components/NotificationBell';
import { supabase } from '../../lib/supabase';
import { Kitchen, Banner } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import {
  formatCurrency, getCurrentLocation, calculateDistance, formatDistance
} from '../../lib/utils';
import { toast } from 'sonner';

/* ─── Category config ────────────────────────────────────────── */
const CATEGORIES = [
  { name: 'Pizza',        emoji: '🍕', bg: 'bg-red-50',    border: 'border-red-100'   },
  { name: 'Burger',       emoji: '🍔', bg: 'bg-yellow-50', border: 'border-yellow-100' },
  { name: 'Biryani',      emoji: '🍛', bg: 'bg-orange-50', border: 'border-orange-100' },
  { name: 'Chinese',      emoji: '🥢', bg: 'bg-red-50',    border: 'border-red-100'   },
  { name: 'North Indian', emoji: '🫓', bg: 'bg-amber-50',  border: 'border-amber-100' },
  { name: 'South Indian', emoji: '🥥', bg: 'bg-green-50',  border: 'border-green-100' },
  { name: 'Desserts',     emoji: '🍰', bg: 'bg-pink-50',   border: 'border-pink-100'  },
  { name: 'Beverages',    emoji: '🥤', bg: 'bg-blue-50',   border: 'border-blue-100'  },
  { name: 'Healthy',      emoji: '🥗', bg: 'bg-green-50',  border: 'border-green-100' },
  { name: 'Rolls',        emoji: '🌯', bg: 'bg-yellow-50', border: 'border-yellow-100' },
];

/* ─── Fallback banner data (shows when DB has no banners) ──── */
const FALLBACK_BANNERS = [
  {
    id: '1', title: '50% OFF on First Order', description: 'Use code WELCOME50 at checkout',
    image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
    gradient: 'from-orange-600 to-red-500',
  },
  {
    id: '2', title: 'Free Delivery Today!', description: 'On orders above ₹199',
    image_url: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&q=80',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: '3', title: 'Biryani Festival', description: 'Best biryanis starting ₹99',
    image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80',
    gradient: 'from-amber-500 to-orange-600',
  },
];

type SortKey = 'rating' | 'distance' | 'time';

/* ══════════════════════════════════════════════════════════════ */
export default function CustomerHome() {
  const navigate = useNavigate();
  const user    = useAuthStore((s) => s.user);
  const { multiKitchenCarts, items: singleItems } = useCartStore();

  const [kitchens,      setKitchens]      = useState<Kitchen[]>([]);
  const [banners,       setBanners]       = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [activeSearch,  setActiveSearch]  = useState(false);
  const [selectedCat,   setSelectedCat]   = useState<string | null>(null);
  const [sortBy,        setSortBy]        = useState<SortKey>('rating');
  const [vegOnly,       setVegOnly]       = useState(false);
  const [userLocation,  setUserLocation]  = useState<{lat:number;lng:number}|null>(null);
  const [locLoading,    setLocLoading]    = useState(false);
  const [locLabel,      setLocLabel]      = useState('Detecting location…');
  const [activeBanner,  setActiveBanner]  = useState(0);
  const [showSort,      setShowSort]      = useState(false);

  const bannerRef   = useRef<HTMLDivElement>(null);
  const searchRef   = useRef<HTMLInputElement>(null);
  const bannerTimer = useRef<ReturnType<typeof setInterval>>();

  /* Total cart items across single + multi carts */
  const totalCart =
    multiKitchenCarts.reduce((s, c) => s + c.items.reduce((ss, i) => ss + i.quantity, 0), 0) +
    singleItems.reduce((s, i) => s + i.quantity, 0);

  /* ── Load data on mount ── */
  useEffect(() => {
    loadKitchens();
    loadBanners();
    fetchLocation();
  }, []);

  /* ── Banner auto-scroll ── */
  useEffect(() => {
    const slides = banners.length || FALLBACK_BANNERS.length;
    if (slides < 2) return;
    bannerTimer.current = setInterval(() => {
      setActiveBanner((p) => (p + 1) % slides);
    }, 3500);
    return () => clearInterval(bannerTimer.current);
  }, [banners]);

  /* ── Scroll banner strip when activeBanner changes ── */
  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    const child = el.children[activeBanner] as HTMLElement;
    if (child) child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeBanner]);

  /* ─── Fetch helpers ─────────────────────────────────────────── */
  const loadKitchens = async () => {
    try {
      const { data, error } = await supabase
        .from('kitchens').select('*').eq('is_approved', true)
        .order('rating', { ascending: false });
      if (error) throw error;
      setKitchens(data || []);
    } catch { toast.error('Failed to load restaurants'); }
    finally { setLoading(false); }
  };

  const loadBanners = async () => {
    try {
      const { data } = await supabase
        .from('banners').select('*').eq('is_active', true)
        .order('priority', { ascending: true }).limit(5);
      if (data && data.length > 0) setBanners(data);
    } catch { /* use fallback */ }
  };

  const fetchLocation = async () => {
    setLocLoading(true);
    try {
      const loc = await getCurrentLocation();
      setUserLocation(loc);
      setLocLabel(`${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}`);

      if (user) {
        const { data: existing } = await supabase
          .from('addresses').select('id').eq('user_id', user.id).eq('is_default', true).single();
        if (existing) {
          await supabase.from('addresses').update({ lat: loc.lat, lng: loc.lng })
            .eq('id', existing.id);
        }
      }
    } catch {
      setLocLabel('Add delivery address');
    } finally {
      setLocLoading(false);
    }
  };

  /* ─── Filtered + sorted kitchens ────────────────────────────── */
  const filtered = kitchens
    .filter((k) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        k.name.toLowerCase().includes(q) ||
        k.description?.toLowerCase().includes(q) ||
        k.categories?.some((c) => c.toLowerCase().includes(q));
      const matchCat = !selectedCat || k.categories?.includes(selectedCat);
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      if (sortBy === 'rating')   return b.rating - a.rating;
      if (sortBy === 'time')     return parseInt(a.delivery_time) - parseInt(b.delivery_time);
      if (sortBy === 'distance' && userLocation && a.lat && b.lat)
        return calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng) -
               calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
      return 0;
    });

  const featured = kitchens.filter((k) => k.rating >= 4.2 && k.is_open).slice(0, 6);
  const slides   = banners.length > 0 ? banners : FALLBACK_BANNERS;

  /* ══════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#f5f5f5]">

      {/* ══ STICKY HEADER ══════════════════════════════════════════ */}
      <header className="mobile-header bg-white z-40 border-b">

        {/* Location bar */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">
              DELIVER TO
            </p>
            <button
              onClick={fetchLocation}
              disabled={locLoading}
              className="flex items-center gap-1 tap-highlight max-w-full"
            >
              <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="text-sm font-bold truncate max-w-[180px]">
                {locLoading ? 'Getting location…' : locLabel}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            </button>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Notification bell (only for logged-in customers) */}
            {user && <NotificationBell />}

            {/* Profile pill */}
            <Link
              to={user ? '/customer/profile' : '/login'}
              className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center"
            >
              {user ? (
                <span className="text-sm font-bold text-primary">
                  {user.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              ) : (
                <span className="text-xs font-bold text-primary">In</span>
              )}
            </Link>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3 pt-1">
          <div
            className="flex items-center gap-2.5 bg-[#f3f3f3] rounded-xl px-3.5 h-11 border border-transparent focus-within:border-primary/30 focus-within:bg-white transition-all"
            onClick={() => { setActiveSearch(true); searchRef.current?.focus(); }}
          >
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setActiveSearch(true)}
              onBlur={() => !searchQuery && setActiveSearch(false)}
              placeholder="Search restaurants or dishes…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground font-medium"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setActiveSearch(false); }}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ══ SCROLLABLE CONTENT ═════════════════════════════════════ */}
      <div className="pb-32">

        {/* ── BANNER CAROUSEL ─────────────────────────────────── */}
        {!activeSearch && !searchQuery && (
          <div className="bg-white pt-2 pb-3">
            <div
              ref={bannerRef}
              className="flex gap-3 px-4 overflow-x-auto no-scrollbar snap-x snap-mandatory"
            >
              {slides.map((banner, idx) => (
                <div
                  key={banner.id}
                  onClick={() => setActiveBanner(idx)}
                  className="flex-shrink-0 w-[calc(100%-2rem)] snap-center rounded-2xl overflow-hidden relative cursor-pointer shadow-md"
                  style={{ height: 148 }}
                >
                  {banner.image_url ? (
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-r ${banner.gradient || 'from-orange-500 to-red-500'}`} />
                  )}
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  {/* Text */}
                  <div className="absolute bottom-0 left-0 right-0 p-3.5">
                    <p className="text-white font-bold text-base leading-tight">{banner.title}</p>
                    {banner.description && (
                      <p className="text-white/80 text-xs mt-0.5">{banner.description}</p>
                    )}
                  </div>
                  {/* Discount pill */}
                  <div className="absolute top-3 right-3 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                    LIMITED
                  </div>
                </div>
              ))}
            </div>

            {/* Dot indicators */}
            <div className="flex justify-center gap-1.5 mt-2.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveBanner(i)}
                  className={`rounded-full transition-all duration-200 ${
                    i === activeBanner
                      ? 'w-5 h-1.5 bg-primary'
                      : 'w-1.5 h-1.5 bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── CATEGORY CHIPS ───────────────────────────────────── */}
        {!searchQuery && (
          <div className="bg-white mt-2 py-3 border-y">
            <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar">
              {/* All chip */}
              <button
                onClick={() => setSelectedCat(null)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all tap-highlight ${
                  !selectedCat
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-foreground border-border'
                }`}
              >
                🌟 All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCat(selectedCat === cat.name ? null : cat.name)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all tap-highlight ${
                    selectedCat === cat.name
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : `${cat.bg} text-foreground ${cat.border}`
                  }`}
                >
                  <span>{cat.emoji}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── FEATURED / TOP-RATED ─────────────────────────────── */}
        {!searchQuery && !selectedCat && featured.length > 0 && (
          <section className="bg-white mt-2 py-4">
            <div className="flex items-center justify-between px-4 mb-3">
              <div className="flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold">Popular Near You</h2>
              </div>
              <button className="flex items-center gap-0.5 text-xs text-primary font-semibold tap-highlight">
                See all <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Horizontal scroll cards */}
            <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar">
              {featured.map((k) => (
                <FeaturedCard key={k.id} kitchen={k} userLocation={userLocation} />
              ))}
            </div>
          </section>
        )}

        {/* ── FILTER BAR ───────────────────────────────────────── */}
        <div className="bg-white mt-2 border-y">
          <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar">
            {/* Sort pill */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowSort((p) => !p)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold bg-white tap-highlight"
              >
                <SlidersHorizontal className="h-3 w-3" />
                {sortBy === 'rating' ? 'Top Rated' : sortBy === 'time' ? 'Fast Delivery' : 'Nearest'}
                <ChevronDown className="h-3 w-3" />
              </button>
              {showSort && (
                <div className="absolute top-full left-0 mt-1.5 bg-white border rounded-xl shadow-xl z-50 min-w-[140px] overflow-hidden">
                  {(['rating', 'time', 'distance'] as SortKey[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSortBy(s); setShowSort(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-semibold tap-highlight ${
                        sortBy === s ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                      }`}
                    >
                      {s === 'rating' ? '⭐ Top Rated' : s === 'time' ? '⚡ Fast Delivery' : '📍 Nearest First'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Veg filter */}
            <button
              onClick={() => setVegOnly((p) => !p)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold tap-highlight transition-all ${
                vegOnly ? 'bg-green-500 text-white border-green-500' : 'bg-white text-foreground'
              }`}
            >
              <Leaf className="h-3 w-3" />
              Pure Veg
            </button>

            {/* Open Now */}
            <button
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold bg-white tap-highlight"
            >
              🟢 Open Now
            </button>

            {/* Offers */}
            <button className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold bg-white tap-highlight">
              🏷️ Offers
            </button>
          </div>
        </div>

        {/* ── ALL RESTAURANTS ──────────────────────────────────── */}
        <section className="bg-white mt-2">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-bold">
                {selectedCat ? `${selectedCat} Restaurants` : searchQuery ? `Results for "${searchQuery}"` : 'All Restaurants'}
              </h2>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {filtered.length} places
            </span>
          </div>

          {loading ? (
            <div className="px-4 space-y-3 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl skeleton" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-6">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-bold text-base mb-1">No restaurants found</p>
              <p className="text-sm text-muted-foreground mb-4">Try adjusting filters or search</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCat(null); }}
                className="text-primary text-sm font-semibold tap-highlight"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((k) => (
                <RestaurantRow key={k.id} kitchen={k} userLocation={userLocation} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ══ FLOATING CART BUTTON ════════════════════════════════════ */}
      {totalCart > 0 && (
        <Link to={multiKitchenCarts.length > 0 ? '/customer/multi-checkout' : '/customer/checkout'}>
          <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-[calc(430px-32px)]">
            <div className="gradient-primary rounded-2xl shadow-xl px-4 py-3.5 flex items-center justify-between animate-slide-in-up">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">
                    {totalCart} item{totalCart > 1 ? 's' : ''} added
                  </p>
                  <p className="text-white/80 text-xs">Tap to review cart</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-white font-bold text-sm">
                View Cart
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Backdrop for sort dropdown */}
      {showSort && (
        <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />
      )}
    </div>
  );
}

/* ══ FEATURED CARD (horizontal scroll) ═══════════════════════════ */
function FeaturedCard({ kitchen, userLocation }: { kitchen: Kitchen; userLocation: {lat:number;lng:number}|null }) {
  const dist = userLocation && kitchen.lat && kitchen.lng
    ? calculateDistance(userLocation.lat, userLocation.lng, kitchen.lat, kitchen.lng)
    : null;

  return (
    <Link to={`/customer/kitchen/${kitchen.id}`} className="flex-shrink-0 w-40 tap-highlight">
      <div className="bg-white rounded-xl overflow-hidden border card-shadow">
        {/* Image */}
        <div className="relative h-28 bg-muted">
          {kitchen.image_url ? (
            <img src={kitchen.image_url} alt={kitchen.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full gradient-primary flex items-center justify-center">
              <span className="text-4xl">🍽️</span>
            </div>
          )}
          {!kitchen.is_open && (
            <div className="absolute inset-0 bg-black/55 flex items-center justify-center rounded-t-xl">
              <span className="text-white text-xs font-bold">CLOSED</span>
            </div>
          )}
          {/* Discount badge */}
          <div className="absolute top-1.5 left-1.5 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow">
            {Math.floor(Math.random() * 20 + 20)}% OFF
          </div>
        </div>
        {/* Info */}
        <div className="p-2.5">
          <p className="font-bold text-xs truncate">{kitchen.name}</p>
          <div className="flex items-center gap-1 mt-1">
            <div className="flex items-center gap-0.5 bg-green-500 text-white rounded px-1 py-0.5">
              <Star className="h-2.5 w-2.5 fill-white" />
              <span className="text-[9px] font-bold">{Number(kitchen.rating).toFixed(1)}</span>
            </div>
            <span className="text-[9px] text-muted-foreground">•</span>
            <span className="text-[9px] text-muted-foreground font-medium">{kitchen.delivery_time}</span>
          </div>
          {dist && (
            <p className="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
              <Navigation2 className="h-2.5 w-2.5" />{formatDistance(dist)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ══ RESTAURANT ROW (vertical list) ═════════════════════════════ */
function RestaurantRow({ kitchen, userLocation }: { kitchen: Kitchen; userLocation: {lat:number;lng:number}|null }) {
  const dist = userLocation && kitchen.lat && kitchen.lng
    ? calculateDistance(userLocation.lat, userLocation.lng, kitchen.lat, kitchen.lng)
    : null;

  const discountPct = Math.floor(Math.random() * 25 + 15);

  return (
    <Link to={`/customer/kitchen/${kitchen.id}`} className="block tap-highlight">
      <div className="flex gap-3 px-4 py-3.5">
        {/* Image */}
        <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
          {kitchen.image_url ? (
            <img src={kitchen.image_url} alt={kitchen.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full gradient-food flex items-center justify-center">
              <span className="text-3xl">🍽️</span>
            </div>
          )}
          {!kitchen.is_open && (
            <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">CLOSED</span>
            </div>
          )}
          {/* Discount sticker */}
          <div className="absolute bottom-0 left-0 right-0 bg-primary/90 text-white text-[8px] font-bold text-center py-0.5">
            {discountPct}% OFF
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 py-0.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sm leading-tight line-clamp-1">{kitchen.name}</h3>
            {/* Rating badge */}
            <div className="flex items-center gap-0.5 bg-green-500 text-white rounded px-1.5 py-0.5 flex-shrink-0">
              <Star className="h-3 w-3 fill-white" />
              <span className="text-xs font-bold">{Number(kitchen.rating).toFixed(1)}</span>
            </div>
          </div>

          {/* Description */}
          {kitchen.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{kitchen.description}</p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2.5 mt-1.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="font-medium">{kitchen.delivery_time}</span>
            </div>
            {dist !== null && (
              <>
                <span className="text-muted-foreground/40 text-xs">•</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="font-medium">{formatDistance(dist)}</span>
                </div>
              </>
            )}
          </div>

          {/* Category chips */}
          {kitchen.categories && kitchen.categories.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {kitchen.categories.slice(0, 3).map((c) => (
                <span key={c} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
