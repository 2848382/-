import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { Clock, CheckCircle } from 'lucide-react';
import { PrivateMission, Letter, AnonymousTip, DualContract } from '../../types';

export const MasterSchedulePanel: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchScheduled = async () => {
      const allItems: any[] = [];
      
      const collections = ['private_missions', 'letters', 'anonymous_tips', 'dual_contracts'];
      for (const colName of collections) {
        const q = query(collection(db, colName));
        const snap = await getDocs(q);
        snap.forEach(d => {
          const data = d.data();
          if (data.revealCondition && !data.isRevealed) {
             allItems.push({ ...data, id: d.id, collection: colName });
          }
        });
      }
      setItems(allItems);
    };

    fetchScheduled();
    // In a real app we might use onSnapshot for all, but for GM panel, we can just fetch on mount or interval.
    const interval = setInterval(fetchScheduled, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleManualReveal = async (item: any) => {
    try {
      await updateDoc(doc(db, item.collection, item.id), {
        isRevealed: true,
        visibility: 'revealed'
      });
      alert('정보가 공개되었습니다.');
      setItems(items.filter(i => i.id !== item.id));
    } catch (e) {
      alert('실패했습니다.');
    }
  };

  return (
    <div className="space-y-6">
       <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
         <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
           <Clock className="text-amber-500" />
           예약된 정보 공개 대기 목록
         </h3>
         {items.length === 0 && <p className="text-slate-500 text-sm">현재 예약된 공개 대기 정보가 없습니다.</p>}
         <div className="space-y-4">
           {items.map(item => (
             <div key={item.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex justify-between items-center">
               <div>
                 <div className="text-xs font-bold text-blue-600 mb-1">
                   {item.collection === 'private_missions' && '개인 미션'}
                   {item.collection === 'letters' && '편지'}
                   {item.collection === 'anonymous_tips' && '제보'}
                   {item.collection === 'dual_contracts' && '이중계약'}
                 </div>
                 <div className="text-sm font-bold text-slate-900">{item.title || item.content || item.missionA || '내용 없음'}</div>
                 <div className="text-xs text-slate-500 mt-1">
                   공개 조건: {item.revealCondition.type} (값: {item.revealCondition.value})
                 </div>
               </div>
               <button
                 onClick={() => handleManualReveal(item)}
                 className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors"
               >
                 수동 즉시 공개
               </button>
             </div>
           ))}
         </div>
       </div>
    </div>
  );
};
