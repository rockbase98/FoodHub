import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingBag, ClipboardList, User, ChefHat, Bike, LayoutDashboard, Store, Package } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';

export default function BottomNav() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const { multiKitchenCarts, items } = useCartStore();

  const totalCartItems = multiKitchenCarts.reduce((sum, cart) => sum + cart.items.reduce((s, i) => s + i.quantity, 0), 0)
    || items.reduce((sum, i) => sum + i.quantity, 0);

  // Role-based nav items
  const getNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'customer':
        return [
          { path: '/customer', icon: Home, label: 'Home' },
          { path: '/customer/orders', icon: ClipboardList, label: 'Orders' },
          { path: '/customer/checkout', icon: ShoppingBag, label: 'Cart', badge: totalCartItems },
          { path: '/customer/addresses', icon: Search, label: 'Addresses' },
          { path: '/customer/profile', icon: User, label: 'Profile' },
        ];
      case 'kitchen_owner':
        return [
          { path: '/kitchen', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/kitchen/orders', icon: Package, label: 'Orders' },
          { path: '/kitchen/menu', icon: Store, label: 'Menu' },
          { path: '/kitchen/register', icon: ChefHat, label: 'Profile' },
        ];
      case 'delivery_partner':
        return [
          { path: '/delivery', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/delivery/history', icon: ClipboardList, label: 'History' },
          { path: '/delivery/register', icon: Bike, label: 'Profile' },
        ];
      case 'admin':
        return [
          { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/admin/kitchens', icon: Store, label: 'Kitchens' },
          { path: '/admin/orders', icon: Package, label: 'Orders' },
          { path: '/admin/riders', icon: Bike, label: 'Riders' },
          { path: '/admin/coupons', icon: ClipboardList, label: 'Coupons' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  if (navItems.length === 0) return null;

  return (
    <div className="mobile-bottom-nav" style={{ left: '50%', transform: 'translateX(-50%)' }}>
      <nav
        className="grid bg-card"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === '/customer'
              ? location.pathname === '/customer'
              : location.pathname.startsWith(item.path) && item.path !== '/customer';

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2 tap-highlight transition-all duration-200 ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
              style={{ minHeight: '56px' }}
            >
              {/* Active indicator pill */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full gradient-primary"
                />
              )}

              {/* Icon with badge */}
              <span className="relative">
                <Icon
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </span>

              <span
                className={`text-[10px] leading-tight font-medium transition-all ${
                  isActive ? 'font-semibold' : ''
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
