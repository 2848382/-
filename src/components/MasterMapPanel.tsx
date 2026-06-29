import React, { useState, useEffect } from "react";
import { ALL_MAP_AREAS } from "../constants/mapData";
import { db } from "../lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { RoomStatus } from "./SchoolMap/IsoRoom";
import { useGame } from "../contexts/GameContext";
import { MapPin, Users } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";

export const MasterMapPanel: React.FC = () => {
  const { allStudents } = useGame();
  const [selectedBuilding, setSelectedBuilding] = useState<string>("본관");
  const [selectedFloor, setSelectedFloor] = useState<string>("1층");
  
  const [roomStatuses, setRoomStatuses] = useState<Record<string, RoomStatus>>({});

  useEffect(() => {
    const q = query(collection(db, 'room_status'));
    const unsub = onSnapshot(q, (snap) => {
        const data: Record<string, RoomStatus> = {};
        snap.forEach(d => {
            data[d.id] = d.data() as RoomStatus;
        });
        setRoomStatuses(data);
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'room_status'));
    return () => unsub();
  }, []);

  const handleStateChange = async (roomId: string, newState: string) => {
    const ref = doc(db, 'room_status', roomId);
    try {
        await setDoc(ref, { state: newState, updatedAt: serverTimestamp() }, { merge: true });
    } catch(e) {
        handleFirestoreError(e, OperationType.UPDATE, `room_status/${roomId}`);
    }
  };

  const handleNoteChange = async (roomId: string, newNote: string) => {
    const ref = doc(db, 'room_status', roomId);
    try {
        await setDoc(ref, { note: newNote, updatedAt: serverTimestamp() }, { merge: true });
    } catch(e) {
        handleFirestoreError(e, OperationType.UPDATE, `room_status/${roomId}`);
    }
  };

  const currentAreas = ALL_MAP_AREAS.filter(a => a.building === selectedBuilding && a.floor === selectedFloor);

  // 현재 접속중인 플레이어 요약
  const playersWithLocation = allStudents.map(p => {
    const locId = p.lastCheckIn?.locationId;
    const area = ALL_MAP_AREAS.find(a => a.id === locId);
    return { name: p.name, location: area ? `${area.building} ${area.floor} ${area.name}` : '알 수 없음' };
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
          <MapPin className="text-indigo-500" />
          방 상태 실시간 관리
        </h3>

        <div className="flex gap-4 mb-6">
          <select value={selectedBuilding} onChange={e => setSelectedBuilding(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-sm">
            {["본관", "별관", "기숙사"].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={selectedFloor} onChange={e => setSelectedFloor(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-sm">
            {["4층", "3층", "2층", "1층", "B1"].map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div className="space-y-3">
          {currentAreas.map(area => {
            const status = roomStatuses[area.id];
            const presentCount = status?.presentPlayers?.length || 0;

            return (
              <div key={area.id} className="flex flex-col md:flex-row gap-4 items-start md:items-center p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-200 transition-colors">
                <div className="w-48 shrink-0">
                  <div className="font-bold text-sm text-slate-800">{area.name}</div>
                  <div className="text-[10px] text-slate-500">{area.id}</div>
                  <div className="text-[10px] text-blue-600 font-bold flex items-center gap-1 mt-1">
                    <Users size={10} /> {presentCount}명 위치함
                  </div>
                </div>

                <div className="flex-1 flex gap-2 w-full">
                  <select 
                    value={status?.state || 'normal'}
                    onChange={e => handleStateChange(area.id, e.target.value)}
                    className="shrink-0 bg-white border border-slate-200 rounded p-1.5 text-xs font-bold w-24"
                  >
                    <option value="normal">Normal</option>
                    <option value="locked">Locked</option>
                    <option value="danger">Danger</option>
                    <option value="event">Event</option>
                    <option value="hidden">Hidden</option>
                  </select>

                  <input 
                    type="text" 
                    placeholder="마스터 메모 (플레이어 미노출)" 
                    value={status?.note || ''}
                    onChange={e => handleNoteChange(area.id, e.target.value)}
                    className="flex-1 min-w-0 bg-white border border-slate-200 rounded p-1.5 text-xs"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
         <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">전체 플레이어 현재 위치 요약</h3>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {playersWithLocation.map((p, i) => (
               <div key={i} className="p-2 bg-slate-50 rounded border border-slate-100 text-xs text-slate-700">
                  <span className="font-bold">{p.name}</span>
                  <div className="text-slate-500 text-[10px] truncate">{p.location}</div>
               </div>
            ))}
         </div>
      </div>
    </div>
  )
}
