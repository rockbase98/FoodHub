import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, Store, Edit2, Trash2, Menu, Settings, Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { supabase } from '../../lib/supabase';
import { Kitchen } from '../../types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';

export default function AdminKitchens() {
  const navigate = useNavigate();
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; kitchen: Kitchen | null }>({ open: false, kitchen: null });
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  useEffect(() => {
    loadKitchens();
  }, []);

  const loadKitchens = async () => {
    try {
      const { data, error } = await supabase
        .from('kitchens')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKitchens(data || []);
    } catch (error: any) {
      toast.error('Failed to load kitchens');
    } finally {
      setLoading(false);
    }
  };

  const updateKitchenStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('kitchens')
        .update({ status, is_approved: status === 'approved' })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Kitchen ${status}`);
      loadKitchens();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteKitchen = async () => {
    if (!deleteDialog.kitchen) return;

    try {
      const { error } = await supabase
        .from('kitchens')
        .delete()
        .eq('id', deleteDialog.kitchen.id);

      if (error) throw error;
      toast.success('Kitchen deleted successfully');
      setDeleteDialog({ open: false, kitchen: null });
      loadKitchens();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete kitchen');
    }
  };

  const filteredKitchens = kitchens.filter((k) => {
    if (filter === 'all') return true;
    return k.status === filter;
  });

  const pendingCount = kitchens.filter((k) => k.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Manage Kitchens</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Filters & Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('all')}
          >
            All ({kitchens.length})
          </Badge>
          <Badge
            variant={filter === 'pending' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('pending')}
          >
            Pending ({pendingCount})
          </Badge>
          <Badge
            variant={filter === 'approved' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('approved')}
          >
            Approved
          </Badge>
          <Badge
            variant={filter === 'rejected' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('rejected')}
          >
            Rejected
          </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}>
              {viewMode === 'table' ? 'Grid View' : 'Table View'}
            </Button>
            <Link to="/admin/add-kitchen">
              <Button size="sm" className="gradient-primary">
                <Plus className="h-4 w-4 mr-1" />
                Add Restaurant
              </Button>
            </Link>
          </div>
        </div>

        {/* Kitchens List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredKitchens.length === 0 ? (
          <div className="text-center py-12">
            <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No kitchens found</p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-card border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-4 font-semibold">Restaurant Name</th>
                  <th className="text-left p-4 font-semibold">Owner</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Rating</th>
                  <th className="text-right p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredKitchens.map((kitchen, idx) => (
                  <tr key={kitchen.id} className={idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {kitchen.image_url ? (
                          <img src={kitchen.image_url} className="w-12 h-12 rounded-lg object-cover" alt="" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Store className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">{kitchen.name}</p>
                          <p className="text-xs text-muted-foreground">{kitchen.categories?.slice(0, 2).join(', ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">Owner ID: {kitchen.owner_id.slice(0, 8)}...</p>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          kitchen.status === 'approved'
                            ? 'default'
                            : kitchen.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {kitchen.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">{kitchen.rating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({kitchen.total_ratings})</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/admin/kitchen/${kitchen.id}`}>
                          <Button size="sm" variant="outline">
                            <Menu className="h-4 w-4 mr-1" />
                            Menu
                          </Button>
                        </Link>
                        <Link to={`/admin/kitchen/${kitchen.id}/settings`}>
                          <Button size="sm" variant="outline">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteDialog({ open: true, kitchen })}
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
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredKitchens.map((kitchen) => (
              <div key={kitchen.id} className="bg-card border rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {kitchen.image_url ? (
                      <img src={kitchen.image_url} className="w-16 h-16 rounded-lg object-cover" alt="" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Store className="h-8 w-8 text-primary" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">{kitchen.name}</h3>
                      <p className="text-sm text-muted-foreground">{kitchen.categories?.slice(0, 2).join(', ')}</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      kitchen.status === 'approved'
                        ? 'default'
                        : kitchen.status === 'rejected'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {kitchen.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Rating</p>
                    <p className="font-medium">{kitchen.rating.toFixed(1)} ({kitchen.total_ratings})</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Delivery</p>
                    <p className="font-medium">{kitchen.delivery_time}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Link to={`/admin/kitchen/${kitchen.id}`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full">
                      <Menu className="h-4 w-4 mr-1" />
                      Menu
                    </Button>
                  </Link>
                  <Link to={`/admin/kitchen/${kitchen.id}/settings`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full">
                      <Settings className="h-4 w-4 mr-1" />
                      Settings
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteDialog({ open: true, kitchen })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {kitchen.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => updateKitchenStatus(kitchen.id, 'rejected')}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      className="gradient-success flex-1"
                      size="sm"
                      onClick={() => updateKitchenStatus(kitchen.id, 'approved')}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, kitchen: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Restaurant</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete <strong>{deleteDialog.kitchen?.name}</strong>?
            This action cannot be undone and will delete all associated menu items and orders.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, kitchen: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteKitchen}>
              Delete Restaurant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
