import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Phone, Mail, LogOut, ChevronRight, MapPin } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import BottomNav from '../../components/layout/BottomNav';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../lib/authService';
import { toast } from 'sonner';

export default function CustomerProfile() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuthStore();
  const [username, setUsername] = useState(user?.username || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authService.updateProfile(user!.id, { username, phone });
      updateUser({ username, phone });
      toast.success('Profile updated');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      logout();
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-to-b from-primary to-primary/90 text-white pt-8 pb-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 shadow-xl">
              <UserIcon className="h-12 w-12" />
            </div>
            <h1 className="text-2xl font-bold mb-1">{user?.username || 'User'}</h1>
            <p className="text-white/80 text-sm">{user?.email}</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 -mt-6 max-w-2xl space-y-4">
        {/* Profile Info Card */}
        <div className="bg-card rounded-2xl p-6 card-shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-lg">Profile Information</h2>
            <Button
              size="sm"
              variant={isEditing ? 'outline' : 'default'}
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <Label htmlFor="username">Full Name</Label>
                <div className="flex items-center gap-2 mt-1">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your name"
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="flex-1"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <UserIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{username || 'Not set'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{phone || 'Not set'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-2xl p-4 card-shadow">
          <button
            onClick={() => navigate('/customer/addresses')}
            className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Saved Addresses</p>
                <p className="text-sm text-muted-foreground">Manage delivery locations</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Logout */}
        <div className="bg-card rounded-2xl p-4 card-shadow">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl text-destructive hover:bg-destructive/10 transition-colors font-semibold"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>

        {/* Account Type */}
        <div className="bg-muted/50 rounded-2xl p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Account Type</p>
          <p className="font-bold capitalize">{user?.role?.replace('_', ' ')}</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
