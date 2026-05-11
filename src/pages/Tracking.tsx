import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, Badge, Button } from '../components/common/UI';
import { Bus, MapPin, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Fix for default Leaflet icon paths in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
// Leaflet doesn't need an API key for OSM
const hasValidKey = true;

// Custom Icons
const createIcon = (color: string, label: string) => L.divIcon({
  html: `
    <div class="flex flex-col items-center">
      <div class="bg-slate-900 border border-white/20 px-2 py-1 rounded-md mb-1 shadow-lg">
        <p class="text-[8px] font-black text-white uppercase tracking-tighter">${label}</p>
      </div>
      <div class="w-4 h-4 rounded-full border-2 border-white shadow-lg" style="background-color: ${color}"></div>
    </div>
  `,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 40]
});

const driverIcon = L.divIcon({
  html: `
    <div class="relative">
      <div class="bg-blue-600 p-2 rounded-2xl text-white shadow-2xl border-2 border-white/20 flex items-center justify-center animate-pulse">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10h10"/><path d="M10 6h4"/><path d="M10 14h4"/><path d="M15 14h.01"/><path d="M19 14h.01"/><path d="M19 6h-7"/><path d="M19 10h-7"/><path d="M5 14h.01"/><path d="M5 6h.01"/><path d="M5 10h.01"/><path d="M14 6h3"/><path d="M14 10h3"/><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m10 20 2 2 2-2"/></svg>
      </div>
    </div>
  `,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

const MapUpdater = ({ deliveries }: { deliveries: any[] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !deliveries.length) return;
    const first = deliveries[0];
    if (first.pickup) {
       map.setView([first.pickup.lat, first.pickup.lng], 13);
    }
  }, [map, deliveries]);

  return null;
};

const MapContent = ({ deliveries }: { deliveries: any[] }) => {
  return (
    <>
      <MapUpdater deliveries={deliveries} />
      {deliveries.map((d) => (
        <React.Fragment key={d.id}>
           {d.pickup && (
             <Marker 
               position={[d.pickup.lat, d.pickup.lng]} 
               icon={createIcon('#4f46e5', 'Pickup')} 
             />
           )}
           {d.dropoff && (
             <Marker 
               position={[d.dropoff.lat, d.dropoff.lng]} 
               icon={createIcon('#10b981', 'Dropoff')} 
             />
           )}
           {d.pickup && d.dropoff && (
             <Polyline 
               positions={[
                 [d.pickup.lat, d.pickup.lng],
                 [d.dropoff.lat, d.dropoff.lng]
               ]} 
               color="#3b82f6" 
               weight={3} 
               opacity={0.4} 
             />
           )}
           {d.driverLocation && (
             <Marker 
               position={[d.driverLocation.lat, d.driverLocation.lng]} 
               icon={driverIcon} 
             />
           )}
        </React.Fragment>
      ))}
    </>
  );
};

export const Tracking = () => {
  const { user, role } = useAuth();
  const [activeDeliveries, setActiveDeliveries] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'deliveries'),
      where(role === 'customer' ? 'senderId' : 'driverId', '==', user.uid),
      where('status', 'in', ['accepted', 'picked_up', 'in_transit'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActiveDeliveries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [user, role]);

  if (!hasValidKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mb-6">
           <Navigation size={32} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Google Maps Key Required</h2>
        <p className="text-gray-500 max-w-sm mb-8">
           To enable real-time tracking, please add your Google Maps API key to the secrets panel.
        </p>
        <div className="bg-white p-6 rounded-2xl shadow-sm text-left w-full max-w-md border border-gray-100">
            <p className="text-sm font-bold mb-4 flex items-center gap-2">
               <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px]">1</span>
               Add GOOGLE_MAPS_PLATFORM_KEY to Secrets
            </p>
            <ul className="text-xs space-y-2 text-gray-400">
               <li>1. Open Settings (⚙️ icon)</li>
               <li>2. Select Secrets</li>
               <li>3. Add name: <code className="bg-gray-100 px-1 py-0.5 rounded">GOOGLE_MAPS_PLATFORM_KEY</code></li>
            </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 h-full flex flex-col">
       <div>
        <h1 className="text-4xl font-black text-white tracking-tighter">Real-time Tracking</h1>
        <p className="text-slate-400 font-medium">View live status and location of your parcels.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-10 flex-1 min-h-0">
         <div className="lg:col-span-2 relative min-h-[450px] rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl glass">
            <MapContainer
              center={[23.8103, 90.4125]}
              zoom={12}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%', background: '#020617' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.osm.org/{z}/{x}/{y}.png"
              />
              <MapContent deliveries={activeDeliveries} />
            </MapContainer>
            
            {/* Overlay for "Glass" effect on map */}
            <div className="absolute inset-0 pointer-events-none border-[12px] border-white/5 rounded-[2.5rem] shadow-inner z-[1000]"></div>
         </div>

         <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            <h3 className="font-black text-white px-1 tracking-tight">Active Shipments ({activeDeliveries.length})</h3>
            <AnimatePresence>
               {activeDeliveries.map(d => (
                  <motion.div 
                    key={d.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <Card className="p-6 border-white/5 bg-white/5 hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300 group">
                       <div className="flex justify-between items-center mb-5">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">ID: #{d.id.slice(-6)}</p>
                          <Badge variant="info">{d.status.replace('_', ' ')}</Badge>
                       </div>
                       <div className="space-y-4 mb-6">
                          <div className="flex gap-3 items-center">
                             <MapPin size={16} className="text-blue-500 shrink-0" />
                             <p className="text-xs text-slate-300 font-bold line-clamp-1">{d.pickup.address}</p>
                          </div>
                          <div className="flex gap-3 items-center">
                             <MapPin size={16} className="text-emerald-500 shrink-0" />
                             <p className="text-xs text-slate-300 font-bold line-clamp-1">{d.dropoff.address}</p>
                          </div>
                       </div>
                       <div className="flex items-center justify-between pt-5 border-t border-white/5">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 bg-blue-600/10 rounded-lg flex items-center justify-center text-blue-400">
                                <Bus size={16} />
                             </div>
                             <span className="text-[10px] font-black text-white uppercase tracking-widest">{d.busRoute}</span>
                          </div>
                          <Button variant="ghost" className="px-3 py-1.5 h-auto text-[9px] uppercase tracking-widest font-black">Details</Button>
                       </div>
                    </Card>
                  </motion.div>
               ))}
               {activeDeliveries.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-3xl border-dashed border-white/10">
                     <Bus className="text-slate-700 mb-4" size={40} />
                     <p className="text-slate-500 text-xs font-black uppercase tracking-widest px-8 leading-relaxed">No shipments currently in transit.</p>
                  </div>
               )}
            </AnimatePresence>
         </div>
      </div>
    </div>
  );
};
