import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button, Input, Badge } from '../common/UI';
import { MapPin, Bus, Package, ShieldCheck, CreditCard } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export const BookingForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    pickup: '',
    dropoff: '',
    parcelDetails: '',
    busRoute: 'Route 12B', // Default for demo
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      await addDoc(collection(db, 'deliveries'), {
        senderId: user.uid,
        driverId: null,
        status: 'pending',
        pickup: { address: formData.pickup, lat: 23.8103, lng: 90.4125 }, // Mock coordinates
        dropoff: { address: formData.dropoff, lat: 23.7940, lng: 90.4043 },
        parcelDetails: formData.parcelDetails,
        busRoute: formData.busRoute,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success('Parcel booked successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to book parcel.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="overflow-visible border-white/5 bg-white/5 backdrop-blur-3xl rounded-[2.5rem]">
        <div className="p-1 px-10 py-6 bg-blue-600/20 text-white flex justify-between items-center rounded-t-[2.5rem] border-b border-white/5">
           <div className="flex gap-2 items-center">
              {[1, 2].map((s) => (
                <div key={s} className={`h-1.5 w-10 rounded-full transition-all duration-500 ${step >= s ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-800'}`} />
              ))}
           </div>
           <Badge variant="info">৳ 50 Fixed Fee</Badge>
        </div>

        <form onSubmit={handleSubmit} className="p-10">
           <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                   <div className="space-y-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                          <MapPin size={20} />
                        </div>
                        <h3 className="text-xl font-black text-white tracking-tight">Delivery Routes</h3>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block pl-1">Pickup Point</label>
                          <Input 
                            required 
                            placeholder="e.g. Farmgate Bus Station" 
                            value={formData.pickup}
                            onChange={e => setFormData({...formData, pickup: e.target.value})}
                            className="bg-slate-900/40 border-white/10 text-white placeholder-slate-600"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block pl-1">Drop-off Point</label>
                          <Input 
                            required 
                            placeholder="e.g. Uttara House Building" 
                            value={formData.dropoff}
                            onChange={e => setFormData({...formData, dropoff: e.target.value})}
                            className="bg-slate-900/40 border-white/10 text-white placeholder-slate-600"
                          />
                        </div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
                          <Package size={20} />
                        </div>
                        <h3 className="text-xl font-black text-white tracking-tight">Parcel Details</h3>
                      </div>
                      <textarea 
                        required 
                        rows={3}
                        className="w-full rounded-2xl border border-white/10 bg-slate-900/40 px-5 py-4 text-sm text-white transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 focus:outline-none placeholder-slate-600"
                        placeholder="Urgent doc for Mr. Arfin, please handle with care..."
                        value={formData.parcelDetails}
                        onChange={e => setFormData({...formData, parcelDetails: e.target.value})}
                      />
                   </div>

                   <Button type="button" onClick={() => setStep(2)} className="w-full py-5 rounded-2xl text-lg uppercase tracking-widest font-black">Next Step</Button>
                </motion.div>
              ) : (
                <motion.div 
                   key="step2"
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   className="space-y-10"
                >
                   <div className="bg-blue-600/5 rounded-[2rem] p-8 border border-white/5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                         <ShieldCheck size={120} />
                      </div>
                      <h4 className="text-white text-lg font-black mb-6 flex items-center gap-3 relative z-10">
                        <ShieldCheck size={20} className="text-blue-400" /> Payment Summary
                      </h4>
                      <div className="space-y-4 relative z-10">
                         <div className="flex justify-between text-sm font-bold text-slate-400">
                            <span>Service Fee</span>
                            <span className="text-white">৳ 40.00</span>
                         </div>
                         <div className="flex justify-between text-sm font-bold text-slate-400">
                            <span>Security Fee</span>
                            <span className="text-white">৳ 10.00</span>
                         </div>
                         <div className="border-t border-white/10 pt-6 flex justify-between items-center">
                            <span className="font-black text-white text-lg uppercase tracking-tight">Total Amount</span>
                            <span className="font-black text-blue-400 text-3xl tracking-tighter">৳ 50.00</span>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-5">
                      <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={loading} className="py-5 rounded-2xl border-white/10 font-black uppercase tracking-widest text-[10px]">Back</Button>
                      <Button type="submit" disabled={loading} className="gap-3 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px]">
                         {loading ? 'Processing...' : <><CreditCard size={18} /> Pay & Book</>}
                      </Button>
                   </div>

                   <p className="text-[9px] text-slate-600 text-center uppercase tracking-[0.3em] font-black">
                     Secured payment via SSLCommerz
                   </p>
                </motion.div>
              )}
           </AnimatePresence>
        </form>
      </Card>
    </div>
  );
};
import { AnimatePresence } from 'motion/react';
import { LoaderCircle } from 'lucide-react';
