import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Play } from 'lucide-react';

export const MasterScenarioPanel: React.FC = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [rewardWon, setRewardWon] = useState(0);
    const [rewardMEM, setRewardMEM] = useState(0);

    const handleBroadcast = async () => {
        if(!title || !description) return;
        if(!confirm("이 시나리오 이벤트를 전체 학생 화면에 띄우시겠습니까?")) return;
        
        try {
            await addDoc(collection(db, 'scenario_scripts'), {
                title,
                description,
                rewardWon,
                rewardMEM,
                status: 'active',
                createdAt: serverTimestamp()
            });
            alert("시나리오가 방송되었습니다.");
            setTitle('');
            setDescription('');
            setRewardWon(0);
            setRewardMEM(0);
        } catch(e) {
            console.error(e);
            alert("전송 실패");
        }
    };

    return (
        <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-sm flex flex-col space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Play size={16} className="text-indigo-600" /> 커스텀 시나리오 강제 전송
            </h3>
            <div className="space-y-3">
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="시나리오 제목 (예: 기숙사 3층 봉쇄)" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-500 font-bold" 
                />
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="내용 (예: 현재 기숙사 3층에 알 수 없는 균열이 발생했습니다. 오늘 밤 3층으로 향하는 자는...)" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm h-32 resize-none focus:outline-none focus:border-indigo-500" 
                />
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">참여 보상 (원)</label>
                      <input type="number" value={rewardWon} onChange={e=>setRewardWon(parseInt(e.target.value)||0)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">참여 보상 (MEM)</label>
                      <input type="number" value={rewardMEM} onChange={e=>setRewardMEM(parseInt(e.target.value)||0)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm" />
                   </div>
                </div>
            </div>
            
            <button onClick={handleBroadcast} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all shadow-md mt-2 flex items-center justify-center gap-2">
                전체 학생 화면 즉시 점유
            </button>
        </div>
    );
};
