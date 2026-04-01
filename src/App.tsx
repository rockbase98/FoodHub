import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from './hooks/useAuth';
import { Loader2 } from 'lucide-react';

// Auth Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

// Customer Pages
import CustomerHome from './pages/customer/CustomerHome';
import KitchenDetail from './pages/customer/KitchenDetail';
import Checkout from './pages/customer/Checkout';
import OrderTracking from './pages/customer/OrderTracking';
import CustomerOrders from './pages/customer/CustomerOrders';
import CustomerProfile from './pages/customer/CustomerProfile';
import AddressManagement from './pages/customer/AddressManagement';
import MultiRestaurantCheckout from './pages/customer/MultiRestaurantCheckout';
import ReviewPage from './pages/customer/ReviewPage';

// Kitchen Owner Pages
import KitchenDashboard from './pages/kitchen/KitchenDashboard';
import KitchenRegistration from './pages/kitchen/KitchenRegistration';
import MenuManagement from './pages/kitchen/MenuManagement';
import KitchenOrders from './pages/kitchen/KitchenOrders';

// Delivery Partner Pages
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';
import DeliveryRegistration from './pages/delivery/DeliveryRegistration';
import ActiveDelivery from './pages/delivery/ActiveDelivery';
import DeliveryHistory from './pages/delivery/DeliveryHistory';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminKitchens from './pages/admin/AdminKitchens';
import AdminRiders from './pages/admin/AdminRiders';
import AdminOrders from './pages/admin/AdminOrders';
import AdminAddKitchen from './pages/admin/AdminAddKitchen';
import AdminKitchenManage from './pages/admin/AdminKitchenManage';
import AdminCoupons from './pages/admin/AdminCoupons';

// Grocery Page
import DesiDidiMart from './pages/customer/DesiDidiMart';
import BottomNav from './components/layout/BottomNav';

// Paths where bottom navigation is shown
const BOTTOM_NAV_PATHS = ['/customer', '/kitchen', '/delivery', '/admin'];

// Inner shell — must be inside BrowserRouter to use useLocation
function AppShell({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
  const location = useLocation();
  const showBottomNav = !!user && BOTTOM_NAV_PATHS.some((p) => location.pathname.startsWith(p));

  return (
    <div className="mobile-app-shell">
      <div className={showBottomNav ? 'app-content' : 'app-content-full'}>
        <Routes>
          {/* ── Public ── */}
          <Route path="/" element={!user ? <LandingPage /> : <RoleBasedRedirect role={user.role} />} />
          <Route path="/login" element={!user ? <LoginPage /> : <RoleBasedRedirect role={user.role} />} />
          <Route path="/signup" element={!user ? <SignupPage /> : <RoleBasedRedirect role={user.role} />} />

          {/* ── Customer ── */}
          <Route path="/customer" element={<CustomerHome />} />
          <Route path="/customer/kitchen/:id" element={<KitchenDetail />} />
          <Route path="/customer/checkout" element={user?.role === 'customer' ? <Checkout /> : <Navigate to="/login" />} />
          <Route path="/customer/orders" element={user?.role === 'customer' ? <CustomerOrders /> : <Navigate to="/login" />} />
          <Route path="/customer/track/:orderId" element={user?.role === 'customer' ? <OrderTracking /> : <Navigate to="/login" />} />
          <Route path="/customer/profile" element={user?.role === 'customer' ? <CustomerProfile /> : <Navigate to="/login" />} />
          <Route path="/customer/review" element={user?.role === 'customer' ? <ReviewPage /> : <Navigate to="/login" />} />
          <Route path="/customer/multi-checkout" element={user?.role === 'customer' ? <MultiRestaurantCheckout /> : <Navigate to="/login" />} />
          <Route path="/customer/addresses" element={user?.role === 'customer' ? <AddressManagement /> : <Navigate to="/login" />} />
          <Route path="/grocery" element={<DesiDidiMart />} />

          {/* ── Kitchen Owner ── */}
          <Route path="/kitchen" element={user?.role === 'kitchen_owner' ? <KitchenDashboard /> : <Navigate to="/login" />} />
          <Route path="/kitchen/register" element={user?.role === 'kitchen_owner' ? <KitchenRegistration /> : <Navigate to="/login" />} />
          <Route path="/kitchen/menu" element={user?.role === 'kitchen_owner' ? <MenuManagement /> : <Navigate to="/login" />} />
          <Route path="/kitchen/orders" element={user?.role === 'kitchen_owner' ? <KitchenOrders /> : <Navigate to="/login" />} />

          {/* ── Delivery Partner ── */}
          <Route path="/delivery" element={user?.role === 'delivery_partner' ? <DeliveryDashboard /> : <Navigate to="/login" />} />
          <Route path="/delivery/register" element={user?.role === 'delivery_partner' ? <DeliveryRegistration /> : <Navigate to="/login" />} />
          <Route path="/delivery/active/:orderId" element={user?.role === 'delivery_partner' ? <ActiveDelivery /> : <Navigate to="/login" />} />
          <Route path="/delivery/history" element={user?.role === 'delivery_partner' ? <DeliveryHistory /> : <Navigate to="/login" />} />

          {/* ── Admin ── */}
          <Route path="/admin" element={user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} />
          <Route path="/admin/kitchens" element={user?.role === 'admin' ? <AdminKitchens /> : <Navigate to="/login" />} />
          <Route path="/admin/riders" element={user?.role === 'admin' ? <AdminRiders /> : <Navigate to="/login" />} />
          <Route path="/admin/orders" element={user?.role === 'admin' ? <AdminOrders /> : <Navigate to="/login" />} />
          <Route path="/admin/add-kitchen" element={user?.role === 'admin' ? <AdminAddKitchen /> : <Navigate to="/login" />} />
          <Route path="/admin/kitchen/:id" element={user?.role === 'admin' ? <AdminKitchenManage /> : <Navigate to="/login" />} />
          <Route path="/admin/kitchen/:id/settings" element={user?.role === 'admin' ? <AdminKitchenManage /> : <Navigate to="/login" />} />
          <Route path="/admin/coupons" element={user?.role === 'admin' ? <AdminCoupons /> : <Navigate to="/login" />} />

          {/* ── Fallback ── */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
      {showBottomNav && <BottomNav />}
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="mobile-app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-xl">
            <span className="text-white text-3xl">🍽️</span>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground mt-2 font-medium">FoodHub</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <AppShell user={user} />
    </BrowserRouter>
  );
}

function RoleBasedRedirect({ role }: { role: string }) {
  switch (role) {
    case 'customer':        return <Navigate to="/customer" />;
    case 'kitchen_owner':   return <Navigate to="/kitchen" />;
    case 'delivery_partner':return <Navigate to="/delivery" />;
    case 'admin':           return <Navigate to="/admin" />;
    default:                return <Navigate to="/login" />;
  }
}

export default App;
