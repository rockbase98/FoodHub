import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChefHat, Store, Menu, Package, Power, LogOut } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Kitchen, Order } from '../../types';
import { toast } from 'sonner';
import { authService } from '../../lib/authService';

export default function KitchenDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKitchenData();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadKitchenData = async () => {
    try {
      const { data, error } = await supabase
        .from('kitchens')
        .select('*')
        .eq('owner_id', user?.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          navigate('/kitchen/register');
          return;
        }
        throw error;
      }

      setKitchen(data);
      await loadOrders();
    } catch (error: any) {
      toast.error('Failed to load kitchen data');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const { data: kitchenData } = await supabase
        .from('kitchens')
        .select('id')
        .eq('owner_id', user?.id)
        .single();

      if (!kitchenData) return;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('kitchen_id', kitchenData.id)
        .in('status', ['pending', 'accepted', 'preparing', 'ready'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Failed to load orders:', error);
    }
  };

  const toggleKitchenStatus = async () => {
    if (!kitchen) return;

    try {
      const { error } = await supabase
        .from('kitchens')
        .update({ is_open: !kitchen.is_open })
        .eq('id', kitchen.id);

      if (error) throw error;
      setKitchen({ ...kitchen, is_open: !kitchen.is_open });
      toast.success(kitchen.is_open ? 'Kitchen closed' : 'Kitchen opened');
    } catch (error: any) {
      toast.error('Failed to update status');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!kitchen) {
    return null;
  }

  if (kitchen.status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
            <ChefHat className="h-10 w-10 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Approval Pending</h2>
          <p className="text-muted-foreground mb-6">
            Your kitchen registration is under review. You'll be notified once approved.
          </p>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    );
  }

  if (kitchen.status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <ChefHat className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Registration Rejected</h2>
          <p className="text-muted-foreground mb-6">
            Unfortunately, your kitchen registration was not approved. Please contact support.
          </p>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    );
  }

  const pendingOrders = orders.filter((o) => o.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{kitchen.name}</h1>
              <p className="text-sm text-muted-foreground">Kitchen Dashboard</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Kitchen Status Card */}
        <div className="bg-card border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-1">Kitchen Status</h3>
              <p className="text-sm text-muted-foreground">
                {kitchen.is_open ? 'Accepting orders' : 'Not accepting orders'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{kitchen.is_open ? 'Open' : 'Closed'}</span>
              <Switch checked={kitchen.is_open} onCheckedChange={toggleKitchenStatus} />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Package className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingOrders}</p>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
              </div>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Store className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kitchen.rating.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Rating</p>
              </div>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Menu className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kitchen.total_ratings}</p>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/kitchen/menu">
            <div className="bg-card border rounded-lg p-6 hover:card-shadow transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg gradient-primary flex items-center justify-center">
                  <Menu className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Menu Management</h3>
                  <p className="text-sm text-muted-foreground">Add, edit, or remove menu items</p>
                </div>
              </div>
            </div>
          </Link>

          <Link to="/kitchen/orders">
            <div className="bg-card border rounded-lg p-6 hover:card-shadow transition-shadow cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg gradient-secondary flex items-center justify-center">
                  <Package className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Manage Orders</h3>
                  <p className="text-sm text-muted-foreground">View and manage incoming orders</p>
                  {pendingOrders > 0 && (
                    <Badge className="mt-2 bg-red-500">{pendingOrders} New</Badge>
                  )}
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
