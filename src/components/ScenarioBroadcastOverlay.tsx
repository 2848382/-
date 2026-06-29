import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, updateDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useGame } from '../contexts/GameContext';
import { motion, AnimatePresence } from 'motion/react';
import { AlertOctagon } from 'lucide-react';

export const ScenarioBroadcastOverlay: React.FC = () => {
    const { user, profile } = useGame();
    const [eventData, setEventData] = useState<any | null>(null);

    useEffect(() => {
        if (!user || profile?.role === 'admin') return;

        // Fetch active scenarios
        const q = query(
           collection(db, 'scenario_scripts'), 
           where('status', '==', 'active'),
           orderBy('createdAt', 'desc'),
           limit(1)
        );

        const unsub = onSnapshot(q, async (snap) => {
            if (!snap.empty) {
                const docSnap = snap.docs[0];
                const scenario = { id: docSnap.id, ...docSnap.data() };
                
                // Check if user already acknowledged this scenario
                // Simple logic: we store read events inside the local storage or a subcollection.
                // Let's use localStorage to prevent spamming firestore writes for now.
                const key = `scenario_ack_${scenario.id}`;
                if (!localStorage.getItem(key)) {
                    setEventData(scenario);
                } else {
                    setEventData(null);
                }
            } else {
                setEventData(null);
            }
        });

        return () => unsub();
    }, [user, profile]);

    const handleAcknowledge = async () => {
        if (!eventData) return;
        localStorage.setItem(`scenario_ack_${eventData.id}`, 'true');
        
        // Grant rewards if any
        if (eventData.rewardWon || eventData.rewardMEM) {
             const updates: any = {};
             if (eventData.rewardWon && profile) updates.balance = (profile.balance || 0) + eventData.rewardWon;
             if (eventData.rewardMEM && profile) updates.memoryPoints = (profile.memoryPoints || 0) + eventData.rewardMEM;
             
             if (Object.keys(updates).length > 0 && user) {
                 updates.updatedAt = serverTimestamp();
                 await updateDoc(doc(db, 'users', user.uid), updates).catch(console.error);
             }
        }

        setEventData(null);
    };

    return (
        <AnimatePresence>
            {eventData && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="fixed inset-0 z-[9999] bg-red-950/90 backdrop-blur-md flex items-center justify-center p-4"
                >
                   <div className="bg-slate-900 border border-red-500 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative overflow-hidden text-center">
                       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse"></div>
                       
                       <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-2xl mx-auto flex items-center justify-center mb-6">
                           <AlertOctagon size={32} />
                       </div>

                       <h1 className="text-2xl font-bold text-white mb-4 tracking-tight">긴급 시나리오 발동</h1>
                       <h2 className="text-xl font-bold text-red-400 mb-6 font-serif">{eventData.title}</h2>
                       <p className="text-slate-300 whitespace-pre-wrap leading-relaxed mb-8">
                           {eventData.description}
                       </p>

                       {(eventData.rewardWon > 0 || eventData.rewardMEM > 0) && (
                           <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8">
                               <p className="text-xs text-red-400 font-bold mb-2 uppercase tracking-widest">자동 지급 보상</p>
                               <div className="flex justify-center gap-4 text-white font-mono font-bold">
                                  {eventData.rewardWon > 0 && <span>+ {eventData.rewardWon} 원</span>}
                                  {eventData.rewardMEM > 0 && <span>+ {eventData.rewardMEM} MEM</span>}
                               </div>
                           </div>
                       )}

                       <button 
                         onClick={handleAcknowledge}
                         className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-lg transition-colors shadow-lg shadow-red-600/20"
                       >
                           상황 확인 및 진행
                       </button>
                   </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
