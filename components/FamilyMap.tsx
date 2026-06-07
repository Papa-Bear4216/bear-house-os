'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { MapContainer, ImageOverlay, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useFamilyMembers } from '@/hooks/use-family';
import { useTasks } from '@/hooks/use-tasks';
import { useLocalStorage } from 'react-use';
import { UploadCloud, CheckCircle2, MapPin } from 'lucide-react';

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function FloorPlanOverlay({ url, bounds }: { url: string, bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [20, 20] });
    map.setMaxBounds(bounds instanceof L.LatLngBounds ? bounds : L.latLngBounds(bounds));
  }, [map, bounds]);
  return <ImageOverlay url={url} bounds={bounds} />;
}

export default function FamilyMap() {
  const { users } = useFamilyMembers();
  const { tasks, updateTaskStatus } = useTasks();
  const [floorPlanData, setFloorPlanData, removeFloorPlanData] = useLocalStorage<string>('bearhouse_floorplan', '');
  
  const [imgBounds, setImgBounds] = useState<L.LatLngBoundsExpression | null>(null);

  useEffect(() => {
    if (floorPlanData) {
      const img = new window.Image();
      img.onload = () => {
        // use an arbitrary scale, say 1px = 1 map unit for CRS.Simple
        const w = img.width;
        const h = img.height;
        // Leaflet CRS.Simple coords are [y, x]
        // Southwest corner, Northeast corner
        setImgBounds([[0, 0], [h, w]]);
      };
      img.src = floorPlanData;
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImgBounds(null);
    }
  }, [floorPlanData]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFloorPlanData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const tasksWithCoords = tasks.filter(t => t.status !== 'done' && t.completed !== true);

  if (!floorPlanData || !imgBounds) {
    return (
      <div className="w-full h-full min-h-[500px] bg-slate-100 rounded-3xl overflow-hidden border-4 border-slate-900 border-dashed flex flex-col items-center justify-center p-8 text-center bg-[#cbd5e1]">
        <div className="w-24 h-24 bg-white rounded-full border-4 border-slate-900 shadow-[8px_8px_0_#1e293b] flex items-center justify-center mb-6">
          <UploadCloud className="w-10 h-10 text-slate-900 stroke-[3]" />
        </div>
        <h3 className="font-display text-2xl font-black uppercase text-slate-900 tracking-tighter mb-2">Upload Home Floorplan</h3>
        <p className="text-slate-700 font-bold mb-8 max-w-md">Upload your home&apos;s floor plan to map out chores and storage locations visually.</p>
        
        <label 
          className="cursor-pointer font-black uppercase tracking-wider text-white bg-[#be185d] px-8 py-4 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:scale-95 text-lg"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onloadend = () => {
                setFloorPlanData(reader.result as string);
              };
              reader.readAsDataURL(file);
            }
          }}
        >
          Select or Drag Image Here
          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[600px] bg-slate-200 rounded-[2rem] overflow-hidden border-4 border-slate-900 shadow-[8px_8px_0_#1e293b] relative z-0 flex">
      <div className="flex-1 relative">
        <MapContainer
          crs={L.CRS.Simple}
          bounds={imgBounds as L.LatLngBoundsExpression}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          className="bg-[#cbd5e1]"
        >
          <FloorPlanOverlay url={floorPlanData} bounds={imgBounds} />
          
          {/* We randomly scatter chores on the map for now since we don't know the exact polygons. 
              In a full version, we'd map "Primary Toy Bin" to specific [y,x] coords! */}
          {tasksWithCoords.map((task, i) => {
             const u = users.find(x => x.id === task.assigneeId);
             
             // Pseudo-random deterministic placement based on task ID
             const hash = task.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
             const yMax = (imgBounds as number[][])[1][0];
             const xMax = (imgBounds as number[][])[1][1];
             const yLoc = (hash % 80 + 10) / 100 * yMax; 
             const xLoc = ((hash * 3) % 80 + 10) / 100 * xMax;

             return (
               <Marker key={task.id} position={[yLoc, xLoc]}>
                 <Popup>
                   <div className="font-bold text-slate-800 text-lg mb-1">{task.title}</div>
                   <div className="text-xs text-slate-600 font-medium mb-3 flex items-center gap-1">
                     <MapPin className="w-3 h-3" /> {task.properStorage || 'Unsorted'}
                   </div>
                   
                   {u && (
                     <div className="flex items-center gap-2 mb-3 bg-slate-100 p-2 rounded-lg border border-slate-200">
                       {u.avatarUrl ? (
                         <Image src={u.avatarUrl} width={24} height={24} className="w-6 h-6 rounded-full border border-slate-300" referrerPolicy="no-referrer" alt={u.name}/>
                       ) : (
                         <div className={`w-6 h-6 rounded-full ${u.color} border border-slate-300`}></div>
                       )}
                       <span className="text-sm font-semibold">{u.name}</span>
                     </div>
                   )}
                   
                   <button 
                     onClick={() => updateTaskStatus(task.id, 'done')}
                     className="w-full py-1.5 bg-emerald-500 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-1 hover:bg-emerald-600 transition-colors"
                   >
                     <CheckCircle2 className="w-4 h-4" /> Mark Done
                   </button>
                 </Popup>
               </Marker>
             )
          })}
        </MapContainer>
        
        <button 
           onClick={() => removeFloorPlanData()}
           className="absolute bottom-4 right-4 z-[400] bg-white border-2 border-slate-900 shadow-[4px_4px_0_#1e293b] px-4 py-2 rounded-xl text-xs font-black uppercase text-slate-900 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        >
          Change Map
        </button>
      </div>
    </div>
  );
}
