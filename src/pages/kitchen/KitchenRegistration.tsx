import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Loader2, Store, FileText, MapPin, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

const CATEGORIES = [
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
  'Healthy Food',
  'Cloud Kitchen',
];

export default function KitchenRegistration() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    delivery_time: '30-40 mins',
    categories: [] as string[],
  });

  // File upload states
  const [fssaiFile, setFssaiFile] = useState<File | null>(null);
  const [fssaiPreview, setFssaiPreview] = useState<string>('');
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [idProofPreview, setIdProofPreview] = useState<string>('');
  const [addressProofFile, setAddressProofFile] = useState<File | null>(null);
  const [addressProofPreview, setAddressProofPreview] = useState<string>('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const toggleCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void,
    setPreview: (preview: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('kitchen-documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('File upload failed:', uploadError);
        return null;
      }

      const { data: publicData } = supabase.storage
        .from('kitchen-documents')
        .getPublicUrl(filePath);

      return publicData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.address || !formData.city || !formData.state || !formData.pincode) {
      toast.error('Please fill all required fields');
      return;
    }

    if (formData.categories.length === 0) {
      toast.error('Select at least one category');
      return;
    }

    if (!fssaiFile) {
      toast.error('FSSAI License is mandatory');
      return;
    }

    if (!idProofFile) {
      toast.error('ID Proof is mandatory');
      return;
    }

    if (!addressProofFile) {
      toast.error('Address Proof is mandatory');
      return;
    }

    setLoading(true);

    try {
      // Upload documents
      const [fssaiUrl, idProofUrl, addressProofUrl, logoUrl] = await Promise.all([
        uploadFile(fssaiFile, 'fssai'),
        uploadFile(idProofFile, 'id-proofs'),
        uploadFile(addressProofFile, 'address-proofs'),
        logoFile ? uploadFile(logoFile, 'logos') : Promise.resolve(null),
      ]);

      if (!fssaiUrl || !idProofUrl || !addressProofUrl) {
        throw new Error('Document upload failed');
      }

      const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} - ${formData.pincode}`;

      const { error } = await supabase.from('kitchens').insert({
        owner_id: user?.id,
        name: formData.name,
        description: formData.description || `Delicious ${formData.categories.join(', ')} cuisine`,
        address: fullAddress,
        delivery_time: formData.delivery_time,
        categories: formData.categories,
        fssai_license_url: fssaiUrl,
        id_proof_url: idProofUrl,
        address_proof_url: addressProofUrl,
        image_url: logoUrl,
        status: 'pending',
        is_approved: false,
        is_open: false,
      });

      if (error) throw error;
      toast.success('Kitchen registered! Awaiting admin approval');
      navigate('/kitchen');
    } catch (error: any) {
      console.error('Registration error:', error);
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

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 mb-6 border">
          <div className="flex items-center gap-3 mb-2">
            <Store className="h-8 w-8 text-primary" />
            <h2 className="text-2xl font-bold">Register Your Cloud Kitchen</h2>
          </div>
          <p className="text-muted-foreground">
            Join our platform and start receiving orders from customers
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Details */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Kitchen Details
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">
                  Kitchen Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Spice Junction Cloud Kitchen"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your kitchen and specialties..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="delivery_time">
                  Estimated Delivery Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="delivery_time"
                  value={formData.delivery_time}
                  onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
                  placeholder="e.g., 30-40 mins"
                />
              </div>

              <div>
                <Label className="mb-2 block">
                  Food Categories <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`p-2 border rounded-lg text-sm font-medium transition-all ${
                        formData.categories.includes(cat)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-card hover:border-primary/50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {formData.categories.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected: {formData.categories.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Address Details */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Kitchen Address
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="address">
                  Complete Address <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="e.g., 302001"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Document Upload */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Required Documents
            </h3>
            <div className="space-y-6">
              {/* FSSAI License */}
              <div>
                <Label>
                  FSSAI License <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Upload your Food Safety and Standards Authority of India license
                </p>
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="fssai"
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-muted transition"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-sm font-medium">Choose File</span>
                  </label>
                  <input
                    id="fssai"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, setFssaiFile, setFssaiPreview)}
                    className="hidden"
                  />
                  <span className="text-sm text-muted-foreground">
                    {fssaiFile ? fssaiFile.name : 'No file chosen'}
                  </span>
                </div>
                {fssaiPreview && (
                  <div className="mt-2 w-32 h-32 rounded-lg border overflow-hidden">
                    <img src={fssaiPreview} alt="FSSAI" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* ID Proof */}
              <div>
                <Label>
                  ID Proof (Aadhar/PAN/Driving License) <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Upload owner's government-issued ID proof
                </p>
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="idproof"
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-muted transition"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-sm font-medium">Choose File</span>
                  </label>
                  <input
                    id="idproof"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, setIdProofFile, setIdProofPreview)}
                    className="hidden"
                  />
                  <span className="text-sm text-muted-foreground">
                    {idProofFile ? idProofFile.name : 'No file chosen'}
                  </span>
                </div>
                {idProofPreview && (
                  <div className="mt-2 w-32 h-32 rounded-lg border overflow-hidden">
                    <img src={idProofPreview} alt="ID Proof" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Address Proof */}
              <div>
                <Label>
                  Address Proof (Electricity Bill/Rent Agreement) <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Upload kitchen address verification document
                </p>
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="addressproof"
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-muted transition"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-sm font-medium">Choose File</span>
                  </label>
                  <input
                    id="addressproof"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, setAddressProofFile, setAddressProofPreview)}
                    className="hidden"
                  />
                  <span className="text-sm text-muted-foreground">
                    {addressProofFile ? addressProofFile.name : 'No file chosen'}
                  </span>
                </div>
                {addressProofPreview && (
                  <div className="mt-2 w-32 h-32 rounded-lg border overflow-hidden">
                    <img src={addressProofPreview} alt="Address Proof" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Kitchen Logo (Optional) */}
              <div>
                <Label>Kitchen Logo (Optional)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Upload your kitchen/restaurant logo
                </p>
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="logo"
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-muted transition"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-sm font-medium">Choose File</span>
                  </label>
                  <input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, setLogoFile, setLogoPreview)}
                    className="hidden"
                  />
                  <span className="text-sm text-muted-foreground">
                    {logoFile ? logoFile.name : 'No file chosen'}
                  </span>
                </div>
                {logoPreview && (
                  <div className="mt-2 w-32 h-32 rounded-lg border overflow-hidden">
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Your kitchen will be reviewed by our admin team within 24-48 hours.
              You'll be notified via email once approved.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gradient-primary" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit for Approval'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
