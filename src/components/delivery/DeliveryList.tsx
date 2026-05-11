import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Badge, Button } from '../common/UI';
import { Bus, MapPin, Clock, ArrowRight, Package, CheckCircle2, Navigation } from 'lucide-react';
import { formatTime, formatDate } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../../lib/firestoreErrors';

export const DeliveryList = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !role) return;

    const deliveryPath = 'deliveries';
    
    if (role === 'customer') {
      const q = query(
        collection(db, deliveryPath),
        where('senderId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setDeliveries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, deliveryPath);
      });
      return () => unsubscribe();
    } else {
      // Driver needs to combine pending and their assigned deliveries
      const pendingQuery = query(
        collection(db, deliveryPath),
        where('status', '==', 'pending')
      );
      const myActiveQuery = query(
        collection(db, deliveryPath),
        where('driverId', '==', user.uid)
      );

      const unsubPending = onSnapshot(pendingQuery, (snapshot) => {
        const pending = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDeliveries(prev => {
          const others = prev.filter(d => d.driverId === user.uid);
          return [...others, ...pending].sort((a, b) => 
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
        });
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, deliveryPath);
      });

      const unsubActive = onSnapshot(myActiveQuery, (snapshot) => {
        const active = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDeliveries(prev => {
          const others = prev.filter(d => d.status === 'pending');
          return [...others, ...active].sort((a, b) => 
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
        });
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, deliveryPath);
      });

      return () => {
        unsubPending();
        unsubActive();
      };
    }
  }, [user, role]);

  const updateStatus = async (deliveryId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus, updatedAt: new Date().toISOString() };
      if (newStatus === 'accepted') {
        updateData.driverId = user?.uid;
      }
      await updateDoc(doc(db, 'deliveries', deliveryId), updateData);
      toast.success(`Delivery updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update delivery');
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" /></div>;

  if (deliveries.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
        <Package size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No active deliveries</h3>
        <p className="text-gray-500">Your parcel journey will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <AnimatePresence>
        {deliveries.map((delivery) => (
          <motion.div
            key={delivery.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="hover:border-blue-500/30 group bg-white/5 backdrop-blur-3xl">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <Badge variant={
                      delivery.status === 'delivered' ? 'success' :
                      delivery.status === 'pending' ? 'warning' : 'info'
                    }>
                      {delivery.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">#{delivery.id.slice(-6)}</span>
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{formatDate(delivery.createdAt)}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                  <div className="space-y-5">
                    <div className="flex gap-4">
                       <div className="relative">
                          <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30 z-10 relative">
                             <MapPin size={16} />
                          </div>
                          <div className="absolute top-8 bottom-[-24px] left-4 border-l border-dashed border-white/10" />
                       </div>
                       <div>
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Pickup</p>
                          <p className="text-sm font-bold text-white truncate max-w-[180px]">{delivery.pickup.address}</p>
                       </div>
                    </div>
                    <div className="flex gap-4">
                       <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                          <MapPin size={16} />
                       </div>
                       <div>
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Drop-off</p>
                          <p className="text-sm font-bold text-white truncate max-w-[180px]">{delivery.dropoff.address}</p>
                       </div>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-5 border border-white/5 flex flex-col justify-center">
                     <div className="flex items-center gap-3 text-blue-400 mb-2">
                        <Bus size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{delivery.busRoute || 'SEARCHING ROUTE'}</span>
                     </div>
                     {delivery.status === 'in_transit' && (
                        <div className="flex items-center gap-2 text-blue-400 mb-3 bg-blue-400/5 px-3 py-1.5 rounded-lg border border-blue-400/10 w-fit">
                           <Clock size={14} className="animate-pulse" />
                           <span className="text-[10px] font-black uppercase tracking-widest">ETA: 25-35 MINS</span>
                        </div>
                     )}
                     <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed italic">"{delivery.parcelDetails}"</p>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    {delivery.status !== 'pending' && delivery.status !== 'cancelled' && (
                       <Button 
                        variant="outline" 
                        className="w-full text-[10px] py-3 uppercase tracking-widest font-black flex gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tracking`);
                        }}
                      >
                         <Navigation size={14} /> Track Order
                       </Button>
                    )}

                    {role === 'customer' && delivery.status === 'pending' && (
                       <Button variant="danger" className="w-full text-[10px] py-3 uppercase tracking-widest font-black" onClick={() => updateStatus(delivery.id, 'cancelled')}>Cancel Request</Button>
                    )}
                    
                    {role === 'driver' && delivery.status === 'pending' && (
                       <Button variant="secondary" className="w-full text-[10px] py-3 uppercase tracking-widest font-black" onClick={() => updateStatus(delivery.id, 'accepted')}>Accept Order</Button>
                    )}

                    {role === 'driver' && delivery.status === 'accepted' && (
                       <Button variant="primary" className="w-full text-[10px] py-3 uppercase tracking-widest font-black" onClick={() => updateStatus(delivery.id, 'picked_up')}>Mark Picked Up</Button>
                    )}
                    
                    {role === 'driver' && delivery.status === 'picked_up' && (
                       <Button variant="primary" className="w-full text-[10px] py-3 uppercase tracking-widest font-black" onClick={() => updateStatus(delivery.id, 'in_transit')}>Start Transit</Button>
                    )}

                    {role === 'driver' && delivery.status === 'in_transit' && (
                       <Button variant="primary" className="w-full text-[10px] py-3 uppercase tracking-widest font-black" onClick={() => updateStatus(delivery.id, 'delivered')}>Complete Batch</Button>
                    )}

                    {delivery.status === 'delivered' && (
                       <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest py-2 px-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                          <CheckCircle2 size={16} /> Delivered
                       </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className={className}>
    <LoaderCircle />
  </motion.div>
);

const LoaderCircle = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);
