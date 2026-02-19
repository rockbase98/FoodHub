import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChefHat, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { authService } from '../lib/authService';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';
import { AuthUser } from '../types';
import { supabase } from '../lib/supabase';
import { getCurrentLocation } from '../lib/utils';

async function mapSupabaseUser(user: User): Promise<AuthUser> {
  // First try to get role from user_metadata
  let role = user.user_metadata?.role || 'customer';
  
  // If not in metadata, fetch from user_profiles table
  if (!user.user_metadata?.role) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile?.role) {
      role = profile.role;
    }
  }
  
  return {
    id: user.id,
    email: user.email!,
    username: user.user_metadata?.username || user.email!.split('@')[0],
    avatar: user.user_metadata?.avatar_url,
    role,
    phone: user.user_metadata?.phone,
  };
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await authService.signInWithPassword(email, password);
      const authUser = await mapSupabaseUser(user);
      login(authUser);
      
      // Update current location automatically on login
      try {
        const location = await getCurrentLocation();
        
        // Check if user has any address, if not create one
        if (authUser.role === 'customer' || authUser.role === 'delivery_partner') {
          const { data: existingAddresses } = await supabase
            .from('addresses')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);
          
          if (!existingAddresses || existingAddresses.length === 0) {
            // Create first address automatically
            await supabase.from('addresses').insert({
              user_id: user.id,
              label: 'Current Location',
              address_line: 'Auto-detected location',
              lat: location.lat,
              lng: location.lng,
              is_default: true,
            });
            toast.success('Location saved automatically');
          } else {
            // Update default address location
            await supabase.from('addresses')
              .update({
                lat: location.lat,
                lng: location.lng,
              })
              .eq('user_id', user.id)
              .eq('is_default', true);
          }
        }
        
        // Update delivery partner location
        if (authUser.role === 'delivery_partner') {
          await supabase.from('delivery_partners').update({
            current_lat: location.lat,
            current_lng: location.lng,
          }).eq('user_id', user.id);
        }
      } catch (locError) {
        console.error('Location update failed:', locError);
        // Don't block login if location fails
      }
      
      switch (authUser.role) {
        case 'customer':
          navigate('/customer');
          break;
        case 'kitchen_owner':
          navigate('/kitchen');
          break;
        case 'delivery_partner':
          navigate('/delivery');
          break;
        case 'admin':
          navigate('/admin');
          break;
        default:
          navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <ChefHat className="h-10 w-10 text-primary" />
            <span className="text-3xl font-bold">FoodHub</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Login to continue to your account</p>
        </div>

        <div className="bg-card p-8 rounded-lg border card-shadow">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full gradient-primary" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Login'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
