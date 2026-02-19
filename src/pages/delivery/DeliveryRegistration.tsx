import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Upload, Bike, FileText, User } from 'lucide-react';
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

  // Document upload states
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licensePreview, setLicensePreview] = useState<string>('');
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [idProofPreview, setIdProofPreview] = useState<string>('');

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
        .from('delivery-documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('File upload failed:', uploadError);
        return null;
      }

      const { data: publicData } = supabase.storage
        .from('delivery-documents')
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
    if (!formData.vehicle_number || !formData.license_number) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!licenseFile) {
      toast.error('Driving License document is mandatory');
      return;
    }

    if (!idProofFile) {
      toast.error('ID Proof document is mandatory');
      return;
    }

    setLoading(true);

    try {
      // Upload documents
      const [licenseUrl, idProofUrl] = await Promise.all([
        uploadFile(licenseFile, 'licenses'),
        uploadFile(idProofFile, 'id-proofs'),
      ]);

      if (!licenseUrl || !idProofUrl) {
        throw new Error('Document upload failed');
      }

      const { error } = await supabase.from('delivery_partners').insert({
        user_id: user?.id,
        ...formData,
        license_url: licenseUrl,
        id_proof_url: idProofUrl,
        status: 'pending',
        is_approved: false,
      });

      if (error) throw error;
      toast.success('Registration submitted! Awaiting approval');
      navigate('/delivery');
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
          <h1 className="text-xl font-bold">Delivery Partner Registration</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 mb-6 border">
          <div className="flex items-center gap-3 mb-2">
            <Bike className="h-8 w-8 text-primary" />
            <h2 className="text-2xl font-bold">Join as Delivery Partner</h2>
          </div>
          <p className="text-muted-foreground">
            Start earning by delivering food orders in your area
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vehicle Details */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Bike className="h-5 w-5 text-primary" />
              Vehicle Details
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="vehicle_type">
                  Vehicle Type <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.vehicle_type} onValueChange={(val: any) => setFormData({ ...formData, vehicle_type: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bike">Bike / Motorcycle</SelectItem>
                    <SelectItem value="scooter">Scooter</SelectItem>
                    <SelectItem value="bicycle">Bicycle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="vehicle_number">
                  Vehicle Registration Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="vehicle_number"
                  value={formData.vehicle_number}
                  onChange={e => setFormData({ ...formData, vehicle_number: e.target.value })}
                  placeholder="e.g., DL01AB1234"
                  className="uppercase"
                  required
                />
              </div>

              <div>
                <Label htmlFor="license_number">
                  Driving License Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="license_number"
                  value={formData.license_number}
                  onChange={e => setFormData({ ...formData, license_number: e.target.value })}
                  placeholder="e.g., DL-1234567890123"
                  className="uppercase"
                  required
                />
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
              {/* Driving License */}
              <div>
                <Label>
                  Driving License (Front & Back) <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Upload a clear photo of your driving license
                </p>
                <div className="flex items-center gap-4">
                  <label
                    htmlFor="license"
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-muted transition"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-sm font-medium">Choose File</span>
                  </label>
                  <input
                    id="license"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, setLicenseFile, setLicensePreview)}
                    className="hidden"
                  />
                  <span className="text-sm text-muted-foreground">
                    {licenseFile ? licenseFile.name : 'No file chosen'}
                  </span>
                </div>
                {licensePreview && (
                  <div className="mt-2 w-40 h-40 rounded-lg border overflow-hidden">
                    <img src={licensePreview} alt="License" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* ID Proof */}
              <div>
                <Label>
                  ID Proof (Aadhar/PAN/Voter ID) <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Upload your government-issued ID proof
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
                  <div className="mt-2 w-40 h-40 rounded-lg border overflow-hidden">
                    <img src={idProofPreview} alt="ID Proof" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Your application will be reviewed by our admin team within 24-48 hours.
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
