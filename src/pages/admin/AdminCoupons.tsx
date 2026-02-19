import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Percent, Calendar, Users, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_discount: number | null;
  valid_from: string;
  valid_until: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

export default function AdminCoupons() {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; coupon: Coupon | null }>({
    open: false,
    coupon: null,
  });
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    min_order_value: '',
    max_discount: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    usage_limit: '',
    is_active: true,
  });

  useEffect(() => {
    loadCoupons();
  }, []);

  useEffect(() => {
    if (editingCoupon) {
      setFormData({
        code: editingCoupon.code,
        description: editingCoupon.description || '',
        discount_type: editingCoupon.discount_type,
        discount_value: editingCoupon.discount_value.toString(),
        min_order_value: editingCoupon.min_order_value.toString(),
        max_discount: editingCoupon.max_discount?.toString() || '',
        valid_from: editingCoupon.valid_from.split('T')[0],
        valid_until: editingCoupon.valid_until?.split('T')[0] || '',
        usage_limit: editingCoupon.usage_limit?.toString() || '',
        is_active: editingCoupon.is_active,
      });
      setDialogOpen(true);
    }
  }, [editingCoupon]);

  const loadCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error: any) {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_value: '',
      max_discount: '',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      usage_limit: '',
      is_active: true,
    });
    setEditingCoupon(null);
  };

  const handleOpenDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleSaveCoupon = async () => {
    if (!formData.code || !formData.discount_value || !formData.min_order_value) {
      toast.error('Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      const couponData = {
        code: formData.code.toUpperCase(),
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_order_value: parseFloat(formData.min_order_value),
        max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
        valid_from: formData.valid_from,
        valid_until: formData.valid_until || null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        is_active: formData.is_active,
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from('coupons')
          .update(couponData)
          .eq('id', editingCoupon.id);

        if (error) throw error;
        toast.success('Coupon updated successfully!');
      } else {
        const { error } = await supabase.from('coupons').insert({
          ...couponData,
          used_count: 0,
        });

        if (error) throw error;
        toast.success('Coupon created successfully!');
      }

      handleCloseDialog();
      loadCoupons();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCoupon = async () => {
    if (!deleteDialog.coupon) return;

    try {
      const { error } = await supabase.from('coupons').delete().eq('id', deleteDialog.coupon.id);

      if (error) throw error;
      toast.success('Coupon deleted successfully');
      setDeleteDialog({ open: false, coupon: null });
      loadCoupons();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete coupon');
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: !coupon.is_active })
        .eq('id', coupon.id);

      if (error) throw error;
      toast.success(`Coupon ${!coupon.is_active ? 'activated' : 'deactivated'}`);
      loadCoupons();
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const activeCoupons = coupons.filter((c) => c.is_active && !isExpired(c.valid_until));
  const expiredCoupons = coupons.filter((c) => isExpired(c.valid_until));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/admin')}>
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-xl font-bold">Manage Coupons</h1>
                <p className="text-sm text-muted-foreground">
                  {activeCoupons.length} active • {expiredCoupons.length} expired
                </p>
              </div>
            </div>
            <Button onClick={handleOpenDialog} className="gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Create Coupon
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Percent className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCoupons.length}</p>
                <p className="text-sm text-muted-foreground">Active Coupons</p>
              </div>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{expiredCoupons.length}</p>
                <p className="text-sm text-muted-foreground">Expired</p>
              </div>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {coupons.reduce((sum, c) => sum + c.used_count, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Uses</p>
              </div>
            </div>
          </div>
        </div>

        {/* Coupons List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-12 bg-card border rounded-lg">
            <Percent className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No coupons created yet</p>
            <Button onClick={handleOpenDialog} className="gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Coupon
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {coupons.map((coupon) => (
              <div key={coupon.id} className="bg-card border rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold font-mono">{coupon.code}</h3>
                      {coupon.is_active && !isExpired(coupon.valid_until) ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : isExpired(coupon.valid_until) ? (
                        <Badge variant="secondary">Expired</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                    {coupon.description && (
                      <p className="text-sm text-muted-foreground mb-3">{coupon.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingCoupon(coupon)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteDialog({ open: true, coupon })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-muted-foreground">Discount</p>
                    <p className="font-semibold">
                      {coupon.discount_type === 'percentage'
                        ? `${coupon.discount_value}% OFF`
                        : formatCurrency(coupon.discount_value)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Min Order</p>
                    <p className="font-semibold">{formatCurrency(coupon.min_order_value)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Max Discount</p>
                    <p className="font-semibold">
                      {coupon.max_discount ? formatCurrency(coupon.max_discount) : 'No Limit'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Usage</p>
                    <p className="font-semibold">
                      {coupon.used_count}
                      {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ' uses'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-xs text-muted-foreground">
                    Valid: {new Date(coupon.valid_from).toLocaleDateString()}
                    {coupon.valid_until &&
                      ` - ${new Date(coupon.valid_until).toLocaleDateString()}`}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {coupon.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <Switch
                      checked={coupon.is_active}
                      onCheckedChange={() => handleToggleStatus(coupon)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Coupon Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Coupon Code */}
            <div>
              <Label htmlFor="code">
                Coupon Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., WELCOME50"
                className="font-mono"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Welcome offer for new users"
                rows={2}
              />
            </div>

            {/* Discount Type & Value */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discount_type">
                  Discount Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(val: any) => setFormData({ ...formData, discount_type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="discount_value">
                  Discount Value <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  placeholder={formData.discount_type === 'percentage' ? 'e.g., 50' : 'e.g., 100'}
                />
              </div>
            </div>

            {/* Min Order & Max Discount */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min_order_value">
                  Minimum Order Value (₹) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="min_order_value"
                  type="number"
                  value={formData.min_order_value}
                  onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })}
                  placeholder="e.g., 299"
                />
              </div>
              <div>
                <Label htmlFor="max_discount">Max Discount (₹) - Optional</Label>
                <Input
                  id="max_discount"
                  type="number"
                  value={formData.max_discount}
                  onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                  placeholder="e.g., 100"
                />
              </div>
            </div>

            {/* Valid Dates */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valid_from">
                  Valid From <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="valid_from"
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="valid_until">Valid Until - Optional</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </div>

            {/* Usage Limit */}
            <div>
              <Label htmlFor="usage_limit">Usage Limit - Optional</Label>
              <Input
                id="usage_limit"
                type="number"
                value={formData.usage_limit}
                onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                placeholder="e.g., 100 (leave empty for unlimited)"
              />
            </div>

            {/* Is Active Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label>Activate Coupon</Label>
                <p className="text-sm text-muted-foreground">
                  Make this coupon available for use
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(val) => setFormData({ ...formData, is_active: val })}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveCoupon} disabled={saving} className="gradient-primary">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingCoupon ? (
                'Update Coupon'
              ) : (
                'Create Coupon'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, coupon: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Coupon</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete coupon <strong>{deleteDialog.coupon?.code}</strong>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, coupon: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCoupon}>
              Delete Coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
