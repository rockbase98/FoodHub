import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChefHat, Loader2, MapPin, Navigation } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { authService } from '../lib/authService';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import { UserRole, AuthUser } from '../types';
import { User } from '@supabase/supabase-js';
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

export default function SignupPage() {
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authService.sendOtp(email);
      toast.success('OTP sent to your email');
      setStep('verify');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await authService.verifyOtpAndSetup(email, otp, password, username, role, phone);
      const authUser = await mapSupabaseUser(user);
      login(authUser);
      
      // Show location capture toast
      const locationToast = toast.loading('📍 Capturing your location...', { duration: Infinity });
      
      // Capture and save current location automatically
      try {
        const location = await getCurrentLocation();
        
        // Create default address for customer and delivery partner
        if (role === 'customer' || role === 'delivery_partner') {
          await supabase.from('addresses').insert({
            user_id: user.id,
            label: 'Home',
            address_line: `Location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
            lat: location.lat,
            lng: location.lng,
            is_default: true,
          });
        }
        
        // Update delivery partner location if applicable
        if (role === 'delivery_partner') {
          // Check if delivery_partners record exists first
          const { data: existingPartner } = await supabase
            .from('delivery_partners')
            .select('id')
            .eq('user_id', user.id)
            .single();
            
          if (existingPartner) {
            await supabase.from('delivery_partners').update({
              current_lat: location.lat,
              current_lng: location.lng,
            }).eq('user_id', user.id);
          }
        }
        
        toast.dismiss(locationToast);
        toast.success('✅ Location saved successfully!', { icon: '📍' });
      } catch (locError: any) {
        toast.dismiss(locationToast);
        console.error('Location capture failed:', locError);
        toast.error('Could not capture location. You can add it later from profile.', {
          duration: 3000,
        });
        // Don't block signup if location fails
      }
      
      // Small delay to show location success message
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      switch (role) {
        case 'customer':
          navigate('/customer');
          break;
        case 'kitchen_owner':
          navigate('/kitchen/register');
          break;
        case 'delivery_partner':
          navigate('/delivery/register');
          break;
        default:
          navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Signup failed');
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
          <h1 className="text-2xl font-bold mb-2">Create Account</h1>
          <p className="text-muted-foreground">Join FoodHub today</p>
        </div>

        <div className="bg-card p-8 rounded-lg border card-shadow">
          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <Label htmlFor="role">I am a</Label>
                <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="kitchen_owner">Cloud Kitchen Owner</SelectItem>
                    <SelectItem value="delivery_partner">Delivery Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="username">Full Name</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
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
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
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
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndSignup} className="space-y-4">
              <div>
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 4-digit OTP"
                  required
                  maxLength={4}
                />
                <p className="text-xs text-muted-foreground mt-1">OTP sent to {email}</p>
              </div>
              <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <Navigation className="h-4 w-4 mr-2" />
                    Verify & Sign Up
                  </>
                )}
              </Button>
              {(role === 'customer' || role === 'delivery_partner') && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  Your location will be auto-detected for better delivery experience
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setStep('email')}
                disabled={loading}
              >
                Back
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
