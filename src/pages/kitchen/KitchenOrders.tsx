import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Clock, Timer, AlertCircle, CheckCircle2, Store, 
  MessageSquare, TrendingUp, Route, Bell, Info 
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Progress } from '../../components/ui/progress';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Order } from '../../types';
import { formatCurrency, getOrderStatusColor, getOrderStatusText } from '../../lib/utils';
import { CoordinationService } from '../../lib/coordinationService';
import { toast } from 'sonner';

interface CoordinationMessage {
  id: string;
  message_type: string;
  message: string;
  metadata: any;
  created_at: string;
  is_read: boolean;
}

interface BatchCoordination {
  batch_order_id: string;
  order_id: string;
  kitchen_id: string;
  kitchen_name: string;
  pickup_sequence: number;
  prep_status: string;
  target_ready_time: string | null;
  actual_ready_time: string | null;
  minutes_until_target: number | null;
  is_delayed: boolean;
  delay_reason: string | null;
}

export default function KitchenOrders() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [kitchenId, setKitchenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<CoordinationMessage[]>([]);
  const [batchCoordination, setBatchCoordination] = useState<Map<string, BatchCoordination[]>>(new Map());

  useEffect(() => {
    loadOrders();
    loadMessages();
    
    const interval = setInterval(() => {
      loadOrders();
      loadMessages();
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      const { data: kitchen } = await supabase.from('kitchens').select('id').eq('owner_id', user?.id).single();
      if (!kitchen) return;

      setKitchenId(kitchen.id);

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('kitchen_id', kitchen.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrders(data || []);

      // Load batch coordination for batch orders
      const batchOrderIds = [...new Set(data?.filter(o => o.batch_order_id).map(o => o.batch_order_id))];
      if (batchOrderIds.length > 0) {
        await loadBatchCoordination(batchOrderIds);
      }
    } catch (error: any) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!kitchenId) return;
    const msgs = await CoordinationService.getKitchenMessages(kitchenId, 10);
    setMessages(msgs);
  };

  const loadBatchCoordination = async (batchOrderIds: string[]) => {
    const coordinationMap = new Map<string, BatchCoordination[]>();
    
    for (const batchId of batchOrderIds) {
      const status = await CoordinationService.getBatchCoordinationStatus(batchId);
      if (status.length > 0) {
        coordinationMap.set(batchId, status);
      }
    }
    
    setBatchCoordination(coordinationMap);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
      if (error) throw error;
      
      if (status === 'ready') {
        await CoordinationService.markOrderReady(orderId);
      }
      
      toast.success(`Order ${status}`);
      loadOrders();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleReportDelay = async (orderId: string) => {
    const delayMinutes = parseInt(prompt('Expected delay in minutes:') || '0');
    const reason = prompt('Reason for delay:') || 'Unexpected delay';
    
    if (delayMinutes > 0) {
      await CoordinationService.notifyDelay(orderId, delayMinutes, reason);
      toast.success('Delay notification sent to other kitchens');
      loadOrders();
    }
  };

  const dismissMessage = async (messageId: string) => {
    await CoordinationService.markMessageRead(messageId);
    loadMessages();
  };

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  const getTimeUntilTarget = (targetTime: string | null) => {
    if (!targetTime) return null;
    const now = new Date();
    const target = new Date(targetTime);
    const diffMs = target.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    return diffMins;
  };

  const getProgressPercentage = (prepStartTime: string | null, targetTime: string | null) => {
    if (!prepStartTime || !targetTime) return 0;
    
    const start = new Date(prepStartTime).getTime();
    const end = new Date(targetTime).getTime();
    const now = Date.now();
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    const progress = ((now - start) / (end - start)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/kitchen')}>
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Orders</h1>
            <p className="text-xs text-muted-foreground">Real-time coordination enabled</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
        {/* Coordination Messages */}
        {messages.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Coordination Alerts ({messages.length})
            </h3>
            {messages.map((msg) => (
              <Alert
                key={msg.id}
                className={
                  msg.message_type === 'delay_notification'
                    ? 'border-destructive/50 bg-destructive/5'
                    : msg.message_type === 'ready_notification'
                    ? 'border-green-500/50 bg-green-50'
                    : 'border-primary/50 bg-primary/5'
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    {msg.message_type === 'delay_notification' && <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />}
                    {msg.message_type === 'ready_notification' && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />}
                    {msg.message_type === 'status_update' && <Info className="h-4 w-4 text-primary mt-0.5" />}
                    <AlertDescription className="text-sm">{msg.message}</AlertDescription>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => dismissMessage(msg.id)}>
                    ✕
                  </Button>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Active Orders */}
        <div>
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Active Orders ({activeOrders.length})
          </h2>
          {activeOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No active orders</p>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order) => {
                const coordination = order.batch_order_id ? batchCoordination.get(order.batch_order_id) : null;
                const isBatchOrder = !!coordination;
                const myCoordination = coordination?.find(c => c.order_id === order.id);
                const otherKitchens = coordination?.filter(c => c.order_id !== order.id) || [];
                const minutesUntilTarget = myCoordination?.minutes_until_target;
                const progress = getProgressPercentage(order.prep_start_time, order.target_ready_time);

                return (
                  <div key={order.id} className={`bg-card border rounded-lg overflow-hidden ${isBatchOrder ? 'ring-2 ring-primary/20' : ''}`}>
                    {/* Batch Order Header */}
                    {isBatchOrder && (
                      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                              #{myCoordination?.pickup_sequence}
                            </div>
                            <div>
                              <p className="font-semibold flex items-center gap-2">
                                <Route className="h-4 w-4" />
                                Multi-Restaurant Order
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {coordination.length} kitchens • Pickup sequence #{myCoordination?.pickup_sequence}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-primary text-white">COORDINATED</Badge>
                        </div>
                      </div>
                    )}

                    {/* Order Content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-lg">{order.order_number}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(order.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge className={getOrderStatusColor(order.status)}>
                          {getOrderStatusText(order.status)}
                        </Badge>
                      </div>

                      {/* Coordination Timing */}
                      {isBatchOrder && myCoordination && (
                        <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">TARGET READY TIME</p>
                              <p className="text-lg font-bold">
                                {myCoordination.target_ready_time 
                                  ? new Date(myCoordination.target_ready_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : 'Calculating...'}
                              </p>
                            </div>
                            {minutesUntilTarget !== null && (
                              <div className="text-right">
                                <p className="text-xs font-medium text-muted-foreground">TIME REMAINING</p>
                                <p className={`text-lg font-bold ${
                                  minutesUntilTarget < 0 ? 'text-destructive' : 
                                  minutesUntilTarget < 5 ? 'text-orange-600' : 
                                  'text-green-600'
                                }`}>
                                  {minutesUntilTarget < 0 ? 'LATE' : `${minutesUntilTarget}m`}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Prep Progress</span>
                              <span className="font-medium">{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>

                          {/* Delay Warning */}
                          {myCoordination.is_delayed && (
                            <Alert className="border-destructive/50 bg-destructive/5 py-2">
                              <AlertCircle className="h-4 w-4 text-destructive" />
                              <AlertDescription className="text-xs">
                                ⚠️ Running behind schedule: {myCoordination.delay_reason}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}

                      {/* Other Kitchens Status */}
                      {otherKitchens.length > 0 && (
                        <div className="mb-4 p-3 bg-primary/5 rounded-lg">
                          <p className="text-xs font-semibold mb-2 flex items-center gap-2">
                            <Store className="h-3 w-3" />
                            Other Kitchens in This Batch
                          </p>
                          <div className="space-y-1">
                            {otherKitchens.map((kitchen) => (
                              <div key={kitchen.order_id} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">#{kitchen.pickup_sequence}</Badge>
                                  <span className="font-medium">{kitchen.kitchen_name}</span>
                                </div>
                                <Badge 
                                  variant={
                                    kitchen.actual_ready_time ? 'default' : 
                                    kitchen.prep_status === 'in_progress' ? 'secondary' : 
                                    'outline'
                                  }
                                  className="text-xs"
                                >
                                  {kitchen.actual_ready_time ? '✓ Ready' : 
                                   kitchen.prep_status === 'in_progress' ? 'Preparing' : 
                                   'Waiting'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Order Items */}
                      <div className="space-y-1 mb-3">
                        {order.items.map((item, i) => (
                          <p key={i} className="text-sm">
                            {item.quantity}x {item.name}
                          </p>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-3 border-t">
                        <span className="font-bold">{formatCurrency(order.total)}</span>
                        <div className="flex gap-2 flex-wrap justify-end">
                          {order.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                onClick={() => updateOrderStatus(order.id, 'cancelled')}
                              >
                                Reject
                              </Button>
                              <Button 
                                size="sm" 
                                className="gradient-primary" 
                                onClick={() => updateOrderStatus(order.id, 'accepted')}
                              >
                                Accept
                              </Button>
                            </>
                          )}
                          {order.status === 'accepted' && (
                            <>
                              {isBatchOrder && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleReportDelay(order.id)}
                                >
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Report Delay
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                onClick={() => updateOrderStatus(order.id, 'preparing')}
                              >
                                <Timer className="h-3 w-3 mr-1" />
                                Start Preparing
                              </Button>
                            </>
                          )}
                          {order.status === 'preparing' && (
                            <>
                              {isBatchOrder && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleReportDelay(order.id)}
                                >
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Report Delay
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                onClick={() => updateOrderStatus(order.id, 'ready')}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Mark Ready
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Completed Orders */}
        <div>
          <h2 className="font-semibold text-lg mb-4">Completed Orders</h2>
          {completedOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No completed orders</p>
          ) : (
            <div className="space-y-4">
              {completedOrders.slice(0, 10).map((order) => (
                <div key={order.id} className="bg-card border rounded-lg p-4 opacity-60">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={getOrderStatusColor(order.status)}>
                        {getOrderStatusText(order.status)}
                      </Badge>
                      <p className="font-bold mt-1">{formatCurrency(order.total)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
