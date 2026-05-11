import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, Badge, Button } from '../components/common/UI';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
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
  busTransportId?: string;
  slotId?: string;
  price?: number;
  helperCommission?: number;
  pickupHubName?: string;
  dropoffHubName?: string;
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

const RoadRoute = ({ origin, destination, color = '#4f46e5', opacity = 0.6 }: { origin: any; destination: any; color?: string; opacity?: number }) => {
  const [positions, setPositions] = useState<[number, number][]>([]);

  useEffect(() => {
    if (!origin || !destination) return;

    const fetchRoute = async () => {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`
        );
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map((coord: any) => [coord[1], coord[0]]);
          setPositions(coords);
        } else {
          setPositions([[origin.lat, origin.lng], [destination.lat, destination.lng]]);
        }
      } catch (error) {
        console.error("OSRM error:", error);
        setPositions([[origin.lat, origin.lng], [destination.lat, destination.lng]]);
      }
    };

    fetchRoute();
  }, [origin.lat, origin.lng, destination.lat, destination.lng]);

  if (positions.length === 0) return null;

  return <Polyline positions={positions} color={color} weight={4} opacity={opacity} />;
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
           <RoadRoute 
              origin={d.pickup} 
              destination={d.dropoff} 
              color={d.status === 'pending' ? '#94a3b8' : '#3b82f6'} 
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
    
    const deliveryPath = 'deliveries';
    const statusQuery = query(
      collection(db, deliveryPath),
      where('status', '==', 'pending')
    );

    const driverQuery = query(
      collection(db, deliveryPath),
      where('driverId', '==', user.uid),
      where('status', 'in', ['accepted', 'picked_up', 'in_transit'])
    );

    const unsubPending = onSnapshot(statusQuery, (snapshot) => {
      const pendingData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Delivery));
      setDeliveries(prev => {
        const myTasks = prev.filter(d => d.driverId === user.uid);
        return [...myTasks, ...pendingData];
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, deliveryPath);
    });

    const unsubDriver = onSnapshot(driverQuery, (snapshot) => {
      const myData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Delivery));
      setDeliveries(prev => {
        const othersPending = prev.filter(d => d.status === 'pending');
        return [...myData, ...othersPending];
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, deliveryPath);
    });

    return () => {
      unsubPending();
      unsubDriver();
    };
  }, [user]);

  const acceptDelivery = async (id: string, busTransportId?: string, slotId?: string) => {
    const deliveryPath = `deliveries/${id}`;
    try {
      // 1. Accept parcel
      await updateDoc(doc(db, 'deliveries', id), {
        status: 'accepted',
        driverId: user?.uid,
        updatedAt: new Date().toISOString()
      });

      // 2. Confirm slot if applicable
      if (busTransportId && slotId) {
        const busRef = doc(db, 'bus_transports', busTransportId);
        await updateDoc(busRef, {
          [`slots.${slotId}`]: 'occupied'
        });
      }

      toast.success('Parcel verified & Slot confirmed!');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, deliveryPath);
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
                          <div className="flex flex-col">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">#{d.id.slice(-6)}</p>
                            {d.slotId && (
                               <div className="flex items-center gap-2 mt-1">
                                 <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-md">SLOT: {d.slotId}</span>
                                 {d.helperCommission && (
                                   <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-md">EARN: ৳{d.helperCommission}</span>
                                 )}
                               </div>
                            )}
                          </div>
                          <Badge variant={d.status === 'pending' ? 'warning' : 'success'}>
                            {d.status === 'pending' ? 'Pending Counter' : 'Verified'}
                          </Badge>
                       </div>
                       
                       <div className="space-y-4 mb-6">
                          <div className="flex gap-3">
                             <MapPin size={16} className="text-blue-400 shrink-0" />
                             <p className="text-xs text-white font-bold truncate">{d.pickupHubName || d.pickup.address}</p>
                          </div>
                          <div className="flex gap-3">
                             <MapPin size={16} className="text-emerald-400 shrink-0" />
                             <p className="text-xs text-secondary-white font-bold truncate">{d.dropoffHubName || d.dropoff.address}</p>
                          </div>
                       </div>

                       {d.status === 'pending' ? (
                         <Button 
                            onClick={(e) => { e.stopPropagation(); acceptDelivery(d.id, d.busTransportId, d.slotId); }}
                            className="w-full text-[10px] py-3 uppercase tracking-widest font-black"
                         >
                            Counter Check-in
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
