import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Upload, Loader2, Settings as SettingsIcon, Menu as MenuIcon } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { supabase } from '../../lib/supabase';
import { Kitchen, MenuItem } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';

const FOOD_CATEGORIES = [
  'Pizza',
  'Biryani',
  'Burger',
  'Chinese',
  'North Indian',
  'South Indian',
  'Desserts',
  'Beverages',
  'Fast Food',
  'Continental',
  'Mexican',
  'Thai',
  'Japanese',
  'Street Food',
];

export default function AdminKitchenManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'menu' | 'settings' | 'add-item'>('menu');
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Menu Item Form States
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    is_veg: true,
    is_available: true,
  });
  const [itemImage, setItemImage] = useState<File | null>(null);
  const [itemImagePreview, setItemImagePreview] = useState<string>('');
  const [savingItem, setSavingItem] = useState(false);

  // Delete Dialog
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; item: MenuItem | null }>({ open: false, item: null });

  // Kitchen Settings Form
  const [kitchenForm, setKitchenForm] = useState({
    name: '',
    description: '',
    address: '',
    delivery_time: '',
    categories: [] as string[],
    status: 'pending' as 'pending' | 'approved' | 'rejected',
    is_open: false,
  });
  const [kitchenImage, setKitchenImage] = useState<File | null>(null);
  const [kitchenImagePreview, setKitchenImagePreview] = useState<string>('');
  const [savingKitchen, setSavingKitchen] = useState(false);

  useEffect(() => {
    loadKitchen();
    loadMenuItems();
  }, [id]);

  useEffect(() => {
    if (kitchen) {
      setKitchenForm({
        name: kitchen.name,
        description: kitchen.description || '',
        address: kitchen.address,
        delivery_time: kitchen.delivery_time,
        categories: kitchen.categories || [],
        status: kitchen.status as 'pending' | 'approved' | 'rejected',
        is_open: kitchen.is_open,
      });
      setKitchenImagePreview(kitchen.image_url || '');
    }
  }, [kitchen]);

  useEffect(() => {
    if (editingItem) {
      setItemForm({
        name: editingItem.name,
        description: editingItem.description || '',
        price: editingItem.price.toString(),
        category: editingItem.category,
        is_veg: editingItem.is_veg,
        is_available: editingItem.is_available,
      });
      setItemImagePreview(editingItem.image_url || '');
      setActiveTab('add-item');
    }
  }, [editingItem]);

  const loadKitchen = async () => {
    try {
      const { data, error } = await supabase
        .from('kitchens')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setKitchen(data);
    } catch (error: any) {
      toast.error('Failed to load kitchen');
    } finally {
      setLoading(false);
    }
  };

  const loadMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('kitchen_id', id)
        .order('category', { ascending: true });

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error: any) {
      toast.error('Failed to load menu items');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setItemImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setItemImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKitchenImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setKitchenImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setKitchenImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCategoryToggle = (category: string) => {
    setKitchenForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleSaveKitchen = async () => {
    if (!kitchenForm.name || !kitchenForm.address || kitchenForm.categories.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }

    setSavingKitchen(true);
    try {
      let imageUrl: string | null = kitchen?.image_url || null;

      // Upload image if new file selected
      if (kitchenImage) {
        const fileExt = kitchenImage.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `kitchens/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('kitchen-images')
          .upload(filePath, kitchenImage);

        if (uploadError) {
          console.error('Image upload failed:', uploadError);
        } else {
          const { data: publicData } = supabase.storage
            .from('kitchen-images')
            .getPublicUrl(filePath);
          imageUrl = publicData.publicUrl;
        }
      }

      const updateData = {
        name: kitchenForm.name,
        description: kitchenForm.description,
        address: kitchenForm.address,
        delivery_time: kitchenForm.delivery_time,
        categories: kitchenForm.categories,
        status: kitchenForm.status,
        is_approved: kitchenForm.status === 'approved',
        is_open: kitchenForm.is_open,
        image_url: imageUrl,
      };

      const { error } = await supabase
        .from('kitchens')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      toast.success('Kitchen details updated successfully!');
      loadKitchen();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update kitchen');
    } finally {
      setSavingKitchen(false);
    }
  };

  const handleSaveMenuItem = async () => {
    if (!itemForm.name || !itemForm.category || !itemForm.price) {
      toast.error('Please fill all required fields');
      return;
    }

    setSavingItem(true);
    try {
      let imageUrl: string | null = editingItem?.image_url || null;

      // Upload image if new file selected
      if (itemImage) {
        const fileExt = itemImage.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `menu-items/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('menu-images')
          .upload(filePath, itemImage);

        if (uploadError) {
          console.error('Image upload failed:', uploadError);
        } else {
          const { data: publicData } = supabase.storage
            .from('menu-images')
            .getPublicUrl(filePath);
          imageUrl = publicData.publicUrl;
        }
      }

      const itemData = {
        kitchen_id: id,
        name: itemForm.name,
        description: itemForm.description,
        price: parseFloat(itemForm.price),
        category: itemForm.category,
        is_veg: itemForm.is_veg,
        is_available: itemForm.is_available,
        image_url: imageUrl,
      };

      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Menu item updated!');
      } else {
        // Create new item
        const { error } = await supabase
          .from('menu_items')
          .insert(itemData);

        if (error) throw error;
        toast.success('Menu item added!');
      }

      // Reset form
      setItemForm({
        name: '',
        description: '',
        price: '',
        category: '',
        is_veg: true,
        is_available: true,
      });
      setItemImage(null);
      setItemImagePreview('');
      setEditingItem(null);
      setActiveTab('menu');
      loadMenuItems();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save menu item');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteMenuItem = async () => {
    if (!deleteDialog.item) return;

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', deleteDialog.item.id);

      if (error) throw error;
      toast.success('Menu item deleted');
      setDeleteDialog({ open: false, item: null });
      loadMenuItems();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete item');
    }
  };

  const handleToggleItemAvailability = async (item: MenuItem) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !item.is_available })
        .eq('id', item.id);

      if (error) throw error;
      toast.success(`Item ${!item.is_available ? 'enabled' : 'disabled'}`);
      loadMenuItems();
    } catch (error: any) {
      toast.error('Failed to update item');
    }
  };

  if (loading || !kitchen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => navigate('/admin/kitchens')}>
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{kitchen.name}</h1>
              <p className="text-sm text-muted-foreground">{kitchen.description}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'menu'
                  ? 'bg-primary text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <MenuIcon className="h-4 w-4 inline mr-2" />
              Menu Editor
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'settings'
                  ? 'bg-primary text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <SettingsIcon className="h-4 w-4 inline mr-2" />
              Settings
            </button>
            <button
              onClick={() => {
                setActiveTab('add-item');
                setEditingItem(null);
                setItemForm({
                  name: '',
                  description: '',
                  price: '',
                  category: '',
                  is_veg: true,
                  is_available: true,
                });
                setItemImagePreview('');
              }}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'add-item'
                  ? 'bg-primary text-white'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <Plus className="h-4 w-4 inline mr-2" />
              Add Food Item
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* MENU EDITOR TAB */}
        {activeTab === 'menu' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Menu Items ({menuItems.length})</h2>
              <Button
                onClick={() => {
                  setActiveTab('add-item');
                  setEditingItem(null);
                }}
                className="gradient-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Food Item
              </Button>
            </div>

            {menuItems.length === 0 ? (
              <div className="text-center py-12 bg-card border rounded-lg">
                <MenuIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No menu items yet</p>
                <Button onClick={() => setActiveTab('add-item')} className="gradient-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Item
                </Button>
              </div>
            ) : (
              <div className="bg-card border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 font-semibold">Item Name</th>
                      <th className="text-left p-4 font-semibold">Category</th>
                      <th className="text-left p-4 font-semibold">Price</th>
                      <th className="text-left p-4 font-semibold">Type</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                      <th className="text-right p-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {item.image_url ? (
                              <img src={item.image_url} className="w-12 h-12 rounded-lg object-cover" alt="" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                🍽️
                              </div>
                            )}
                            <div>
                              <p className="font-semibold">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary">{item.category}</Badge>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold">{formatCurrency(item.price)}</span>
                        </td>
                        <td className="p-4">
                          <Badge variant={item.is_veg ? 'default' : 'destructive'}>
                            {item.is_veg ? '🟢 Veg' : '🔴 Non-Veg'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Switch
                            checked={item.is_available}
                            onCheckedChange={() => handleToggleItemAvailability(item)}
                          />
                          <span className="ml-2 text-sm">
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingItem(item)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteDialog({ open: true, item })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Restaurant Settings</h2>
            <div className="bg-card border rounded-lg p-6 max-w-3xl">
              <div className="space-y-6">
                {/* Restaurant Name */}
                <div>
                  <Label htmlFor="kitchen-name">
                    Restaurant Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="kitchen-name"
                    value={kitchenForm.name}
                    onChange={(e) => setKitchenForm({ ...kitchenForm, name: e.target.value })}
                    placeholder="Restaurant name"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="kitchen-description">Description</Label>
                  <Textarea
                    id="kitchen-description"
                    value={kitchenForm.description}
                    onChange={(e) => setKitchenForm({ ...kitchenForm, description: e.target.value })}
                    placeholder="Describe the restaurant..."
                    rows={3}
                  />
                </div>

                {/* Address */}
                <div>
                  <Label htmlFor="kitchen-address">
                    Address <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="kitchen-address"
                    value={kitchenForm.address}
                    onChange={(e) => setKitchenForm({ ...kitchenForm, address: e.target.value })}
                    placeholder="Full address"
                    rows={2}
                  />
                </div>

                {/* Delivery Time */}
                <div>
                  <Label htmlFor="kitchen-delivery-time">Delivery Time</Label>
                  <Input
                    id="kitchen-delivery-time"
                    value={kitchenForm.delivery_time}
                    onChange={(e) => setKitchenForm({ ...kitchenForm, delivery_time: e.target.value })}
                    placeholder="e.g., 30-40 mins"
                  />
                </div>

                {/* Categories */}
                <div>
                  <Label className="mb-3 block">
                    Cuisine Types <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {FOOD_CATEGORIES.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => handleCategoryToggle(category)}
                        className={`p-2 border rounded-lg text-sm font-medium transition-all ${
                          kitchenForm.categories.includes(category)
                            ? 'bg-primary text-white border-primary'
                            : 'bg-card hover:border-primary/50'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                  {kitchenForm.categories.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selected: {kitchenForm.categories.join(', ')}
                    </p>
                  )}
                </div>

                {/* Logo Upload */}
                <div>
                  <Label>Restaurant Logo</Label>
                  <div className="mt-2 space-y-4">
                    <div className="flex items-center gap-4">
                      <label
                        htmlFor="kitchen-image"
                        className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-muted transition"
                      >
                        <Upload className="h-4 w-4" />
                        <span className="text-sm font-medium">Choose Logo</span>
                      </label>
                      <input
                        id="kitchen-image"
                        type="file"
                        accept="image/*"
                        onChange={handleKitchenImageChange}
                        className="hidden"
                      />
                      <span className="text-sm text-muted-foreground">
                        {kitchenImage ? kitchenImage.name : 'No file chosen'}
                      </span>
                    </div>
                    {kitchenImagePreview && (
                      <div className="w-40 h-40 rounded-lg border overflow-hidden">
                        <img src={kitchenImagePreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <Label htmlFor="kitchen-status">Restaurant Status</Label>
                  <Select
                    value={kitchenForm.status}
                    onValueChange={(val: any) => setKitchenForm({ ...kitchenForm, status: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending Approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Is Open Toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Restaurant Open/Close</Label>
                    <p className="text-sm text-muted-foreground">Is the restaurant currently accepting orders?</p>
                  </div>
                  <Switch
                    checked={kitchenForm.is_open}
                    onCheckedChange={(val) => setKitchenForm({ ...kitchenForm, is_open: val })}
                  />
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t">
                  <Button
                    onClick={handleSaveKitchen}
                    disabled={savingKitchen}
                    className="w-full gradient-primary"
                  >
                    {savingKitchen ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Save Restaurant Settings'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADD/EDIT ITEM TAB */}
        {activeTab === 'add-item' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">
              {editingItem ? 'Edit Food Item' : 'Add Food Item'}
            </h2>
            <div className="bg-card border rounded-lg p-6 max-w-2xl">
              <div className="space-y-6">
                {/* Item Name */}
                <div>
                  <Label htmlFor="item-name">
                    Food Item Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="item-name"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    placeholder="e.g., Margherita Pizza"
                  />
                </div>

                {/* Category */}
                <div>
                  <Label htmlFor="category">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select value={itemForm.category} onValueChange={(val) => setItemForm({ ...itemForm, category: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {FOOD_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price */}
                <div>
                  <Label htmlFor="price">
                    Price (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                    placeholder="e.g., 299"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={itemForm.description}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                    placeholder="Describe the dish, ingredients, taste..."
                    rows={3}
                  />
                </div>

                {/* Veg / Non-Veg Toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Veg / Non-Veg</Label>
                    <p className="text-sm text-muted-foreground">Is this a vegetarian item?</p>
                  </div>
                  <Switch
                    checked={itemForm.is_veg}
                    onCheckedChange={(val) => setItemForm({ ...itemForm, is_veg: val })}
                  />
                </div>

                {/* Availability Toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Available</Label>
                    <p className="text-sm text-muted-foreground">Is this item currently available?</p>
                  </div>
                  <Switch
                    checked={itemForm.is_available}
                    onCheckedChange={(val) => setItemForm({ ...itemForm, is_available: val })}
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <Label>Upload Image</Label>
                  <div className="mt-2 space-y-4">
                    <div className="flex items-center gap-4">
                      <label
                        htmlFor="item-image"
                        className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-muted transition"
                      >
                        <Upload className="h-4 w-4" />
                        <span className="text-sm font-medium">Choose Image</span>
                      </label>
                      <input
                        id="item-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <span className="text-sm text-muted-foreground">
                        {itemImage ? itemImage.name : 'No file chosen'}
                      </span>
                    </div>
                    {itemImagePreview && (
                      <div className="w-40 h-40 rounded-lg border overflow-hidden">
                        <img src={itemImagePreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveTab('menu');
                      setEditingItem(null);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveMenuItem}
                    disabled={savingItem}
                    className="flex-1 gradient-primary"
                  >
                    {savingItem ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      editingItem ? 'Update Item' : 'Save Item'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Item Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, item: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Menu Item</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete <strong>{deleteDialog.item?.name}</strong>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, item: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteMenuItem}>
              Delete Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
