'use client';

import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';

const FamilyMap = dynamic(() => import('@/components/FamilyMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] bg-slate-100 rounded-3xl animate-pulse flex items-center justify-center border border-slate-200">
      <div className="text-slate-400 font-medium flex items-center gap-2 flex-col">
         <MapPin className="w-8 h-8 opacity-50" />
         Loading Map...
      </div>
    </div>
  )
});

export default function MapPage() {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 xl:p-12 relative bg-slate-50 h-full">
      <div className="max-w-5xl mx-auto space-y-6 h-full flex flex-col">
        <header>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-900 flex items-center gap-3">
            <MapPin className="w-8 h-8 text-rose-500" />
            Where are you?
          </h1>
          <p className="text-slate-500 mt-2 text-base max-w-2xl">
            Live family location tracking. Make sure location services are enabled on your device.
          </p>
        </header>
        
        <div className="flex-1 min-h-[500px] pb-8 relative z-0">
          <FamilyMap />
        </div>
      </div>
    </div>
  );
}
