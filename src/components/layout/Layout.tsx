import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bus, MapPin, LayoutDashboard, MessageCircle, LogOut, User, Navigation } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { logout } from '../../lib/firebase';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Courier Hubs', path: '/hubs', icon: Navigation },
    { label: 'Tracking', path: '/tracking', icon: MapPin },
    { label: 'Support', path: '/support', icon: MessageCircle },
  ];

  if (role === 'customer') {
    navItems.splice(1, 0, { label: 'Send Parcel', path: '/book', icon: Bus });
  }

  if (role === 'driver') {
    navItems.splice(1, 0, { label: 'Active Routes', path: '/routes', icon: Navigation });
    navItems.splice(2, 0, { label: 'Register Bus', path: '/register-transport', icon: Bus });
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row relative overflow-hidden text-slate-100">
      {/* Background Mesh Gradient */}
      <div className="absolute inset-0 z-0 mesh-gradient pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-72 glass border-r-0 flex-col sticky top-0 h-screen z-10">
        <div className="p-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/40">
            <Bus size={28} />
          </div>
          <span className="text-2xl font-black text-white tracking-tighter">BusX <span className="text-blue-400">Courier</span></span>
        </div>

        <nav className="flex-1 px-6 py-6 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all group relative',
                location.pathname === item.path
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon size={20} className={cn(location.pathname === item.path ? 'text-white' : 'text-slate-500 group-hover:text-blue-400')} />
              {item.label}
              {location.pathname === item.path && (
                <motion.div layoutId="nav-bg" className="absolute inset-0 bg-blue-600 rounded-2xl -z-10" />
              )}
            </Link>
          ))}
        </nav>

        <div className="p-6">
          <div className="flex items-center gap-4 px-5 py-4 bg-white/5 rounded-3xl border border-white/10 mb-6">
            <div className="w-11 h-11 rounded-full bg-slate-800 border-2 border-blue-500/50 overflow-hidden flex items-center justify-center text-blue-400 font-bold shadow-inner">
              {user?.photoURL ? <img src={user.photoURL} alt="" /> : <User size={22} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.displayName}</p>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="md:hidden flex items-center justify-between p-6 glass border-b-0 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
            <Bus size={22} />
          </div>
          <span className="text-xl font-black text-white tracking-tighter">BusX</span>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={logout} className="text-red-400"><LogOut size={20}/></button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col z-10 relative">
        <div className="flex-1 container mx-auto px-6 py-10 max-w-6xl">
          {children}
        </div>
        
        {/* Mobile bottom nav */}
        <nav className="md:hidden glass border-t-0 fixed bottom-0 left-0 right-0 py-4 px-8 flex justify-between items-center z-50 rounded-t-[2.5rem]">
           {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-1.5 text-[10px] font-black uppercase tracking-widest',
                location.pathname === item.path ? 'text-blue-400 scale-110' : 'text-slate-500'
              )}
            >
              <item.icon size={22} />
              {item.label}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
};
