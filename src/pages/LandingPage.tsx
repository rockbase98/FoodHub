import { Link } from 'react-router-dom';
import { Search, MapPin, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';

// Exact Swiggy food options
const FOOD_OPTIONS = [
  { name: 'Pizza', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&h=200&fit=crop' },
  { name: 'Cake', img: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&h=200&fit=crop' },
  { name: 'Burger', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop' },
  { name: 'Biryani', img: 'https://images.unsplash.com/photo-1563379091339-03b21ef4a4f8?w=200&h=200&fit=crop' },
  { name: 'Rolls', img: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=200&h=200&fit=crop' },
  { name: 'Noodles', img: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=200&h=200&fit=crop' },
  { name: 'Momo', img: 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=200&h=200&fit=crop' },
  { name: 'Pasta', img: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=200&h=200&fit=crop' },
  { name: 'Ice Cream', img: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=200&h=200&fit=crop' },
  { name: 'Dosa', img: 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=200&h=200&fit=crop' },
  { name: 'Khichdi', img: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=200&h=200&fit=crop' },
  { name: 'Gulab Jamun', img: 'https://images.unsplash.com/photo-1602351447937-745cb720612f?w=200&h=200&fit=crop' },
  { name: 'Idli', img: 'https://images.unsplash.com/photo-1589301773859-9e58d6fcc25f?w=200&h=200&fit=crop' },
  { name: 'Pav Bhaji', img: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=200&h=200&fit=crop' },
  { name: 'Salad', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop' },
  { name: 'Koaob', img: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=200&h=200&fit=crop' },
  { name: 'Shake', img: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=200&h=200&fit=crop' },
  { name: 'Chole Bhature', img: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200&h=200&fit=crop' },
];

const GROCERIES = [
  { name: 'Fresh Vegetables', img: 'https://images.unsplash.com/photo-1566385101042-1a000c1267c4?w=150&h=150&fit=crop' },
  { name: 'Fresh Fruits', img: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=150&h=150&fit=crop' },
  { name: 'Dairy, Bread and Eggs', img: 'https://images.unsplash.com/photo-1550583724-125581fe2f83?w=150&h=150&fit=crop' },
  { name: 'Rice, Atta and Dals', img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=150&h=150&fit=crop' },
  { name: 'Masalas and Dry Fruits', img: 'https://images.unsplash.com/photo-1596040033229-a0b3b524ef02?w=150&h=150&fit=crop' },
  { name: 'Oils and Ghee', img: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=150&h=150&fit=crop' },
  { name: 'Munchies', img: 'https://images.unsplash.com/photo-1599490659213-e2b9527bb087?w=150&h=150&fit=crop' },
  { name: 'Sweet Tooth', img: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=150&h=150&fit=crop' },
  { name: 'Cold Drinks and Juices', img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=150&h=150&fit=crop' },
  { name: 'Biscuits and Cakes', img: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=150&h=150&fit=crop' },
  { name: 'Instant and Frozen Food', img: 'https://images.unsplash.com/photo-1594756202090-0424b60dc5c6?w=150&h=150&fit=crop' },
  { name: 'Meat and Seafood', img: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=150&h=150&fit=crop' },
];

const RESTAURANTS = [
  { name: 'The Roast House', rating: '4.5', cuisine: 'North Indian • Continental', price: '₹400 for two', time: '31 mins', img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop', offer: 'Flat 50% off on pre-booking', bankOffer: 'Upto 10% off with bank offers' },
  { name: 'Sambre', rating: '3.9', cuisine: 'Continental • North Indian', price: '₹1800 for two', time: '53 mins', img: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=300&fit=crop', offer: 'Flat 20% off on pre-booking', bankOffer: 'Upto 10% off with bank offers' },
  { name: 'Chef Sushil Bon', rating: '4.1', cuisine: 'Fast Food • Street Food', time: '54 mins', img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop', offer: 'Upto 10% off with bank offers' },
  { name: 'Crystal Grill', rating: '4.4', cuisine: 'North Indian • Fast Food', time: '17 mins', img: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop', offer: 'Flat 50% off on walk-ins', bankOffer: 'Get upto 5% off using TMBNW' },
  { name: 'Binge Resturant Bhagirathabara', rating: '3.1', cuisine: 'North Indian • Asian', time: '24 mins', img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop', offer: 'Flat 25% off on pre-booking', bankOffer: 'Upto 10% off with bank offers' },
  { name: 'Taste Of Persia', rating: '4.0', cuisine: 'Mughlai • North Indian', time: '24 mins', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop', offer: 'Upto 10% off with bank offers' },
];

export default function LandingPage() {
  const foodScrollRef = useRef<HTMLDivElement>(null);
  const restaurantScrollRef = useRef<HTMLDivElement>(null);
  const groceryScrollRef = useRef<HTMLDivElement>(null);

  const scroll = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* EXACT SWIGGY HERO */}
      <div className="bg-[#FF5200] text-white relative overflow-hidden" style={{ minHeight: '600px' }}>
        {/* Decorative vegetable image - left */}
        <img 
          src="https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&h=600&fit=crop" 
          className="absolute left-0 top-16 w-64 h-auto opacity-90 pointer-events-none hidden lg:block"
          alt=""
        />
        
        {/* Decorative food image - right */}
        <img 
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=600&fit=crop" 
          className="absolute right-0 top-0 w-96 h-auto opacity-90 pointer-events-none hidden lg:block"
          alt=""
        />

        {/* Navbar */}
        <nav className="flex items-center justify-between px-6 md:px-12 py-4 max-w-[1440px] mx-auto relative z-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <div className="w-5 h-5 bg-[#FF5200] rounded-full" />
            </div>
            <span className="text-2xl font-black">Swiggy</span>
          </Link>
          
          <div className="flex items-center gap-6 text-sm">
            <Link to="/signup?role=kitchen_owner" className="hidden md:block font-semibold hover:opacity-90">
              Swiggy Corporate
            </Link>
            <Link to="/signup?role=delivery_partner" className="hidden md:block font-semibold hover:opacity-90">
              Partner with us
            </Link>
            <button className="hidden md:block border border-white px-5 py-2 rounded-xl font-bold hover:bg-white/10 transition">
              Get the App ↗
            </button>
            <Link to="/login">
              <button className="bg-black text-white px-6 py-2 rounded-xl font-bold hover:bg-gray-900 transition">
                Sign In
              </button>
            </Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="text-center pt-12 pb-8 px-4 relative z-10 max-w-[1440px] mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
            Order food & groceries. Discover<br />
            best restaurants. Swiggy it!
          </h1>
          
          {/* Search Inputs */}
          <div className="flex flex-col md:flex-row gap-3 max-w-3xl mx-auto mb-16">
            <div className="relative flex-[1]">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FF5200]" size={20} />
              <input 
                type="text" 
                placeholder="Enter your delivery location" 
                className="w-full h-14 pl-12 pr-4 rounded-xl text-gray-900 text-base font-medium outline-none border-none shadow-sm"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0L6.59 1.41 12.17 7H0v2h12.17l-5.58 5.59L8 16l8-8z"/>
              </svg>
            </div>
            <div className="relative flex-[2]">
              <input 
                type="text" 
                placeholder="Search for restaurant, item or more" 
                className="w-full h-14 px-5 rounded-xl text-gray-900 text-base font-medium outline-none border-none shadow-sm"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>
          </div>
        </div>

        {/* Three Service Cards - Exact Swiggy Style */}
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 pb-16 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* FOOD DELIVERY */}
            <Link to="/customer">
              <div className="bg-white rounded-[32px] p-8 h-[300px] md:h-[350px] relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all">
                <div className="relative z-10">
                  <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-none mb-1">FOOD</h2>
                  <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-none mb-2">DELIVERY</h2>
                  <p className="text-gray-500 font-bold text-sm uppercase mb-1">FROM RESTAURANTS</p>
                  <p className="text-[#FF5200] font-bold text-base">UPTO 60% OFF</p>
                  <div className="mt-6 w-12 h-12 bg-[#FF5200] rounded-full flex items-center justify-center shadow-lg">
                    <ArrowRight className="text-white" size={24} />
                  </div>
                </div>
                <img 
                  src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop" 
                  className="absolute bottom-[-20px] right-[-30px] w-72 h-72 object-cover rounded-full rotate-12 group-hover:scale-110 transition-transform"
                  alt=""
                />
              </div>
            </Link>

            {/* DESI DIDI MART */}
            <Link to="/grocery">
              <div className="bg-white rounded-[32px] p-8 h-[300px] md:h-[350px] relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all">
                <div className="relative z-10">
                  <h2 className="text-3xl md:text-4xl font-black leading-tight mb-2" style={{ color: '#108548' }}>DESI DIDI<br/>MART</h2>
                  <p className="text-gray-500 font-bold text-sm uppercase mb-1">INSTANT GROCERY</p>
                  <p className="text-[#FF5200] font-bold text-base">UPTO 60% OFF</p>
                  <div className="mt-6 w-12 h-12 bg-[#FF5200] rounded-full flex items-center justify-center shadow-lg">
                    <ArrowRight className="text-white" size={24} />
                  </div>
                </div>
                <img 
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&h=300&fit=crop" 
                  className="absolute bottom-[-10px] right-[-20px] w-56 h-56 object-cover group-hover:scale-110 transition-transform"
                  alt=""
                />
              </div>
            </Link>

            {/* DINEOUT */}
            <Link to="/signup">
              <div className="bg-white rounded-[32px] p-8 h-[300px] md:h-[350px] relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all">
                <div className="relative z-10">
                  <h2 className="text-4xl md:text-5xl font-black leading-none mb-2" style={{ color: '#1C3C5C' }}>DINEOUT</h2>
                  <p className="text-gray-500 font-bold text-sm uppercase mb-1">EAT OUT & SAVE MORE</p>
                  <p className="text-[#FF5200] font-bold text-base">UPTO 50% OFF</p>
                  <div className="mt-6 w-12 h-12 bg-[#FF5200] rounded-full flex items-center justify-center shadow-lg">
                    <ArrowRight className="text-white" size={24} />
                  </div>
                </div>
                <img 
                  src="https://images.unsplash.com/photo-1559339352-11d035aa65de?w=300&h=300&fit=crop" 
                  className="absolute bottom-[-30px] right-[-40px] w-72 h-72 object-cover rounded-full group-hover:scale-110 transition-transform"
                  alt=""
                />
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* FOOD OPTIONS CAROUSEL - What's on your mind? */}
      <section className="max-w-[1440px] mx-auto px-6 md:px-12 py-16 bg-white">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">What's on your mind?</h2>
          <div className="flex gap-3">
            <button 
              onClick={() => scroll(foodScrollRef, 'left')}
              className="w-9 h-9 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition"
            >
              <ChevronLeft size={20} className="text-gray-700" />
            </button>
            <button 
              onClick={() => scroll(foodScrollRef, 'right')}
              className="w-9 h-9 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition"
            >
              <ChevronRight size={20} className="text-gray-700" />
            </button>
          </div>
        </div>
        
        <div ref={foodScrollRef} className="flex gap-10 overflow-x-scroll pb-4 scrollbar-hide">
          {FOOD_OPTIONS.map((item, i) => (
            <Link key={i} to="/customer" className="flex flex-col items-center flex-shrink-0 cursor-pointer group">
              <div className="w-36 h-36 rounded-full overflow-hidden mb-3 group-hover:scale-105 transition-transform shadow-md">
                <img src={item.img} className="w-full h-full object-cover" alt={item.name} />
              </div>
              <p className="text-base font-semibold text-gray-800">{item.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* TOP RESTAURANT CHAINS */}
      <section className="max-w-[1440px] mx-auto px-6 md:px-12 py-16 bg-white border-t border-gray-200">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Top restaurant chains</h2>
          <div className="flex gap-3">
            <button 
              onClick={() => scroll(restaurantScrollRef, 'left')}
              className="w-9 h-9 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition"
            >
              <ChevronLeft size={20} className="text-gray-700" />
            </button>
            <button 
              onClick={() => scroll(restaurantScrollRef, 'right')}
              className="w-9 h-9 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition"
            >
              <ChevronRight size={20} className="text-gray-700" />
            </button>
          </div>
        </div>
        
        <div ref={restaurantScrollRef} className="flex gap-6 overflow-x-scroll pb-4 scrollbar-hide">
          {RESTAURANTS.map((res, i) => (
            <Link key={i} to="/customer" className="flex-shrink-0 w-full md:w-[380px] rounded-2xl overflow-hidden border border-gray-200 group cursor-pointer hover:shadow-xl transition-all bg-white">
              <div className="relative h-56">
                <img src={res.img} className="w-full h-full object-cover" alt={res.name} />
                <div className="absolute top-3 right-3 bg-green-700 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                  ★ {res.rating}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{res.name}</h3>
                    <p className="text-sm text-gray-600">{res.cuisine}</p>
                    {res.price && <p className="text-sm text-gray-600">{res.price}</p>}
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    {res.time}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-3 mb-3">
                  <button className="text-xs font-medium text-gray-700 underline">📅 Table booking</button>
                </div>
                
                <div className="space-y-2">
                  <div className="bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                    <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">% {res.offer}</p>
                  </div>
                  {res.bankOffer && (
                    <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2">
                      <p className="text-[11px] font-semibold text-blue-700">{res.bankOffer}</p>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* GROCERY CATEGORIES - DESI DIDI MART */}
      <section className="max-w-[1440px] mx-auto px-6 md:px-12 py-16 bg-white border-t border-gray-200">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Shop groceries on Desi Didi Mart</h2>
          <div className="flex gap-3">
            <button 
              onClick={() => scroll(groceryScrollRef, 'left')}
              className="w-9 h-9 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition"
            >
              <ChevronLeft size={20} className="text-gray-700" />
            </button>
            <button 
              onClick={() => scroll(groceryScrollRef, 'right')}
              className="w-9 h-9 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition"
            >
              <ChevronRight size={20} className="text-gray-700" />
            </button>
          </div>
        </div>
        
        <div ref={groceryScrollRef} className="flex gap-6 overflow-x-scroll pb-4 scrollbar-hide">
          {GROCERIES.map((item, i) => (
            <Link key={i} to="/grocery" className="flex flex-col items-center flex-shrink-0 cursor-pointer group" style={{ minWidth: '140px' }}>
              <div className="w-36 h-36 bg-gray-50 rounded-2xl p-3 mb-3 group-hover:bg-gray-100 transition flex items-center justify-center shadow-sm">
                <img src={item.img} className="max-w-full max-h-full object-contain" alt={item.name} />
              </div>
              <p className="text-sm font-semibold text-gray-800 text-center leading-tight">{item.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer - Simple Swiggy Style */}
      <footer className="bg-black text-white py-12 px-6 md:px-12">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-6 md:mb-0">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                <div className="w-5 h-5 bg-[#FF5200] rounded-full" />
              </div>
              <span className="text-2xl font-black">Swiggy</span>
            </div>
            <p className="text-gray-400 text-sm">
              © 2024 Swiggy Limited
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}


