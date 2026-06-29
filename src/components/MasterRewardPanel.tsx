import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RewardRequest, UserProfile } from '../types';
import { Gift, CheckCircle, XCircle } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { useDialog } from '../contexts/DialogContext';

export const MasterRewardPanel: React.FC = () => {
   const [requests, setRequests] = useState<RewardRequest[]>([]);
   const { allStudents, systemConfig } = useGame();
   const { confirm } = useDialog();

   useEffect(() => {
     // No composite index so sort local
     const q = query(collection(db, 'reward_requests'));
     const unsub = onSnapshot(q, snap => {
       const data = snap.docs.map(d => ({id: d.id, ...d.data()} as RewardRequest));
       data.sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
       setRequests(data);
     });
     return () => unsub();
   }, []);

   const handleResolve = async (req: RewardRequest, approved: boolean) => {
     if(!(await confirm({ title: approved ? '승인 확인' : '거절 확인', message: approved ? "승인하시겠습니까?" : "거절하시겠습니까?" }))) return;
     try {
       await updateDoc(doc(db, 'reward_requests', req.id), {
          status: approved ? 'approved' : 'rejected',
          resolvedAt: serverTimestamp()
       });

       if (approved) {
          const userObj = allStudents.find(s=>s.uid === req.requesterId);
          if(req.type === 'stat' && req.statChanges && userObj) {
            let updateTarget: any = {};
            let logMsg = [];
            for (const [key, val] of Object.entries(req.statChanges)) {
               const numVal = parseInt(val as any);
               if(numVal !== 0 && (userObj as any)[key] !== undefined) {
                  updateTarget[key] = (userObj as any)[key] + Math.max(-50, Math.min(50, numVal));
                  logMsg.push(`${key}: ${numVal>0?'+':''}${numVal}`);
               }
            }
            if(Object.keys(updateTarget).length > 0) {
               updateTarget.updatedAt = serverTimestamp();
               await updateDoc(doc(db, 'users', req.requesterId), updateTarget);
               await addDoc(collection(db, 'event_logs'), {
                 uid: req.requesterId,
                 type: 'stat_change',
                 description: `보상 승인됨 (스탯 변경: ${logMsg.join(', ')})`,
                 descriptionMasked: `보상 승인됨 (${logMsg.length}개 항목 확인)`,
                 loopIndex: systemConfig?.currentLoop || 1,
                 createdAt: serverTimestamp()
               });
            }
          } else if (req.type === 'item' && req.itemName && userObj) {
            const newInv = [...(userObj.inventory || []), req.itemName];
            await updateDoc(doc(db, 'users', req.requesterId), { inventory: newInv, updatedAt: serverTimestamp() });
            await addDoc(collection(db, 'event_logs'), {
                 uid: req.requesterId,
                 type: 'item_get',
                 description: `보상 승인됨 (아이템 획득: ${req.itemName})`,
                 descriptionMasked: `보상 승인됨 (물품 수령)`,
                 loopIndex: systemConfig?.currentLoop || 1,
                 createdAt: serverTimestamp()
               });
          }
       }
     } catch(e) {
       console.error(e);
       alert("에러 발생");
     }
   };

   return (
     <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 mb-4">
           <Gift size={16} className="text-blue-500"/> 학생 보상 신청 승인 (마스터봇 판정)
        </h3>
        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
           {requests.length === 0 ? <p className="text-sm text-slate-400">신청 내역이 없습니다.</p> :
             requests.map(r => (
               <div key={r.id} className="p-4 border border-slate-100 bg-slate-50 rounded-xl">
                 <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{r.requesterName}</div>
                      <div className="text-[10px] text-slate-400">{new Date(r.createdAt?.toMillis?.() || Date.now()).toLocaleString()}</div>
                    </div>
                    {r.status === 'pending' ? (
                       <div className="flex gap-2">
                          <button onClick={() => handleResolve(r, true)} className="p-1 text-emerald-600 hover:bg-emerald-100 rounded" title="승인"><CheckCircle size={16}/></button>
                          <button onClick={() => handleResolve(r, false)} className="p-1 text-rose-600 hover:bg-rose-100 rounded" title="거절"><XCircle size={16}/></button>
                       </div>
                    ) : (
                       <span className={`text-[10px] font-bold ${r.status==='approved'?'text-emerald-600':'text-rose-600'}`}>{r.status.toUpperCase()}</span>
                    )}
                 </div>
                 <div className="text-sm text-slate-700 font-medium whitespace-pre-wrap mb-2">
                    " {r.reason} "
                 </div>
                 <div className="text-xs text-blue-600 font-bold bg-blue-50 p-2 rounded-lg inline-block">
                    {r.type === 'stat' ? '스탯 변동 요청: ' + JSON.stringify(r.statChanges) : `아이템 요청: ${r.itemName}`}
                 </div>
               </div>
             ))
           }
        </div>
     </div>
   );
};
