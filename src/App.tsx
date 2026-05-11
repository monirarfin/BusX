import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { Bus, ArrowRight, Shield, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { signInWithGoogle, db } from './lib/firebase';
import { Layout } from './components/layout/Layout';
import { Button, Card } from './components/common/UI';
import { doc, getDocFromServer } from 'firebase/firestore';

// Connection Test
const testConnection = async () => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection established.");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        console.error("Firebase is offline. Check your network.");
      } else if (error.message.includes('permission-denied')) {
        // This is actually okay for a connection test if the rule was restrictive,
        // but we added a rule for it now.
        console.log("Firebase connected (Permission verified).");
      }
    }
  }
};

// Pages
const Landing = () => {
  const { user, role, setRole, loading } = useAuth();
  const [isSettingRole, setIsSettingRole] = useState(false);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      toast.success('Signed in successfully!');
    } catch (error) {
      toast.error('Login failed.');
    }
  };

  const handleRoleSelect = async (selectedRole: 'customer' | 'driver') => {
    setIsSettingRole(true);
    try {
      await setRole(selectedRole);
      toast.success(`Welcome as a ${selectedRole}!`);
    } catch (error) {
      toast.error('Failed to set role.');
    } finally {
      setIsSettingRole(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
        <Bus className="text-blue-500" size={48} />
      </motion.div>
    </div>
  );

  if (user && !role) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient opacity-30"></div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="z-10 w-full max-w-md">
          <Card className="p-10 text-center">
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Welcome to <span className="text-blue-400">BusX</span></h2>
            <p className="text-slate-400 mb-10 text-sm font-medium">Please select your role to continue</p>
            
            <div className="grid gap-5">
              <Button 
                onClick={() => handleRoleSelect('customer')} 
                disabled={isSettingRole}
                className="h-28 flex-col gap-2 rounded-3xl"
              >
                <span className="text-xl">Customer</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">I want to send documents</span>
              </Button>
              <Button 
                onClick={() => handleRoleSelect('driver')} 
                variant="outline"
                disabled={isSettingRole}
                className="h-28 flex-col gap-2 rounded-3xl border-white/20 bg-white/5"
              >
                <span className="text-xl">Bus Driver / Staff</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">I want to deliver parcels</span>
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (user && role) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 mesh-gradient"></div>
      
      {/* Hero Section */}
      <nav className="max-w-7xl mx-auto px-8 py-8 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/40">
             <Bus size={24} />
          </div>
          <span className="text-2xl font-black text-white tracking-tighter">BusX</span>
        </div>
        <Button onClick={handleLogin} variant="outline" className="border-white/10 px-6">Get Started</Button>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-16 md:py-32 relative z-10">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-6xl md:text-[100px] font-black leading-[0.85] mb-10 tracking-tighter">
              INSTANT <br />
              <span className="text-blue-500">COURIER</span> <br />
              BY BUS.
            </h1>
            <p className="text-lg text-slate-400 mb-12 max-w-lg font-medium">
              The fastest way to send urgent documents within the city. 
              Reliable, secure, and powered by public transport infrastructure.
            </p>
            <div className="flex flex-wrap gap-5">
              <Button onClick={handleLogin} className="px-10 py-5 text-lg rounded-2xl">
                Send a Parcel <ArrowRight className="ml-3" size={20} />
              </Button>
              <Button variant="outline" className="px-10 py-5 text-lg rounded-2xl border-white/10 bg-white/5">How it Works</Button>
            </div>
            
            <div className="mt-16 flex items-center gap-10 text-slate-500 font-bold">
               <div className="flex items-center gap-2">
                  <Shield size={18} className="text-blue-500" /> <span className="text-[10px] uppercase tracking-[0.2em]">Secure</span>
               </div>
               <div className="flex items-center gap-2">
                  <Clock size={18} className="text-blue-500" /> <span className="text-[10px] uppercase tracking-[0.2em]">Fast</span>
               </div>
               <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-blue-500" /> <span className="text-[10px] uppercase tracking-[0.2em]">Tracked</span>
               </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="relative hidden lg:block"
          >
            <div className="aspect-square bg-blue-600/5 rounded-[5rem] border border-white/5 flex items-center justify-center p-20 overflow-hidden relative backdrop-blur-3xl shadow-inner">
                <div className="absolute inset-0">
                   <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px]"></div>
                </div>
                
                <div className="relative">
                   <Card className="p-8 w-72 rotate-[-8deg] absolute left-[-100px] top-4 z-20 bg-white/20 border-white/20">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/40">
                          <CheckCircle2 size={28} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">Picked Up</p>
                          <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Bus DHK-1120</p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full w-full overflow-hidden">
                         <motion.div className="h-full bg-blue-400" animate={{ x: ['-100%', '0%'] }} transition={{ duration: 2, repeat: Infinity }} />
                      </div>
                   </Card>
                   
                   <div className="relative group">
                      <div className="absolute -inset-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                      <img 
                        src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1000&auto=format&fit=crop" 
                        alt="Bus" 
                        className="w-96 h-[500px] object-cover rounded-[3rem] relative shadow-2xl grayscale hover:grayscale-0 transition-all duration-700"
                      />
                   </div>
                </div>
            </div>
          </motion.div>
        </div>
      </main>
      
      <footer className="max-w-7xl mx-auto px-8 py-10 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 relative z-10">
         <span>BusX Courier © 2026</span>
         <div className="flex gap-8">
            <a href="#" className="hover:text-blue-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-blue-400 transition-colors">Terms</a>
         </div>
      </footer>
    </div>
  );
};

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (!user || !role) return <Navigate to="/" />;
  return <Layout>{children}</Layout>;
};

import { Dashboard } from './pages/Dashboard';
import { Booking } from './pages/Booking';
import { Tracking } from './pages/Tracking';
import { Support } from './pages/Support';
import { DriverRoutes } from './pages/DriverRoutes';
import { RegisterTransport } from './pages/RegisterTransport';
import { Hubs } from './pages/Hubs';

export default function App() {
  useEffect(() => {
    testConnection();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-center" />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/book" element={<ProtectedRoute><Booking /></ProtectedRoute>} />
          <Route path="/routes" element={<ProtectedRoute><DriverRoutes /></ProtectedRoute>} />
          <Route path="/tracking" element={<ProtectedRoute><Tracking /></ProtectedRoute>} />
          <Route path="/hubs" element={<ProtectedRoute><Hubs /></ProtectedRoute>} />
          <Route path="/register-transport" element={<ProtectedRoute><RegisterTransport /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
