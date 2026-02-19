import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Clock, CheckCircle2, Package, Bike, ChefHat, Home, Navigation } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { supabase } from '../../lib/supabase';
import { Order, Kitchen, Address } from '../../types';
import { formatCurrency, getOrderStatusText, getOrderStatusColor } from '../../lib/utils';
import { toast } from 'sonner';

interface DeliveryPartnerInfo {
  id: string;
  user_id: string;
  vehicle_type: string;
  vehicle_number: string;
  current_lat: number | null;
  current_lng: number | null;
  user_profiles: {
    username: string;
    phone: string | null;
  };
}

export default function OrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [deliveryPartner, setDeliveryPartner] = useState<DeliveryPartnerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any>({});

  useEffect(() => {
    loadOrderDetails();
    const interval = setInterval(loadOrderDetails, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    if (order && kitchen && address && !loading) {
      // Delay to ensure Google Maps API is loaded
      setTimeout(() => {
        initializeMap();
      }, 500);
    }
  }, [order, kitchen, address, loading]);

  const loadOrderDetails = async () => {
    try {
      const { data: orderData, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (error) throw error;
      setOrder(orderData);

      const [kitchenRes, addressRes] = await Promise.all([
        supabase.from('kitchens').select('*').eq('id', orderData.kitchen_id).single(),
        supabase.from('addresses').select('*').eq('id', orderData.address_id).single(),
      ]);

      if (kitchenRes.data) setKitchen(kitchenRes.data);
      if (addressRes.data) setAddress(addressRes.data);

      // Load delivery partner if assigned
      if (orderData.delivery_partner_id) {
        const { data: partnerData } = await supabase
          .from('delivery_partners')
          .select('*, user_profiles!delivery_partners_user_id_fkey(username, phone)')
          .eq('user_id', orderData.delivery_partner_id)
          .single();
        
        if (partnerData) {
          setDeliveryPartner(partnerData as DeliveryPartnerInfo);
          // Update delivery partner marker on map
          if (mapInstanceRef.current && partnerData.current_lat && partnerData.current_lng) {
            updateDeliveryMarker(partnerData.current_lat, partnerData.current_lng);
          }
        }
      }
    } catch (error: any) {
      toast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = () => {
    if (!mapRef.current || !kitchen?.lat || !kitchen?.lng || !address?.lat || !address?.lng) return;
    if (typeof google === 'undefined' || !google.maps) return;

    // Initialize map centered between kitchen and customer
    const centerLat = (Number(kitchen.lat) + Number(address.lat)) / 2;
    const centerLng = (Number(kitchen.lng) + Number(address.lng)) / 2;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: centerLat, lng: centerLng },
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    mapInstanceRef.current = map;

    // Kitchen Marker
    const kitchenMarker = new google.maps.Marker({
      position: { lat: Number(kitchen.lat), lng: Number(kitchen.lng) },
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#FF5200',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      title: kitchen.name,
    });
    markersRef.current.kitchen = kitchenMarker;

    // Customer Marker
    const customerMarker = new google.maps.Marker({
      position: { lat: Number(address.lat), lng: Number(address.lng) },
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#10b981',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      title: 'Delivery Address',
    });
    markersRef.current.customer = customerMarker;

    // Delivery Partner Marker (if available)
    if (deliveryPartner?.current_lat && deliveryPartner?.current_lng) {
      const deliveryMarker = new google.maps.Marker({
        position: { lat: Number(deliveryPartner.current_lat), lng: Number(deliveryPartner.current_lng) },
        map,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          rotation: 0,
        },
        title: 'Delivery Partner',
      });
      markersRef.current.delivery = deliveryMarker;
    }

    // Draw route line
    const routePath = new google.maps.Polyline({
      path: [
        { lat: Number(kitchen.lat), lng: Number(kitchen.lng) },
        deliveryPartner?.current_lat && deliveryPartner?.current_lng
          ? { lat: Number(deliveryPartner.current_lat), lng: Number(deliveryPartner.current_lng) }
          : { lat: Number(address.lat), lng: Number(address.lng) },
        { lat: Number(address.lat), lng: Number(address.lng) },
      ],
      geodesic: true,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.6,
      strokeWeight: 4,
    });
    routePath.setMap(map);

    // Fit bounds to show all markers
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: Number(kitchen.lat), lng: Number(kitchen.lng) });
    bounds.extend({ lat: Number(address.lat), lng: Number(address.lng) });
    if (deliveryPartner?.current_lat && deliveryPartner?.current_lng) {
      bounds.extend({ lat: Number(deliveryPartner.current_lat), lng: Number(deliveryPartner.current_lng) });
    }
    map.fitBounds(bounds);
  };

  const updateDeliveryMarker = (lat: number, lng: number) => {
    if (typeof google === 'undefined' || !google.maps) return;
    
    if (markersRef.current.delivery) {
      markersRef.current.delivery.setPosition({ lat: Number(lat), lng: Number(lng) });
    } else if (mapInstanceRef.current) {
      const deliveryMarker = new google.maps.Marker({
        position: { lat: Number(lat), lng: Number(lng) },
        map: mapInstanceRef.current,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: 'Delivery Partner',
      });
      markersRef.current.delivery = deliveryMarker;
    }
  };

  const getOrderTimeline = () => {
    const stages = [
      { key: 'pending', label: 'Order Placed', icon: Package, time: order?.created_at },
      { key: 'confirmed', label: 'Confirmed by Kitchen', icon: ChefHat, time: null },
      { key: 'preparing', label: 'Food Preparing', icon: ChefHat, time: null },
      { key: 'ready', label: 'Ready for Pickup', icon: CheckCircle2, time: null },
      { key: 'picked_up', label: 'Picked Up', icon: Bike, time: null },
      { key: 'out_for_delivery', label: 'Out for Delivery', icon: Navigation, time: null },
      { key: 'delivered', label: 'Delivered', icon: Home, time: null },
    ];

    const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'out_for_delivery', 'delivered'];
    const currentIndex = statusOrder.indexOf(order?.status || 'pending');

    return stages.map((stage, index) => ({
      ...stage,
      completed: index <= currentIndex,
      active: index === currentIndex,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) return null;

  const timeline = getOrderTimeline();
  const isDelivered = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/customer/orders')}>
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Track Order</h1>
              <p className="text-sm text-muted-foreground">{order.order_number}</p>
            </div>
          </div>
          <Badge className={getOrderStatusColor(order.status)}>
            {getOrderStatusText(order.status)}
          </Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Map & Timeline */}
          <div className="space-y-6">
            {/* Live Map */}
            {kitchen?.lat && address?.lat && !isDelivered && !isCancelled && (
              <div className="bg-card border rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 border-b">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-primary" />
                    Live Tracking
                  </h3>
                  <p className="text-sm text-muted-foreground">Real-time delivery location</p>
                </div>
                <div ref={mapRef} className="h-80 md:h-96 w-full" />
                <div className="p-4 border-t bg-muted/30">
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#FF5200]"></div>
                      <span className="text-muted-foreground">Kitchen</span>
                    </div>
                    {deliveryPartner && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rotate-45 bg-blue-500"></div>
                        <span className="text-muted-foreground">Delivery Partner</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-muted-foreground">Your Location</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Order Timeline */}
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-6 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Order Status
              </h3>
              <div className="space-y-4">
                {timeline.map((stage, index) => (
                  <div key={stage.key} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          stage.completed
                            ? 'bg-green-500 text-white'
                            : stage.active
                            ? 'bg-primary text-white animate-pulse'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <stage.icon className="h-5 w-5" />
                      </div>
                      {index < timeline.length - 1 && (
                        <div
                          className={`w-0.5 h-12 mt-1 ${
                            stage.completed ? 'bg-green-500' : 'bg-muted'
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 pt-2">
                      <p
                        className={`font-medium ${
                          stage.active ? 'text-primary' : stage.completed ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {stage.label}
                      </p>
                      {stage.time && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(stage.time).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Delivery Partner Info */}
            {deliveryPartner && order.status !== 'pending' && order.status !== 'confirmed' && (
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl font-bold">
                    {deliveryPartner.user_profiles?.username?.charAt(0).toUpperCase() || 'D'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900">
                      {deliveryPartner.user_profiles?.username || 'Delivery Partner'}
                    </h3>
                    <p className="text-sm text-blue-700">Your delivery partner</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Bike className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-800">
                        {deliveryPartner.vehicle_type.toUpperCase()} • {deliveryPartner.vehicle_number}
                      </span>
                    </div>
                  </div>
                  {deliveryPartner.user_profiles?.phone && (
                    <a href={`tel:${deliveryPartner.user_profiles.phone}`}>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Kitchen Details */}
            {kitchen && (
              <div className="bg-card border rounded-lg p-6">
                <div className="flex items-start gap-4">
                  {kitchen.image_url && (
                    <img
                      src={kitchen.image_url}
                      alt={kitchen.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{kitchen.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {kitchen.address}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Address */}
            {address && (
              <div className="bg-card border rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <Home className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Delivery Address</h3>
                    <p className="text-sm font-medium text-muted-foreground mt-1">{address.label}</p>
                    <p className="text-sm text-muted-foreground">{address.address_line}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-4">Order Summary</h3>
              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-sm border-2 ${
                          item.is_veg ? 'border-green-600' : 'border-red-600'
                        }`}>
                          <div className={`w-2 h-2 rounded-full m-auto mt-0.5 ${
                            item.is_veg ? 'bg-green-600' : 'bg-red-600'
                          }`} />
                        </span>
                        <span className="font-medium text-sm">{item.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground ml-6">Qty: {item.quantity}</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>{formatCurrency(order.delivery_fee)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Payment: {order.payment_method === 'cod' ? 'Cash on Delivery' : 'UPI'}
                </p>
              </div>
            </div>

            {/* Delivery Instructions */}
            {order.delivery_instructions && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm font-medium text-yellow-900">Delivery Instructions:</p>
                <p className="text-sm text-yellow-800 mt-1">{order.delivery_instructions}</p>
              </div>
            )}

            {/* Need Help */}
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-3">Need Help?</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Phone className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
                {isDelivered && (
                  <Link to="/customer/review" state={{ orderId: order.id }}>
                    <Button className="w-full gradient-primary" size="sm">
                      Rate Your Experience
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Load Google Maps Script */}
      <script
        async
        src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&libraries=geometry"
      />
    </div>
  );
}
