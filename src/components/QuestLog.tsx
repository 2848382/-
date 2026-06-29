import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Clock, Star, Coins, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { updateDoc, doc, increment, collection, query, where, onSnapshot, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Quest } from '../types';

export const QuestLog: React.FC = () => {
  const { user, profile } = useGame();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeReward, setActiveReward] = useState<{ id: string, exp: number, won: number } | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const q = query(
      collection(db, 'system', 'data', 'quests'), 
      where('isActive', '==', true)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quest));
      setQuests(fetched.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
      setLoading(false);
    }, (err) => {
      console.error("Quest fetch error:", err);
      setError("데이터 로딩 실패");
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const completeQuest = async (quest: Quest) => {
    if (!user || !profile) return;
    
    // Check if already completed
    if (profile.completedQuests?.includes(quest.id)) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "이미 완료된 미션입니다.", type: "warning" } }));
      return;
    }

    if (profile.isCardFrozen) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "IC 카드가 정지되어 보상을 수령할 수 없습니다.", type: "error" } }));
      return;
    }

    try {
      // Animate
      setActiveReward({ id: quest.id, exp: quest.rewardStamina, won: quest.rewardWon });
      
      // Update DB
      await updateDoc(doc(db, 'users', user.uid), {
        stamina: Math.min(100, (profile.stamina || 0) + quest.rewardStamina),
        balance: increment(quest.rewardWon),
        completedQuests: arrayUnion(quest.id),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Quest completion error:", err);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "보상 수령 중 오류가 발생했습니다.", type: "error" } }));
    }
  };

  if (loading) {
    return (
      <div className="modern-card p-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-mw-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">미션 데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modern-card p-10 flex flex-col items-center justify-center space-y-4">
        <AlertCircle size={32} className="text-red-500" />
        <p className="text-xs font-bold text-red-500 uppercase tracking-widest">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full relative">
      <div className="flex justify-between items-start mb-6 md:mb-8">
        <div>
          <h3 className="text-heading text-[var(--color-primary-900)]">
            일일 퀘스트 / 일정 로그
          </h3>
          <p className="text-micro text-[var(--color-neutral-400)]">
            Schedule & Objectives
          </p>
        </div>
      </div>

      <div className="space-y-4 relative min-h-[200px]">
        {quests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[var(--color-neutral-50)] rounded-3xl border-2 border-dashed border-[var(--color-neutral-200)]">
            <AlertCircle size={40} className="text-[var(--color-neutral-300)] mb-4" />
            <p className="text-micro text-[var(--color-neutral-400)]">발행된 미션이 없습니다</p>
          </div>
        ) : quests.map((quest) => {
          const isCompleted = profile?.completedQuests?.includes(quest.id);
          
          return (
            <div 
              key={quest.id}
              className={cn(
                "p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                isCompleted ? "bg-[var(--color-neutral-50)] border-[var(--color-neutral-100)] opacity-70" : "bg-white border-[var(--color-border)] shadow-sm hover:border-[var(--color-primary-500)] hover:shadow-md"
              )}
            >
              <div className="flex items-start gap-4">
                 <div className={cn(
                   "p-2 rounded-xl mt-0.5",
                   "bg-[var(--color-primary-50)] text-[var(--color-primary-600)]"
                 )}>
                   <Clock size={20} />
                 </div>
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-micro px-2 py-0.5 rounded-full border",
                        "border-[var(--color-primary-200)] text-[var(--color-primary-600)] bg-[var(--color-primary-50)]"
                      )}>
                        MISSION
                      </span>
                      <span className="text-micro text-[var(--color-neutral-400)]">
                        {quest.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h4 className={cn("text-base font-bold text-[var(--color-primary-900)] mb-1", isCompleted && "line-through text-[var(--color-neutral-400)]")}>
                      {quest.title}
                    </h4>
                    <p className="text-xs font-medium text-[var(--color-neutral-500)] line-clamp-1">{quest.description}</p>
                 </div>
              </div>

              <div className="flex items-center gap-4 sm:border-l sm:border-[var(--color-border)] sm:pl-4">
                 <div className="flex flex-col gap-1 min-w-[80px]">
                   <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-stamina)]">
                      <Star size={14} /> +{quest.rewardStamina} EXP
                   </div>
                   <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary-600)]">
                      <Coins size={14} /> +{quest.rewardWon} 원
                   </div>
                 </div>
                 
                 <button 
                   onClick={() => completeQuest(quest)}
                   disabled={isCompleted}
                   className={cn(
                     "w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0",
                     isCompleted ? "bg-[var(--color-success)] text-white shadow-md shadow-[var(--color-success)]/40" : "bg-[var(--color-primary-900)] text-white hover:opacity-90"
                   )}
                 >
                   {isCompleted ? <CheckCircle size={20} /> : <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" style={{ animationDuration: '3s' }} />}
                 </button>
              </div>

              {/* Animation overlay */}
              <AnimatePresence>
                 {activeReward?.id === quest.id && (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.8, y: 10 }}
                     animate={{ opacity: 1, scale: 1, y: -40 }}
                     exit={{ opacity: 0, scale: 1.2, y: -80 }}
                     onAnimationComplete={() => setActiveReward(null)}
                     className="absolute right-16 top-0 pointer-events-none flex flex-col items-center gap-1 z-10"
                   >
                      <span className="text-sm font-black text-[var(--color-stamina)] bg-orange-50 px-3 py-1 rounded-full shadow-lg border border-orange-100">+ {activeReward.exp} EXP</span>
                      <span className="text-sm font-black text-[var(--color-primary-600)] bg-[var(--color-primary-50)] px-3 py-1 rounded-full shadow-lg border border-[var(--color-primary-200)]">+ {activeReward.won} 원</span>
                   </motion.div>
                 )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
