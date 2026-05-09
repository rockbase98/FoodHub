import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Bike } from 'lucide-react';

interface DeliveryMapProps {
  kitchenLat?: number | null;
  kitchenLng?: number | null;
  customerLat?: number | null;
  customerLng?: number | null;
  riderLat?: number | null;
  riderLng?: number | null;
  kitchenName?: string;
  customerAddress?: string;
  orderStatus?: string;
}

export default function DeliveryMap({
  kitchenLat,
  kitchenLng,
  customerLat,
  customerLng,
  riderLat,
  riderLng,
  kitchenName = 'Restaurant',
  customerAddress = 'Your Location',
  orderStatus,
}: DeliveryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ kitchen?: any; customer?: any; rider?: any }>({});
  const polylineRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [leafletError, setLeafletError] = useState(false);

  // Determine best center point
  const getCenterPoint = (): [number, number] => {
    if (riderLat && riderLng) return [riderLat, riderLng];
    if (kitchenLat && kitchenLng) return [kitchenLat, kitchenLng];
    if (customerLat && customerLng) return [customerLat, customerLng];
    // Default: Jaipur, India
    return [26.9124, 75.7873];
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Dynamically import Leaflet to avoid SSR issues
    const initMap = async () => {
      try {
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');

        if (!mapContainerRef.current) return;

        const center = getCenterPoint();
        const map = L.map(mapContainerRef.current, {
          center,
          zoom: 13,
          zoomControl: true,
          attributionControl: false,
          scrollWheelZoom: false,
        });

        // Use OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;

        // Create custom icons using DivIcon
        const createIcon = (emoji: string, label: string, color: string) =>
          L.divIcon({
            html: `
              <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
              ">
                <div style="
                  width: 40px;
                  height: 40px;
                  border-radius: 50% 50% 50% 0;
                  transform: rotate(-45deg);
                  background: ${color};
                  border: 3px solid white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
                ">
                  <span style="
                    transform: rotate(45deg);
                    font-size: 18px;
                    line-height: 1;
                  ">${emoji}</span>
                </div>
                <div style="
                  background: ${color};
                  color: white;
                  padding: 2px 8px;
                  border-radius: 20px;
                  font-size: 10px;
                  font-weight: 700;
                  font-family: 'Poppins', sans-serif;
                  white-space: nowrap;
                  margin-top: 2px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                ">${label}</div>
              </div>
            `,
            iconSize: [60, 64],
            iconAnchor: [30, 64],
            popupAnchor: [0, -64],
            className: '',
          });

        const riderIcon = L.divIcon({
          html: `
            <div style="
              display: flex;
              flex-direction: column;
              align-items: center;
              filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
            ">
              <div style="
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: linear-gradient(135deg, #FF6B35, #FF8E53);
                border: 3px solid white;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 12px rgba(255,107,53,0.5);
                animation: riderPulse 1.5s ease-in-out infinite;
              ">
                <span style="font-size: 22px; line-height: 1;">🏍️</span>
              </div>
              <div style="
                background: linear-gradient(135deg, #FF6B35, #FF8E53);
                color: white;
                padding: 2px 10px;
                border-radius: 20px;
                font-size: 10px;
                font-weight: 700;
                font-family: 'Poppins', sans-serif;
                margin-top: 2px;
                box-shadow: 0 2px 4px rgba(255,107,53,0.4);
              ">Rider</div>
            </div>
          `,
          iconSize: [70, 68],
          iconAnchor: [35, 68],
          popupAnchor: [0, -68],
          className: '',
        });

        const kitchenIcon = createIcon('🍽️', kitchenName.slice(0, 10), '#22c55e');
        const customerIcon = createIcon('📍', 'You', '#3b82f6');

        const points: [number, number][] = [];

        // Add kitchen marker
        if (kitchenLat && kitchenLng) {
          const kitchenMarker = L.marker([kitchenLat, kitchenLng], { icon: kitchenIcon })
            .addTo(map)
            .bindPopup(`<b>🍽️ ${kitchenName}</b><br>Restaurant Location`);
          markersRef.current.kitchen = kitchenMarker;
          points.push([kitchenLat, kitchenLng]);
        }

        // Add customer marker
        if (customerLat && customerLng) {
          const customerMarker = L.marker([customerLat, customerLng], { icon: customerIcon })
            .addTo(map)
            .bindPopup(`<b>📍 Your Location</b><br>${customerAddress}`);
          markersRef.current.customer = customerMarker;
          points.push([customerLat, customerLng]);
        }

        // Add rider marker
        if (riderLat && riderLng) {
          const riderMarker = L.marker([riderLat, riderLng], { icon: riderIcon })
            .addTo(map)
            .bindPopup('<b>🏍️ Delivery Partner</b><br>On the way!');
          markersRef.current.rider = riderMarker;
          points.push([riderLat, riderLng]);
        }

        // Draw dotted route line
        if (points.length > 1) {
          polylineRef.current = L.polyline(points, {
            color: '#FF6B35',
            weight: 3,
            opacity: 0.7,
            dashArray: '8, 8',
          }).addTo(map);
          map.fitBounds(L.latLngBounds(points), { padding: [50, 50] });
        } else if (points.length === 1) {
          map.setView(points[0], 14);
        }

        // Add pulse animation CSS
        const style = document.createElement('style');
        style.textContent = `
          @keyframes riderPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255,107,53,0.4); }
            50% { box-shadow: 0 0 0 10px rgba(255,107,53,0); }
          }
        `;
        document.head.appendChild(style);

        setMapLoaded(true);
      } catch (err) {
        console.error('Leaflet init error:', err);
        setLeafletError(true);
      }
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update rider marker position on prop change
  useEffect(() => {
    if (!mapRef.current || !markersRef.current.rider || !riderLat || !riderLng) return;
    markersRef.current.rider.setLatLng([riderLat, riderLng]);

    // Update polyline
    if (polylineRef.current) {
      const points: [number, number][] = [];
      if (kitchenLat && kitchenLng) points.push([kitchenLat, kitchenLng]);
      if (riderLat && riderLng) points.push([riderLat, riderLng]);
      if (customerLat && customerLng) points.push([customerLat, customerLng]);
      polylineRef.current.setLatLngs(points);
    }
  }, [riderLat, riderLng]);

  // Fallback UI when no coordinates available
  const hasCoords = (kitchenLat && kitchenLng) || (customerLat && customerLng) || (riderLat && riderLng);

  if (leafletError || !hasCoords) {
    return (
      <div className="w-full h-56 bg-gradient-to-br from-orange-50 to-blue-50 rounded-2xl border flex flex-col items-center justify-center gap-3">
        <div className="flex items-center gap-4">
          {kitchenLat && kitchenLng ? (
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center">
                <span className="text-lg">🍽️</span>
              </div>
              <span className="text-xs font-medium text-green-700">Restaurant</span>
            </div>
          ) : null}

          <div className="flex-1 border-t-2 border-dashed border-orange-400 mx-2 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-md">
              <span className="text-sm">🏍️</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-blue-500 flex items-center justify-center">
              <span className="text-lg">📍</span>
            </div>
            <span className="text-xs font-medium text-blue-700">You</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center px-4">
          {!hasCoords
            ? 'Live map available once delivery partner is assigned'
            : 'Map could not load — check your connection'}
        </p>
        {orderStatus === 'out_for_delivery' && (
          <div className="flex items-center gap-2 text-xs text-orange-600 font-semibold bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full">
            <Bike className="h-3.5 w-3.5" />
            Rider is on the way!
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-64 rounded-2xl overflow-hidden border shadow-sm">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">Loading map...</span>
          </div>
        </div>
      )}

      {/* Live badge */}
      {riderLat && riderLng && (
        <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-green-200 text-green-700 text-xs font-bold px-2.5 py-1.5 rounded-full shadow-md">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          LIVE
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl border shadow-sm px-3 py-2 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🍽️</span>
          <span className="text-xs font-medium">Restaurant</span>
        </div>
        {riderLat && riderLng && (
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🏍️</span>
            <span className="text-xs font-medium">Rider</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-sm">📍</span>
          <span className="text-xs font-medium">You</span>
        </div>
      </div>
    </div>
  );
}
