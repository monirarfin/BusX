import React from 'react';
import { DeliveryList } from '../components/delivery/DeliveryList';
import { Card, Badge } from '../components/common/UI';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { TrendingUp, CheckCircle2, Clock } from 'lucide-react';

export const Dashboard = () => {
  const { role } = useAuth();
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
      <div>
        <h1 className="text-4xl font-black text-white tracking-tighter">Dashboard</h1>
        <p className="text-slate-400 font-medium">Manage your {role === 'customer' ? 'delivery requests' : 'assigned tasks'}.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
