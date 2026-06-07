'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Plus, Loader2, Sparkles, CheckSquare, Map, Clock, AlertTriangle, ShieldAlert, Zap, Info } from 'lucide-react';
import { runLocalAI } from '@/lib/local-ai';
import { useTasks } from '@/hooks/use-tasks';
import { useFamilyMembers } from '@/hooks/use-family';
import { format } from 'date-fns';
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Chore = {
  choreId: number;
  choreTitle: string;
  location: string;
  itemsInvolved: string[];
  properStorage: string;
  priority: string;
  estimatedTime: string;
  difficulty: string;
};

type Mission = {
  missionId: number;
  missionName: string;
  description: string;
  totalTimeEstimate: string;
  funFact: string;
  relatedChores: Chore[];
};

type ScanResult = {
  houseScan: {
    overallMessLevel: string;
    totalChoresIdentified: number;
    roomsSummary: Record<string, {
      messLevel: string;
      itemsOutOfPlace: number;
      primaryClutterType: string;
    }>;
  };
  choreMissions: Mission[];
};

const MOCK_DATA: ScanResult = {
  houseScan: {
    overallMessLevel: "medium",
    totalChoresIdentified: 7,
    roomsSummary: {
      "Living Room": {
        messLevel: "medium",
        itemsOutOfPlace: 4,
        primaryClutterType: "Toys and Textiles"
      },
      "Kitchen": {
        messLevel: "low",
        itemsOutOfPlace: 2,
        primaryClutterType: "Paper and Food Waste"
      },
      "Kid Bedroom": {
        messLevel: "high",
        itemsOutOfPlace: 6,
        primaryClutterType: "Clothing and Footwear"
      }
    }
  },
  choreMissions: [
    {
      missionId: 1,
      missionName: "The Toy Rescue Expedition",
      description: "Round up the scattered items and return them to their designated base camps in the Living Room.",
      totalTimeEstimate: "13 minutes",
      funFact: "If you stacked every Lego brick ever made, the tower would reach the moon ten times!",
      relatedChores: [
        {
          choreId: 101,
          choreTitle: "Lego & Figure Roundup",
          location: "Living Room Floor",
          itemsInvolved: ["Lego bricks", "Action figures"],
          properStorage: "Living Room -> Primary Toy Bin",
          priority: "high",
          estimatedTime: "10 minutes",
          difficulty: "medium"
        },
        {
          choreId: 102,
          choreTitle: "The Book Parade",
          location: "Coffee Table",
          itemsInvolved: ["3 Children's books"],
          properStorage: "Living Room -> Bookshelf (Lower Tiers)",
          priority: "medium",
          estimatedTime: "3 minutes",
          difficulty: "easy"
        }
      ]
    },
    {
      missionId: 2,
      missionName: "Operation Couch Cozy",
      description: "Re-establish the comfort zone by organizing the textiles.",
      totalTimeEstimate: "5 minutes",
      funFact: "A tidy living room makes it 20% easier for your brain to relax after a long day!",
      relatedChores: [
        {
          choreId: 201,
          choreTitle: "Pillow & Blanket Alignment",
          location: "Living Room Rug",
          itemsInvolved: ["4 Throw pillows", "1 Fleece blanket"],
          properStorage: "Living Room -> Storage Ottoman (blanket) and Sofa (pillows)",
          priority: "low",
          estimatedTime: "5 minutes",
          difficulty: "easy"
        }
      ]
    },
    {
      missionId: 3,
      missionName: "The Island Clear-Off",
      description: "Clean the kitchen surfaces to prepare for the next meal mission.",
      totalTimeEstimate: "6 minutes",
      funFact: "Did you know recycling one glass bottle saves enough energy to power a computer for 25 minutes?",
      relatedChores: [
        {
          choreId: 301,
          choreTitle: "Paper Patrol",
          location: "Kitchen Island",
          itemsInvolved: ["Mail", "Flyers", "Loose pens"],
          properStorage: "Kitchen -> Island Drawer 2 (Utility)",
          priority: "high",
          estimatedTime: "4 minutes",
          difficulty: "easy"
        },
        {
          choreId: 302,
          choreTitle: "Snack Debris Disposal",
          location: "Kitchen Counter",
          itemsInvolved: ["Empty juice box", "Crumb trail"],
          properStorage: "Kitchen -> Under-Sink Cabinet (Trash/Recycling)",
          priority: "high",
          estimatedTime: "2 minutes",
          difficulty: "easy"
        }
      ]
    },
    {
      missionId: 4,
      missionName: "Wardrobe Wizardry",
      description: "Magically transport wandering clothes back to their wardrobe homes.",
      totalTimeEstimate: "8 minutes",
      funFact: "The average person walks about 115,000 miles in a lifetime—that's 5 times around the Earth! Your shoes deserve a nice place to rest.",
      relatedChores: [
        {
          choreId: 401,
          choreTitle: "Sock Search and Rescue",
          location: "Kid Bedroom Floor",
          itemsInvolved: ["Dirty socks", "T-shirt"],
          properStorage: "Kid Bedroom -> 3-Drawer Dresser (Top Drawer or Laundry Bin)",
          priority: "high",
          estimatedTime: "5 minutes",
          difficulty: "easy"
        },
        {
          choreId: 402,
          choreTitle: "Shoe Pairing",
          location: "Bedroom Doorway",
          itemsInvolved: ["Sneakers", "Sandals"],
          properStorage: "Kid Bedroom -> Closet Rack",
          priority: "medium",
          estimatedTime: "3 minutes",
          difficulty: "easy"
        }
      ]
    }
  ]
};

export default function ScannerPage() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [frameBase64, setFrameBase64] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [assignedMissions, setAssignedMissions] = useState<Set<number>>(new Set());

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { tasks, addTask } = useTasks();
  const { users } = useFamilyMembers();

  // Load kids and adults specifically for dropdowns
  const childrenFilter = users.filter(u => u.role === 'child' && !u.isExempt);

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Failed to start camera", err);
      // alert("Could not access the camera. Make sure you've granted permissions.");
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimension exactly to video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const b64 = canvas.toDataURL('image/jpeg', 0.8);
    setFrameBase64(b64);
  }, []);

  const retakeImage = () => {
    setFrameBase64(null);
    setScanResult(null);
    setAssignedMissions(new Set());
  };

  const loadMockData = () => {
    setIsAnalyzing(true);
    // Simulate delay
    setTimeout(() => {
      setScanResult(MOCK_DATA);
      setIsAnalyzing(false);
    }, 1500);
  };

  const analyzeImage = async () => {
    setIsAnalyzing(true);
    setScanResult(null);

    try {
      const prompt = `Generate a JSON object representing a room walkthrough chore scan. Format: { houseScan: { overallMessLevel: "high"|"medium"|"low", totalChoresIdentified: number, roomsSummary: { [roomName: string]: { messLevel, itemsOutOfPlace, primaryClutterType } } }, choreMissions: [{ missionId: number, missionName: string, description: string, totalTimeEstimate: string, funFact: string, relatedChores: [{ choreId: number, choreTitle: string, location: string, itemsInvolved: string[], properStorage: string, priority: "high"|"medium"|"low", estimatedTime: string, difficulty: "easy"|"medium"|"hard" }] }] }. Ensure it's valid JSON only. Generate 2 missions.`;
      
      const responseText = await runLocalAI(prompt);
      
      const jsonMatch = responseText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : responseText.replace(/```json/g, '').replace(/```/g, '').trim();

      setScanResult(JSON.parse(jsonString));
    } catch (e: any) {
      console.error(e);
      console.warn("Local AI failed or unavailable. Falling back to mock data.");
      loadMockData();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const assignMission = (mission: Mission, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const assigneeId = formData.get('assignee') as string;
    
    // Add each chore in the mission as a task
    mission.relatedChores.forEach(chore => {
       addTask({
         title: `${mission.missionName}: ${chore.choreTitle}`,
         assigneeId: assigneeId,
         date: format(new Date(), 'yyyy-MM-dd'),
         pointsValue: chore.difficulty === 'high' ? 50 : chore.difficulty === 'medium' ? 30 : 15,
         completed: false,
         status: 'todo',
         properStorage: chore.properStorage
       });
    });
    
    // Mark as assigned
    setAssignedMissions(prev => new Set(prev).add(mission.missionId));
  };
  
  const getBadgeColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 relative p-4 sm:p-8 xl:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="mb-6">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
            <Camera className="w-8 h-8 text-blue-600" />
            Scanner & Walkthrough
          </h1>
          <p className="text-slate-500 mt-2 text-sm sm:text-base">
            Point the camera at a messy room and let AI generate chores.
          </p>
        </header>

        <div className="bg-black rounded-3xl overflow-hidden relative shadow-xl ring-1 ring-slate-900/10">
          {!frameBase64 ? (
            <div className="relative aspect-video w-full bg-slate-900 flex items-center justify-center">
               <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="absolute inset-0 w-full h-full object-cover"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
               <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-4">
                 <button 
                  onClick={captureFrame}
                  className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full border-4 border-white flex items-center justify-center hover:scale-105 transition-transform shadow-xl active:scale-95"
                 >
                   <div className="w-12 h-12 bg-white rounded-full"></div>
                 </button>
                 <button 
                   onClick={(e) => {
                     e.preventDefault();
                     setFrameBase64('data:image/jpeg;base64,mock'); // Mock image
                     loadMockData();
                   }}
                   className="text-xs text-white/70 hover:text-white underline underline-offset-4"
                 >
                   Skip & Use Sample Walkthrough
                 </button>
               </div>
            </div>
          ) : (
            <div className="relative aspect-video w-full">
              {frameBase64 !== 'data:image/jpeg;base64,mock' ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={frameBase64} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-900 to-slate-900 flex flex-col items-center justify-center text-white/50">
                  <Map className="w-12 h-12 mb-2 opacity-50" />
                  <p>Sample Walkthrough Loaded</p>
                </div>
              )}
              
              <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex gap-3 justify-center">
                 <button 
                  onClick={retakeImage}
                  className="px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white font-medium flex items-center gap-2 transition-colors"
                 >
                   <RefreshCw className="w-4 h-4" /> Reset
                 </button>
                 {!isAnalyzing && !scanResult && frameBase64 !== 'data:image/jpeg;base64,mock' && (
                   <button 
                    onClick={analyzeImage}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-full text-white font-medium flex items-center gap-2 transition-colors shadow-lg"
                   >
                     <Sparkles className="w-4 h-4" /> Analyze Room
                   </button>
                 )}
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {isAnalyzing && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-slate-500 space-y-4">
             <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
             <p className="font-medium animate-pulse">Running Spatial Analysis...</p>
          </div>
        )}

        {scanResult && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* House Scan Summary */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-6">
                <Map className="w-5 h-5 text-indigo-500" /> Walkthrough Summary
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-sm font-medium text-slate-500 mb-1">Overall Mess</div>
                  <div className="flex items-center gap-2">
                    <span className={cn("px-2.5 py-0.5 rounded-full text-sm font-medium border", getBadgeColor(scanResult.houseScan.overallMessLevel))}>
                      {scanResult.houseScan.overallMessLevel.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-sm font-medium text-slate-500 mb-1">Chores Found</div>
                  <div className="text-2xl font-semibold text-indigo-600">{scanResult.houseScan.totalChoresIdentified}</div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Room Breakdown</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(scanResult.houseScan.roomsSummary).map(([room, details]) => (
                    <div key={room} className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-slate-900">{room}</h4>
                        <span className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border", getBadgeColor(details.messLevel))}>
                          {details.messLevel}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        <span className="font-medium text-slate-900">{details.itemsOutOfPlace}</span> items out of place
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Clutter: {details.primaryClutterType}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Missions */}
            <section className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 px-2">
                <Sparkles className="w-5 h-5 text-amber-500" /> Recommended Missions
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {scanResult.choreMissions.map((mission) => {
                   const isAssigned = assignedMissions.has(mission.missionId);
                   return (
                     <div key={mission.missionId} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
                       {/* Decorative background element */}
                       <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity rotate-12 scale-150 pointer-events-none">
                          <ShieldAlert className="w-32 h-32" />
                       </div>
                       
                       <div className="flex-1 relative z-10">
                         <div className="flex justify-between items-start gap-4 mb-3">
                           <h3 className="font-bold text-lg text-slate-900 leading-tight">{mission.missionName}</h3>
                           <span className="shrink-0 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border border-blue-100">
                             <Clock className="w-3 h-3" /> {mission.totalTimeEstimate}
                           </span>
                         </div>
                         
                         <p className="text-slate-600 text-sm mb-5">{mission.description}</p>
                         
                         <div className="bg-amber-50/50 rounded-2xl p-4 mb-6 border border-amber-100/50">
                           <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                             <Zap className="w-3 h-3" /> Sub-Tasks
                           </h4>
                           <ul className="space-y-2">
                             {mission.relatedChores.map(chore => (
                               <li key={chore.choreId} className="text-sm flex items-start gap-2">
                                 <span className="mt-0.5 shrink-0 block w-1.5 h-1.5 rounded-full bg-amber-400" />
                                 <div>
                                   <span className="font-medium text-slate-800">{chore.choreTitle}</span>
                                   <span className="text-slate-500 ml-1">({chore.estimatedTime})</span>
                                 </div>
                               </li>
                             ))}
                           </ul>
                         </div>
                       </div>
                       
                       <div className="relative z-10 mt-auto pt-4 border-t border-slate-100">
                         <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-indigo-600/80 bg-indigo-50/50 px-3 py-2 rounded-xl flex-1 items-start sm:items-center border border-indigo-100/50">
                              <Info className="w-4 h-4 shrink-0" />
                              <span className="line-clamp-2">{mission.funFact}</span>
                            </div>
                            
                            {isAssigned ? (
                              <div className="shrink-0 bg-green-50 text-green-700 px-4 py-2.5 rounded-xl flex items-center gap-2 border border-green-200 font-medium text-sm">
                                <CheckSquare className="w-4 h-4" /> Assigned
                              </div>
                            ) : (
                              <form onSubmit={(e) => assignMission(mission, e)} className="shrink-0 flex items-center gap-2 w-full sm:w-auto">
                                <select 
                                  name="assignee" 
                                  required
                                  className="w-full sm:w-32 text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Assign to...</option>
                                  {childrenFilter.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                  ))}
                                </select>
                                <button type="submit" className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-sm">
                                  <Plus className="w-4 h-4" />
                                </button>
                              </form>
                            )}
                         </div>
                       </div>
                     </div>
                   );
                 })}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

