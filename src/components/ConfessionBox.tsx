import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useGame } from '../contexts/GameContext';
import { FileHeart, AlertTriangle } from 'lucide-react';

export const ConfessionBox: React.FC = () => {
  const { user, profile, systemConfig } = useGame();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isOpen = systemConfig?.confessionOpen;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !content) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'confessions'), {
        authorUid: user.uid,
        content,
        isAnonymous: true,
        loopIndex: systemConfig?.currentLoop || 1,
        stressReduction: 15,
        createdAt: serverTimestamp()
      });

      // Reduce stress
      const newStress = Math.max(0, profile.stress - 15);
      await updateDoc(doc(db, 'users', user.uid), {
        stress: newStress,
        updatedAt: serverTimestamp()
      });

      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "당신의 고백이 어둠 속에 남겨졌습니다. 마음의 짐이 조금 덜어졌습니다.", type: "success" } }));
      setContent('');
    } catch(e) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "오류가 발생했습니다.", type: "error" } }));
    }
    setSubmitting(false);
  };

  if (!isOpen) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900 rounded-2xl border border-slate-800">
         <FileHeart size={48} className="text-slate-700 mb-4" />
         <h2 className="text-lg font-bold text-slate-300">현재 자백 시간이 아닙니다</h2>
         <p className="text-sm text-slate-500 mt-2">자백 시스템이 닫혀있습니다. 문이 다시 열릴 때를 기다리세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-red-900/10 pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
             <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-xl flex items-center justify-center border border-red-500/30">
                <FileHeart size={24} />
             </div>
             <div>
                <h2 className="text-xl font-bold mb-1">익명 자백</h2>
                <p className="text-xs text-red-300/80">당신의 죄악과 비밀을 고백하세요. 스트레스가 15 감소합니다.</p>
             </div>
          </div>
       </div>

       <div className="bg-white border border-red-100 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="bg-red-50 rounded-lg p-3 flex gap-3 text-red-800 text-xs mb-4">
               <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
               <p leading-relaxed>모든 고백은 완벽한 익명이 보장됩니다. 다른 학생들은 이 내용을 볼 수 없으며, 오직 당신의 부담을 덜기 위한 용도로만 사용됩니다.</p>
             </div>
             <textarea 
               required
               maxLength={200}
               placeholder="누구에게도 말할 수 없었던 것을 적으세요..." 
               value={content}
               onChange={e => setContent(e.target.value)}
               className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm h-32 focus:border-red-300 focus:ring focus:ring-red-100 outline-none transition-all placeholder:text-slate-400"
             />
             <div className="text-right text-[10px] text-slate-400 font-mono mb-2">{content.length} / 200</div>
             <button 
               disabled={submitting || !content} 
               className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold tracking-widest hover:bg-red-900 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all duration-300 disabled:opacity-50"
             >
               {submitting ? '제출 중...' : '고백 남기기'}
             </button>
          </form>
       </div>
    </div>
  );
};
