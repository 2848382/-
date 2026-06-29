import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { ActivityLog } from '../../types';
import { Activity, ShieldAlert, Info, AlertTriangle } from 'lucide-react';

export const MasterAnomalyPanel: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'activity_logs'), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(q, snap => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog)));
    });
    return () => unsub();
  }, []);

  const getSeverityIcon = (sev: string) => {
    if (sev === 'danger') return <ShieldAlert size={16} className="text-rose-500" />;
    if (sev === 'warning') return <AlertTriangle size={16} className="text-amber-500" />;
    return <Info size={16} className="text-blue-500" />;
  };

  return (
    <div className="space-y-6">
       <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
         <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
           <Activity className="text-blue-600" />
           활동 기록 및 이상 탐지 (Activity & Anomaly Logs)
         </h3>
         <div className="space-y-3">
           {logs.map((log, idx) => (
             <div key={idx} className={`p-4 border-l-4 rounded-r-xl bg-slate-50 flex items-start gap-3 
               ${log.severity === 'danger' ? 'border-l-rose-500 bg-rose-50/50' : 
                 log.severity === 'warning' ? 'border-l-amber-500 bg-amber-50/50' : 
                 'border-l-blue-500'}`}
             >
               <div className="mt-0.5">{getSeverityIcon(log.severity)}</div>
               <div className="flex-1">
                 <div className="text-sm font-bold text-slate-800">
                   [{log.actionType}] {log.actorName || 'Unknown'} <span className="text-xs text-slate-400 ml-2">UID: {log.actorUid?.slice(0,6)}...</span>
                 </div>
                 <div className="text-sm text-slate-600 mt-1">{log.message}</div>
               </div>
               <div className="text-[10px] text-slate-400">
                 {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : '방금 전'}
               </div>
             </div>
           ))}
         </div>
       </div>
    </div>
  );
};
