import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, Bike } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { supabase } from '../../lib/supabase';
import { DeliveryPartner } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';

export default function AdminRiders() {
  const navigate = useNavigate();
  const [riders, setRiders] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRiders();
  }, []);

  const loadRiders = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_partners')
        .select('*, user_profiles!inner(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRiders(data || []);
    } catch (error: any) {
      toast.error('Failed to load riders');
    } finally {
      setLoading(false);
    }
  };

  const updateRiderStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('delivery_partners')
        .update({ status, is_approved: status === 'approved' })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Rider ${status}`);
      loadRiders();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredRiders = riders.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const pendingCount = riders.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Manage Delivery Partners</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('all')}
          >
            All ({riders.length})
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

        {/* Riders List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredRiders.length === 0 ? (
          <div className="text-center py-12">
            <Bike className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No riders found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRiders.map((rider) => (
              <div key={rider.id} className="bg-card border rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{rider.user_profiles.username}</h3>
                    <p className="text-sm text-muted-foreground">{rider.user_profiles.email}</p>
                    {rider.user_profiles.phone && (
                      <p className="text-sm text-muted-foreground">{rider.user_profiles.phone}</p>
                    )}
                  </div>
                  <Badge
                    variant={
                      rider.status === 'approved'
                        ? 'default'
                        : rider.status === 'rejected'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {rider.status}
                  </Badge>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Vehicle Type</p>
                    <p className="font-medium capitalize">{rider.vehicle_type}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Vehicle Number</p>
                    <p className="font-medium">{rider.vehicle_number}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">License</p>
                    <p className="font-medium">{rider.license_number}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Deliveries</p>
                    <p className="font-medium">{rider.total_deliveries}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Earnings</p>
                    <p className="font-medium">{formatCurrency(rider.earnings)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">{rider.is_online ? 'Online' : 'Offline'}</p>
                  </div>
                </div>

                {rider.status === 'pending' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => updateRiderStatus(rider.id, 'rejected')}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      className="gradient-success"
                      size="sm"
                      onClick={() => updateRiderStatus(rider.id, 'approved')}
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
    </div>
  );
}
