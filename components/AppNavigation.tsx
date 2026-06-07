'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { CalendarDays, Gift, Image as ImageIcon, Video, Home, Menu, X, Cpu, Camera, UserCircle2, Star, Trophy, Gamepad2, UtensilsCrossed, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFamilyMembers } from '@/hooks/use-family';
import { CurrentUserProvider, useCurrentUser } from '@/hooks/use-current-user';
import { HeartTrail } from './HeartTrail';

const NAV_ITEMS = [
  { name: 'Calendar', href: '/', icon: CalendarDays },
  { name: 'Missions', href: '/missions', icon: Gamepad2 },
  { name: 'Meals', href: '/meals', icon: UtensilsCrossed },
  { name: 'Shopping', href: '/shopping', icon: ShoppingCart },
  { name: 'Hermes', href: '/assistant', icon: Cpu },
  { name: 'Scanner', href: '/scanner', icon: Camera },
  { name: 'Map', href: '/map', icon: Home },
  { name: 'Rewards', href: '/rewards', icon: Gift },
  { name: 'Gallery', href: '/gallery', icon: ImageIcon },
  { name: 'Video Calls', href: '/calls', icon: Video },
];

function UserSwitcher() {
  const { users } = useFamilyMembers();
  const { currentUser, setCurrentUser } = useCurrentUser();

  // Find the most up-to-date user object (with avatarUrl)
  const activeUser = users.find(u => u.id === currentUser?.id) || currentUser;
  const isAdmin = activeUser?.role === 'admin' || activeUser?.role === 'superadmin';

  if (!activeUser) return null;

  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-2 mb-3">Viewing As</h3>
      <div className="flex items-center gap-3 px-2 mb-3">
        {/* ... avatar ... */}
        <div className="relative">
          {activeUser.avatarUrl ? (
            <Image 
              src={activeUser.avatarUrl} 
              alt={activeUser.name} 
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:scale-110 active:scale-95 transition-all duration-300"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={`w-10 h-10 rounded-full ${activeUser.color} flex items-center justify-center border-2 border-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]`}>
              <UserCircle2 className="w-6 h-6 text-white" />
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-slate-900 truncate">{activeUser.name}</span>
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">{activeUser.role}</span>
        </div>
      </div>
      <div className="space-y-2">
        <select 
          value={activeUser.id}
          onChange={(e) => setCurrentUser(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
        >
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        {isAdmin && (
           <div className="text-[10px] text-slate-500 bg-slate-100 p-2 rounded-lg">
             Family Code: <span className="font-mono font-bold text-slate-800">{activeUser.familyCode || 'N/A'}</span>
           </div>
        )}
      </div>
    </div>
  );
}

export function AppNavigationContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { users } = useFamilyMembers();
  const { currentUser } = useCurrentUser();

  const isAbriana = currentUser?.name === 'Abriana';
  const isChild = currentUser?.role === 'child';

  return (
    <div className={`flex flex-col md:flex-row min-h-screen ${isAbriana ? 'bg-pink-50' : 'bg-slate-50'}`}>
      {isAbriana && <HeartTrail />}
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col w-64 ${isAbriana ? 'bg-pink-50 border-pink-100' : 'bg-white border-r border-slate-200'} sticky top-0 h-screen`}>
        <div className={`p-6 border-b ${isAbriana ? 'border-pink-100' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${isAbriana ? 'bg-pink-500' : 'bg-blue-600'}`}>
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-semibold tracking-tight text-slate-900 leading-tight">Bear House</h1>
              <p className="text-xs text-slate-500">Family OS</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive 
                    ? (isAbriana ? 'bg-pink-500 text-white shadow-md' : 'bg-blue-50 text-blue-700 font-medium') 
                    : (isAbriana ? 'text-pink-400 hover:bg-pink-100 hover:text-pink-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? (isAbriana ? 'text-white' : 'text-blue-600') : (isAbriana ? 'text-pink-300' : 'text-slate-400')}`} />
                {item.name}
                {isActive && isChild && <Star className="ml-auto w-4 h-4 animate-spin-slow" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <UserSwitcher />
          
          <Link
            href="/setup-home"
            className="w-full flex items-center justify-center gap-2 mb-4 px-3 py-2 text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200/60"
          >
            <Bot className="w-4 h-4" />
            Setup Your Home (Local AI)
          </Link>

          <button 
            onClick={() => {
              if ('Notification' in window) {
                Notification.requestPermission().then(p => alert(p === 'granted' ? 'Alert notifications enabled for updates!' : 'Notifications blocked.'));
              }
            }}
            className="w-full mb-4 px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200/60"
          >
            Enable Device Notifications
          </button>
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 px-2 flex items-center justify-between">
              Family Stars <Trophy className="w-3 h-3 text-yellow-500" />
            </h3>
            {users.filter(u => u.role === 'child').map(u => (
              <motion.div 
                key={u.id} 
                whileHover={{ x: 5 }}
                className={`flex items-center justify-between px-3 py-2 rounded-2xl transition-all ${isAbriana ? 'hover:bg-pink-100' : 'hover:bg-slate-50'} group`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {u.avatarUrl ? (
                      <Image 
                        src={u.avatarUrl} 
                        alt={u.name} 
                        width={36}
                        height={36}
                        className="w-9 h-9 rounded-full object-cover shadow-[0_2px_8px_rgba(0,0,0,0.1)] border-2 border-white group-hover:scale-110 transition-transform" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className={`w-9 h-9 rounded-full ${u.color} flex items-center justify-center text-xs text-white font-bold shadow-[0_2px_8px_rgba(0,0,0,0.1)] border-2 border-white`}>
                        {u.name[0]}
                      </div>
                    )}
                    <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 shadow-sm">
                      <Star className="w-2.5 h-2.5 text-white fill-white" />
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${isAbriana ? 'text-pink-600' : 'text-slate-700'}`}>{u.name}</span>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${isAbriana ? 'bg-pink-200 text-pink-600' : 'bg-yellow-50 text-yellow-600'}`}>
                  <span className="text-sm font-black italic">{u.points}</span>
                  <Star className="w-3.5 h-3.5 fill-current" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 p-4 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Home className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-display font-semibold tracking-tight text-slate-900">Bear House</h1>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 md:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-4/5 max-w-sm bg-white shadow-2xl z-50 md:hidden flex flex-col"
            >
              <div className="p-4 flex items-center justify-between border-b border-slate-100">
                <h2 className="font-display font-semibold text-lg">Menu</h2>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 border-b border-slate-100">
                 <UserSwitcher />
                 <Link
                   href="/setup-home"
                   onClick={() => setMobileMenuOpen(false)}
                   className="w-full flex items-center justify-center gap-2 mt-4 px-3 py-2 text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200/60"
                 >
                   <Bot className="w-4 h-4" />
                   Setup Your Home (Local AI)
                 </Link>
              </div>
              <nav className="p-4 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link 
                      key={item.name} 
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 font-medium' 
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {children}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className={`md:hidden fixed bottom-0 inset-x-0 ${isAbriana ? 'bg-pink-100 border-pink-200' : 'bg-white border-t border-slate-200'} flex items-center justify-around pb-safe z-40`}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex flex-col items-center justify-center w-full py-2.5 space-y-1 transition-colors ${
                isActive 
                  ? (isAbriana ? 'text-pink-600' : 'text-blue-600') 
                  : (isAbriana ? 'text-pink-400 hover:text-pink-600' : 'text-slate-500 hover:text-slate-900')
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? (isAbriana ? 'bg-pink-200 scale-110 shadow-sm' : 'bg-blue-50') : ''}`}>
                <item.icon className={`w-5 h-5 ${isActive && isChild ? 'animate-pulse' : ''}`} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tighter">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function AppNavigation({ children }: { children: React.ReactNode }) {
  return (
    <CurrentUserProvider>
      <AppNavigationContent>{children}</AppNavigationContent>
    </CurrentUserProvider>
  );
}

