import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bus, Save, Shield, MapPin, Truck, Hash, Users, Navigation } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card } from '../components/common/UI';
import { toast } from 'react-hot-toast';

export const RegisterTransport = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    busNumber: '',
    companyName: '',
    route: '',
    capacity: '',
    phoneNumber: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Initialize 40 slots
      const initialSlots: Record<string, string> = {};
      for (let i = 1; i <= 40; i++) {
        initialSlots[`SLOT-${i.toString().padStart(2, '0')}`] = 'available';
      }

      await addDoc(collection(db, 'bus_transports'), {
        ...formData,
        driverId: user.uid,
        capacity: 40,
        slots: initialSlots,
        status: 'active',
        registeredAt: serverTimestamp()
      });
      toast.success('Bus registered successfully with 40 slots!');
      setFormData({
        busNumber: '',
        companyName: '',
        route: '',
        capacity: '',
        phoneNumber: ''
      });
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
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black text-white tracking-tight">Bus <span className="text-blue-500">Registration</span></h1>
        <p className="text-slate-400 font-medium text-lg leading-relaxed max-w-2xl">
          Register your bus as an official courier transport vehicle to start accepting parcels.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
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
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Parcel Capacity</label>
                  <div className="relative">
                    <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. 50 kg / 10 Large Boxes"
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
      </div>
    </div>
  );
};
