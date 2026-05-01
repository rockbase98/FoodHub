import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Store, Bike, Package, LogOut, TrendingUp, Users, DollarSign, Activity, Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';
import { authService } from '../../lib/authService';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [stats, setStats] = useState({
    totalKitchens: 0,
    pendingKitchens: 0,
    totalRiders: 0,
    pendingRiders: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    activeOrders: 0,
    onlineRiders: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [kitchens, riders, orders, customers] = await Promise.all([
        supabase.from('kitchens').select('*', { count: 'exact' }),
        supabase.from('delivery_partners').select('*', { count: 'exact' }),
        supabase.from('orders').select('*'),
        supabase.from('user_profiles').select('*', { count: 'exact' }).eq('role', 'customer'),
      ]);

      const pendingKitchens = kitchens.data?.filter((k) => k.status === 'pending').length || 0;
      const pendingRiders = riders.data?.filter((r) => r.status === 'pending').length || 0;
      const onlineRiders = riders.data?.filter((r) => r.is_online).length || 0;
      const totalRevenue = orders.data?.reduce((sum, o) => sum + o.total, 0) || 0;
      const activeOrders = orders.data?.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length || 0;

      setStats({
        totalKitchens: kitchens.count || 0,
        pendingKitchens,
        totalRiders: riders.count || 0,
        pendingRiders,
        totalOrders: orders.data?.length || 0,
        totalRevenue,
        totalCustomers: customers.count || 0,
        activeOrders,
        onlineRiders,
      });
    } catch (error: any) {
      toast.error('Failed to load stats');
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      logout();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Platform Management</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<Store className="h-6 w-6" />}
            title="Total Kitchens"
            value={stats.totalKitchens}
            subtitle={`${stats.pendingKitchens} pending`}
            color="bg-blue-100 text-blue-600"
          />
          <StatCard
            icon={<Bike className="h-6 w-6" />}
            title="Delivery Partners"
            value={stats.totalRiders}
            subtitle={`${stats.onlineRiders} online now`}
            color="bg-green-100 text-green-600"
          />
          <StatCard
            icon={<Users className="h-6 w-6" />}
            title="Customers"
            value={stats.totalCustomers}
            subtitle="Registered users"
            color="bg-purple-100 text-purple-600"
          />
          <StatCard
            icon={<Activity className="h-6 w-6" />}
            title="Active Orders"
            value={stats.activeOrders}
            subtitle={`${stats.totalOrders} total`}
            color="bg-yellow-100 text-yellow-600"
          />
        </div>

        {/* Revenue Card */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-lg p-8 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-8 w-8" />
            <h2 className="text-2xl font-bold">Total Revenue</h2>
          </div>
          <p className="text-4xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
        </div>

        {/* Add New Restaurant Button */}
        <div className="mb-6">
          <Link to="/admin/add-kitchen">
            <Button className="w-full md:w-auto gradient-primary">
              <Plus className="h-5 w-5 mr-2" />
              Add New Restaurant / Cloud Kitchen
            </Button>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Link to="/admin/kitchens">
            <div className="bg-card border rounded-lg p-6 hover:card-shadow transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Store className="h-7 w-7 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Manage Kitchens</h3>
                  <p className="text-sm text-muted-foreground">Approve & manage kitchens</p>
                  {stats.pendingKitchens > 0 && (
                    <p className="text-xs text-yellow-600 mt-1">{stats.pendingKitchens} pending approval</p>
                  )}
                </div>
              </div>
            </div>
          </Link>

          <Link to="/admin/riders">
            <div className="bg-card border rounded-lg p-6 hover:card-shadow transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-green-100 flex items-center justify-center">
                  <Bike className="h-7 w-7 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Manage Riders</h3>
                  <p className="text-sm text-muted-foreground">Approve & manage delivery partners</p>
                  {stats.pendingRiders > 0 && (
                    <p className="text-xs text-yellow-600 mt-1">{stats.pendingRiders} pending approval</p>
                  )}
                </div>
              </div>
            </div>
          </Link>

          <Link to="/admin/orders">
            <div className="bg-card border rounded-lg p-6 hover:card-shadow transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Package className="h-7 w-7 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">View All Orders</h3>
                  <p className="text-sm text-muted-foreground">Monitor platform orders</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, subtitle, color }: { icon: React.ReactNode; title: string; value: number; subtitle: string; color: string }) {
  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
