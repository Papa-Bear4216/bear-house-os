'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { MapContainer, ImageOverlay, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useFamilyMembers } from '@/hooks/use-family';
import { useTasks } from '@/hooks/use-tasks';
import { UploadCloud, CheckCircle2, MapPin, Loader2 } from 'lucide-react';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, storage, isPlaceholder, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const FLOORPLAN_STORAGE_PATH = 'floorplan/current';
const FLOORPLAN_LS_KEY = 'bearhouse_floorplan_url';
const DEFAULT_FLOORPLAN = '/floorplan.png';

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

function FloorPlanOverlay({ url, bounds }: { url: string; bounds: L.LatLngBoundsExpression }) {
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
  const [floorPlanUrl, setFloorPlanUrl] = useState<string>(DEFAULT_FLOORPLAN);
  const [imgBounds, setImgBounds] = useState<L.LatLngBoundsExpression | null>(null);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Load floor plan URL from Firestore, fall back to localStorage cache
  useEffect(() => {
    const loadFloorPlan = async () => {
      if (isPlaceholder) {
        const cached = localStorage.getItem(FLOORPLAN_LS_KEY);
        if (cached) setFloorPlanUrl(cached);
        return;
      }
      try {
        const docRef = doc(db, 'households', 'shared', 'config', 'floorplan');
        const snap = await getDoc(docRef);
        const url = snap.data()?.floorPlanUrl as string | undefined;
        if (url) {
          setFloorPlanUrl(url);
          localStorage.setItem(FLOORPLAN_LS_KEY, url);
        } else {
          const cached = localStorage.getItem(FLOORPLAN_LS_KEY);
          setFloorPlanUrl(cached || DEFAULT_FLOORPLAN);
        }
      } catch {
        const cached = localStorage.getItem(FLOORPLAN_LS_KEY);
        setFloorPlanUrl(cached || DEFAULT_FLOORPLAN);
      }
    };
    if (user || isPlaceholder) loadFloorPlan();
  }, [user]);

  // Compute image bounds when URL changes
  useEffect(() => {
    if (!floorPlanUrl) { setImgBounds(null); return; }
    const img = new window.Image();
    img.onload = () => setImgBounds([[0, 0], [img.height, img.width]]);
    img.src = floorPlanUrl;
  }, [floorPlanUrl]);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      if (isPlaceholder) {
        // Local-only mode: use object URL (session only)
        const url = URL.createObjectURL(file);
        setFloorPlanUrl(url);
        localStorage.setItem(FLOORPLAN_LS_KEY, url);
        return;
      }
      const sRef = storageRef(storage, FLOORPLAN_STORAGE_PATH);
      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);
      const docRef = doc(db, 'households', 'shared', 'config', 'floorplan');
      await setDoc(docRef, { floorPlanUrl: url }, { merge: true });
      setFloorPlanUrl(url);
      localStorage.setItem(FLOORPLAN_LS_KEY, url);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleRemove = useCallback(async () => {
    setFloorPlanUrl(DEFAULT_FLOORPLAN);
    setImgBounds(null);
    localStorage.removeItem(FLOORPLAN_LS_KEY);
    if (isPlaceholder) return;
    try {
      const docRef = doc(db, 'households', 'shared', 'config', 'floorplan');
      await setDoc(docRef, { floorPlanUrl: '' }, { merge: true });
      await deleteObject(storageRef(storage, FLOORPLAN_STORAGE_PATH));
    } catch {}
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const tasksWithCoords = tasks.filter(t => t.status !== 'done' && t.completed !== true);

  if (!floorPlanUrl || !imgBounds) {
    return (
      <div className="w-full h-full min-h-[500px] bg-slate-100 rounded-3xl overflow-hidden border-4 border-slate-900 border-dashed flex flex-col items-center justify-center p-8 text-center bg-[#cbd5e1]">
        <div className="w-24 h-24 bg-white rounded-full border-4 border-slate-900 shadow-[8px_8px_0_#1e293b] flex items-center justify-center mb-6">
          {uploading
            ? <Loader2 className="w-10 h-10 text-slate-900 animate-spin" />
            : <UploadCloud className="w-10 h-10 text-slate-900 stroke-[3]" />}
        </div>
        <h3 className="font-display text-2xl font-black uppercase text-slate-900 tracking-tighter mb-2">Upload Home Floorplan</h3>
        <p className="text-slate-700 font-bold mb-8 max-w-md">Upload your home&apos;s floor plan to map out chores and storage locations visually.</p>
        <label
          className="cursor-pointer font-black uppercase tracking-wider text-white bg-[#be185d] px-8 py-4 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0_#1e293b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:scale-95 text-lg"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFileUpload(file);
          }}
        >
          {uploading ? 'Uploading…' : 'Select or Drag Image Here'}
          <input type="file" accept="image/*" className="hidden" onChange={onInputChange} disabled={uploading} />
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
          <FloorPlanOverlay url={floorPlanUrl} bounds={imgBounds} />
          {tasksWithCoords.map((task) => {
            const u = users.find(x => x.id === task.assigneeId);
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
                        <Image src={u.avatarUrl} width={24} height={24} className="w-6 h-6 rounded-full border border-slate-300" referrerPolicy="no-referrer" alt={u.name} />
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
            );
          })}
        </MapContainer>
        <button
          onClick={handleRemove}
          className="absolute bottom-4 right-4 z-[400] bg-white border-2 border-slate-900 shadow-[4px_4px_0_#1e293b] px-4 py-2 rounded-xl text-xs font-black uppercase text-slate-900 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        >
          Change Map
        </button>
      </div>
    </div>
  );
}
