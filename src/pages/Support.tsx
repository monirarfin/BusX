import React from 'react';
import { SupportChat } from '../components/SupportChat';
import { motion } from 'motion/react';
import { MessageSquare, PhoneCall, Mail } from 'lucide-react';
import { Card } from '../components/common/UI';

export const Support = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
      <div>
        <h1 className="text-4xl font-black text-white tracking-tighter">Support</h1>
        <p className="text-slate-400 font-medium">How can we help you today?</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
         <div className="lg:col-span-2">
            <SupportChat />
         </div>
         <div className="space-y-6">
            <h3 className="font-black text-white px-1 tracking-tight">Alternative Contact</h3>
            <Card className="p-6 space-y-6 bg-white/5 border-white/10">
               <div className="flex items-center gap-5 group cursor-pointer border-b border-white/5 pb-6 last:border-0 last:pb-0">
                  <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-lg shadow-blue-600/10">
                     <PhoneCall size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1.5">Call Us</p>
                    <p className="text-sm font-bold text-white tracking-tight">+880 1234 567890</p>
                  </div>
               </div>
               <div className="flex items-center gap-5 group cursor-pointer border-b border-white/5 pb-6 last:border-0 last:pb-0">
                  <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-lg shadow-blue-600/10">
                     <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1.5">Email</p>
                    <p className="text-sm font-bold text-white tracking-tight">support@busx.com</p>
                  </div>
               </div>
            </Card>

            <Card className="p-8 bg-blue-600 text-white border-0 shadow-2xl shadow-blue-600/20 rounded-[2.5rem] relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                  <MessageSquare size={100} />
               </div>
               <MessageSquare className="mb-6 opacity-50 relative z-10" size={32} />
               <h4 className="text-xl font-black mb-3 tracking-tight relative z-10">Enterprise Support</h4>
               <p className="text-xs text-blue-100/70 leading-relaxed font-medium relative z-10">
                  Looking for bulk document delivery for your business? Contact our sales team for corporate discounts and integrated APIs.
               </p>
            </Card>
         </div>
      </div>
    </motion.div>
  );
};
