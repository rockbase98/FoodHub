import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Clock, MapPin, Plus, Minus, ShoppingCart, Info, Leaf } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { supabase } from '../../lib/supabase';
import { Kitchen, MenuItem } from '../../types';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';

export default function KitchenDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [flyAnims, setFlyAnims] = useState<{ id: string; x: number; y: number }[]>([]);
  const { items, addItem, updateQuantity, kitchenId, getTotal } = useCartStore();

  useEffect(() => {
    loadKitchenData();
  }, [id]);

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

  const handleAddItem = (e: React.MouseEvent, item: MenuItem) => {
    if (!user) {
      toast.error('Please login to add items');
      navigate('/login');
      return;
    }
    if (!kitchen) return;
    addItem(item, kitchen.id);
    toast.success(`${item.name} added!`);
    // Trigger fly animation from button position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const animId = `${Date.now()}-${Math.random()}`;
    setFlyAnims((prev) => [...prev, { id: animId, x: rect.left, y: rect.top }]);
    setTimeout(() => setFlyAnims((prev) => prev.filter((f) => f.id !== animId)), 700);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!kitchen) return null;

  const categories = Array.from(new Set(menuItems.map((item) => item.category)));
  const filteredItems = selectedCategory
    ? menuItems.filter((item) => item.category === selectedCategory)
    : menuItems;

  const cartItemsForKitchen = kitchenId === kitchen.id ? items : [];
  const cartTotal = getTotal();

  return (
    <div className="min-h-screen bg-[#f0f0f5] pb-24">
      {/* Cart fly animations */}
      <div className="pointer-events-none fixed inset-0 z-[999]">
        {flyAnims.map((anim) => (
          <div
            key={anim.id}
            className="animate-fly-to-cart absolute"
            style={{ left: anim.x, top: anim.y }}
          >
            <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
              +1
            </div>
          </div>
        ))}
      </div>

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
        <button
          onClick={() => navigate('/customer')}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Restaurant Info Card */}
      <div className="bg-white -mt-6 mx-4 rounded-t-3xl shadow-xl relative z-10">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold mb-2">{kitchen.name}</h1>
          <p className="text-muted-foreground mb-4 line-clamp-2">{kitchen.description}</p>

          <div className="flex items-center gap-4 mb-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-xl">
              <Star className="h-4 w-4 fill-white" />
              <span className="font-bold">{kitchen.rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{kitchen.delivery_time}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground truncate max-w-[200px]">{kitchen.address}</span>
            </div>
          </div>

          {/* Categories */}
          {kitchen.categories && kitchen.categories.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {kitchen.categories.map((cat) => (
                <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
              ))}
            </div>
          )}

          {!kitchen.is_open && (
            <div className="mt-3 bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Currently Closed — Opens later</span>
            </div>
          )}
        </div>

        {/* Offer Strip */}
        <div className="px-6 py-3 bg-green-50 border-b flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-xs text-white font-bold">%</div>
          <span className="text-sm font-medium text-green-700">40% OFF upto ₹120 with code FIRSTORDER</span>
        </div>

        {/* Category Tabs */}
        {categories.length > 0 && (
          <div className="sticky top-0 z-20 bg-white border-b">
            <div className="px-6 py-3 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                    !selectedCategory ? 'bg-primary text-white shadow-sm' : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  All Items
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                      selectedCategory === category ? 'bg-primary text-white shadow-sm' : 'bg-muted text-foreground hover:bg-muted/80'
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
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="text-lg font-bold mb-2">No items in this category</h3>
              <p className="text-muted-foreground mb-4">Try another category or check back later</p>
              <Button variant="outline" onClick={() => setSelectedCategory(null)}>View All Items</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const cartItem = cartItemsForKitchen.find((ci) => ci.menuItem.id === item.id);
                const quantity = cartItem?.quantity || 0;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 border shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Veg/Non-Veg Badge */}
                        <div className="flex items-center gap-2 mb-2">
                          {item.is_veg ? (
                            <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                              <Leaf className="h-3 w-3" /> Veg
                            </span>
                          ) : (
                            <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                              🍖 Non-Veg
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-base mb-1 line-clamp-1">{item.name}</h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{item.description}</p>
                        )}
                        <p className="text-lg font-bold text-primary">{formatCurrency(item.price)}</p>
                      </div>

                      {/* Image & Add Button */}
                      <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-muted">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-orange-200 to-pink-200 flex items-center justify-center">
                              <span className="text-3xl">{item.is_veg ? '🥗' : '🍗'}</span>
                            </div>
                          )}
                        </div>

                        {/* Add / Quantity */}
                        {!kitchen.is_open ? (
                          <Badge variant="secondary" className="text-xs">Closed</Badge>
                        ) : quantity === 0 ? (
                          <Button
                            size="sm"
                            onClick={(e) => handleAddItem(e, item)}
                            className="bg-white text-primary border-2 border-primary hover:bg-primary hover:text-white font-bold rounded-lg px-6 transition-all shadow-sm"
                          >
                            ADD
                          </Button>
                        ) : (
                          <div className="flex items-center bg-primary text-white rounded-lg shadow-md overflow-hidden">
                            <button
                              onClick={() => updateQuantity(item.id, quantity - 1)}
                              className="px-3 py-1.5 hover:bg-primary/80 transition-colors font-bold"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="font-bold min-w-[28px] text-center text-sm">{quantity}</span>
                            <button
                              onClick={(e) => {
                                updateQuantity(item.id, quantity + 1);
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                const animId = `${Date.now()}-${Math.random()}`;
                                setFlyAnims((prev) => [...prev, { id: animId, x: rect.left, y: rect.top }]);
                                setTimeout(() => setFlyAnims((prev) => prev.filter((f) => f.id !== animId)), 700);
                              }}
                              className="px-3 py-1.5 hover:bg-primary/80 transition-colors font-bold"
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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl z-50">
          <div className="container mx-auto px-4 py-4">
            <button
              onClick={() => navigate('/customer/checkout')}
              className="w-full h-14 bg-primary text-white rounded-xl flex items-center justify-between px-6 shadow-lg hover:shadow-xl transition-all hover:bg-primary/90"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="font-bold text-sm">{cartItemsForKitchen.length}</span>
                </div>
                <span className="text-sm font-medium">
                  {cartItemsForKitchen.length} {cartItemsForKitchen.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-lg font-bold">{formatCurrency(cartTotal)}</p>
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
