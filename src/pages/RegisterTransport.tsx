import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bus, Save, Shield, MapPin, Truck, Hash, Users, Navigation, Phone, TrendingUp, DollarSign, Package, Clock, ChevronRight, Wallet } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card, Badge } from '../components/common/UI';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';

interface Delivery {
  id: string;
  price: number;
  helperCommission: number;
  status: string;
  slotId: string;
  busTransportId: string;
  busRoute: string;
  createdAt: string;
}

export const RegisterTransport = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'register' | 'earnings'>('register');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [formData, setFormData] = useState({
    busNumber: '',
    companyName: '',
    route: '',
    capacity: '',
    phoneNumber: '',
    helperName: '',
    helperPhone: '',
    gpsEnabled: true
  });

  useEffect(() => {
    if (!user || view !== 'earnings') return;

    const deliveriesPath = 'deliveries';
    const q = query(
      collection(db, deliveriesPath),
      where('driverId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDeliveries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Delivery)));
    });

    return () => unsubscribe();
  }, [user, view]);

  const totalEarnings = deliveries
    .filter(d => d.status === 'delivered')
    .reduce((acc, d) => acc + (d.helperCommission || 0), 0);

  const pendingEarnings = deliveries
    .filter(d => d.status !== 'delivered' && d.status !== 'cancelled')
    .reduce((acc, d) => acc + (d.helperCommission || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const busCapacity = parseInt(formData.capacity) || 40;
    setLoading(true);
    try {
      // Initialize slots based on capacity
      const initialSlots: Record<string, string> = {};
      for (let i = 1; i <= busCapacity; i++) {
        initialSlots[`SLOT-${i.toString().padStart(2, '0')}`] = 'available';
      }

      await addDoc(collection(db, 'bus_transports'), {
        ...formData,
        driverId: user.uid,
        capacity: busCapacity,
        slots: initialSlots,
        status: 'active',
        registeredAt: serverTimestamp()
      });
      toast.success('Bus registered successfully with helper identified!');
      setFormData({
        busNumber: '',
        companyName: '',
        route: '',
        capacity: '',
        phoneNumber: '',
        helperName: '',
        helperPhone: '',
        gpsEnabled: true
      });
      setView('earnings');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to register bus.');
    } finally {
      setLoading(false);
    }
  };

  const busCompanies = [
    "Green Line Paribahan",
    "Hanif Enterprise",
    "Ena Transport",
    "Shyamoli Paribahan",
    "Eagle Paribahan",
    "Shohagh Paribahan",
    "Desh Travels",
    "Nabil Paribahan"
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-black text-white tracking-tight">Bus <span className="text-blue-500">Network</span></h1>
          <p className="text-slate-400 font-medium text-lg leading-relaxed max-w-2xl">
            {view === 'register' 
              ? 'Register your bus as an official courier transport vehicle.' 
              : 'Detailed analysis of your helper commissions and earnings.'}
          </p>
        </div>
        
        <div className="bg-slate-900 overflow-hidden p-1.5 rounded-[2rem] border border-white/10 flex gap-1">
           <button 
             onClick={() => setView('register')}
             className={cn(
               "px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all",
               view === 'register' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-slate-300"
             )}
           >
             Registration
           </button>
           <button 
             onClick={() => setView('earnings')}
             className={cn(
               "px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all",
               view === 'earnings' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-slate-300"
             )}
           >
             Earnings Detail
           </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'register' ? (
          <motion.div 
            key="register"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid lg:grid-cols-2 gap-12"
          >
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="p-10 border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 text-blue-500/10 pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
                  <Bus size={180} />
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Company Name</label>
                      <select 
                        required
                        value={formData.companyName}
                        onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                      >
                        <option value="">Select Company</option>
                        {busCompanies.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Bus Number / Plate</label>
                      <div className="relative">
                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                        <input 
                          required
                          type="text" 
                          placeholder="e.g. DHK-1120"
                          value={formData.busNumber}
                          onChange={(e) => setFormData({...formData, busNumber: e.target.value})}
                          className="w-full bg-slate-900/50 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Bus Route</label>
                    <div className="relative">
                      <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                      <input 
                        required
                        type="text" 
                        placeholder="e.g. Dhaka to Sylhet"
                        value={formData.route}
                        onChange={(e) => setFormData({...formData, route: e.target.value})}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Storage Slots</label>
                      <div className="relative">
                        <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                        <input 
                          required
                          type="number" 
                          placeholder="e.g. 40"
                          value={formData.capacity}
                          onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                          className="w-full bg-slate-900/50 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Contact for Tracking</label>
                      <div className="relative">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                        <input 
                          required
                          type="tel" 
                          placeholder="e.g. +880 1XXX XXX XXX"
                          value={formData.phoneNumber}
                          onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                          className="w-full bg-slate-900/50 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block ml-1">Supervisor Helper Name</label>
                      <div className="relative">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                        <input 
                          required
                          type="text" 
                          placeholder="Name of parcel helper"
                          value={formData.helperName}
                          onChange={(e) => setFormData({...formData, helperName: e.target.value})}
                          className="w-full bg-slate-900/50 border border-blue-500/10 rounded-2xl pl-12 pr-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block ml-1">Helper Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                        <input 
                          required
                          type="tel" 
                          placeholder="Helper's personal phone"
                          value={formData.helperPhone}
                          onChange={(e) => setFormData({...formData, helperPhone: e.target.value})}
                          className="w-full bg-slate-900/50 border border-blue-500/10 rounded-2xl pl-12 pr-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-blue-600/5 rounded-3xl border border-blue-500/10 flex items-center justify-between group cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, gpsEnabled: !prev.gpsEnabled }))}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${formData.gpsEnabled ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800 text-slate-500'}`}>
                        <Navigation size={24} className={formData.gpsEnabled ? 'animate-pulse' : ''} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight">Enable Live GPS Tracking</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Allow customers to see ETA</p>
                      </div>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative transition-colors ${formData.gpsEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}>
                       <motion.div 
                         animate={{ x: formData.gpsEnabled ? 24 : 4 }}
                         className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                       />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-5 rounded-2xl text-lg font-black tracking-tighter"
                  >
                    {loading ? 'Registering...' : 'Register as Courier Transport'}
                    <Save className="ml-3" size={20} />
                  </Button>
                </form>
              </Card>
            </motion.div>

            <div className="space-y-8">
               <Card className="p-8 bg-blue-600/5 border-blue-500/10">
                  <div className="flex gap-6">
                     <div className="w-14 h-14 bg-blue-600 rounded-2xl flex-shrink-0 flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
                        <Shield size={28} />
                     </div>
                     <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">Trust & Security</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                          All registered buses are vetted by the BusX network. Your tracking information will be visible to customers whose parcels you carry.
                        </p>
                     </div>
                  </div>
               </Card>

               <Card className="p-8 bg-white/5 border-white/5">
                  <div className="flex gap-6">
                     <div className="w-14 h-14 bg-slate-800 rounded-2xl flex-shrink-0 flex items-center justify-center text-blue-400">
                        <MapPin size={28} />
                     </div>
                     <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">Network Coverage</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                          Bangladesh's major highways are covered. By registering, you join a network of 500+ buses delivering 2000+ parcels daily.
                        </p>
                     </div>
                  </div>
               </Card>

               <div className="p-10 border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-white/5 rounded-full">
                     <Bus size={32} className="text-slate-600" />
                  </div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest max-w-[200px]">
                    Registration takes less than 2 minutes and verification is instant.
                  </p>
               </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="earnings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <Card className="p-8 bg-blue-600/10 border-blue-500/20 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 text-blue-500/5 group-hover:scale-110 transition-transform">
                     <Wallet size={120} />
                  </div>
                  <Badge variant="info">Total Balance</Badge>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Available to Withdraw</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-white tracking-tighter">৳{totalEarnings}</span>
                  </div>
               </Card>

               <Card className="p-8 bg-emerald-500/5 border-emerald-500/10">
                  <TrendingUp className="text-emerald-500 mb-6" size={32} />
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Completed Deliveries</p>
                  <p className="text-4xl font-black text-white tracking-tighter">
                     {deliveries.filter(d => d.status === 'delivered').length}
                  </p>
               </Card>

               <Card className="p-8 bg-orange-500/5 border-orange-500/10">
                  <Clock className="text-orange-500 mb-6" size={32} />
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Pending Earnings</p>
                  <p className="text-4xl font-black text-white tracking-tighter">৳{pendingEarnings}</p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-2">{deliveries.filter(d => !['delivered', 'cancelled'].includes(d.status)).length} tasks in progress</p>
               </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-center justify-between px-2">
                     <h3 className="text-xl font-black text-white tracking-tight">Earning History</h3>
                     <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{deliveries.length} Transactions</div>
                  </div>
                  
                  <div className="space-y-3">
                     {deliveries.map((delivery) => (
                        <motion.div 
                          key={delivery.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="glass p-5 rounded-3xl border-white/5 hover:border-white/10 transition-all flex items-center justify-between gap-4 group"
                        >
                           <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center",
                                delivery.status === 'delivered' ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-600/10 text-blue-400"
                              )}>
                                 <DollarSign size={20} />
                              </div>
                              <div>
                                 <p className="text-xs font-black text-white">{delivery.busRoute}</p>
                                 <div className="flex items-center gap-2 mt-0.5">
                                    <Badge variant={delivery.status === 'delivered' ? 'success' : 'info'}>
                                       {delivery.status.replace('_', ' ')}
                                    </Badge>
                                    <span className="text-[10px] font-bold text-slate-500">Slot: {delivery.slotId}</span>
                                 </div>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-lg font-black text-white tracking-tight">৳{delivery.helperCommission}</p>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                 {new Date(delivery.createdAt).toLocaleDateString()}
                              </p>
                           </div>
                        </motion.div>
                     ))}
                     {deliveries.length === 0 && (
                        <div className="py-20 border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center text-center opacity-50">
                           <Package size={40} className="text-slate-600 mb-4" />
                           <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No earning data found yet</p>
                        </div>
                     )}
                  </div>
               </div>

               <div className="space-y-6">
                  <h3 className="text-xl font-black text-white tracking-tight px-2">Slot Economics</h3>
                  <Card className="p-8 border-white/5 space-y-8">
                     <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <p className="text-xs font-bold text-slate-400">Box Slot Price (Avg)</p>
                           <p className="text-sm font-black text-white">৳350.00</p>
                        </div>
                        <div className="flex items-center justify-between">
                           <p className="text-xs font-bold text-slate-400">Your Commission (20%)</p>
                           <p className="text-sm font-black text-emerald-400">৳70.00</p>
                        </div>
                        <div className="h-px bg-white/5" />
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              <p className="text-xs font-black text-white">Potential/Trip</p>
                              <Badge variant="info">40 Slots</Badge>
                           </div>
                           <p className="text-lg font-black text-blue-400">৳2,800.00</p>
                        </div>
                     </div>

                     <div className="p-6 bg-slate-950/50 rounded-3xl border border-white/5 space-y-4">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Payout Policy</h4>
                        <div className="space-y-3">
                           {[
                              "Commissions credit instantly on delivery",
                              "Withdrawal takes 24-48 business hours",
                              "Supports Bkash, Rocket & Nagad"
                           ].map((item, i) => (
                              <div key={i} className="flex gap-2 items-start">
                                 <ChevronRight size={12} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                 <p className="text-[10px] font-medium text-slate-400 leading-tight">{item}</p>
                              </div>
                           ))}
                        </div>
                     </div>

                     <Button className="w-full py-4 rounded-2xl bg-white text-slate-950 hover:bg-slate-200 font-black uppercase tracking-widest text-[10px]">
                        Request Payout
                     </Button>
                  </Card>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

