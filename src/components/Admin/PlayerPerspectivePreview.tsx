import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { UserProfile, PrivateMission, Letter, AnonymousTip } from '../../types';
import { Eye, ShieldCheck, X } from 'lucide-react';
import { StatBar } from '../ui/StatBar';

interface Props {
  user: UserProfile;
  onClose: () => void;
}

export const PlayerPerspectivePreview: React.FC<Props> = ({ user, onClose }) => {
  const [missions, setMissions] = useState<PrivateMission[]>([]);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [tips, setTips] = useState<AnonymousTip[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const qMissions = query(collection(db, 'private_missions'), where('targetUid', '==', user.uid));
      const snapMissions = await getDocs(qMissions);
      setMissions(snapMissions.docs.map(d => d.data() as PrivateMission));

      const qLettersTo = query(collection(db, 'letters'), where('recipientUid', '==', user.uid));
      const snapLettersTo = await getDocs(qLettersTo);
      setLetters(snapLettersTo.docs.map(d => d.data() as Letter));

      const qTipsTo = query(collection(db, 'anonymous_tips'), where('recipientUid', '==', user.uid));
      const snapTipsTo = await getDocs(qTipsTo);
      setTips(snapTipsTo.docs.map(d => d.data() as AnonymousTip));
    };
    fetchData();
  }, [user]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#F8FAFC] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
           <div className="flex items-center gap-2">
             <Eye className="text-blue-600" />
             <span className="font-bold">플레이어 시점 미리보기</span>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
           <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex items-center gap-3 mb-4">
               <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
               <div>
                 <div className="font-black text-lg">{user.name}</div>
                 <div className="text-xs text-slate-500">{user.studentId}</div>
               </div>
             </div>
             <div className="grid grid-cols-2 gap-2">
               <div className="bg-slate-50 p-2 rounded flex justify-between text-xs font-bold"><span>결속력</span> <span>{user.bonding || 0}</span></div>
               <div className="bg-slate-50 p-2 rounded flex justify-between text-xs font-bold"><span>반항심</span> <span>{user.rebellion || 0}</span></div>
               <div className="bg-slate-50 p-2 rounded flex justify-between text-xs font-bold"><span>스트레스</span> <span>{user.stress || 0}</span></div>
               <div className="bg-slate-50 p-2 rounded flex justify-between text-xs font-bold"><span>잔액</span> <span>{user.balance || 0}원</span></div>
             </div>
           </div>

           <div>
             <h3 className="font-bold text-slate-800 mb-2">진행 중인 개인 미션</h3>
             {missions.length === 0 && <p className="text-xs text-slate-500">없음</p>}
             {missions.map((m, i) => (
               <div key={i} className="bg-white p-3 rounded-xl mb-2 border-l-4 border-l-blue-500 text-sm">
                 <div className="font-bold">{m.title}</div>
                 <div className="text-xs text-slate-600 mt-1">{m.description}</div>
               </div>
             ))}
           </div>

           <div>
             <h3 className="font-bold text-slate-800 mb-2">받은 편지함 ({letters.length})</h3>
             {letters.slice(0,3).map((l, i) => (
               <div key={i} className="bg-white p-3 rounded-xl mb-2 border border-slate-100 text-sm whitespace-pre-wrap">
                 {l.content}
               </div>
             ))}
           </div>

           <div>
             <h3 className="font-bold text-slate-800 mb-2">받은 제보함 ({tips.length})</h3>
             {tips.slice(0,3).map((t, i) => (
               <div key={i} className="bg-white p-3 rounded-xl mb-2 border border-slate-100 text-sm whitespace-pre-wrap">
                 {t.content}
               </div>
             ))}
           </div>

        </div>
        
        <div className="p-4 bg-slate-900 text-white text-center text-xs font-bold shrink-0">
           <ShieldCheck size={14} className="inline mr-1" /> 읽기 전용 뷰입니다.
        </div>
      </div>
    </div>
  );
};
