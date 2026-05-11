import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, CheckCircle2, Navigation, Wifi, WifiOff,
  Clock, Phone, AlertTriangle, RefreshCw, Bike, Package, Truck,
  Map, ChevronDown, ChevronUp
} from 'lucide-react';
import DeliveryMap from '../../components/features/DeliveryMap';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { supabase } from '../../lib/supabase';
import { Order, Kitchen, Address } from '../../types';
import { formatCurrency, getOrderStatusText } from '../../lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/authStore';

interface LocationState {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: Date;
}

const BROADCAST_INTERVAL_MS = 15_000; // 15 seconds

export default function ActiveDelivery() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [order, setOrder] = useState<Order | null>(null);
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);

  // Location broadcasting state
  const [locationState, setLocationState] = useState<LocationState | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastCount, setBroadcastCount] = useState(0);
  const [nextBroadcastIn, setNextBroadcastIn] = useState(BROADCAST_INTERVAL_MS / 1000);
  const [isUpdatingManually, setIsUpdatingManually] = useState(false);
  const [deliveryId, setDeliveryId] = useState<string | null>(null);

  const [mapExpanded, setMapExpanded] = useState(true);

  const broadcastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const latestLocationRef = useRef<LocationState | null>(null);

  // ── Load order ──────────────────────────────────────────────────
  useEffect(() => {
    loadOrderDetails();
    return () => stopBroadcasting();
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      const { data: orderData, error } = await supabase
        .from('orders').select('*').eq('id', orderId).single();
      if (error) throw error;
      setOrder(orderData);

      const [kitchenRes, addressRes, deliveryRes] = await Promise.all([
        supabase.from('kitchens').select('*').eq('id', orderData.kitchen_id).single(),
        supabase.from('addresses').select('*').eq('id', orderData.address_id).single(),
        supabase.from('deliveries').select('id').eq('order_id', orderId).maybeSingle(),
      ]);

      if (kitchenRes.data) setKitchen(kitchenRes.data);
      if (addressRes.data) setAddress(addressRes.data);
      if (deliveryRes.data) setDeliveryId(deliveryRes.data.id);

      // Auto-start broadcasting for active statuses
      if (['picked_up', 'out_for_delivery', 'ready', 'accepted'].includes(orderData.status)) {
        startBroadcasting();
      }
    } catch (error: any) {
      toast.error('Failed to load order');
      navigate('/delivery');
    } finally {
      setLoading(false);
    }
  };

  // ── GPS: get current position ───────────────────────────────────
  const getCurrentPosition = (): Promise<LocationState> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported by your browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            timestamp: new Date(),
          });
        },
        (err) => {
          let msg = 'Location unavailable';
          if (err.code === err.PERMISSION_DENIED) msg = 'Location permission denied';
          else if (err.code === err.TIMEOUT) msg = 'Location request timed out';
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
      );
    });
  };

  // ── Push coordinates to Supabase ────────────────────────────────
  const pushLocationToSupabase = useCallback(async (loc: LocationState) => {
    if (!orderId) return;

    const { error } = await supabase
      .from('deliveries')
      .update({ current_lat: loc.lat, current_lng: loc.lng })
      .eq('order_id', orderId);

    if (error) {
      console.error('Location push error:', error);
      throw error;
    }

    setBroadcastCount((c) => c + 1);
    console.log(`[GPS] Broadcast #${broadcastCount + 1} — lat:${loc.lat.toFixed(6)} lng:${loc.lng.toFixed(6)}`);
  }, [orderId, broadcastCount]);

  // ── Fetch + push once ───────────────────────────────────────────
  const fetchAndBroadcast = useCallback(async (showToast = false) => {
    try {
      const loc = await getCurrentPosition();
      latestLocationRef.current = loc;
      setLocationState(loc);
      setLocationError(null);
      await pushLocationToSupabase(loc);
      if (showToast) toast.success('📍 Location updated!');
    } catch (err: any) {
      setLocationError(err.message);
      if (showToast) toast.error(err.message);
    }
  }, [pushLocationToSupabase]);

  // ── Start continuous broadcasting ───────────────────────────────
  const startBroadcasting = useCallback(async () => {
    if (isBroadcasting) return;
    setIsBroadcasting(true);
    setNextBroadcastIn(BROADCAST_INTERVAL_MS / 1000);

    // Immediate first broadcast
    await fetchAndBroadcast();

    // Interval: broadcast every 15s
    broadcastTimerRef.current = setInterval(async () => {
      await fetchAndBroadcast();
      setNextBroadcastIn(BROADCAST_INTERVAL_MS / 1000);
    }, BROADCAST_INTERVAL_MS);

    // Countdown timer (tick every second)
    countdownRef.current = setInterval(() => {
      setNextBroadcastIn((prev) => (prev <= 1 ? BROADCAST_INTERVAL_MS / 1000 : prev - 1));
    }, 1000);

    toast.success('📍 Live location broadcasting started');
  }, [isBroadcasting, fetchAndBroadcast]);

  // ── Stop broadcasting ───────────────────────────────────────────
  const stopBroadcasting = useCallback(() => {
    if (broadcastTimerRef.current) clearInterval(broadcastTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (watchIdRef.current !== null) navigator.geolocation?.clearWatch(watchIdRef.current);
    setIsBroadcasting(false);
  }, []);

  // ── Manual "Update Now" ─────────────────────────────────────────
  const handleManualUpdate = async () => {
    setIsUpdatingManually(true);
    await fetchAndBroadcast(true);
    setNextBroadcastIn(BROADCAST_INTERVAL_MS / 1000);
    setIsUpdatingManually(false);
  };

  // ── Order status update ─────────────────────────────────────────
  const updateStatus = async (status: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
      if (error) throw error;
      await supabase.from('deliveries').update({ status }).eq('order_id', orderId);

      toast.success(`Status updated: ${getOrderStatusText(status)}`);

      if (status === 'picked_up' || status === 'out_for_delivery') {
        // Ensure broadcasting is running during active delivery
        if (!isBroadcasting) startBroadcasting();
      }

      if (status === 'delivered') {
        stopBroadcasting();
        await supabase.from('orders').update({ payment_status: 'completed' }).eq('id', orderId);
        // Clear coordinates on completion
        await supabase.from('deliveries').update({ current_lat: null, current_lng: null }).eq('order_id', orderId);
        toast.success('🎉 Delivery completed! Great job!');
        navigate('/delivery');
      } else {
        loadOrderDetails();
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Accuracy label ──────────────────────────────────────────────
  const getAccuracyLabel = (accuracy: number) => {
    if (accuracy <= 10) return { label: 'Excellent', color: 'text-green-600' };
    if (accuracy <= 30) return { label: 'Good', color: 'text-blue-600' };
    if (accuracy <= 100) return { label: 'Fair', color: 'text-yellow-600' };
    return { label: 'Poor', color: 'text-red-600' };
  };

  // ── Render ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f0f5]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) return null;

  const accuracyInfo = locationState ? getAccuracyLabel(locationState.accuracy) : null;

  const statusSteps = [
    { key: 'accepted', label: 'Accepted', icon: '✅' },
    { key: 'ready', label: 'Ready', icon: '📦' },
    { key: 'picked_up', label: 'Picked Up', icon: '🛵' },
    { key: 'out_for_delivery', label: 'On the Way', icon: '🚀' },
    { key: 'delivered', label: 'Delivered', icon: '🎉' },
  ];
  const currentStep = statusSteps.findIndex((s) => s.key === order.status);

  return (
    <div className="min-h-screen bg-[#f0f0f5] pb-6">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/delivery')} className="hover:scale-110 transition-transform">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Active Delivery</h1>
            <p className="text-sm text-muted-foreground">{order.order_number}</p>
          </div>
          {isBroadcasting && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              LIVE GPS
            </div>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">

        {/* ── Status Banner ──────────────────────────────────────── */}
        <div className="bg-primary text-white rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm opacity-80 mb-0.5">Current Status</p>
              <p className="text-2xl font-bold">{getOrderStatusText(order.status)}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{formatCurrency(order.total)}</p>
              <p className="text-xs opacity-70">
                {order.payment_method === 'cod' ? '💵 Collect Cash' : '📱 UPI Paid'}
              </p>
            </div>
          </div>
          {/* Progress steps */}
          <div className="flex items-center gap-1">
            {statusSteps.map((step, i) => {
              const isDone = i < currentStep;
              const isCurrent = i === currentStep;
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className={`flex flex-col items-center gap-0.5 flex-shrink-0 ${i === 0 ? '' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isDone ? 'bg-white/30 text-white'
                      : isCurrent ? 'bg-white text-primary ring-2 ring-white/50 shadow-lg'
                      : 'bg-white/10 text-white/40'
                    }`}>
                      {isDone ? '✓' : step.icon}
                    </div>
                    <span className={`text-[9px] font-medium hidden sm:block ${isCurrent ? 'text-white' : 'text-white/50'}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < statusSteps.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 rounded-full transition-all ${
                      i < currentStep ? 'bg-white/60' : 'bg-white/15'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Live Location Broadcaster ──────────────────────────── */}
        <div className={`rounded-2xl border-2 overflow-hidden shadow-sm transition-all ${
          isBroadcasting ? 'border-green-400 bg-white' : locationError ? 'border-red-300 bg-white' : 'border-border bg-white'
        }`}>
          {/* Header */}
          <div className={`px-5 py-4 flex items-center justify-between ${
            isBroadcasting ? 'bg-green-50' : locationError ? 'bg-red-50' : 'bg-muted/40'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isBroadcasting ? 'bg-green-500' : locationError ? 'bg-red-100' : 'bg-muted'
              }`}>
                {isBroadcasting ? (
                  <Navigation className="h-5 w-5 text-white" />
                ) : locationError ? (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                ) : (
                  <Navigation className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-bold text-sm">
                  {isBroadcasting ? 'Broadcasting Location' : locationError ? 'Location Error' : 'Location Sharing'}
                </p>
                <p className={`text-xs ${
                  isBroadcasting ? 'text-green-600' : locationError ? 'text-red-500' : 'text-muted-foreground'
                }`}>
                  {isBroadcasting
                    ? `Customer can see you live • ${broadcastCount} update${broadcastCount !== 1 ? 's' : ''} sent`
                    : locationError || 'Start to share location with customer'}
                </p>
              </div>
            </div>
            {isBroadcasting ? (
              <div className="flex items-center gap-1.5">
                <Wifi className="h-4 w-4 text-green-500 animate-pulse" />
                <span className="text-xs font-bold text-green-600">LIVE</span>
              </div>
            ) : (
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {/* Location details */}
          {locationState && (
            <div className="px-5 py-4 grid grid-cols-2 gap-3 border-b">
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1 font-medium">Latitude</p>
                <p className="font-mono font-bold text-sm">{locationState.lat.toFixed(6)}°</p>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1 font-medium">Longitude</p>
                <p className="font-mono font-bold text-sm">{locationState.lng.toFixed(6)}°</p>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1 font-medium">GPS Accuracy</p>
                <p className={`font-bold text-sm ${accuracyInfo?.color}`}>
                  ±{locationState.accuracy}m ({accuracyInfo?.label})
                </p>
              </div>
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1 font-medium">Last Updated</p>
                <p className="font-bold text-sm">
                  {locationState.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="px-5 py-4 flex items-center gap-3">
            {!isBroadcasting ? (
              <Button
                onClick={startBroadcasting}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-5 rounded-xl"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Start Broadcasting
              </Button>
            ) : (
              <>
                <div className="flex-1 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <div className="relative">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-40" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-green-700">Next update in</p>
                    <p className="text-lg font-bold text-green-800 leading-none">{nextBroadcastIn}s</p>
                  </div>
                  <Clock className="h-5 w-5 text-green-500" />
                </div>
                <Button
                  onClick={handleManualUpdate}
                  disabled={isUpdatingManually}
                  variant="outline"
                  className="border-2 border-green-400 text-green-700 hover:bg-green-50 font-bold py-5 px-4 rounded-xl"
                >
                  {isUpdatingManually ? (
                    <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}

            {isBroadcasting && (
              <Button
                onClick={stopBroadcasting}
                variant="outline"
                className="border-2 border-red-300 text-red-500 hover:bg-red-50 font-bold py-5 px-4 rounded-xl"
              >
                <WifiOff className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Info footer */}
          <div className="px-5 pb-4">
            <p className="text-xs text-muted-foreground text-center">
              {isBroadcasting
                ? '🔒 Only the customer for this order can see your location'
                : '📱 GPS location is shared every 15 seconds while broadcasting'}
            </p>
          </div>
        </div>

        {/* ── Navigation Map ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <button
            onClick={() => setMapExpanded(!mapExpanded)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isBroadcasting ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                <Map className={`h-4 w-4 ${isBroadcasting ? 'text-green-600' : 'text-blue-600'}`} />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Navigation Map</p>
                <p className="text-xs text-muted-foreground">
                  {isBroadcasting ? 'Your position updates in real time' : 'Kitchen → You → Customer'}
                </p>
              </div>
              {isBroadcasting && locationState && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            {mapExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {mapExpanded && (
            <div className="px-4 pb-4">
              <DeliveryMap
                kitchenLat={kitchen?.lat}
                kitchenLng={kitchen?.lng}
                customerLat={address?.lat}
                customerLng={address?.lng}
                riderLat={locationState?.lat ?? null}
                riderLng={locationState?.lng ?? null}
                kitchenName={kitchen?.name || 'Kitchen'}
                customerAddress={address?.address_line || 'Customer'}
                orderStatus={order.status}
              />
              {/* Waypoint strip */}
              <div className="mt-3 flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 flex-shrink-0">
                  <span className="text-sm">🍽️</span>
                  <span className="text-xs font-medium text-green-700 max-w-[90px] truncate">
                    {kitchen?.name || 'Kitchen'}
                  </span>
                </div>
                <span className="text-muted-foreground text-lg flex-shrink-0">→</span>
                <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 flex-shrink-0 border ${
                  locationState
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-muted border-border'
                }`}>
                  <span className="text-sm">🏍️</span>
                  <span className={`text-xs font-medium max-w-[80px] truncate ${
                    locationState ? 'text-orange-700' : 'text-muted-foreground'
                  }`}>
                    {locationState ? 'You (Live)' : 'You (GPS off)'}
                  </span>
                </div>
                <span className="text-muted-foreground text-lg flex-shrink-0">→</span>
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5 flex-shrink-0">
                  <span className="text-sm">📍</span>
                  <span className="text-xs font-medium text-blue-700 max-w-[90px] truncate">
                    {address?.label || 'Customer'}
                  </span>
                </div>
              </div>
              {locationState && (
                <p className="text-[10px] text-center text-muted-foreground mt-2">
                  🏍️ Your position: {locationState.lat.toFixed(5)}, {locationState.lng.toFixed(5)}
                  {isBroadcasting && ` • Updates every ${BROADCAST_INTERVAL_MS / 1000}s`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Pickup Location ────────────────────────────────────── */}
        {kitchen && (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-5 border-b bg-orange-50">
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-0.5">Pickup Location</p>
                <p className="font-bold text-base">{kitchen.name}</p>
                <p className="text-sm text-muted-foreground">{kitchen.address}</p>
              </div>
              {order.status === 'ready' && (
                <Badge className="bg-yellow-500 text-white border-0 text-xs font-bold">
                  Ready!
                </Badge>
              )}
            </div>
            {kitchen.lat && kitchen.lng && (
              <div className="px-5 py-3 flex items-center gap-2 text-sm text-blue-600">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">
                  {kitchen.lat.toFixed(4)}, {kitchen.lng.toFixed(4)}
                </span>
                <a
                  href={`https://maps.google.com/?q=${kitchen.lat},${kitchen.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs underline font-semibold hover:text-blue-800"
                >
                  Open in Maps ↗
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── Delivery Address ───────────────────────────────────── */}
        {address && (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-5 border-b bg-blue-50">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Bike className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-0.5">Deliver To</p>
                <p className="font-bold text-base">{address.label}</p>
                <p className="text-sm text-muted-foreground">{address.address_line}</p>
              </div>
            </div>
            {address.lat && address.lng && (
              <div className="px-5 py-3 flex items-center gap-2 text-sm text-blue-600">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">
                  {address.lat.toFixed(4)}, {address.lng.toFixed(4)}
                </span>
                <a
                  href={`https://maps.google.com/?q=${address.lat},${address.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs underline font-semibold hover:text-blue-800"
                >
                  Navigate ↗
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── Order Items ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 border shadow-sm">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            Order Summary
          </h3>
          <div className="space-y-2.5 mb-4">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {item.quantity}
                  </span>
                  <span className="font-medium">{item.name}</span>
                </div>
                <span className="font-semibold">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(order.total)}</span>
          </div>
          {order.payment_method === 'cod' && (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-yellow-600 font-bold text-sm">💵</span>
              <p className="text-sm font-semibold text-yellow-700">
                Collect ₹{order.total.toFixed(0)} cash at the door
              </p>
            </div>
          )}
        </div>

        {/* ── Delivery Instructions ──────────────────────────────── */}
        {order.delivery_instructions && (
          <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm mb-1 text-amber-700">Delivery Instructions</h3>
                <p className="text-sm text-muted-foreground">{order.delivery_instructions}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Action Buttons ─────────────────────────────────────── */}
        <div className="space-y-3">
          {order.status === 'ready' && (
            <Button
              onClick={() => updateStatus('picked_up')}
              className="w-full gradient-primary py-6 text-lg rounded-2xl font-bold shadow-lg"
            >
              <Package className="h-5 w-5 mr-2" />
              Confirm Pickup
            </Button>
          )}
          {order.status === 'picked_up' && (
            <Button
              onClick={() => updateStatus('out_for_delivery')}
              className="w-full gradient-primary py-6 text-lg rounded-2xl font-bold shadow-lg"
            >
              <Bike className="h-5 w-5 mr-2" />
              Start Delivery
            </Button>
          )}
          {order.status === 'out_for_delivery' && (
            <Button
              onClick={() => updateStatus('delivered')}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-6 text-lg rounded-2xl font-bold shadow-lg"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Mark as Delivered
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
