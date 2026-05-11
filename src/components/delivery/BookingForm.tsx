import React, { useState, useEffect } from 'react';
import { addDoc, collection, onSnapshot, query, orderBy, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button, Badge } from '../common/UI';
import { MapPin, Bus, Package, ShieldCheck, CreditCard, ChevronDown, Clock, Search, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrors';
import { cn } from '../../lib/utils';

interface Hub {
  id: string;
  name: string;
  companyName: string;
  location: { lat: number; lng: number; address: string };
}

interface BusTransport {
  id: string;
  busNumber: string;
  companyName: string;
  route: string;
  slots: Record<string, 'available' | 'booked' | 'occupied'>;
  driverLocation?: { lat: number; lng: number };
}

const SlotGrid = ({ slots, selectedSlot, onSelect }: { slots: Record<string, string>, selectedSlot: string, onSelect: (id: string) => void }) => {
  return (
    <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 mt-4">
      {Object.entries(slots).sort().map(([id, status]) => (
        <button
          key={id}
          type="button"
          disabled={status !== 'available'}
          onClick={() => onSelect(id)}
          className={cn(
            "aspect-square rounded-lg flex flex-col items-center justify-center transition-all border text-[10px] font-black",
            status === 'available' 
              ? id === selectedSlot 
                ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400/50 scale-105 z-10" 
                : "bg-slate-900/40 border-white/10 text-slate-500 hover:border-blue-500/50 hover:bg-blue-500/5"
              : "bg-slate-950/20 border-white/5 text-slate-800 cursor-not-allowed opacity-40"
          )}
        >
          <span className="opacity-60">{id.replace('SLOT-', '')}</span>
          {status === 'available' && id === selectedSlot && <CheckCircle2 size={10} className="mt-1" />}
        </button>
      ))}
    </div>
  );
};

// Helper function for distance
const calculateDistance = (p1: {lat: number, lng: number}, p2: {lat: number, lng: number}) => {
  const R = 6371; // km
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLon = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1.35; // Road distance factor
};

export const BookingForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [incomingBuses, setIncomingBuses] = useState<BusTransport[]>([]);
  const [distance, setDistance] = useState(0);
  const [price, setPrice] = useState(0);
  const [formData, setFormData] = useState({
    pickupHubId: '',
    dropoffHubId: '',
    busTransportId: '',
    slotId: '',
    parcelDetails: '',
  });

  useEffect(() => {
    if (formData.pickupHubId && formData.dropoffHubId) {
      const p = hubs.find(h => h.id === formData.pickupHubId);
      const d = hubs.find(h => h.id === formData.dropoffHubId);
      if (p && d) {
        const dist = calculateDistance(p.location, d.location);
        const calculatedPrice = Math.max(50, Math.ceil(dist / 50) * 50);
        setDistance(dist);
        setPrice(calculatedPrice);
      }
    }
  }, [formData.pickupHubId, formData.dropoffHubId, hubs]);

  useEffect(() => {
    if (!user) return;
    const hubPath = 'bus_counters';
    const q = query(collection(db, hubPath), orderBy('companyName', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hub)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, hubPath);
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch incoming buses when pickup hub is selected
  useEffect(() => {
    if (!user || !formData.pickupHubId) return;
    const selectedHub = hubs.find(h => h.id === formData.pickupHubId);
    if (!selectedHub) return;

    const transportPath = 'bus_transports';
    const q = query(
      collection(db, transportPath), 
      where('companyName', '==', selectedHub.companyName),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIncomingBuses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BusTransport)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, transportPath);
    });

    return () => unsubscribe();
  }, [user, formData.pickupHubId, hubs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const pickupHub = hubs.find(h => h.id === formData.pickupHubId);
    const dropoffHub = hubs.find(h => h.id === formData.dropoffHubId);
    const selectedBus = incomingBuses.find(b => b.id === formData.busTransportId);

    if (!pickupHub || !dropoffHub || !selectedBus || !formData.slotId) {
      toast.error('Please complete all selection steps.');
      return;
    }

    setLoading(true);
    const deliveryPath = 'deliveries';
    try {
      // 1. Create delivery record
      await addDoc(collection(db, deliveryPath), {
        senderId: user.uid,
        driverId: selectedBus.driverId, // The supervisor/helper in charge
        busTransportId: selectedBus.id,
        slotId: formData.slotId,
        price: price,
        helperCommission: price * 0.2, // 20% commission
        status: 'pending',
        pickup: pickupHub.location,
        dropoff: dropoffHub.location,
        pickupHubName: `${pickupHub.companyName} - ${pickupHub.name}`,
        dropoffHubName: `${dropoffHub.companyName} - ${dropoffHub.name}`,
        parcelDetails: formData.parcelDetails,
        busRoute: selectedBus.route,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 2. Mark slot as booked on bus
      const busRef = doc(db, 'bus_transports', selectedBus.id);
      await updateDoc(busRef, {
        [`slots.${formData.slotId}`]: 'booked'
      });

      toast.success('Successfully booked slot ' + formData.slotId);
      navigate('/dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, deliveryPath);
      toast.error('Failed to book parcel.');
    } finally {
      setLoading(false);
    }
  };

  const selectedBus = incomingBuses.find(b => b.id === formData.busTransportId);

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <Card className="overflow-hidden border-white/5 bg-slate-900/80 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl relative">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-10 py-10 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-full bg-white/10 skew-x-[-25deg] translate-x-20"></div>
           <div className="relative z-10 flex items-center justify-between">
              <div>
                 <h2 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                    <Bus size={36} />
                    BOX <span className="text-blue-200 uppercase">Storage</span>
                 </h2>
                 <p className="text-blue-100/60 text-xs font-bold uppercase tracking-widest mt-1">Select Bus & Your Preferred Slot</p>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map(s => (
                  <div key={s} className={cn("h-2 rounded-full transition-all duration-500", step >= s ? "w-8 bg-white shadow-lg" : "w-4 bg-white/20")} />
                ))}
              </div>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
           <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-8"
                >
                   <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-400">
                          <MapPin size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white tracking-tight">Hub Selection</h3>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Collection & Destination</p>
                        </div>
                      </div>
                      <div className="grid gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Pickup Hub Authority</label>
                          <div className="relative group">
                            <select 
                              required 
                              value={formData.pickupHubId}
                              onChange={e => setFormData({...formData, pickupHubId: e.target.value})}
                              className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-6 py-5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none transition-all group-hover:border-white/10"
                            >
                              <option value="">Select Pickup Counter</option>
                              {hubs.map(h => (
                                <option key={h.id} value={h.id}>{h.companyName} - {h.name}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Destination Hub</label>
                          <div className="relative group">
                            <select 
                              required 
                              value={formData.dropoffHubId}
                              onChange={e => setFormData({...formData, dropoffHubId: e.target.value})}
                              className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-6 py-5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none transition-all group-hover:border-white/10"
                            >
                              <option value="">Select Drop-off Counter</option>
                              {hubs.map(h => (
                                <option key={h.id} value={h.id}>{h.companyName} - {h.name}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
                          </div>
                        </div>

                        {price > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-blue-600/10 border border-blue-500/20 rounded-3xl p-6 flex items-center justify-between"
                          >
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                                   <CreditCard size={20} />
                                </div>
                                <div className="text-left">
                                   <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Estimated Cost</p>
                                   <p className="text-xl font-black text-white tracking-tighter">৳{price}</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Route Dist.</p>
                                <p className="text-sm font-black text-slate-300">~{distance.toFixed(0)} KM</p>
                             </div>
                          </motion.div>
                        )}
                      </div>
                   </div>
                   <Button 
                    type="button" 
                    disabled={!formData.pickupHubId || !formData.dropoffHubId}
                    onClick={() => setStep(2)}
                    className="w-full py-6 rounded-2xl text-lg font-black tracking-tighter shadow-xl shadow-blue-600/20"
                   >
                    SEARCH INCOMING BUSES
                   </Button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-400">
                               <Clock size={24} />
                            </div>
                            <div>
                               <h3 className="text-xl font-black text-white tracking-tight">Arriving Buses</h3>
                               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Live Schedule - Next 1 Hour</p>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        {incomingBuses.length === 0 ? (
                          <div className="py-20 border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center text-center px-10">
                            <Search size={40} className="text-slate-700 mb-4" />
                            <p className="text-slate-500 text-sm font-medium">Monitoring track... No buses of this company are currently approaching this hub.</p>
                          </div>
                        ) : (
                          incomingBuses.map(bus => {
                            const freeSlots = Object.values(bus.slots).filter(s => s === 'available').length;
                            const isIncoming = true; // Simulation
                            return (
                               <button
                                 key={bus.id}
                                 type="button"
                                 onClick={() => setFormData({...formData, busTransportId: bus.id})}
                                 className={cn(
                                   "w-full p-6 rounded-[2rem] border transition-all text-left relative overflow-hidden group",
                                   formData.busTransportId === bus.id 
                                     ? "bg-blue-600 border-blue-400 text-white shadow-2xl shadow-blue-600/30" 
                                     : "bg-white/5 border-white/5 hover:border-white/10"
                                 )}
                               >
                                 {isIncoming && (
                                   <div className="absolute top-0 right-0 py-1 px-4 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest rounded-bl-xl flex items-center gap-1">
                                      <div className="w-1 h-1 bg-white rounded-full animate-ping" />
                                      Incoming 15m
                                   </div>
                                 )}
                                 <div className="flex flex-col gap-4">
                                   <div className="flex items-center gap-3">
                                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", formData.busTransportId === bus.id ? "bg-white/20" : "bg-slate-800")}>
                                         <Bus size={20} />
                                      </div>
                                      <div>
                                         <p className="text-[9px] font-black uppercase tracking-widest opacity-60 m-0">{bus.companyName}</p>
                                         <h4 className="font-black text-lg tracking-tight m-0">{bus.busNumber}</h4>
                                      </div>
                                   </div>
                                   
                                   <div className="flex justify-between items-end border-t border-white/10 pt-4">
                                      <div className="space-y-1">
                                         <p className="text-[8px] font-bold uppercase tracking-widest opacity-50">Route Strength</p>
                                         <p className="text-xs font-bold">{bus.route}</p>
                                      </div>
                                      <div className="text-right">
                                         <p className="text-[8px] font-bold uppercase tracking-widest opacity-50">Storage Capacity</p>
                                         <p className="text-sm font-black">{freeSlots} Slots Free</p>
                                      </div>
                                   </div>
                                 </div>
                               </button>
                            );
                          })
                        )}
                      </div>
                   </div>
                   <div className="flex gap-4">
                      <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 py-5 font-black uppercase tracking-widest text-[10px] text-slate-500">Back</Button>
                      <Button 
                        disabled={!formData.busTransportId}
                        onClick={() => setStep(3)}
                        className="flex-[2] py-5 rounded-2xl text-lg font-black tracking-tighter"
                      >
                        VIEW BOX SLOTS
                      </Button>
                   </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="space-y-8"
                >
                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-400">
                               <Package size={24} />
                            </div>
                            <div>
                               <h3 className="text-xl font-black text-white tracking-tight">Slot Grid</h3>
                               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Select Unique Box Id</p>
                            </div>
                         </div>
                      </div>

                      <div className="bg-slate-950/80 rounded-[2.5rem] p-8 border border-white/5 shadow-inner">
                        <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/5">
                           <div>
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assigned Bus</p>
                              <h4 className="text-lg font-black text-white">{selectedBus?.busNumber}</h4>
                           </div>
                           <div className="flex gap-4">
                              <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                 <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Free</span>
                              </div>
                              <div className="flex items-center gap-2 opacity-30">
                                 <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                                 <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Booked</span>
                              </div>
                           </div>
                        </div>

                        {selectedBus && (
                          <SlotGrid 
                            slots={selectedBus.slots} 
                            selectedSlot={formData.slotId}
                            onSelect={(id) => setFormData({...formData, slotId: id})}
                          />
                        )}
                        
                        <AnimatePresence>
                          {formData.slotId && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-8 p-6 bg-blue-600 rounded-3xl flex items-center justify-between shadow-2xl shadow-blue-600/20"
                            >
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white">
                                     <CheckCircle2 size={24} />
                                  </div>
                                  <div>
                                     <p className="text-[8px] font-white/80 font-black uppercase tracking-widest m-0">Box Slot ID</p>
                                     <p className="text-xl font-black text-white m-0 tracking-tighter">{formData.slotId}</p>
                                  </div>
                               </div>
                               <Badge className="bg-white text-blue-600 font-black px-4 py-1.5 rounded-full">CONFIRMED</Badge>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Parcel Contents</label>
                        <textarea 
                          required
                          placeholder="Please specify weight and nature of parcel..."
                          value={formData.parcelDetails}
                          onChange={e => setFormData({...formData, parcelDetails: e.target.value})}
                          className="w-full bg-slate-950/50 border border-white/5 rounded-[2rem] px-6 py-5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[120px] resize-none transition-all placeholder:text-slate-700 hover:border-white/10"
                        />
                      </div>
                   </div>

                   <div className="flex gap-4">
                      <Button variant="ghost" onClick={() => setStep(2)} className="flex-1 py-5 font-black uppercase tracking-widest text-[10px] text-slate-500">Back</Button>
                      <Button 
                        type="submit"
                        disabled={loading || !formData.slotId || !formData.parcelDetails}
                        className="flex-[2] py-5 rounded-2xl text-lg font-black tracking-tighter shadow-xl shadow-blue-600/30"
                      >
                        {loading ? 'PROCESSING...' : 'INITIALIZE BOOKING'}
                      </Button>
                   </div>
                </motion.div>
              )}
           </AnimatePresence>
        </form>
        
        <div className="px-10 pb-10 flex items-center gap-2 opacity-40 grayscale pointer-events-none">
           <ShieldCheck size={14} className="text-blue-400" />
           <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">Live Tracking & Slot Guarantee Powered by BusX Engine</p>
        </div>
      </Card>
    </div>
  );
};
