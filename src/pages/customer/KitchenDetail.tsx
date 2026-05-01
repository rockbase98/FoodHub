import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Clock, MapPin, Plus, Minus, ShoppingCart, Info } from 'lucide-react';
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
