import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Loader2, Store } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

const CUISINE_OPTIONS = [
  'North Indian',
  'South Indian',
  'Chinese',
  'Italian',
  'Pizza',
  'Burger',
  'Biryani',
  'Fast Food',
  'Desserts',
  'Beverages',
  'Continental',
  'Mexican',
  'Thai',
  'Japanese',
  'Street Food',
  'Healthy Food',
  'Cloud Kitchen',
];

export default function AdminAddKitchen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  
  const [formData, setFormData] = useState({
    restaurantName: '',
    ownerName: '',
    ownerEmail: '',
    contactNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    description: '',
    deliveryTime: '30-40 mins',
    status: 'approved' as 'pending' | 'approved' | 'rejected',
  });

  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCuisineToggle = (cuisine: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(cuisine)
        ? prev.filter((c) => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.restaurantName || !formData.ownerName || !formData.ownerEmail || !formData.contactNumber) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!formData.address || !formData.city || !formData.state || !formData.pincode) {
      toast.error('Please fill complete address details');
      return;
    }

    if (selectedCuisines.length === 0) {
      toast.error('Please select at least one cuisine type');
      return;
    }

    setLoading(true);
    try {
      // 1. Check if user already exists
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', formData.ownerEmail)
        .single();

      let ownerId: string;

      if (existingUser) {
        ownerId = existingUser.id;
      } else {
        // 2. Create a new auth user (without password - will need to set via email)
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: formData.ownerEmail,
          email_confirm: true,
          user_metadata: {
            username: formData.ownerName,
            role: 'kitchen_owner',
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create user');

        ownerId = authData.user.id;

        // 3. Create user profile
        const { error: profileError } = await supabase.from('user_profiles').insert({
          id: ownerId,
          username: formData.ownerName,
          email: formData.ownerEmail,
          phone: formData.contactNumber,
          role: 'kitchen_owner',
        });

        if (profileError) throw profileError;
      }

      // 4. Upload logo if provided
      let logoUrl: string | null = null;
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `kitchens/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('kitchen-images')
          .upload(filePath, logoFile);

        if (uploadError) {
          console.error('Logo upload failed:', uploadError);
        } else {
          const { data: publicData } = supabase.storage
            .from('kitchen-images')
            .getPublicUrl(filePath);
          logoUrl = publicData.publicUrl;
        }
      }

      // 5. Create kitchen
      const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} - ${formData.pincode}`;
      
      const { error: kitchenError } = await supabase.from('kitchens').insert({
        owner_id: ownerId,
        name: formData.restaurantName,
        description: formData.description || `Delicious ${selectedCuisines.join(', ')} cuisine`,
        address: fullAddress,
        delivery_time: formData.deliveryTime,
        categories: selectedCuisines,
        image_url: logoUrl,
        status: formData.status,
        is_approved: formData.status === 'approved',
        is_open: formData.status === 'approved',
      });

      if (kitchenError) throw kitchenError;

      toast.success('Restaurant/Cloud Kitchen created successfully!');
      navigate('/admin/kitchens');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to create kitchen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/admin/kitchens')}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Add New Restaurant / Cloud Kitchen</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Restaurant Details */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Restaurant Details
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="restaurantName">
                  Restaurant Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="restaurantName"
                  value={formData.restaurantName}
                  onChange={(e) => handleInputChange('restaurantName', e.target.value)}
                  placeholder="e.g., Spice Junction Kitchen"
                  required
                />
              </div>
              <div>
                <Label htmlFor="deliveryTime">Estimated Delivery Time</Label>
                <Input
                  id="deliveryTime"
                  value={formData.deliveryTime}
                  onChange={(e) => handleInputChange('deliveryTime', e.target.value)}
                  placeholder="e.g., 30-40 mins"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Restaurant Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the restaurant and its specialties..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Owner Details */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Owner Details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ownerName">
                  Owner Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ownerName"
                  value={formData.ownerName}
                  onChange={(e) => handleInputChange('ownerName', e.target.value)}
                  placeholder="Full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="contactNumber">
                  Contact Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contactNumber"
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                  placeholder="+91 9876543210"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="ownerEmail">
                  Restaurant Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) => handleInputChange('ownerEmail', e.target.value)}
                  placeholder="owner@restaurant.com"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Owner will receive login credentials on this email
                </p>
              </div>
            </div>
          </div>

          {/* Address Details */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Address Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="address">
                  Complete Address <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Street address, building name, floor"
                  rows={2}
                  required
                />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="e.g., Jaipur"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">
                    State <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="e.g., Rajasthan"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pincode">
                    Pincode <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                    placeholder="e.g., 302001"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cuisine Type */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              Cuisine Type <span className="text-red-500">*</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Select all cuisines this restaurant serves
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CUISINE_OPTIONS.map((cuisine) => (
                <button
                  key={cuisine}
                  type="button"
                  onClick={() => handleCuisineToggle(cuisine)}
                  className={`p-3 border rounded-lg text-sm font-medium transition-all ${
                    selectedCuisines.includes(cuisine)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-card hover:border-primary/50'
                  }`}
                >
                  {cuisine}
                </button>
              ))}
            </div>
            {selectedCuisines.length > 0 && (
              <p className="text-sm text-muted-foreground mt-3">
                Selected: {selectedCuisines.join(', ')}
              </p>
            )}
          </div>

          {/* Logo Upload */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Restaurant Logo</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label
                  htmlFor="logo"
                  className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-muted transition"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-sm font-medium">Choose Logo</span>
                </label>
                <input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <span className="text-sm text-muted-foreground">
                  {logoFile ? logoFile.name : 'No file chosen'}
                </span>
              </div>
              {logoPreview && (
                <div className="w-32 h-32 rounded-lg border overflow-hidden">
                  <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Restaurant Status</h2>
            <Select
              value={formData.status}
              onValueChange={(value: any) => handleInputChange('status', value)}
            >
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved & Active</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-2">
              {formData.status === 'approved' && 'Restaurant will be visible to customers immediately'}
              {formData.status === 'pending' && 'Restaurant will need admin approval before going live'}
              {formData.status === 'rejected' && 'Restaurant will not be visible to customers'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/kitchens')}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 gradient-primary">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Save & Create Restaurant'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
