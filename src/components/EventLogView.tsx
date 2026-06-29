import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useGame } from '../contexts/GameContext';
import { EventLog } from '../types';
import { History, Activity, MessageSquare, ShieldAlert, MapPin, Eye, RefreshCw } from 'lucide-react';
import { gameTerms } from '../lib/utils';
import { cn } from '../lib/utils';
import { useRandomEvent } from '../hooks/useRandomEvent';

export const EventLogView: React.FC = () => {
  const { user, profile, systemConfig } = useGame();
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLoop, setSelectedLoop] = useState<number | 'all'>('all');
  const [viewMode, setViewMode] = useState<'events'|'checkins'>('events');

  const { rollRandomEvent, isRolling } = useRandomEvent();
  const hasAwakened = profile?.hasAwakened || false;

  const fetchLogs = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const q = query(collection(db, 'event_logs'), where('uid', '==', user.uid));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as EventLog));
      data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setLogs(data);
    } catch (err) {
      console.error("Fetch logs error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleObserve = async () => {
    const result = await rollRandomEvent();
    if (result) {
       fetchLogs(true);
    } else {
       window.dispatchEvent(new CustomEvent('app-toast', { 
         detail: { message: "주변에 특별한 것은 보이지 않습니다.", type: 'info' } 
       }));
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
       <RefreshCw className="animate-spin text-slate-300 mb-4" size={32} />
       <p className="text-sm font-bold text-slate-400">행적 추적 중...</p>
    </div>
  );

  const filteredLogs = selectedLoop === 'all' ? logs : logs.filter(l => l.loopIndex === selectedLoop);
  
  const checkins = (profile?.checkInHistory || []).slice().sort((a, b) => (b.at?.toMillis?.() || 0) - (a.at?.toMillis?.() || 0));
  const filteredCheckins = selectedLoop === 'all' ? checkins : checkins.filter(c => c.loopIndex === selectedLoop);

  const loopsFromEvents = logs.map(l => l.loopIndex).filter(Boolean);
  const loopsFromCheckins = checkins.map(c => c.loopIndex).filter(Boolean);
  const loopSet = new Set([...loopsFromEvents, ...loopsFromCheckins]);
  
  if (systemConfig?.currentLoop) loopSet.add(systemConfig.currentLoop);
  const loops = Array.from(loopSet).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <History size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">활동 기록</h2>
            <p className="text-sm text-slate-500">지금까지의 행적과 변화를 타임라인으로 확인합니다.</p>
          </div>
        </div>

        <button 
           onClick={handleObserve}
           disabled={isRolling || refreshing}
           className={cn(
             "px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm",
             isRolling || refreshing
               ? "bg-slate-100 text-slate-400 cursor-not-allowed"
               : "bg-slate-900 text-white hover:bg-slate-800 active:scale-95"
           )}
        >
           {isRolling ? (
             <RefreshCw size={16} className="animate-spin" />
           ) : (
             <Eye size={16} />
           )}
           {isRolling ? "관찰 중..." : "주변 관찰"}
        </button>
      </div>
      
      <div className="flex bg-slate-100 p-1 rounded-xl">
        <button 
           onClick={() => setViewMode('events')}
           className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-colors", viewMode === 'events' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
        >
           이벤트 로그
        </button>
        <button 
           onClick={() => setViewMode('checkins')}
           className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition-colors", viewMode === 'checkins' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}
        >
           동선 기록 (체크인)
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
         <button 
           onClick={() => setSelectedLoop('all')}
           className={cn("px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-colors border", selectedLoop === 'all' ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}
         >
           전체 보기
         </button>
         {loops.map(lNum => (
           <button 
             key={lNum}
             onClick={() => setSelectedLoop(lNum)}
             className={cn("px-4 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-colors border", selectedLoop === lNum ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}
           >
             {lNum}{gameTerms('loopCount', hasAwakened)}
           </button>
         ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
         {viewMode === 'events' ? (
           filteredLogs.length === 0 ? (
             <div className="text-center py-10 text-slate-400">기록이 존재하지 않습니다.</div>
           ) : (
             <div className="relative border-l-2 border-slate-100 ml-3 md:ml-4 space-y-8 pb-4">
               {filteredLogs.map((log) => {
                 const time = new Date(log.createdAt?.toMillis?.() || Date.now());
                 const desc = hasAwakened ? log.description : (log.descriptionMasked || log.description);
                 
                 let Icon = Activity;
                 let color = "text-indigo-500";
                 let bg = "bg-indigo-50";
                 
                 if (log.type === 'stat_change') { Icon = Activity; color = "text-blue-500"; bg = "bg-blue-50"; }
                 if (log.type === 'relation_change') { Icon = MessageSquare; color = "text-pink-500"; bg = "bg-pink-50"; }
                 if (log.type === 'vote') { Icon = ShieldAlert; color = "text-amber-500"; bg = "bg-amber-50"; }
                 if (log.type === 'action') { Icon = MapPin; color = "text-teal-500"; bg = "bg-teal-50"; }
                 if (log.type === 'random_event') { Icon = Eye; color = "text-purple-600"; bg = "bg-purple-100"; }
                 if (log.type === 'item_get') { Icon = History; color = "text-emerald-500"; bg = "bg-emerald-50"; }

                 return (
                   <div key={log.id} className="relative pl-6 md:pl-8">
                     <div className={cn("absolute -left-[17px] top-0.5 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center", bg, color)}>
                       <Icon size={12} strokeWidth={3} />
                     </div>
                     
                     <div>
                       <div className="flex items-baseline gap-2 mb-1">
                         <span className="text-xs font-bold text-slate-900 border border-slate-200 rounded px-1.5 py-0.5">{log.loopIndex}{gameTerms('loopCount', hasAwakened)}</span>
                         <span className="text-[10px] text-slate-400 font-mono tracking-tighter">{time.toLocaleString()}</span>
                       </div>
                       <p className="text-sm font-medium text-slate-700 leading-snug break-words pr-4">
                         {desc}
                       </p>
                       
                       {log.statSnapshot && (
                         <div className="mt-3 inline-flex bg-slate-50 border border-slate-100 rounded-lg py-1.5 px-3 text-[10px] font-mono text-slate-500 gap-3">
                            {log.statSnapshot.physical !== undefined && <span>PHY:{log.statSnapshot.physical}</span>}
                            {log.statSnapshot.stress !== undefined && <span>STR:{log.statSnapshot.stress}</span>}
                            {log.statSnapshot.stamina !== undefined && <span>STM:{log.statSnapshot.stamina}</span>}
                         </div>
                       )}
                     </div>
                   </div>
                 );
               })}
             </div>
           )
         ) : (
           filteredCheckins.length === 0 ? (
              <div className="text-center py-10 text-slate-400">체크인 기록이 존재하지 않습니다.</div>
           ) : (
             <div className="relative border-l-2 border-slate-100 ml-3 md:ml-4 space-y-8 pb-4">
               {filteredCheckins.map((chk, i) => {
                 const time = new Date(chk.at?.toMillis?.() || Date.now());
                 return (
                   <div key={i} className="relative pl-6 md:pl-8">
                     <div className={cn("absolute -left-[17px] top-0.5 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center bg-teal-50 text-teal-600")}>
                       <MapPin size={12} strokeWidth={3} />
                     </div>
                     <div>
                       <div className="flex items-baseline gap-2 mb-1">
                         <span className="text-xs font-bold text-slate-900 border border-slate-200 rounded px-1.5 py-0.5">{chk.loopIndex}{gameTerms('loopCount', hasAwakened)}</span>
                         <span className="text-[10px] text-slate-400 font-mono tracking-tighter">{time.toLocaleString()}</span>
                       </div>
                       <p className="text-sm font-medium text-slate-700 leading-snug break-words pr-4">
                         <span className="font-bold text-teal-700">{chk.locationName}</span> 도착 확인.
                       </p>
                     </div>
                   </div>
                 );
               })}
             </div>
           )
         )}
      </div>
    </div>
  );
};
