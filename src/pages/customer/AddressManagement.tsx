import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Home, Briefcase, Plus, Edit2, Trash2, Star, Navigation, Check, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { getCurrentLocation } from '../../lib/utils';
import { toast } from 'sonner';

interface Address {
  id: string;
  user_id: string;
  label: string;
  address_line: string;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
  created_at: string;
}

export default function AddressManagement() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    label: 'home',
    customLabel: '',
    address_line: '',
    lat: null as number | null,
    lng: null as number | null,
    is_default: false,
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapPickerMode, setMapPickerMode] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, []);

  useEffect(() => {
    if (addresses.length > 0 && !loading) {
      setTimeout(() => initializeMap(), 500);
    }
  }, [addresses, loading]);

  const loadAddresses = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error: any) {
      toast.error('Failed to load addresses');
      console.error('Load addresses error:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = () => {
    if (!mapRef.current || addresses.length === 0) return;
    if (typeof google === 'undefined' || !google.maps) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    // Calculate center from all addresses
    const validAddresses = addresses.filter((a) => a.lat && a.lng);
    if (validAddresses.length === 0) return;

    const avgLat = validAddresses.reduce((sum, a) => sum + (a.lat || 0), 0) / validAddresses.length;
    const avgLng = validAddresses.reduce((sum, a) => sum + (a.lng || 0), 0) / validAddresses.length;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: avgLat, lng: avgLng },
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
    });

    mapInstanceRef.current = map;

    // Add markers for each address
    validAddresses.forEach((address, index) => {
      const marker = new google.maps.Marker({
        position: { lat: Number(address.lat), lng: Number(address.lng) },
        map,
        title: address.label,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: address.is_default ? 14 : 10,
          fillColor: getLabelColor(address.label),
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: address.is_default ? 4 : 2,
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${address.label.toUpperCase()}</h3>
            <p style="font-size: 12px; color: #666;">${address.address_line}</p>
            ${address.is_default ? '<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">DEFAULT</span>' : ''}
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    const bounds = new google.maps.LatLngBounds();
    validAddresses.forEach((address) => {
      bounds.extend({ lat: Number(address.lat), lng: Number(address.lng) });
    });
    map.fitBounds(bounds);
  };

  const getLabelColor = (label: string) => {
    const colors: Record<string, string> = {
      home: '#10b981',
      work: '#3b82f6',
      other: '#f59e0b',
    };
    return colors[label.toLowerCase()] || '#6366f1';
  };

  const getLabelIcon = (label: string) => {
    const icons: Record<string, any> = {
      home: Home,
      work: Briefcase,
      other: MapPin,
    };
    return icons[label.toLowerCase()] || MapPin;
  };

  const handleGetCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const location = await getCurrentLocation();
      setFormData((prev) => ({
        ...prev,
        lat: location.lat,
        lng: location.lng,
        address_line: prev.address_line || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
      }));
      toast.success('Location detected successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to get location');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleMapPicker = () => {
    setMapPickerMode(true);
    if (typeof google === 'undefined' || !google.maps) {
      toast.error('Google Maps not loaded');
      return;
    }

    const map = new google.maps.Map(document.getElementById('map-picker')!, {
      center: formData.lat && formData.lng ? { lat: formData.lat, lng: formData.lng } : { lat: 28.6139, lng: 77.2090 },
      zoom: 13,
    });

    const marker = new google.maps.Marker({
      position: map.getCenter()!,
      map,
      draggable: true,
    });

    marker.addListener('dragend', () => {
      const position = marker.getPosition()!;
      setFormData((prev) => ({
        ...prev,
        lat: position.lat(),
        lng: position.lng(),
      }));
    });

    map.addListener('click', (e: any) => {
      marker.setPosition(e.latLng);
      setFormData((prev) => ({
        ...prev,
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      }));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const finalLabel = formData.label === 'custom' ? formData.customLabel : formData.label;

    if (!finalLabel || !formData.address_line || !formData.lat || !formData.lng) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (editingAddress) {
        // Update existing address
        const { error } = await supabase
          .from('addresses')
          .update({
            label: finalLabel,
            address_line: formData.address_line,
            lat: formData.lat,
            lng: formData.lng,
            is_default: formData.is_default,
          })
          .eq('id', editingAddress.id);

        if (error) throw error;

        // If setting as default, unset others
        if (formData.is_default) {
          await supabase
            .from('addresses')
            .update({ is_default: false })
            .eq('user_id', user.id)
            .neq('id', editingAddress.id);
        }

        toast.success('Address updated successfully');
      } else {
        // Create new address
        const { error } = await supabase.from('addresses').insert({
          user_id: user.id,
          label: finalLabel,
          address_line: formData.address_line,
          lat: formData.lat,
          lng: formData.lng,
          is_default: formData.is_default,
        });

        if (error) throw error;

        // If setting as default, unset others
        if (formData.is_default) {
          await supabase
            .from('addresses')
            .update({ is_default: false })
            .eq('user_id', user.id);
        }

        toast.success('Address added successfully');
      }

      resetForm();
      setShowAddModal(false);
      setEditingAddress(null);
      loadAddresses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save address');
    }
  };

  const handleSetDefault = async (addressId: string) => {
    if (!user) return;
    try {
      // Unset all defaults
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);

      // Set new default
      await supabase.from('addresses').update({ is_default: true }).eq('id', addressId);

      toast.success('Default address updated');
      loadAddresses();
    } catch (error: any) {
      toast.error('Failed to update default address');
    }
  };

  const handleDelete = async (addressId: string) => {
    try {
      const { error } = await supabase.from('addresses').delete().eq('id', addressId);
      if (error) throw error;
      toast.success('Address deleted');
      setDeleteConfirm(null);
      loadAddresses();
    } catch (error: any) {
      toast.error('Failed to delete address');
    }
  };

  const handleEdit = (address: Address) => {
    setFormData({
      label: ['home', 'work', 'other'].includes(address.label.toLowerCase()) ? address.label.toLowerCase() : 'custom',
      customLabel: ['home', 'work', 'other'].includes(address.label.toLowerCase()) ? '' : address.label,
      address_line: address.address_line,
      lat: address.lat,
      lng: address.lng,
      is_default: address.is_default,
    });
    setEditingAddress(address);
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      label: 'home',
      customLabel: '',
      address_line: '',
      lat: null,
      lng: null,
      is_default: false,
    });
    setMapPickerMode(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)}>
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold">My Addresses</h1>
              <p className="text-sm text-muted-foreground">Manage your delivery locations</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left - Address List */}
          <div className="space-y-4">
            {/* Add New Button */}
            <Button onClick={() => setShowAddModal(true)} className="w-full gradient-primary" size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Add New Address
            </Button>

            {/* Address List */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-card border rounded-lg p-4 animate-pulse">
                    <div className="h-20 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : addresses.length === 0 ? (
              <div className="bg-card border rounded-lg p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <MapPin className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No addresses yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Add your first delivery address</p>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((address) => {
                  const IconComponent = getLabelIcon(address.label);
                  return (
                    <div
                      key={address.id}
                      className={`bg-card border rounded-lg p-4 transition-all ${
                        address.is_default ? 'ring-2 ring-primary ring-offset-2' : 'hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${getLabelColor(address.label)}20` }}
                        >
                          <IconComponent className="h-6 w-6" style={{ color: getLabelColor(address.label) }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg capitalize">{address.label}</h3>
                            {address.is_default && (
                              <Badge className="bg-primary text-white">
                                <Star className="h-3 w-3 mr-1 fill-white" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{address.address_line}</p>
                          {address.lat && address.lng && (
                            <p className="text-xs text-muted-foreground font-mono">
                              📍 {address.lat.toFixed(4)}, {address.lng.toFixed(4)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-4">
                        {!address.is_default && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetDefault(address.id)}
                            className="flex-1"
                          >
                            <Star className="h-4 w-4 mr-1" />
                            Set Default
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(address)}
                          className="flex-1"
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteConfirm(address.id)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Delete Confirmation */}
                      {deleteConfirm === address.id && (
                        <div className="mt-3 p-3 bg-destructive/10 border border-destructive rounded-lg">
                          <p className="text-sm font-medium text-destructive mb-2">Delete this address?</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(address.id)}
                              className="flex-1"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteConfirm(null)}
                              className="flex-1"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right - Map View */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-card border rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 border-b">
                <h3 className="font-semibold flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-primary" />
                  All Locations on Map
                </h3>
                <p className="text-sm text-muted-foreground">Visual overview of your addresses</p>
              </div>
              {addresses.length > 0 ? (
                <div ref={mapRef} className="h-96 w-full" />
              ) : (
                <div className="h-96 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Add addresses to see them on map</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Address Modal */}
      <Dialog open={showAddModal} onOpenChange={(open) => {
        setShowAddModal(open);
        if (!open) {
          resetForm();
          setEditingAddress(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Label Selection */}
            <div>
              <Label>Address Type</Label>
              <Select value={formData.label} onValueChange={(value) => setFormData({ ...formData, label: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">🏠 Home</SelectItem>
                  <SelectItem value="work">💼 Work</SelectItem>
                  <SelectItem value="other">📍 Other</SelectItem>
                  <SelectItem value="custom">✏️ Custom Label</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Label */}
            {formData.label === 'custom' && (
              <div>
                <Label>Custom Label Name</Label>
                <Input
                  value={formData.customLabel}
                  onChange={(e) => setFormData({ ...formData, customLabel: e.target.value })}
                  placeholder="e.g., Gym, Friend's Place"
                  required
                />
              </div>
            )}

            {/* Address Line */}
            <div>
              <Label>Complete Address</Label>
              <Input
                value={formData.address_line}
                onChange={(e) => setFormData({ ...formData, address_line: e.target.value })}
                placeholder="House no., Street, Locality, City, Pincode"
                required
              />
            </div>

            {/* GPS Coordinates */}
            <div className="space-y-3">
              <Label>GPS Location (Required for delivery)</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  step="any"
                  value={formData.lat || ''}
                  onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                  placeholder="Latitude"
                />
                <Input
                  type="number"
                  step="any"
                  value={formData.lng || ''}
                  onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                  placeholder="Longitude"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetCurrentLocation}
                  disabled={locationLoading}
                  className="flex-1"
                >
                  {locationLoading ? (
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Navigation className="h-4 w-4 mr-2" />
                  )}
                  Use Current Location
                </Button>
                <Button type="button" variant="outline" onClick={handleMapPicker} className="flex-1">
                  <MapPin className="h-4 w-4 mr-2" />
                  Pick on Map
                </Button>
              </div>
            </div>

            {/* Map Picker */}
            {mapPickerMode && (
              <div>
                <Label>Click on map to select location</Label>
                <div id="map-picker" className="h-64 rounded-lg border" />
                <p className="text-xs text-muted-foreground mt-2">
                  Selected: {formData.lat?.toFixed(6)}, {formData.lng?.toFixed(6)}
                </p>
              </div>
            )}

            {/* Set as Default */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="w-4 h-4 text-primary focus:ring-primary rounded"
              />
              <Label htmlFor="is_default" className="cursor-pointer flex items-center gap-2">
                <Star className="h-4 w-4" />
                Set as default delivery address
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                  setEditingAddress(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="gradient-primary">
                {editingAddress ? 'Update Address' : 'Save Address'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Google Maps Script */}
      <script
        async
        src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&libraries=geometry,places"
      />
    </div>
  );
}
