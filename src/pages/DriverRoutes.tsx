import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { collection, query, where, onSnapshot, doc, updateDoc, runTransaction } from 'firebase/firestore';
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
  targetHubId?: string;
  currentHubId?: string;
  createdAt: string;
}

interface Hub {
  id: string;
  name: string;
  companyName: string;
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

const RoadRoute = ({ origin, destination, color = '#4f46e5', opacity = 0.6 }: { origin: any; destination: any; color?: string; opacity?: number; key?: string }) => {
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

const MapContent = ({ deliveries, optimizedTasks, driverLocation }: { deliveries: any[]; optimizedTasks: Task[]; driverLocation: any }) => {
  return (
    <>
      <MapUpdater deliveries={deliveries} />
      
      {/* Current Driver Marker */}
      {driverLocation && (
        <Marker 
          position={[driverLocation.lat, driverLocation.lng]} 
          icon={createIcon('#3b82f6')}
        />
      )}

      {/* Road Segment Routes for Optimized Tasks */}
      {optimizedTasks.length > 0 && driverLocation && (
        <RoadRoute 
          origin={driverLocation} 
          destination={optimizedTasks[0].location} 
          color="#3b82f6" 
          opacity={0.8}
        />
      )}
      
      {optimizedTasks.length > 1 && optimizedTasks.slice(0, -1).map((task, i) => (
        <RoadRoute 
          key={`segment-${i}`}
          origin={task.location} 
          destination={optimizedTasks[i+1].location} 
          color="#3b82f6" 
          opacity={0.5}
        />
      ))}

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

      {/* Task Sequence Numbers */}
      {optimizedTasks.map((t, index) => (
        <Marker
          key={t.id}
          position={[t.location.lat, t.location.lng]}
          icon={L.divIcon({
            html: `<div class="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black border-2 border-white shadow-lg ring-4 ring-blue-500/20">${index + 1}</div>`,
            className: '',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })}
        />
      ))}
    </>
  );
};

interface BusTransport {
  id: string;
  busNumber: string;
  companyName: string;
  route: string;
  status: string;
  gpsEnabled?: boolean;
}

interface Task {
  id: string;
  deliveryId: string;
  type: 'pickup' | 'dropoff';
  location: { lat: number; lng: number };
  address: string;
  priority: number;
  distanceTo?: number;
}

const getDistance = (l1: { lat: number; lng: number }, l2: { lat: number; lng: number }) => {
  const R = 6371; // km
  const dLat = (l2.lat - l1.lat) * Math.PI / 180;
  const dLng = (l2.lng - l1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(l1.lat * Math.PI / 180) * Math.cos(l2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const DriverRoutes = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [myTransports, setMyTransports] = useState<BusTransport[]>([]);
  const [activeBusId, setActiveBusId] = useState<string | null>(localStorage.getItem('active_bus_id'));
  const [isTracking, setIsTracking] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [optimizedTasks, setOptimizedTasks] = useState<Task[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showTrackingConfirm, setShowTrackingConfirm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showHubs, setShowHubs] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Fetch my registered transports
    const transportUnsub = onSnapshot(
      query(collection(db, 'bus_transports'), where('driverId', '==', user.uid)),
      (snapshot) => {
        setMyTransports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BusTransport)));
      }
    );

    // Fetch Hubs for handover
    const hubUnsub = onSnapshot(collection(db, 'bus_counters'), (snapshot) => {
      setHubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hub)));
    });

    const deliveryPath = 'deliveries';
    const statusQuery = query(
      collection(db, deliveryPath),
      where('status', 'in', ['pending', 'at_hub'])
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
      hubUnsub();
      transportUnsub();
    };
  }, [user]);

  // GPS Tracking Logic
  useEffect(() => {
    if (!isTracking || !activeBusId) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setDriverLocation({ lat: latitude, lng: longitude });
        try {
          await updateDoc(doc(db, 'bus_transports', activeBusId), {
            driverLocation: { lat: latitude, lng: longitude },
            lastGpsSync: new Date().toISOString()
          });
          
          // Also update all active deliveries handled by this driver for convenience (optional but helpful for client speed)
          const batchUpdates = deliveries
            .filter(d => d.driverId === user?.uid && ['accepted', 'picked_up', 'in_transit'].includes(d.status))
            .map(d => updateDoc(doc(db, 'deliveries', d.id), {
               driverLocation: { lat: latitude, lng: longitude }
            }));
          
          await Promise.all(batchUpdates);
        } catch (e) {
          console.error("GPS update error:", e);
        }
      },
      (error) => {
        console.error("GPS Error:", error);
        toast.error("GPS Signal Lost!");
        setIsTracking(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isTracking, activeBusId, deliveries, user?.uid]);

  const toggleTracking = () => {
    if (isTracking) {
      setIsTracking(false);
      toast.success("GPS Tracking Stopped");
      return;
    }

    if (!activeBusId) {
      toast.error("Please select a bus first");
      return;
    }
    const selectedBus = myTransports.find(b => b.id === activeBusId);
    if (selectedBus && selectedBus.gpsEnabled === false) {
      toast.error("GPS Tracking is disabled for this bus. Enable it in registration.");
      return;
    }
    setShowTrackingConfirm(true);
  };

  const confirmStartTracking = () => {
    setIsTracking(true);
    setShowTrackingConfirm(false);
    toast.success("GPS Tracking Active!");
  };

  // Route Optimization Logic (Greedy TSP)
  useEffect(() => {
    if (!user || deliveries.length === 0) {
      setOptimizedTasks([]);
      return;
    }

    const runOptimization = () => {
      setIsOptimizing(true);
      
      // 1. Define possible tasks for the driver
      const myDeliveries = deliveries.filter(d => d.driverId === user.uid);
      const tasks: Task[] = [];

      myDeliveries.forEach(d => {
        if (d.status === 'accepted') {
          tasks.push({
            id: `pickup-${d.id}`,
            deliveryId: d.id,
            type: 'pickup',
            location: d.pickup,
            address: d.pickupHubName || d.pickup.address,
            priority: 1
          });
        } else if (['picked_up', 'in_transit'].includes(d.status)) {
          tasks.push({
            id: `dropoff-${d.id}`,
            deliveryId: d.id,
            type: 'dropoff',
            location: d.dropoff,
            address: d.dropoffHubName || d.dropoff.address,
            priority: 2
          });
        }
      });

      if (tasks.length === 0) {
        setOptimizedTasks([]);
        setIsOptimizing(false);
        return;
      }

      // 2. Greedy TSP Solver
      const result: Task[] = [];
      let currentLoc = driverLocation || tasks[0].location;
      const remainingTasks = [...tasks];

      while (remainingTasks.length > 0) {
        let nearestIdx = 0;
        let minDist = Infinity;

        for (let i = 0; i < remainingTasks.length; i++) {
          const d = getDistance(currentLoc, remainingTasks[i].location);
          if (d < minDist) {
            minDist = d;
            nearestIdx = i;
          }
        }

        const [nextTask] = remainingTasks.splice(nearestIdx, 1);
        nextTask.distanceTo = minDist;
        result.push(nextTask);
        currentLoc = nextTask.location;
      }

      setOptimizedTasks(result);
      setIsOptimizing(false);
    };

    const timeoutId = setTimeout(runOptimization, 1000); // Debounce
    return () => clearTimeout(timeoutId);
  }, [deliveries, driverLocation, user]);

  const handleBusSelect = (id: string) => {
    setActiveBusId(id);
    localStorage.setItem('active_bus_id', id);
  };

  const handoverToHub = async (deliveryId: string, hubId: string) => {
    const deliveryPath = `deliveries/${deliveryId}`;
    const delivery = deliveries.find(d => d.id === deliveryId);
    
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Update delivery status
        const deliveryRef = doc(db, 'deliveries', deliveryId);
        transaction.update(deliveryRef, {
          status: 'at_hub',
          currentHubId: hubId,
          driverId: null, // Released from current helper
          updatedAt: new Date().toISOString()
        });

        // 2. Free up slot on the bus if applicable
        if (delivery?.busTransportId && delivery?.slotId) {
          const busRef = doc(db, 'bus_transports', delivery.busTransportId);
          transaction.update(busRef, {
            [`slots.${delivery.slotId}`]: 'available'
          });
        }
      });

      toast.success('Parcel handed over to Hub & Slot freed!');
      setShowHubs(false);
      setSelectedId(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, deliveryPath);
    }
  };

  const deliverParcel = async (id: string) => {
    const delivery = deliveries.find(d => d.id === id);
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Mark as delivered
        const deliveryRef = doc(db, 'deliveries', id);
        transaction.update(deliveryRef, {
          status: 'delivered',
          updatedAt: new Date().toISOString()
        });

        // 2. Free up slot if still occupied
        if (delivery?.busTransportId && delivery?.slotId) {
          const busRef = doc(db, 'bus_transports', delivery.busTransportId);
          transaction.update(busRef, {
            [`slots.${delivery.slotId}`]: 'available'
          });
        }
      });
      toast.success('Parcel Delivered & Slot freed!');
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const pickupParcel = async (id: string) => {
    const deliveryPath = `deliveries/${id}`;
    try {
      await updateDoc(doc(db, 'deliveries', id), {
        status: 'picked_up',
        updatedAt: new Date().toISOString()
      });
      toast.success('Parcel Picked Up!');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, deliveryPath);
    }
  };

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
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Active Routes</h1>
          <p className="text-slate-400 font-medium">Optimize your pickups along the bus route.</p>
        </div>
        
        {/* Hub GPS Controller */}
        <div className="glass p-1.5 rounded-[2rem] flex items-center gap-1 min-w-[300px]">
           <div className="flex-1 px-4">
              <select 
                value={activeBusId || ''} 
                onChange={(e) => handleBusSelect(e.target.value)}
                className="bg-transparent text-white text-[10px] font-black uppercase tracking-widest outline-none w-full"
              >
                <option value="" disabled className="bg-slate-900">Select Active Bus</option>
                {myTransports.map(bt => (
                  <option key={bt.id} value={bt.id} className="bg-slate-900">{bt.busNumber} ({bt.companyName})</option>
                ))}
              </select>
           </div>
           <button
             onClick={toggleTracking}
             className={cn(
               "flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all",
               isTracking 
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 animate-pulse" 
                : "bg-white/5 text-slate-400 hover:bg-white/10"
             )}
           >
             <Navigation size={14} className={isTracking ? 'animate-bounce' : ''} />
             {isTracking ? 'LIVE ON' : 'START SYNC'}
           </button>
        </div>
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
              <MapContent deliveries={deliveries} optimizedTasks={optimizedTasks} driverLocation={driverLocation} />
            </MapContainer>
         </div>

         <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            {optimizedTasks.length > 0 && (
              <div className="space-y-4 mb-10">
                <div className="flex items-center justify-between px-2">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <h3 className="font-black text-white tracking-tight uppercase text-xs">Route Optimization</h3>
                   </div>
                   {isOptimizing && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                </div>
                
                <div className="space-y-2">
                  {optimizedTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass p-4 rounded-2xl border-white/5 flex items-center gap-4 relative overflow-hidden group"
                    >
                       <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
                       <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-blue-400">
                          {index + 1}
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                             <Badge variant={task.type === 'pickup' ? 'info' : 'success'}>
                                {task.type}
                             </Badge>
                             <p className="text-[10px] font-black text-slate-500 uppercase truncate">#{task.deliveryId.slice(-6)}</p>
                             {task.distanceTo !== undefined && (
                               <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded ml-auto">
                                  {task.distanceTo.toFixed(1)} km
                               </span>
                             )}
                          </div>
                          <p className="text-xs text-white font-bold truncate">{task.address}</p>
                       </div>
                       <ArrowRight size={14} className="text-white/10 group-hover:text-blue-500 transition-colors" />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

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
                       
                       {d.status === 'at_hub' && (
                         <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Waiting at Hub for Transfer</p>
                         </div>
                       )}

                       {d.status === 'pending' || (d.status === 'at_hub' && d.driverId !== user?.uid) ? (
                         <div className="flex flex-col gap-2">
                           <Button 
                              onClick={(e) => { e.stopPropagation(); acceptDelivery(d.id, d.busTransportId, d.slotId); }}
                              className="w-full text-[10px] py-3 uppercase tracking-widest font-black"
                           >
                              {d.status === 'at_hub' ? 'Accept for Transfer' : 'Counter Check-in'}
                           </Button>
                           {d.status === 'at_hub' && (
                             <Button 
                                variant="outline"
                                onClick={(e) => { e.stopPropagation(); setShowHubs(true); setSelectedId(d.id); }}
                                className="w-full text-[8px] py-2 border-white/10 bg-white/5 font-black uppercase tracking-widest mt-1"
                             >
                                Handover to Another Hub
                             </Button>
                           )}
                         </div>
                       ) : d.status !== 'delivered' && d.status !== 'cancelled' ? (
                         <div className="space-y-3">
                            <div className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-2">
                               <CheckCircle2 size={16} /> 
                               {d.status === 'accepted' ? 'Assigned (Pending Pickup)' : 'In My Care (Helper)'}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                               {d.status === 'accepted' ? (
                                 <Button 
                                    onClick={(e) => { e.stopPropagation(); pickupParcel(d.id); }}
                                    className="col-span-2 py-3 bg-blue-600 hover:bg-blue-500 font-black uppercase tracking-widest text-[10px]"
                                 >
                                    Mark as Picked Up
                                 </Button>
                               ) : (
                                 <>
                                   <Button 
                                      variant="outline"
                                      onClick={(e) => { e.stopPropagation(); setShowHubs(true); setSelectedId(d.id); }}
                                      className="text-[8px] py-2 border-white/10 bg-white/5"
                                   >
                                      Hub Handover
                                   </Button>
                                   <Button 
                                      onClick={(e) => { e.stopPropagation(); deliverParcel(d.id); }}
                                      className="text-[8px] py-2 bg-emerald-600 hover:bg-emerald-500"
                                   >
                                      Final Delivery
                                   </Button>
                                 </>
                               )}
                            </div>
                         </div>
                       ) : null}
                    </Card>
                  </motion.div>
               ))}
            </AnimatePresence>
         </div>
      </div>

      <AnimatePresence>
        {showTrackingConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowTrackingConfirm(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm bg-slate-900 rounded-[2.5rem] border border-white/10 shadow-2xl p-8"
            >
              <div className="w-16 h-16 bg-blue-600/20 rounded-3xl flex items-center justify-center text-blue-400 mb-6 mx-auto">
                <Navigation size={32} className="animate-pulse" />
              </div>
              <h3 className="text-xl font-black text-white text-center mb-2 tracking-tight">Enable Live Tracking?</h3>
              <p className="text-slate-400 text-center text-sm font-medium mb-8 leading-relaxed">
                By starting sync, your current GPS coordinates will be shared with customers to provide accurate ETA for their parcels.
              </p>
              <div className="space-y-3">
                <Button onClick={confirmStartTracking} className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 font-black uppercase tracking-widest text-[10px]">
                  Start Live Sync
                </Button>
                <Button onClick={() => setShowTrackingConfirm(false)} variant="ghost" className="w-full py-4 text-slate-500 font-black uppercase tracking-widest text-[10px]">
                  Maybe Later
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {showHubs && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowHubs(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md bg-slate-900 rounded-[2.5rem] border border-white/10 shadow-2xl p-10"
            >
              <h3 className="text-xl font-black text-white mb-6">Select Hub for Handover</h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto mb-8 pr-2 custom-scrollbar">
                {hubs.map(hub => (
                  <button
                    key={hub.id}
                    onClick={() => selectedId && handoverToHub(selectedId, hub.id)}
                    className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 text-left transition-all"
                  >
                    <p className="text-sm font-bold text-white">{hub.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{hub.companyName}</p>
                  </button>
                ))}
              </div>
              <Button onClick={() => setShowHubs(false)} variant="ghost" className="w-full text-slate-500 font-black uppercase tracking-widest text-[10px]">Cancel</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
