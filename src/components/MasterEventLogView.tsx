import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useGame } from '../contexts/GameContext';
import { EventLog } from '../types';
import { History, Activity, MessageSquare, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';

export const MasterEventLogView: React.FC = () => {
    const [logs, setLogs] = useState<EventLog[]>([]);
    const { allStudents } = useGame();

    useEffect(() => {
        // We use onSnapshot for real-time monitoring of all logs
        const q = query(collection(db, 'event_logs'));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as EventLog));
            data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
            setLogs(data);
        });
        return () => unsub();
    }, []);

    const getUserName = (uid: string) => {
        const student = allStudents.find(s => s.uid === uid);
        return student ? student.name : 'Unknown';
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 h-full flex flex-col">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 mb-4 shrink-0">
                <History size={16} className="text-indigo-600" /> 실시간 로그 스트림
            </h3>
            
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-2">
                {logs.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">기록이 없습니다.</div>
                ) : (
                    logs.map(log => {
                        const time = new Date(log.createdAt?.toMillis?.() || Date.now());
                        let desc = log.description || log.descriptionMasked || '';
                        
                        let Icon = Activity;
                        let color = "text-indigo-500";
                        let bg = "bg-indigo-50";
                        
                        if (log.type === 'stat_change') { color = "text-blue-500"; bg = "bg-blue-50"; }
                        if (log.type === 'relation_change') { Icon = MessageSquare; color = "text-pink-500"; bg = "bg-pink-50"; }
                        if (log.type === 'vote') { Icon = ShieldAlert; color = "text-amber-500"; bg = "bg-amber-50"; }

                        return (
                            <div key={log.id} className="flex gap-3 text-sm">
                                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5", bg, color)}>
                                    <Icon size={10} strokeWidth={3} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-bold text-slate-800 text-xs truncate max-w-[100px]">{getUserName(log.uid)}</span>
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded font-mono">L{log.loopIndex}</span>
                                        <span className="text-[10px] text-slate-400 font-mono tracking-tighter shrink-0">{time.toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-[13px] text-slate-600 leading-snug break-words">
                                        {desc}
                                    </p>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    );
};
