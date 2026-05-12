import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, Badge } from '../components/common/UI';
import { User, Bell, Shield, Phone, Mail, CheckCircle2, Volume2, Navigation, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';

export const Profile = () => {
  const { user, role } = useAuth();
  const [preferences, setPreferences] = useState({
    bookingConfirmations: true,
    driverUpdates: true,
    hubArrivalAlerts: true,
    voiceNotifications: true,
    promotionalOffers: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchPrefs = async () => {
      try {
        const docRef = doc(db, 'user_preferences', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPreferences(docSnap.data() as any);
        }
      } catch (e) {
        console.error("Error fetching preferences:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrefs();
  }, [user]);

  const togglePreference = (key: keyof typeof preferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const savePreferences = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'user_preferences', user.uid), preferences);
      toast.success('Preferences saved successfully!');
    } catch (e) {
      toast.error('Failed to save preferences');
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">My Profile</h1>
          <p className="text-slate-400 font-medium">Manage your identity and notification settings.</p>
        </div>
        <Button onClick={savePreferences} className="bg-blue-600 hover:bg-blue-500 font-black uppercase tracking-widest text-xs py-4 px-8 rounded-2xl">
          Save Changes
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <Card className="p-8 border-white/5 bg-white/5 flex flex-col items-center text-center">
            <div className="w-32 h-32 rounded-[2.5rem] bg-slate-800 border-4 border-blue-500/30 overflow-hidden flex items-center justify-center text-blue-400 mb-6 shadow-2xl">
              {user?.photoURL ? <img src={user.photoURL} alt="" /> : <User size={64} />}
            </div>
            <h2 className="text-2xl font-black text-white mb-2">{user?.displayName}</h2>
            <Badge variant="info">{role}</Badge>
            
            <div className="w-full space-y-4 pt-6 border-t border-white/5">
               <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400"><Mail size={18} /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email Address</p>
                    <p className="text-xs text-white font-bold">{user?.email}</p>
                  </div>
               </div>
               <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400"><Shield size={18} /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Account Status</p>
                    <p className="text-xs text-emerald-400 font-bold">Verified ✅</p>
                  </div>
               </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <Card className="p-10 border-white/5 bg-white/5 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                <Bell size={120} className="text-blue-500" />
             </div>
             <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400">
                   <Bell size={24} />
                </div>
                <div>
                   <h3 className="text-xl font-black text-white">Notification Preferences</h3>
                   <p className="text-slate-500 text-xs font-bold">Choose how you want to be alerted.</p>
                </div>
             </div>

             <div className="space-y-4">
                {[
                  { key: 'bookingConfirmations', label: 'Booking Confirmations', desc: 'Get notified when your parcel booking is confirmed.', icon: CheckCircle2 },
                  { key: 'driverUpdates', label: 'Driver Status Updates', desc: 'Receive alerts when your driver starts the route.', icon: Navigation },
                  { key: 'hubArrivalAlerts', label: 'Hub Arrival Alerts (4km)', desc: 'Get alerted 5-10 mins before arrival at the target hub.', icon: MapPin },
                  { key: 'voiceNotifications', label: 'Voice Assistant / Audio Alerts', desc: 'Enable automatic audio announcements for pick-ups.', icon: Volume2 },
                  { key: 'promotionalOffers', label: 'Promotional Offers', desc: 'Stay updated with latest discounts and features.', icon: Phone }
                ].map((item) => (
                  <div 
                    key={item.key}
                    onClick={() => togglePreference(item.key as any)}
                    className="group"
                  >
                    <div className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group-hover:bg-white/10">
                       <div className="flex gap-6 items-center">
                          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500 group-hover:text-blue-400 transition-colors">
                             <item.icon size={20} />
                          </div>
                          <div>
                             <p className="text-sm font-black text-white mb-1">{item.label}</p>
                             <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
                          </div>
                       </div>
                       <div className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${preferences[item.key as keyof typeof preferences] ? 'bg-blue-600' : 'bg-slate-800'}`}>
                          <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 ${preferences[item.key as keyof typeof preferences] ? 'translate-x-6' : 'translate-x-0'}`} />
                       </div>
                    </div>
                  </div>
                ))}
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
