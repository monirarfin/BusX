import React from 'react';
import { BookingForm } from '../components/delivery/BookingForm';
import { motion } from 'motion/react';
import { Info } from 'lucide-react';

export const Booking = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
      <div>
        <h1 className="text-4xl font-black text-white tracking-tighter">Send Parcel</h1>
        <p className="text-slate-400 font-medium tracking-tight">Fast document delivery via verified public bus routes.</p>
      </div>

      <div className="bg-blue-600/5 border border-white/5 rounded-3xl p-6 flex gap-4 text-blue-100 backdrop-blur-md">
         <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
            <Info size={20} />
         </div>
         <p className="text-xs leading-relaxed font-medium">
            <b className="text-white block mb-1">Station Protocols:</b> 
            You are booking a document delivery. The bus driver will call the recipient upon arrival at the destination station. 
            Please ensure the phone number is active.
         </p>
      </div>

      <BookingForm />
    </motion.div>
  );
};
