import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ShoppingBag, Package, Plus, Minus } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import BottomNav from '../../components/layout/BottomNav';
import { useCartStore } from '../../stores/cartStore';
import { toast } from 'sonner';

const GROCERY_CATEGORIES = [
  { 
    name: 'Fresh Vegetables', 
    img: 'https://images.unsplash.com/photo-1566385101042-1a000c1267c4?w=300&h=300&fit=crop',
    items: 120
  },
  { 
    name: 'Fresh Fruits', 
    img: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=300&h=300&fit=crop',
    items: 85
  },
  { 
    name: 'Dairy, Bread & Eggs', 
    img: 'https://images.unsplash.com/photo-1550583724-125581fe2f83?w=300&h=300&fit=crop',
    items: 95
  },
  { 
    name: 'Rice, Atta & Dals', 
    img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&h=300&fit=crop',
    items: 65
  },
  { 
    name: 'Masalas & Dry Fruits', 
    img: 'https://images.unsplash.com/photo-1596040033229-a0b3b524ef02?w=300&h=300&fit=crop',
    items: 110
  },
  { 
    name: 'Oils & Ghee', 
    img: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&h=300&fit=crop',
    items: 45
  },
  { 
    name: 'Munchies', 
    img: 'https://images.unsplash.com/photo-1599490659213-e2b9527bb087?w=300&h=300&fit=crop',
    items: 150
  },
  { 
    name: 'Sweet Tooth', 
    img: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=300&h=300&fit=crop',
    items: 75
  },
  { 
    name: 'Cold Drinks & Juices', 
    img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&h=300&fit=crop',
    items: 90
  },
  { 
    name: 'Biscuits & Cakes', 
    img: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&h=300&fit=crop',
    items: 105
  },
  { 
    name: 'Instant & Frozen Food', 
    img: 'https://images.unsplash.com/photo-1594756202090-0424b60dc5c6?w=300&h=300&fit=crop',
    items: 80
  },
  { 
    name: 'Meat & Seafood', 
    img: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=300&h=300&fit=crop',
    items: 55
  },
];

// Grocery Products as Menu Items
const FEATURED_PRODUCTS = [
  { id: 'g1', name: 'Fresh Tomatoes', price: 40, img: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&h=300&fit=crop', discount: '20% OFF', is_veg: true, category: 'Vegetables' },
  { id: 'g2', name: 'Amul Milk', price: 28, img: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&h=300&fit=crop', discount: '10% OFF', is_veg: true, category: 'Dairy' },
  { id: 'g3', name: 'Brown Bread', price: 45, img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=300&fit=crop', discount: 'Buy 1 Get 1', is_veg: true, category: 'Bakery' },
  { id: 'g4', name: 'Farm Fresh Eggs', price: 70, img: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=300&h=300&fit=crop', discount: '15% OFF', is_veg: true, category: 'Dairy' },
  { id: 'g5', name: 'Fresh Onions', price: 35, img: 'https://images.unsplash.com/photo-1508747703725-719777637510?w=300&h=300&fit=crop', discount: '15% OFF', is_veg: true, category: 'Vegetables' },
  { id: 'g6', name: 'Basmati Rice', price: 150, img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&h=300&fit=crop', discount: '10% OFF', is_veg: true, category: 'Staples' },
  { id: 'g7', name: 'Fresh Carrots', price: 45, img: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=300&h=300&fit=crop', discount: '20% OFF', is_veg: true, category: 'Vegetables' },
  { id: 'g8', name: 'Paneer', price: 80, img: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300&h=300&fit=crop', discount: '5% OFF', is_veg: true, category: 'Dairy' },
];

export default function DesiDidiMart() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const cartItems = useCartStore((state) => state.items);
  const addToCart = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const setKitchenId = useCartStore((state) => state.setKitchenId);

  const getItemQuantity = (itemId: string) => {
    const cartItem = cartItems.find((item) => item.menuItem.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  const handleAddToCart = (product: any) => {
    // Set a dummy kitchen ID for grocery items
    setKitchenId('grocery-mart');
    addToCart(product as any);
    toast.success(`${product.name} added to cart!`);
  };

  const handleUpdateQuantity = (product: any, newQuantity: number) => {
    if (newQuantity === 0) {
      updateQuantity(product.id, 0);
      toast.success(`${product.name} removed from cart`);
    } else {
      updateQuantity(product.id, newQuantity);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card sticky top-0 z-40 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-black" style={{ color: '#108548' }}>DESI DIDI MART</h1>
              <p className="text-sm text-muted-foreground">Fresh groceries in minutes</p>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for products..."
              className="h-12 pl-10 pr-4 text-base rounded-xl border-2 focus:border-primary shadow-sm"
            />
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 py-8 px-4 border-b">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <ShoppingBag className="h-8 w-8 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">Get groceries in 10 minutes!</h2>
          </div>
          <p className="text-gray-600 mb-4">Fresh vegetables, fruits, dairy & more delivered to your doorstep</p>
          <div className="flex items-center justify-center gap-4 text-sm font-semibold text-green-700">
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              <span>1000+ Products</span>
            </div>
            <div>•</div>
            <div>Free Delivery above ₹199</div>
            <div>•</div>
            <div>Upto 60% OFF</div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Featured Products */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Today's Best Deals</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FEATURED_PRODUCTS.map((product, i) => (
              <div key={i} className="bg-card rounded-xl overflow-hidden border card-shadow card-hover">
                <div className="relative h-40">
                  <img src={product.img} alt={product.name} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                    {product.discount}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">{product.name}</h3>
                  <p className="text-lg font-bold text-green-600">₹{product.price}</p>
                  {getItemQuantity(product.id) === 0 ? (
                    <Button 
                      size="sm" 
                      className="w-full mt-2 gradient-primary"
                      onClick={() => handleAddToCart(product)}
                    >
                      Add to Cart
                    </Button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 mt-2 bg-primary text-white rounded-lg px-2 py-2">
                      <button 
                        onClick={() => handleUpdateQuantity(product, getItemQuantity(product.id) - 1)}
                        className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="font-bold min-w-[24px] text-center">{getItemQuantity(product.id)}</span>
                      <button 
                        onClick={() => handleUpdateQuantity(product, getItemQuantity(product.id) + 1)}
                        className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* All Categories */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {GROCERY_CATEGORIES.map((category, i) => (
              <div key={i} className="bg-card rounded-xl overflow-hidden border card-shadow card-hover cursor-pointer">
                <div className="relative h-32">
                  <img src={category.img} alt={category.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-3 text-center">
                  <h3 className="font-semibold text-sm mb-1">{category.name}</h3>
                  <p className="text-xs text-muted-foreground">{category.items} items</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white text-center">
          <h3 className="text-xl font-bold mb-2">Download Desi Didi Mart App</h3>
          <p className="mb-4">Get exclusive offers and faster checkout on mobile app</p>
          <Button variant="secondary" className="bg-white text-green-600 hover:bg-gray-100">
            Download Now
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
