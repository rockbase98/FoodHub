import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

const CATEGORIES = ['Pizza', 'Biryani', 'Chinese', 'North Indian', 'South Indian', 'Desserts', 'Beverages', 'Fast Food', 'Healthy'];

export default function KitchenRegistration() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    delivery_time: '30-40 mins',
    categories: [] as string[],
  });

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.categories.length === 0) {
      toast.error('Select at least one category');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('kitchens').insert({
        owner_id: user?.id,
        ...formData,
        status: 'pending',
        is_approved: false,
      });

      if (error) throw error;
      toast.success('Kitchen registered! Awaiting admin approval');
      navigate('/kitchen');
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
          <h1 className="text-xl font-bold">Register Your Kitchen</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <div>
              <Label htmlFor="name">Kitchen Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Delicious Bites Kitchen"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your kitchen and specialties..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="address">Complete Address *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street, landmark, city, pincode"
                required
              />
            </div>

            <div>
              <Label htmlFor="delivery_time">Estimated Delivery Time</Label>
              <Input
                id="delivery_time"
                value={formData.delivery_time}
                onChange={e => setFormData({ ...formData, delivery_time: e.target.value })}
                placeholder="30-40 mins"
              />
            </div>

            <div>
              <Label>Food Categories *</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {CATEGORIES.map(cat => (
                  <Badge
                    key={cat}
                    variant={formData.categories.includes(cat) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleCategory(cat)}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
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
