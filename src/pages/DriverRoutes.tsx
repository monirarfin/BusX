import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, Badge, Button } from '../components/common/UI';
import { Bus, MapPin, Navigation, Package, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';

// Fix for default Leaflet icon paths in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Delivery {
  id: string;
  senderId: string;
  driverId?: string;
  status: 'pending' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  pickup: { lat: number; lng: number; address: string };
  dropoff: { lat: number; lng: number; address: string };
  parcelDetails: string;
  busRoute?: string;
  createdAt: string;
}

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = true;

const createIcon = (color: string) => L.divIcon({
  html: `<div class="w-4 h-4 rounded-full border-2 border-white shadow-lg" style="background-color: ${color}"></div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const MapUpdater = ({ deliveries }: { deliveries: any[] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !deliveries.length) return;
    const first = deliveries[0];
    map.setView([first.pickup.lat, first.pickup.lng], 12);
  }, [map, deliveries.length > 0]);

  return null;
};

const MapContent = ({ deliveries }: { deliveries: any[] }) => {
  return (
    <>
      <MapUpdater deliveries={deliveries} />
      {deliveries.map((d) => (
        <React.Fragment key={d.id}>
           <Marker 
             position={[d.pickup.lat, d.pickup.lng]} 
             icon={createIcon('#4f46e5')} 
           />
           <Marker 
             position={[d.dropoff.lat, d.dropoff.lng]} 
             icon={createIcon('#10b981')} 
           />
           <Polyline 
              positions={[
                [d.pickup.lat, d.pickup.lng],
                [d.dropoff.lat, d.dropoff.lng]
              ]} 
              color={d.status === 'pending' ? '#94a3b8' : '#3b82f6'} 
              weight={3}
              opacity={0.6}
           />
        </React.Fragment>
      ))}
    </>
  );
};

export const DriverRoutes = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    // Show PENDING deliveries (potential) and deliveries assigned to THIS driver
    const q = query(
      collection(db, 'deliveries'),
      where('status', 'in', ['pending', 'accepted', 'picked_up', 'in_transit'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Delivery));
      // Filter in memory for specific driver visibility logic
      setDeliveries(data.filter(d => d.status === 'pending' || d.driverId === user.uid));
    });

    return () => unsubscribe();
  }, [user]);

  const acceptDelivery = async (id: string) => {
    try {
      await updateDoc(doc(db, 'deliveries', id), {
        status: 'accepted',
        driverId: user?.uid,
        updatedAt: new Date().toISOString()
      });
      toast.success('Task accepted!');
    } catch (e) {
      toast.error('Failed to accept');
    }
  };

  const selectedDelivery = deliveries.find(d => d.id === selectedId);

  if (!hasValidKey) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 glass rounded-[2.5rem]">
           <Navigation size={40} className="text-blue-500 mb-4" />
           <h2 className="text-2xl font-black text-white mb-2">Driver Maps Required</h2>
           <p className="text-slate-400 max-w-sm mb-6 font-medium">Please add your Google Maps API key to view routes.</p>
        </div>
     );
  }

  return (
    <div className="space-y-8 h-full flex flex-col">
       <div>
        <h1 className="text-4xl font-black text-white tracking-tighter">Active Routes</h1>
        <p className="text-slate-400 font-medium">Optimize your pickups along the bus route.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-10 flex-1 min-h-0">
         <div className="lg:col-span-2 relative min-h-[500px] rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl glass font-sans">
            <MapContainer
              center={[23.8103, 90.4125]}
              zoom={11}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%', background: '#020617' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.osm.org/{z}/{x}/{y}.png"
              />
              <MapContent deliveries={deliveries} />
            </MapContainer>
         </div>

         <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center justify-between px-2">
               <h3 className="font-black text-white tracking-tight">Available Tasks</h3>
               <Badge variant="info">{deliveries.length}</Badge>
            </div>

            <AnimatePresence>
               {deliveries.map(d => (
                  <motion.div 
                    key={d.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => setSelectedId(d.id)}
                  >
                    <Card className={cn(
                      "p-6 border-white/5 bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer",
                      selectedId === d.id ? "ring-2 ring-blue-500 bg-white/10" : ""
                    )}>
                       <div className="flex justify-between items-center mb-4">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">#{d.id.slice(-6)}</p>
                          <Badge variant={d.status === 'pending' ? 'warning' : 'success'}>
                            {d.status === 'pending' ? 'Potential' : 'Assigned'}
                          </Badge>
                       </div>
                       
                       <div className="space-y-4 mb-6">
                          <div className="flex gap-3">
                             <MapPin size={16} className="text-blue-400 shrink-0" />
                             <p className="text-xs text-white font-bold truncate">{d.pickup.address}</p>
                          </div>
                          <div className="flex gap-3">
                             <MapPin size={16} className="text-emerald-400 shrink-0" />
                             <p className="text-xs text-secondary-white font-bold truncate">{d.dropoff.address}</p>
                          </div>
                       </div>

                       {d.status === 'pending' ? (
                         <Button 
                            onClick={(e) => { e.stopPropagation(); acceptDelivery(d.id); }}
                            className="w-full text-[10px] py-3 uppercase tracking-widest font-black"
                         >
                            Accept Task
                         </Button>
                       ) : (
                         <div className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                            <CheckCircle2 size={16} /> My Task
                         </div>
                       )}
                    </Card>
                  </motion.div>
               ))}
            </AnimatePresence>
         </div>
      </div>
    </div>
  );
};
