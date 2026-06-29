import React, { useState, useEffect, useRef } from "react";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, AlertTriangle, MonitorPlay, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from "../../lib/utils";
import { useGame } from "../../contexts/GameContext";
import { IsoGrid } from './IsoGrid';
import { MapDetailPanel } from './MapDetailPanel';
import { StorePopup } from './StorePopup';
import { MAP_DATA, ALL_MAP_AREAS } from '../../constants/mapData';
import { collection, onSnapshot, query, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { RoomStatus } from "./IsoRoom";
import { handleFirestoreError, OperationType } from "../../lib/firestoreErrorHandler";

export const SchoolMap: React.FC = () => {
    const { profile, allStudents, checkIn } = useGame();
    const currentLoop = profile?.loops || 0;
    
    // [신규] 오늘 체크인한 방 ID 계산
    const visitedRoomIds = React.useMemo(() => {
      const ids: string[] = [];
      if (profile?.lastCheckIn?.locationId) {
        const lastAt = profile?.lastCheckIn?.at?.toDate?.();
        if (lastAt) {
          const today = new Date();
          const isSameDay =
            lastAt.getFullYear() === today.getFullYear() &&
            lastAt.getMonth() === today.getMonth() &&
            lastAt.getDate() === today.getDate();
          if (isSameDay) ids.push(profile.lastCheckIn.locationId);
        }
      }
      if (profile?.checkInHistory) {
        const currentLoop = profile.loops ?? 0;
        profile.checkInHistory
          .filter(h => h.loopIndex === currentLoop)
          .forEach(h => {
            if (!ids.includes(h.locationId)) ids.push(h.locationId);
          });
      }
      return ids;
    }, [profile?.lastCheckIn, profile?.checkInHistory, profile?.loops]);
    
    const [activeTab, setActiveTab] = useState<string>("본관");
    const [activeFloor, setActiveFloor] = useState<string>("1층");
    const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
    const [hoveredAreaId, setHoveredAreaId] = useState<string | null>(null);
    const [storePopup, setStorePopup] = useState<{type: 'store'|'vending', id: string} | null>(null);
    const transformRef = useRef<ReactZoomPanPinchRef>(null);
    
    // Real-time room status
    const [roomStatuses, setRoomStatuses] = useState<Record<string, RoomStatus>>({});
    
    // Fetch real-time statuses
    useEffect(() => {
        const q = query(collection(db, 'room_status'));
        const unsub = onSnapshot(q, (snap) => {
            const data: Record<string, RoomStatus> = {};
            snap.forEach(doc => {
                data[doc.id] = doc.data() as RoomStatus;
            });
            setRoomStatuses(data);
        }, (e) => handleFirestoreError(e, OperationType.LIST, 'room_status'));
        return () => unsub();
    }, []);

    // Also we need clues that have category 'place'
    const [clueNodes, setClueNodes] = useState<any[]>([]);
    useEffect(() => {
        // Just fetch clue nodes once to show on map (or use real-time if needed, but simple fetch is okay)
        // If there's a clues collection, fetch. Normally handled in ClueBoard.
        getDocs(collection(db, 'clues')).then(snap => {
            const clues = snap.docs.map(d => ({id: d.id, ...d.data()}));
            setClueNodes(clues);
        }).catch(() => {});
    }, []);

    const selectedArea = ALL_MAP_AREAS.find(a => a.id === selectedAreaId);

    const getFloors = (tab: string) => {
        if (tab === "본관") return ["4층", "3층", "2층", "1층"];
        if (tab === "별관") return ["3층", "2층", "1층", "B1"];
        return ["3층", "2층", "1층"]; // 기숙사
    };

    useEffect(() => {
        const floors = getFloors(activeTab);
        setActiveFloor(floors[floors.length - 1]); // 1층(마지막 항목)으로 리셋
        setSelectedAreaId(null);
        setStorePopup(null);
        if (transformRef.current) {
            setTimeout(() => transformRef.current?.resetTransform(), 50);
        }
    }, [activeTab]);

    return (
        <div 
          className="flex flex-col xl:flex-row bg-[#0e1628] w-full overflow-hidden border-0 xl:border border-[var(--color-border)] xl:rounded-[1.5rem] xl:shadow-sm relative font-sans h-[calc(100dvh-56px-5rem-env(safe-area-inset-bottom))] md:h-[calc(100dvh-56px)]"
        >
          
          {/* Header */}
          <div className="absolute top-0 left-0 w-full z-20 flex flex-col items-center p-4 py-6 pointer-events-none gap-3">
             {/* Building Tabs */}
             <div className="pointer-events-auto flex items-center justify-center bg-[rgba(255,255,255,0.08)] backdrop-blur-md p-1 rounded-full border border-[rgba(255,255,255,0.12)] gap-1">
               {["본관", "별관", "기숙사"].map((tab) => (
                 <button
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   className={cn(
                     "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                     activeTab === tab
                       ? "bg-white text-[var(--color-blue-900)] shadow-sm"
                       : "text-white/60 hover:text-white"
                   )}
                 >
                   {tab}
                 </button>
               ))}
             </div>
             
             {/* Floor Tabs */}
             <div className="pointer-events-auto flex items-center justify-center bg-[rgba(255,255,255,0.08)] backdrop-blur-md p-1 rounded-full border border-[rgba(255,255,255,0.12)] gap-1">
                 {getFloors(activeTab).map(floor => (
                   <motion.button
                     key={floor}
                     onClick={() => setActiveFloor(floor)}
                     whileTap={{ scale: 0.93 }}
                     className={cn(
                       "px-4 py-1.5 rounded-full text-xs font-bold transition-colors duration-150 uppercase",
                       activeFloor === floor 
                         ? "bg-white text-[var(--color-navy-900)] shadow-sm" 
                         : "text-white/60 hover:text-white/90"
                     )}
                   >
                     {floor.replace("층", "F")}
                   </motion.button>
                 ))}
             </div>
          </div>

          <div className="flex-1 relative flex w-full h-full bg-[#0e1628]">
            {/* [디자인] ISO 그리드 배경 */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.4 }}>
              <defs>
                <pattern id="isoGrid" x="0" y="0" width="64" height="32" patternUnits="userSpaceOnUse">
                  {/* ISO 마름모 격자 */}
                  <path
                    d="M 32 0 L 64 16 L 32 32 L 0 16 Z"
                    fill="none"
                    stroke="#c8d4e8"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#isoGrid)" />
            </svg>
            <TransformWrapper
                ref={transformRef}
                initialScale={1.4}
                minScale={0.4}
                maxScale={5}
                centerOnInit={true}
                limitToBounds={false}
                wheel={{ step: 0.08 }}
                pinch={{ step: 3 }}
                doubleClick={{ mode: 'reset' }}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                   <>
                     {/* 줌 컨트롤 (우측 하단) */}
                     <div className="absolute right-3 bottom-4 md:right-8 md:bottom-8 z-20 flex flex-col gap-1.5 pointer-events-auto">
                        {currentLoop >= 3 && (
                            <div className="absolute bottom-[100%] right-0 mb-2 flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 text-red-400 backdrop-blur rounded-lg shadow border border-slate-800 pointer-events-none whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                <span className="text-[10px] font-bold tracking-widest">CCTV SYS.</span>
                            </div>
                        )}
                        <button onClick={() => zoomIn()} className="w-9 h-9 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] backdrop-blur-md border border-[rgba(255,255,255,0.15)] rounded-xl flex items-center justify-center text-white transition-all active:scale-90">
                           <ZoomIn size={16} />
                        </button>
                        <button onClick={() => zoomOut()} className="w-9 h-9 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] backdrop-blur-md border border-[rgba(255,255,255,0.15)] rounded-xl flex items-center justify-center text-white transition-all active:scale-90">
                           <ZoomOut size={16} />
                        </button>
                        <button onClick={() => resetTransform()} className="w-9 h-9 bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] backdrop-blur-md border border-[rgba(255,255,255,0.15)] rounded-xl flex items-center justify-center text-white transition-all active:scale-90">
                           <RefreshCcw size={16} />
                        </button>
                     </div>

                     <div className="flex-1 w-full h-full cursor-grab active:cursor-grabbing">
                        <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%' }}>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={`${activeTab}-${activeFloor}`}
                                    initial={{ opacity: 0, scale: 0.97 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.02 }}
                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                    style={{ width: '100%', height: '100%' }}
                                >
                                    <IsoGrid 
                                       building={activeTab}
                                       floor={activeFloor}
                                       currentLoop={currentLoop}
                                       selectedAreaId={selectedAreaId}
                                       hoveredAreaId={hoveredAreaId}
                                       visitedRoomIds={visitedRoomIds}
                                       roomStatuses={roomStatuses}
                                       allPlayers={allStudents}
                                       clueNodes={clueNodes}
                                       myUid={profile?.uid}
                                       profile={profile}
                                       masterView={profile?.isAdmin}
                                       onAreaSelect={setSelectedAreaId}
                                       onAreaHover={setHoveredAreaId}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </TransformComponent>
                     </div>
                   </>
                )}
            </TransformWrapper>
          </div>

          {/* Map Detail Panel */}
          <MapDetailPanel
            area={selectedArea || null}
            roomStatus={selectedArea ? roomStatuses[selectedArea.id] : undefined}
            currentLoop={currentLoop}
            allPlayers={allStudents}
            clueNodes={clueNodes}
            masterView={profile?.isAdmin}
            onCheckIn={checkIn}
            onOpenStore={(type, id) => setStorePopup({ type, id })}
            onClose={() => setSelectedAreaId(null)}
          />

          {/* Store Popup */}
          {storePopup && (
             <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[340px] z-[9999]">
                 <StorePopup
                    type={storePopup.type}
                    currentLoop={currentLoop}
                    areaId={storePopup.id}
                    onClose={() => setStorePopup(null)}
                 />
             </div>
          )}
        </div>
    );
};

export default SchoolMap;
