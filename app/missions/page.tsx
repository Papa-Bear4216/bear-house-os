'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Map as MapIcon, 
  Sparkles, 
  Clock, 
  Gamepad2, 
  ChevronRight, 
  CheckCircle2, 
  Info,
  Star,
  ShieldCheck
} from 'lucide-react';
import { HOUSE_MISSIONS, Mission, MissionChore } from '@/lib/familyos';
import { useCurrentUser } from '@/hooks/use-current-user';

export default function MissionsPage() {
  const { currentUser } = useCurrentUser();
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [completedChores, setCompletedChores] = useState<number[]>([]);

  const isAbriana = currentUser?.name === 'Abriana';

  const toggleChore = (id: number) => {
    setCompletedChores(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const calculateProgress = (mission: Mission) => {
    const total = mission.relatedChores.length;
    const completed = mission.relatedChores.filter(c => completedChores.includes(c.choreId)).length;
    return (completed / total) * 100;
  };

  return (
    <div className={`flex-1 overflow-y-auto min-h-screen ${isAbriana ? 'bg-pink-50/50' : 'bg-slate-50'} pb-24`}>
       {/* Hero Section */}
       <header className={`p-8 sm:p-12 text-center relative overflow-hidden ${isAbriana ? 'bg-white' : 'bg-white'}`}>
         {isAbriana && (
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-300 via-pink-500 to-pink-300" />
         )}
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="relative z-10"
         >
           <h1 className={`font-display text-4xl sm:text-6xl font-black italic tracking-tighter mb-4 ${isAbriana ? 'text-pink-600' : 'text-slate-900'} uppercase`}>
             Mission Control
           </h1>
           <p className="text-slate-500 max-w-xl mx-auto font-medium">
             Select a quest to restore order to the realm. Earn stars and unlock legendary status!
           </p>
         </motion.div>

         <div className="mt-8 flex justify-center gap-4">
           <div className={`px-4 py-2 rounded-full border ${isAbriana ? 'bg-pink-100 border-pink-200 text-pink-600' : 'bg-blue-50 border-blue-100 text-blue-600'} text-xs font-bold uppercase tracking-widest flex items-center gap-2`}>
             <Trophy className="w-4 h-4" /> 4 Active Quests
           </div>
           <div className="px-4 py-2 rounded-full bg-yellow-50 border border-yellow-100 text-yellow-600 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
             <Star className="w-4 h-4 fill-yellow-500" /> 1500 XP Available
           </div>
         </div>
       </header>

       <main className="max-w-6xl mx-auto p-4 sm:p-8">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {HOUSE_MISSIONS.map((mission) => {
              const progress = calculateProgress(mission);
              const isSelected = selectedMission?.missionId === mission.missionId;
              
              return (
                <motion.div
                  key={mission.missionId}
                  layoutId={`mission-${mission.missionId}`}
                  onClick={() => setSelectedMission(mission)}
                  className={`cursor-pointer rounded-[2.5rem] bg-white p-1 shadow-sm hover:shadow-xl transition-all duration-500 border-2 ${isSelected ? (isAbriana ? 'border-pink-500' : 'border-blue-500') : 'border-slate-100 hover:border-slate-300'}`}
                >
                  <div className={`h-full rounded-[2.2rem] p-6 flex flex-col ${isSelected && isAbriana ? 'bg-pink-50' : 'bg-white'}`}>
                    <div className="flex justify-between items-start mb-6">
                      <div className={`p-3 rounded-2xl ${isAbriana ? 'bg-pink-100 text-pink-500' : 'bg-blue-50 text-blue-500'}`}>
                        <Gamepad2 className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        {mission.totalTimeEstimate}
                      </div>
                    </div>

                    <h3 className={`text-2xl font-black italic uppercase tracking-tight mb-2 ${isAbriana ? 'text-pink-600' : 'text-slate-900'}`}>
                      {mission.missionName}
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-8">
                      {mission.description}
                    </p>

                    <div className="mt-auto space-y-4">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                        <span>Progress</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className={`h-full ${isAbriana ? 'bg-pink-500' : 'bg-blue-500'}`} 
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
         </div>
       </main>

       {/* Mission Detail Modal */}
       <AnimatePresence>
         {selectedMission && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedMission(null)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
              />
              
              <motion.div
                layoutId={`mission-${selectedMission.missionId}`}
                className={`relative w-full max-w-2xl bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]`}
              >
                <div className={`p-8 sm:p-10 overflow-y-auto`}>
                  <div className="flex justify-between items-start mb-8">
                    <div className={`px-4 py-1.5 rounded-full ${isAbriana ? 'bg-pink-100 text-pink-600' : 'bg-blue-50 text-blue-600'} text-xs font-black uppercase italic tracking-widest shadow-sm`}>
                      Active Mission: #{selectedMission.missionId}
                    </div>
                    <button 
                      onClick={() => setSelectedMission(null)}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <ChevronRight className="w-6 h-6 rotate-90 text-slate-400" />
                    </button>
                  </div>

                  <h2 className={`text-3xl sm:text-4xl font-black italic uppercase tracking-tighter mb-4 ${isAbriana ? 'text-pink-600' : 'text-slate-900'}`}>
                    {selectedMission.missionName}
                  </h2>
                  <p className="text-slate-500 mb-10 leading-relaxed font-medium">
                    {selectedMission.description}
                  </p>

                  <div className="space-y-4 mb-10">
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                       <MapIcon className="w-4 h-4" /> Objectives List
                    </h4>
                    
                    {selectedMission.relatedChores.map((chore: MissionChore) => {
                      const isDone = completedChores.includes(chore.choreId);
                      return (
                        <div 
                          key={chore.choreId}
                          onClick={() => toggleChore(chore.choreId)}
                          className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer flex items-center justify-between group ${isDone ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}
                        >
                          <div className="flex items-center gap-5">
                             <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isDone ? 'bg-green-100 text-green-600' : 'bg-white text-slate-400 group-hover:scale-110 shadow-sm'}`}>
                               {isDone ? <CheckCircle2 className="w-6 h-6" /> : <Sparkles className="w-5 h-5" />}
                             </div>
                             <div>
                               <h5 className={`font-bold uppercase tracking-tight ${isDone ? 'text-green-700 line-through opacity-60' : 'text-slate-900'}`}>
                                 {chore.choreTitle}
                               </h5>
                               <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-bold uppercase tracking-wider">
                                 <span className="flex items-center gap-1"><MapIcon className="w-3 h-3" /> {chore.location}</span>
                                 <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {chore.estimatedTime}</span>
                               </div>
                             </div>
                          </div>
                          
                          {!isDone && (
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Proper Storage Info */}
                  <div className={`p-6 rounded-3xl ${isAbriana ? 'bg-pink-50/50' : 'bg-blue-50/50'} border-2 ${isAbriana ? 'border-pink-100' : 'border-blue-100'} mb-8`}>
                    <h5 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-3 ${isAbriana ? 'text-pink-600' : 'text-blue-600'}`}>
                      <ShieldCheck className="w-4 h-4" /> Recommended Tactics
                    </h5>
                    {selectedMission.relatedChores.map(c => (
                      <p key={c.choreId} className="text-sm font-medium text-slate-600 mb-2 last:mb-0">
                        <span className="font-bold underline text-slate-900">{c.choreTitle}</span>: Return to <span className="italic">{c.properStorage}</span>
                      </p>
                    ))}
                  </div>

                  <div className="bg-yellow-50 border-2 border-yellow-100 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="relative z-10 flex gap-4">
                      <div className="p-3 bg-yellow-400 text-white rounded-2xl shadow-md rotate-3 group-hover:rotate-0 transition-transform">
                        <Info className="w-6 h-6" />
                      </div>
                      <div>
                        <h6 className="text-yellow-800 font-bold uppercase text-xs tracking-widest mb-1">Mission Fun Fact</h6>
                        <p className="text-yellow-700 text-sm font-medium italic">
                          &quot;{selectedMission.funFact}&quot;
                        </p>
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Sparkles className="w-12 h-12" />
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 mt-auto flex justify-end gap-3">
                   <button 
                     onClick={() => setSelectedMission(null)}
                     className="px-6 py-3 font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                   >
                     Close
                   </button>
                   <button 
                     disabled={calculateProgress(selectedMission) < 100}
                     className={`px-8 py-3 rounded-2xl font-black uppercase tracking-[0.15em] italic transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale ${isAbriana ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                   >
                     Complete Mission
                   </button>
                </div>
              </motion.div>
           </div>
         )}
       </AnimatePresence>

       {/* House Guide Section */}
       <div className="max-w-6xl mx-auto p-4 sm:p-8 mt-12 bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className={`p-8 border-b ${isAbriana ? 'bg-pink-500' : 'bg-slate-900'} text-white`}>
            <h3 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
              <ShieldCheck className="w-7 h-7" /> House Supply Guide
            </h3>
            <p className="opacity-80 text-sm font-medium mt-1 uppercase tracking-widest">Master the art of organization</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 p-8">
            {[
              { room: "Entryway", zones: ["Backpacks", "Keys/Tray", "Shoes (max 2 pairs)"] },
              { room: "Living Room", zones: ["Bookshelf (Kid/Adult)", "Media Console", "Storage Ottoman"] },
              { room: "Kitchen", zones: ["Pantry shelves", "Utility drawer", "Trash/Recycling"] },
              { room: "Kid Bedroom", zones: ["Dresser (Socks/T-shirts/PJs)", "Toy Bin", "Closet Rack"] }
            ].map(loc => (
              <div key={loc.room} className="space-y-4">
                <h4 className={`font-black uppercase italic tracking-tighter text-lg ${isAbriana ? 'text-pink-600' : 'text-slate-900'}`}>{loc.room}</h4>
                <ul className="space-y-2">
                  {loc.zones.map(zone => (
                    <li key={zone} className="text-sm font-bold text-slate-500 flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${isAbriana ? 'bg-pink-300' : 'bg-slate-300'}`} />
                      {zone}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
       </div>
    </div>
  );
}
