'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { auth, db, signInWithGoogle } from '@/lib/firebase';
import { AppUser } from '@/lib/familyos';
import { LogIn, Sparkles, Key, Mail, User, Shield, ChevronRight, UserPlus, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Onboarding States
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardStep, setOnboardStep] = useState<'choice' | 'create' | 'join'>('choice');
  
  // Create Family States
  const [userName, setUserName] = useState('');
  const [userColor, setUserColor] = useState('bg-blue-500');
  const [familyCodeInput, setFamilyCodeInput] = useState('');

  const colors = [
    { name: 'Blue', value: 'bg-blue-500' },
    { name: 'Pink', value: 'bg-pink-500' },
    { name: 'Green', value: 'bg-green-500' },
    { name: 'Yellow', value: 'bg-yellow-500' },
    { name: 'Purple', value: 'bg-purple-500' },
    { name: 'Indigo', value: 'bg-indigo-500' },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFbUser(user);
      if (user) {
        // Check if user document exists in Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          // Already onboarded, store current user ID in local storage
          localStorage.setItem('current_user_id', user.uid);
          router.push('/');
        } else {
          // Needs onboarding
          setNeedsOnboarding(true);
        }
      } else {
        setNeedsOnboarding(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    setLoading(true);

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Authentication failed. Please check your credentials.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Google Sign-In failed.');
      setLoading(false);
    }
  };

  // Generate a random 6-character alphanumeric family code
  const generateFamilyCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbUser || !userName.trim()) return;
    setLoading(true);

    const newFamilyCode = generateFamilyCode();

    const newUserDoc: AppUser = {
      id: fbUser.uid,
      name: userName.trim(),
      color: userColor,
      role: 'superadmin', // First creator is superadmin
      points: 0,
      familyCode: newFamilyCode,
    };

    try {
      await setDoc(doc(db, 'users', fbUser.uid), newUserDoc);
      localStorage.setItem('current_user_id', fbUser.uid);
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError('Failed to create family profile in database. Check rules.');
      setLoading(false);
    }
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbUser || !familyCodeInput.trim() || !userName.trim()) return;
    setLoading(true);
    setError(null);

    const targetCode = familyCodeInput.trim().toUpperCase();

    try {
      // Find a user who already has this familyCode
      const q = query(collection(db, 'users'), where('familyCode', '==', targetCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('No family found with that code. Please verify and try again.');
        setLoading(false);
        return;
      }

      // Family exists! Join as a child (rules say only admins can assign roles, or sign up as child by default)
      const newUserDoc: AppUser = {
        id: fbUser.uid,
        name: userName.trim(),
        color: userColor,
        role: 'child', // Default to child, parents can upgrade roles later
        points: 0,
        familyCode: targetCode,
      };

      await setDoc(doc(db, 'users', fbUser.uid), newUserDoc);
      localStorage.setItem('current_user_id', fbUser.uid);
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError('Error joining family. Make sure permissions are correct.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#facc15] flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0_#1e293b] flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-full border-4 border-slate-900 border-t-transparent animate-spin"></div>
          <p className="font-display font-black text-xl text-slate-900 uppercase">Loading Family OS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#facc15] flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <main className="w-full max-w-md my-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="font-display text-5xl font-black tracking-tighter text-slate-900 uppercase flex items-center justify-center gap-2 drop-shadow-[2px_2px_0_rgba(255,255,255,1)]">
            Bear House <Sparkles className="w-8 h-8 text-[#be185d] fill-[#be185d]" />
          </h1>
          <p className="text-slate-900 font-bold mt-2 text-sm uppercase tracking-wide bg-white inline-block px-3 py-1 border-2 border-slate-900 shadow-[2px_2px_0_#1e293b]">
            Your ADHD Family Hub
          </p>
        </div>

        <div className="bg-white rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0_#1e293b] overflow-hidden">
          <AnimatePresence mode="wait">
            {!needsOnboarding ? (
              /* Authentication Form */
              <motion.div
                key="auth"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="p-6 sm:p-8 space-y-6"
              >
                <div className="flex gap-2 p-1 bg-slate-100 border-2 border-slate-900 rounded-xl">
                  <button
                    onClick={() => setAuthMode('login')}
                    className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg border-2 transition-all ${
                      authMode === 'login' 
                        ? 'bg-[#ccff00] border-slate-900 shadow-[2px_2px_0_#1e293b] text-slate-900' 
                        : 'border-transparent text-slate-500'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setAuthMode('signup')}
                    className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg border-2 transition-all ${
                      authMode === 'signup' 
                        ? 'bg-[#c084fc] border-slate-900 shadow-[2px_2px_0_#1e293b] text-slate-900' 
                        : 'border-transparent text-slate-500'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                {error && (
                  <div className="p-4 bg-red-100 border-2 border-red-500 text-red-800 rounded-xl text-xs font-bold flex items-center gap-2">
                    <Shield className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /> Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="YOU@EXAMPLE.COM"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0_#1e293b] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none text-sm font-bold bg-white text-slate-900 uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                      <Key className="w-3.5 h-3.5" /> Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0_#1e293b] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none text-sm font-bold bg-white text-slate-900"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#ccff00] text-slate-900 font-display font-black text-lg uppercase tracking-wider rounded-xl border-2 border-slate-900 shadow-[4px_4px_0_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-5 h-5" />
                    {authMode === 'login' ? 'Let\'s Go!' : 'Create Account'}
                  </button>
                </form>

                <div className="relative my-6 text-center">
                  <span className="bg-white px-3 text-xs font-black uppercase tracking-widest text-slate-400 border-2 border-slate-200 rounded-full relative z-10">OR</span>
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-3 bg-white text-slate-900 font-bold text-sm uppercase tracking-wider rounded-xl border-2 border-slate-900 shadow-[4px_4px_0_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#ea4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.3 1 3.4 3.7 1.5 7.7l3.7 2.9C6.1 7.4 8.8 5 12 5z"/>
                    <path fill="#4285f4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.5H12v4.8h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                    <path fill="#fbbc05" d="M5.2 14.8c-.3-.8-.4-1.7-.4-2.8s.1-2 .4-2.8L1.5 6.3C.5 8.1 0 10 0 12s.5 3.9 1.5 5.7l3.7-2.9z"/>
                    <path fill="#34a853" d="M12 23c3.2 0 6-1.1 8-2.9l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.2 0-5.9-2.4-6.8-5.6l-3.7 2.9C3.4 20.3 7.3 23 12 23z"/>
                  </svg>
                  Sign in with Google
                </button>
              </motion.div>
            ) : (
              /* Onboarding Gate */
              <motion.div
                key="onboard"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-6 sm:p-8 space-y-6"
              >
                {onboardStep === 'choice' && (
                  <div className="space-y-6 text-center">
                    <h2 className="font-display font-black text-2xl uppercase tracking-tight text-slate-900">
                      Welcome to Bear House!
                    </h2>
                    <p className="text-slate-600 text-sm font-medium leading-relaxed">
                      Let&apos;s set up your family system. Would you like to create a new family unit or join an existing family using a code?
                    </p>

                    <div className="grid grid-cols-1 gap-4">
                      <button
                        onClick={() => setOnboardStep('create')}
                        className="p-5 bg-[#c084fc] hover:bg-[#b074ec] border-2 border-slate-900 shadow-[4px_4px_0_#1e293b] rounded-2xl flex flex-col items-center justify-center gap-1 group transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:scale-95"
                      >
                        <UserPlus className="w-8 h-8 text-slate-900" />
                        <span className="font-display font-black text-lg uppercase text-slate-900 tracking-wider">Create New Family</span>
                        <span className="text-xs font-bold text-slate-800">For home administrators / parents</span>
                      </button>

                      <button
                        onClick={() => setOnboardStep('join')}
                        className="p-5 bg-[#ccff00] hover:bg-[#bceb00] border-2 border-slate-900 shadow-[4px_4px_0_#1e293b] rounded-2xl flex flex-col items-center justify-center gap-1 group transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:scale-95"
                      >
                        <Key className="w-8 h-8 text-slate-900" />
                        <span className="font-display font-black text-lg uppercase text-slate-900 tracking-wider">Join Existing Family</span>
                        <span className="text-xs font-bold text-slate-800">Requires a family invitation code</span>
                      </button>
                    </div>
                  </div>
                )}

                {onboardStep === 'create' && (
                  <form onSubmit={handleCreateFamily} className="space-y-6">
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => setOnboardStep('choice')}
                        className="text-xs font-black uppercase text-slate-500 hover:text-slate-900"
                      >
                        &larr; Back
                      </button>
                      <h2 className="font-display font-black text-xl uppercase tracking-tight text-slate-900 ml-auto">
                        Create Your Family
                      </h2>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700">Your Admin Profile Name</label>
                      <input
                        type="text"
                        required
                        value={userName}
                        onChange={e => setUserName(e.target.value)}
                        placeholder="E.G. MOMMY (GWEN)"
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0_#1e293b] focus:outline-none text-sm font-bold bg-white text-slate-900 uppercase"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700">Choose Profile Color</label>
                      <div className="flex flex-wrap gap-2">
                        {colors.map(color => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => setUserColor(color.value)}
                            className={`w-8 h-8 rounded-full border-2 border-slate-900 transition-all ${color.value} ${userColor === color.value ? 'ring-4 ring-slate-900 scale-110 shadow-[2px_2px_0_rgba(0,0,0,0.25)]' : ''}`}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!userName.trim()}
                      className="w-full py-3 bg-[#c084fc] text-slate-900 font-display font-black text-lg uppercase tracking-wider rounded-xl border-2 border-slate-900 shadow-[4px_4px_0_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Sparkles className="w-5 h-5" />
                      Generate Family OS!
                    </button>
                  </form>
                )}

                {onboardStep === 'join' && (
                  <form onSubmit={handleJoinFamily} className="space-y-6">
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => setOnboardStep('choice')}
                        className="text-xs font-black uppercase text-slate-500 hover:text-slate-900"
                      >
                        &larr; Back
                      </button>
                      <h2 className="font-display font-black text-xl uppercase tracking-tight text-slate-900 ml-auto">
                        Join a Family
                      </h2>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-100 border-2 border-red-500 text-red-800 rounded-xl text-xs font-bold">
                        {error}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700">Family Invitation Code</label>
                      <input
                        type="text"
                        required
                        value={familyCodeInput}
                        onChange={e => setFamilyCodeInput(e.target.value)}
                        placeholder="E.G. BEAR12"
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0_#1e293b] focus:outline-none text-sm font-mono font-black bg-white text-slate-900 uppercase text-center"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700">Your Name</label>
                      <input
                        type="text"
                        required
                        value={userName}
                        onChange={e => setUserName(e.target.value)}
                        placeholder="E.G. JULIA"
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0_#1e293b] focus:outline-none text-sm font-bold bg-white text-slate-900 uppercase"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700">Choose Profile Color</label>
                      <div className="flex flex-wrap gap-2">
                        {colors.map(color => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => setUserColor(color.value)}
                            className={`w-8 h-8 rounded-full border-2 border-slate-900 transition-all ${color.value} ${userColor === color.value ? 'ring-4 ring-slate-900 scale-110 shadow-[2px_2px_0_rgba(0,0,0,0.25)]' : ''}`}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!userName.trim() || !familyCodeInput.trim()}
                      className="w-full py-3 bg-[#ccff00] text-slate-900 font-display font-black text-lg uppercase tracking-wider rounded-xl border-2 border-slate-900 shadow-[4px_4px_0_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <ChevronRight className="w-5 h-5" />
                      Join and Sync
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
