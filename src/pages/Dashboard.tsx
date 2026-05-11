import React from 'react';
import { DeliveryList } from '../components/delivery/DeliveryList';
import { Card, Badge, Button } from '../components/common/UI';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { TrendingUp, CheckCircle2, Clock, Navigation, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const { role } = useAuth();
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Dashboard</h1>
          <p className="text-slate-400 font-medium">Manage your {role === 'customer' ? 'delivery requests' : 'assigned tasks'}.</p>
        </div>
        {role === 'driver' && (
          <Link to="/routes">
            <Button variant="outline" className="border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 gap-2 rounded-2xl px-6">
               <Navigation size={18} className="animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest">GPS Sync Status</span>
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         {role === 'driver' && (
           <Card className="p-8 group bg-indigo-600/10 border-indigo-500/20 md:col-span-2 lg:col-span-1">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-white/5 rounded-[2rem] flex items-center justify-center text-indigo-400 border border-white/10 shadow-xl">
                  <Navigation size={24} />
                </div>
                <Badge variant="success">Active</Badge>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">GPS Helper Sync</p>
              <div className="flex items-center gap-3">
                <p className="text-3xl font-black text-white tracking-tighter">Connected</p>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-4">Syncing live location for pickups</p>
           </Card>
         )}
         <Card className="p-8 group bg-blue-600/10 border-blue-500/20">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-white/5 rounded-[2rem] flex items-center justify-center text-blue-400 border border-white/10 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xl">
                <TrendingUp size={24} />
              </div>
              <Badge variant="info">Live</Badge>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Active Deliveries</p>
            <p className="text-5xl font-black text-white tracking-tighter">0</p>
         </Card>
         
         <Card className="p-8 bg-emerald-500/5 border-emerald-500/15">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-white/5 rounded-[2rem] flex items-center justify-center text-emerald-400 border border-white/10 shadow-xl">
                <CheckCircle2 size={24} />
              </div>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Completed</p>
            <p className="text-5xl font-black text-white tracking-tighter">12</p>
         </Card>

         <Card className="p-8 bg-orange-500/5 border-orange-500/15">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-white/5 rounded-[2rem] flex items-center justify-center text-orange-400 border border-white/10 shadow-xl">
                <Clock size={24} />
              </div>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Average Time</p>
            <p className="text-5xl font-black text-white tracking-tighter">45<span className="text-xl font-bold ml-1 opacity-50">min</span></p>
         </Card>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-black text-white px-1 tracking-tight">Recent Activity</h3>
        <DeliveryList />
      </div>
    </motion.div>
  );
};
