'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { CalendarDays, Gift, Image as ImageIcon, Video, Home, Menu, X, Cpu, Camera, Star, Trophy, Gamepad2, UtensilsCrossed, ShoppingCart, Wallet, Bot, MessageCircle, Settings, Package, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFamilyMembers } from '@/hooks/use-family';
import { CurrentUserProvider, useCurrentUser } from '@/hooks/use-current-user';
import { HeartTrail } from './HeartTrail';
import { registerFCMToken, onForegroundMessage } from '@/lib/fcm';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const NAV_ITEMS = [
  { name: 'Calendar', href: '/', icon: CalendarDays },
  { name: 'Missions', href: '/missions', icon: Gamepad2 },
  { name: 'Meals', href: '/meals', icon: UtensilsCrossed },
  { name: 'Shopping', href: '/shopping', icon: ShoppingCart },
  { name: 'Pantry', href: '/inventory', icon: Package },
  { name: 'Budget', href: '/budget', icon: Wallet },
  { name: 'Messages', href: '/messages', icon: MessageCircle },
  { name: 'Hermes', href: '/assistant', icon: Cpu },
  { name: 'Scanner', href: '/scanner', icon: Camera },
  { name: 'Map', href: '/map', icon: Home },
  { name: 'Rewards', href: '/rewards', icon: Gift },
  { name: 'Gallery', href: '/gallery', icon: ImageIcon },
  { name: 'Video Calls', href: '/calls', icon: Video },
];

// Only these 6 show on the mobile bottom bar — everything else is in the hamburger
const BOTTOM_NAV = ['/', '/missions', '/messages', '/meals', '/assistant', '/shopping'];

export function AppNavigationContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { users } = useFamilyMembers();
  const { currentUser } = useCurrentUser();

  const isAbriana = currentUser?.name === 'Abriana';
  const isChild = currentUser?.role === 'child';
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  const settingsActive = pathname === '/settings';

  // Hide budget from children
  const visibleNavItems = NAV_ITEMS.filter(item => !(isChild && item.href === '/budget'));

  async function handleLogout() {
    try {
      await signOut(auth);
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  const [notifStatus, setNotifStatus] = useState<'idle' | 'loading' | 'on' | 'denied'>('idle');
  const [foregroundToast, setForegroundToast] = useState<{ title: string; body?: string } | null>(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    const unsub = onForegroundMessage((payload) => {
      setForegroundToast({ title: payload.title ?? 'Bear House', body: payload.body });
      setTimeout(() => setForegroundToast(null), 5000);
    });
    return unsub;
  }, [currentUser?.id]);

  async function handleEnableNotifications() {
    if (!currentUser?.id) return;
    setNotifStatus('loading');
    const result = await registerFCMToken(currentUser.id);
    if (result.success) {
      setNotifStatus('on');
    } else if (result.error === 'Permission denied') {
      setNotifStatus('denied');
    } else {
      setNotifStatus('idle');
      console.warn('[FCM]', result.error);
    }
  }

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
          {visibleNavItems.map((item) => {
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

        <div className="p-4 border-t border-slate-100 space-y-3">
          {/* Settings — admin only */}
          {isAdmin && (
            <Link
              href="/settings"
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                settingsActive
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          )}

          <Link
            href="/setup-home"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200/60"
          >
            <Bot className="w-4 h-4" />
            Setup Your Home (Local AI)
          </Link>

          <button
            onClick={handleEnableNotifications}
            disabled={notifStatus === 'loading' || notifStatus === 'on'}
            className={`w-full px-3 py-2 text-xs font-semibold rounded-lg transition-colors border ${
              notifStatus === 'on'
                ? 'bg-green-50 text-green-700 border-green-200 cursor-default'
                : notifStatus === 'denied'
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200/60'
            }`}
          >
            {notifStatus === 'loading' ? 'Enabling…' : notifStatus === 'on' ? '✓ Notifications On' : notifStatus === 'denied' ? 'Permission Denied' : 'Enable Notifications'}
          </button>

          {/* Current user + logout */}
          {currentUser && (
            <div className="flex items-center justify-between px-2 py-2 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                {currentUser.avatarUrl ? (
                  <Image src={currentUser.avatarUrl} alt={currentUser.name} width={28} height={28} className="w-7 h-7 rounded-full border border-slate-200 object-cover shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className={`w-7 h-7 rounded-full ${currentUser.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{currentUser.name[0]}</div>
                )}
                <span className="text-xs font-semibold text-slate-700 truncate">{currentUser.name}</span>
              </div>
              <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0" title="Sign out">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="space-y-4 pt-2">
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
        <div className="flex items-center gap-2">
          {/* Settings shortcut in top bar for admin */}
          {isAdmin && (
            <Link
              href="/settings"
              className={`p-2 rounded-lg transition-colors ${settingsActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Settings className="w-5 h-5" />
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
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

              {/* Admin section at top of mobile menu */}
              {isAdmin && (
                <div className="px-4 pt-4 pb-2 border-b border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">Admin</p>
                  <Link
                    href="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${
                      settingsActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Settings className={`w-5 h-5 ${settingsActive ? 'text-white' : 'text-slate-500'}`} />
                    Settings
                  </Link>
                </div>
              )}

              {/* Current user display */}
              {currentUser && (
                <div className="px-4 pt-3 pb-2">
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    {currentUser.avatarUrl ? (
                      <Image src={currentUser.avatarUrl} alt={currentUser.name} width={32} height={32} className="w-8 h-8 rounded-full border border-slate-200 object-cover shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className={`w-8 h-8 rounded-full ${currentUser.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}>{currentUser.name[0]}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
                      <p className="text-xs text-slate-400 capitalize">{currentUser.role}</p>
                    </div>
                  </div>
                </div>
              )}

              <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {visibleNavItems.map((item) => {
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

              <div className="p-4 border-t border-slate-100 space-y-2">
                <Link
                  href="/setup-home"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200/60"
                >
                  <Bot className="w-4 h-4" />
                  Setup Your Home (Local AI)
                </Link>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors border border-red-200/60"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {children}
      </div>

      {/* Foreground notification toast */}
      <AnimatePresence>
        {foregroundToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 right-4 z-[200] max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-sm">🔔</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-slate-900">{foregroundToast.title}</p>
              {foregroundToast.body && <p className="text-xs text-slate-500 mt-0.5">{foregroundToast.body}</p>}
            </div>
            <button onClick={() => setForegroundToast(null)} className="text-slate-400 hover:text-slate-600 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation — 6 core items only */}
      <nav className={`md:hidden fixed bottom-0 inset-x-0 ${isAbriana ? 'bg-pink-100 border-pink-200' : 'bg-white border-t border-slate-200'} flex items-center justify-around pb-safe z-40`}>
        {NAV_ITEMS.filter(item => BOTTOM_NAV.includes(item.href)).map((item) => {
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
