import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useGame } from '../contexts/GameContext';
import { EventLog } from '../types';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, Area, AreaChart } from 'recharts';

export const StatHistoryChart: React.FC<{ targetUid?: string }> = ({ targetUid }) => {
  const { user } = useGame();
  const uid = targetUid || user?.uid;
  const [logs, setLogs] = useState<EventLog[]>([]);

  useEffect(() => {
    if (!uid) return;
    const fetchLogs = async () => {
      const q = query(collection(db, 'event_logs'), where('uid', '==', uid));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as EventLog));
      data.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
      setLogs(data);
    };
    fetchLogs();
  }, [uid]);

  const chartData = useMemo(() => {
     let currentStats = { physical: 0, stress: 0, stamina: 0 };
     const points = logs.map((log) => {
        const time = new Date(log.createdAt?.toMillis?.() || Date.now());
        if (log.statSnapshot) {
            currentStats = {
                // merge missing from previous to make a continuous line if needed, 
                // but usually snapshot has current state.
                physical: log.statSnapshot.physical ?? currentStats.physical,
                stress: log.statSnapshot.stress ?? currentStats.stress,
                stamina: log.statSnapshot.stamina ?? currentStats.stamina,
            };
        }
        return {
           time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
           loop: log.loopIndex,
           ...currentStats,
        }
     });

     // Filter out duplicate identical stat points? Recharts handles lines fine.
     return points;
  }, [logs]);

  if (!uid || chartData.length === 0) return null;

  return (
     <div className="w-full h-64 mt-4 bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <h3 className="text-sm font-bold text-slate-800 mb-4">주요 스탯 변화 추이</h3>
        <ResponsiveContainer width="100%" height="80%">
           <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="time" tick={{fontSize: 10}} tickMargin={10} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} width={30} />
              <Tooltip 
                 labelStyle={{fontSize: 10, fontWeight: 'bold'}}
                 contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                 itemStyle={{fontSize: 12, fontWeight: 'bold'}}
              />
              <Legend wrapperStyle={{fontSize: 10}} />
              <Line type="monotone" dataKey="physical" stroke="#3b82f6" strokeWidth={2} dot={false} name="PHY (체력)" />
              <Line type="monotone" dataKey="stress" stroke="#ef4444" strokeWidth={2} dot={false} name="STR (스트레스)" />
              <Line type="monotone" dataKey="stamina" stroke="#10b981" strokeWidth={2} dot={false} name="STM (기력)" />
           </LineChart>
        </ResponsiveContainer>
     </div>
  );
};
