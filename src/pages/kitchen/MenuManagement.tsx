import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { MenuItem } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';

export default function MenuManagement() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [kitchenId, setKitchenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    is_veg: true,
    is_available: true,
  });

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      const { data: kitchen } = await supabase
        .from('kitchens')
        .select('id')
        .eq('owner_id', user?.id)
        .single();

      if (!kitchen) {
        navigate('/kitchen/register');
        return;
      }

      setKitchenId(kitchen.id);

      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('kitchen_id', kitchen.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error: any) {
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('menu_items')
          .update({
            ...formData,
            price: parseFloat(formData.price),
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Item updated');
      } else {
        const { error } = await supabase.from('menu_items').insert({
          kitchen_id: kitchenId,
          ...formData,
          price: parseFloat(formData.price),
        });

        if (error) throw error;
        toast.success('Item added');
      }

      setFormData({ name: '', description: '', price: '', category: '', is_veg: true, is_available: true });
      setShowForm(false);
      setEditingItem(null);
      loadMenuItems();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category: item.category,
      is_veg: item.is_veg,
      is_available: item.is_available,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;

    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) throw error;
      toast.success('Item deleted');
      loadMenuItems();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !item.is_available })
        .eq('id', item.id);

      if (error) throw error;
      loadMenuItems();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/kitchen')}>
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold">Menu Management</h1>
          </div>
          <Button onClick={() => { setShowForm(true); setEditingItem(null); setFormData({ name: '', description: '', price: '', category: '', is_veg: true, is_available: true }); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {showForm && (
          <div className="bg-card border rounded-lg p-6 mb-6">
            <h2 className="font-semibold text-lg mb-4">{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Item Name *</Label>
                  <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Input id="category" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="Pizza, Biryani, etc." required />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>

              <div>
                <Label htmlFor="price">Price (₹) *</Label>
                <Input id="price" type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} required />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={formData.is_veg} onCheckedChange={val => setFormData({ ...formData, is_veg: val })} />
                  <Label>Vegetarian</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formData.is_available} onCheckedChange={val => setFormData({ ...formData, is_available: val })} />
                  <Label>Available</Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="gradient-primary">
                  {editingItem ? 'Update Item' : 'Add Item'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingItem(null); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : menuItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No menu items yet</p>
            <Button onClick={() => setShowForm(true)}>Add First Item</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {menuItems.map(item => (
              <div key={item.id} className="bg-card border rounded-lg p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    <Badge variant={item.is_veg ? 'outline' : 'destructive'} className="text-xs">
                      {item.is_veg ? '🟢' : '🔴'}
                    </Badge>
                    {!item.is_available && <Badge variant="secondary">Unavailable</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{item.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-bold text-primary">{formatCurrency(item.price)}</span>
                    <span className="text-muted-foreground">{item.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={item.is_available} onCheckedChange={() => toggleAvailability(item)} />
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
