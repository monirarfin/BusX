import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Phone, Building2, Plus, X, Search, Navigation, Building, LocateFixed, Eye } from 'lucide-react';
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card } from '../components/common/UI';
import { toast } from 'react-hot-toast';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface Hub {
  id: string;
  name: string;
  companyName: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  contactNumber: string;
}

const LocationPicker = ({ lat, lng, onChange }: { lat: number, lng: number, onChange: (lat: number, lng: number) => void }) => {
  if (!hasValidKey) {
    return (
      <div className="h-48 flex flex-col items-center justify-center bg-slate-950/50 border border-white/5 rounded-2xl text-center px-4">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Maps Key Required</p>
        <p className="text-[8px] text-slate-600 mt-1">Please add GOOGLE_MAPS_PLATFORM_KEY in Secrets</p>
      </div>
    );
  }

  return (
    <div className="h-48 rounded-2xl overflow-hidden border border-white/10">
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={{ lat, lng }}
          defaultZoom={15}
          center={{ lat, lng }}
          mapId="DEMO_MAP_ID"
          onClick={(e) => {
            if (e.detail.latLng) {
               onChange(e.detail.latLng.lat, e.detail.latLng.lng);
            }
          }}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
          disableDefaultUI={true}
        >
          <AdvancedMarker position={{ lat, lng }}>
             <Pin background="#3b82f6" glyphColor="#fff" />
          </AdvancedMarker>
        </Map>
      </APIProvider>
    </div>
  );
};

export const Hubs = () => {
  const { user } = useAuth();
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    address: '',
    lat: 23.8103,
    lng: 90.4125,
    contactNumber: ''
  });

  const handleLocateMe = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }));
          toast.success('Live location captured!');
          setShowPicker(true);
        },
        (error) => {
          console.error(error);
          toast.error('Failed to get location. Please allow GPS access.');
        }
      );
    } else {
      toast.error('Geolocation not supported by your browser.');
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

  const handleAddHub = async (e: React.FormEvent) => {
    e.preventDefault();
    const hubPath = 'bus_counters';
    try {
      await addDoc(collection(db, hubPath), {
        name: formData.name,
        companyName: formData.companyName,
        location: {
          address: formData.address,
          lat: Number(formData.lat),
          lng: Number(formData.lng)
        },
        contactNumber: formData.contactNumber,
        createdAt: serverTimestamp()
      });
      toast.success('Hub registered successfully!');
      setIsAdding(false);
      setFormData({
        name: '',
        companyName: '',
        address: '',
        lat: 23.8103,
        lng: 90.4125,
        contactNumber: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, hubPath);
      toast.error('Failed to add hub.');
    }
  };

  const filteredHubs = hubs.filter(hub => 
    hub.name.toLowerCase().includes(search.toLowerCase()) || 
    hub.companyName.toLowerCase().includes(search.toLowerCase()) ||
    hub.location.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-white tracking-tight">Courier <span className="text-blue-500">Hubs</span></h1>
          <p className="text-slate-400 font-medium">Official bus counters serving as collection & drop-off points.</p>
        </div>
        <Button onClick={() => setIsAdding(true)} className="rounded-2xl px-6 py-4 font-black tracking-tighter">
          <Plus className="mr-2" size={20} /> Add New Hub
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input 
          type="text" 
          placeholder="Search by company, location or counter name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-[2rem] pl-16 pr-8 py-5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-xl"
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredHubs.map((hub) => (
            <motion.div
              key={hub.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card className="h-full p-8 border-white/5 hover:border-blue-500/30 transition-all group">
                <div className="flex flex-col h-full gap-6">
                  <div className="flex items-start justify-between">
                    <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-lg">
                      <Building2 size={28} />
                    </div>
                    <div className="bg-slate-900 border border-white/10 px-3 py-1 rounded-full">
                       <span className="text-[10px] font-black text-white uppercase tracking-widest">{hub.companyName}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white leading-tight">{hub.name}</h3>
                    <div className="flex items-start gap-2 text-slate-400">
                      <MapPin size={14} className="mt-1 flex-shrink-0" />
                      <p className="text-sm font-medium">{hub.location.address}</p>
                    </div>
                  </div>

                  <div className="mt-auto space-y-4 pt-6 border-t border-white/5">
                    <div className="flex items-center gap-3 text-slate-400">
                      <Phone size={16} />
                      <span className="text-sm font-bold">{hub.contactNumber}</span>
                    </div>
                    <Button variant="outline" className="w-full rounded-xl border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest">
                       View On Map
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Hub Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 rounded-[3rem] border border-white/10 shadow-2xl p-10 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-600/10 to-transparent"></div>
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/30">
                    <Building size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Add New <span className="text-blue-400">Hub</span></h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Registration Form</p>
                  </div>
                </div>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X size={24} className="text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleAddHub} className="space-y-6 relative z-10">
                <div className="grid md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Company Name</label>
                     <select 
                       required
                       value={formData.companyName}
                       onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                       className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                     >
                       <option value="">Select Company</option>
                       {busCompanies.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Counter Name</label>
                     <input 
                       required
                       type="text" 
                       placeholder="e.g. Abdullahpur Counter"
                       value={formData.name}
                       onChange={(e) => setFormData({...formData, name: e.target.value})}
                       className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                     />
                   </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Physical Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input 
                      required
                      type="text" 
                      placeholder="Street address, Area, City"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full bg-slate-950/50 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Contact Number</label>
                     <div className="relative">
                       <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                       <input 
                         required
                         type="tel" 
                         placeholder="Contact phone"
                         value={formData.contactNumber}
                         onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
                         className="w-full bg-slate-950/50 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                       />
                     </div>
                   </div>
                   <div className="space-y-2">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Location Coordinates</label>
                        <button 
                          type="button"
                          onClick={() => setShowPicker(!showPicker)}
                          className="text-[8px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 flex items-center gap-1"
                        >
                          <Eye size={10} /> {showPicker ? 'Hide' : 'Show'} Map
                        </button>
                      </div>
                      <div className="flex gap-2">
                         <div className="relative flex-1">
                           <input 
                             type="number" step="any" placeholder="Lat" 
                             value={formData.lat} onChange={(e) => setFormData({...formData, lat: Number(e.target.value)})}
                             className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                           />
                         </div>
                         <div className="relative flex-1">
                           <input 
                             type="number" step="any" placeholder="Lng" 
                             value={formData.lng} onChange={(e) => setFormData({...formData, lng: Number(e.target.value)})}
                             className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                           />
                         </div>
                         <button 
                           type="button"
                           onClick={handleLocateMe}
                           className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
                           title="Use Live Location"
                         >
                           <LocateFixed size={18} />
                         </button>
                      </div>
                      
                      <AnimatePresence>
                        {showPicker && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="pt-2"
                          >
                            <LocationPicker 
                              lat={formData.lat} 
                              lng={formData.lng} 
                              onChange={(lat, lng) => setFormData(prev => ({ ...prev, lat, lng }))} 
                            />
                            <p className="text-[8px] text-slate-500 mt-2 text-center uppercase tracking-widest">Click on map to adjust pin position</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </div>
                </div>

                <div className="flex gap-4 pt-6">
                   <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setIsAdding(false)} 
                    className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-400"
                   >
                     Cancel
                   </Button>
                   <Button 
                    type="submit" 
                    className="flex-[2] py-4 rounded-2xl font-black tracking-tighter text-lg"
                   >
                     Register Hub
                   </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
