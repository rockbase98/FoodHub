import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

export default function DeliveryRegistration() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_type: 'bike' as 'bike' | 'scooter' | 'bicycle',
    vehicle_number: '',
    license_number: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('delivery_partners').insert({
        user_id: user?.id,
        ...formData,
        status: 'pending',
        is_approved: false,
      });

      if (error) throw error;
      toast.success('Registration submitted! Awaiting approval');
      navigate('/delivery');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Delivery Partner Registration</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <div>
              <Label htmlFor="vehicle_type">Vehicle Type *</Label>
              <Select value={formData.vehicle_type} onValueChange={(val: any) => setFormData({ ...formData, vehicle_type: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bike">Bike</SelectItem>
                  <SelectItem value="scooter">Scooter</SelectItem>
                  <SelectItem value="bicycle">Bicycle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="vehicle_number">Vehicle Number *</Label>
              <Input
                id="vehicle_number"
                value={formData.vehicle_number}
                onChange={e => setFormData({ ...formData, vehicle_number: e.target.value })}
                placeholder="DL01AB1234"
                required
              />
            </div>

            <div>
              <Label htmlFor="license_number">Driving License Number *</Label>
              <Input
                id="license_number"
                value={formData.license_number}
                onChange={e => setFormData({ ...formData, license_number: e.target.value })}
                placeholder="DL-1234567890123"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full gradient-primary" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit for Approval'}
          </Button>
        </form>
      </div>
    </div>
  );
}
