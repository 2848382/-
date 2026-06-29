import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useGame } from '../contexts/GameContext';
import { PrivateMission, DualContract } from '../types';
import { Target, CheckCircle, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

export const PrivateMissionView: React.FC = () => {
  const { user, logActivity } = useGame();
  const [missions, setMissions] = useState<PrivateMission[]>([]);
  const [contracts, setContracts] = useState<DualContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    // Private Missions
    const qM = query(
      collection(db, 'private_missions'), 
      where('targetUid', '==', user.uid),
      where('isVisible', '==', true)
    );
    const unsubM = onSnapshot(qM, (snap) => {
      setMissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as PrivateMission)));
    });

    // Dual Contracts (where I am A)
    const qCA = query(collection(db, 'dual_contracts'), where('playerAUid', '==', user.uid));
    const unsubCA = onSnapshot(qCA, (snap) => {
       const aContracts = snap.docs.map(d => ({ id: d.id, ...d.data() } as DualContract));
       // Also need B
       const qCB = query(collection(db, 'dual_contracts'), where('playerBUid', '==', user.uid));
       getDocs(qCB).then(snapB => {
           const bContracts = snapB.docs.map(d => ({ id: d.id, ...d.data() } as DualContract));
           setContracts([...aContracts, ...bContracts]);
           setLoading(false);
       });
    });

    return () => { unsubM(); unsubCA(); };
  }, [user]);

  const handleComplete = async (missionId: string, title: string) => {
    if (!confirm("임무를 완료하셨습니까? 마스터의 확인 후 보상이 지급됩니다.")) return;
    try {
      await updateDoc(doc(db, 'private_missions', missionId), { isCompleted: true });
      // Notify Master
      await addDoc(collection(db, 'event_logs'), {
        uid: user?.uid,
        type: 'mission_complete',
        description: `[임무 보고] ${title} 완료 보고`,
        descriptionMasked: `[특별 과제 완료] (비공개 처리됨)`,
        loopIndex: 1, // Will be accurate if we import systemConfig, but fallback mapping is fine
        createdAt: serverTimestamp()
      }).catch(()=>{});
      
      if (logActivity) {
        await logActivity('MISSION_SUBMIT', `개인 미션 완료 보고: ${title}`, 'info');
      }
    } catch(e) {
      console.error(e);
    }
  };

  if (loading) return <div>로딩중...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%, #fff), linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%, #fff)', backgroundSize: '10px 10px', backgroundPosition: '0 0, 5px 5px' }}/>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
            <Target size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight mb-1">특별 과제</h2>
            <p className="text-xs text-slate-400">당신에게 비밀스럽게 하달된 지시 사항입니다.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {missions.length === 0 && contracts.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-100 font-medium">
             현재 진행 중인 특별 과제가 없습니다.
          </div>
        )}
        
        {/* Private Missions */}
        {missions.map(m => (
          <div key={m.id} className={cn("bg-white border rounded-2xl p-5 shadow-sm relative overflow-hidden", m.isCompleted ? "border-emerald-200" : "border-slate-200")}>
             {m.isCompleted && <div className="absolute right-0 top-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full flex items-start justify-end p-2 text-emerald-600"><CheckCircle size={20}/></div>}
             <h3 className="font-bold text-slate-900 text-lg mb-2 mr-8">{m.title}</h3>
             <p className="text-sm text-slate-600 mb-4 whitespace-pre-wrap leading-relaxed">{m.description}</p>
             
             {m.reward && (
               <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs mb-4">
                 <span className="font-bold text-slate-700 block mb-1">성공 보상</span>
                 <div className="flex gap-3 text-slate-600 font-mono">
                    {m.reward.balance !== undefined && <span>{m.reward.balance > 0 ? '+' : ''}{m.reward.balance} 원</span>}
                    {m.reward.stamina !== undefined && <span>{m.reward.stamina > 0 ? '+' : ''}{m.reward.stamina} STM</span>}
                    {m.reward.memoryPoints !== undefined && <span>{m.reward.memoryPoints > 0 ? '+' : ''}{m.reward.memoryPoints} MEM</span>}
                 </div>
               </div>
             )}

             {!m.isCompleted ? (
               <button onClick={() => handleComplete(m.id, m.title)} className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-bold shadow-md hover:bg-slate-800 transition-colors">
                 목표 달성 보고
               </button>
             ) : (
               <div className="w-full py-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold text-center border border-emerald-100">
                 보고 완료 (대기중)
               </div>
             )}
          </div>
        ))}

        {/* Dual Contracts */}
        {contracts.map(c => {
           const isA = c.playerAUid === user?.uid;
           const myMission = isA ? c.missionA : c.missionB;
           const myReward = isA ? c.rewardA : c.rewardB;
           const isResolved = c.status === 'resolved';

           return (
             <div key={c.id} className={cn("bg-white border rounded-2xl p-5 shadow-sm relative overflow-hidden", isResolved ? "border-slate-200 opacity-70" : "border-rose-200")}>
               {!isResolved && <div className="absolute right-0 top-0 w-16 h-16 bg-rose-500/10 rounded-bl-full flex items-start justify-end p-2 text-rose-600"><Clock size={20} className="animate-pulse"/></div>}
               <div className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-1">이중 체결 계약</div>
               <h3 className="font-bold text-slate-900 text-lg mb-2">상호 이행 조항</h3>
               <p className="text-sm text-slate-800 font-medium mb-4 whitespace-pre-wrap leading-relaxed">{myMission}</p>
               
               {myReward && (
                 <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 text-xs mb-4">
                   <span className="font-bold text-rose-800 block mb-1">이행 보상</span>
                   <div className="flex gap-3 text-rose-700 font-mono font-bold">
                      {myReward.balance !== undefined && <span>{myReward.balance > 0 ? '+' : ''}{myReward.balance} 원</span>}
                      {myReward.stamina !== undefined && <span>{myReward.stamina > 0 ? '+' : ''}{myReward.stamina} STM</span>}
                   </div>
                 </div>
               )}

               <div className="text-[10px] text-slate-400">본 계약 대상자는 이중으로 체결되어 있으며 상대방의 세부 내용은 열람할 수 없습니다.</div>
             </div>
           );
        })}
      </div>
    </div>
  );
};
