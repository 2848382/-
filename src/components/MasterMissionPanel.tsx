import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useGame } from '../contexts/GameContext';
import { Target } from 'lucide-react';
import { gameTerms } from '../lib/utils'; // if needed

export const MasterMissionPanel: React.FC = () => {
    const { allStudents } = useGame();
    
    // Private Mission
    const [mTarget, setMTarget] = useState('');
    const [mTitle, setMTitle] = useState('');
    const [mDesc, setMDesc] = useState('');
    
    // Dual Contract
    const [dA, setDA] = useState('');
    const [dB, setDB] = useState('');
    const [dMissA, setDMissA] = useState('');
    const [dMissB, setDMissB] = useState('');

    const handlePublishMission = async () => {
       if(!mTarget || !mTitle || !mDesc) return;
       try {
         await addDoc(collection(db, 'private_missions'), {
           targetUid: mTarget,
           title: mTitle,
           description: mDesc,
           isCompleted: false,
           isVisible: true,
           createdAt: serverTimestamp()
         });
         alert("개인 임무(배신 등)가 발행되었습니다.");
         setMTarget(''); setMTitle(''); setMDesc('');
       } catch(e) {
         alert("오류 발생");
       }
    };

    const handlePublishDual = async () => {
       if(!dA || !dB || !dMissA || !dMissB) return;
       try {
         await addDoc(collection(db, 'dual_contracts'), {
            playerAUid: dA,
            playerBUid: dB,
            missionA: dMissA,
            missionB: dMissB,
            status: 'active',
            createdAt: serverTimestamp()
         });
         alert("이중 계약이 발행되었습니다.");
         setDA(''); setDB(''); setDMissA(''); setDMissB('');
       } catch(e) {
         alert("오류 발생");
       }
    };

    return (
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-sm space-y-4 flex flex-col">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                 <Target size={16} className="text-rose-500"/> 개인 타겟 미션 발행
              </h3>
              <select value={mTarget} onChange={e=>setMTarget(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-rose-500">
                <option value="">대상 학생 선택</option>
                {allStudents.map(s => <option key={s.uid} value={s.uid}>{s.name} ({s.studentId})</option>)}
              </select>
              <input type="text" value={mTitle} onChange={e=>setMTitle(e.target.value)} placeholder="미션 제목 (예: 배신자의 증명)" className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-rose-500" />
              <textarea value={mDesc} onChange={e=>setMDesc(e.target.value)} placeholder="미션 내용" className="w-full h-24 bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-rose-500 resize-none" />
              <button onClick={handlePublishMission} className="mt-auto py-3 bg-slate-900 rounded-xl text-white text-sm font-bold hover:bg-slate-800 transition">개인 미션 전송</button>
          </div>

          <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-sm space-y-4 flex flex-col">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                 <Target size={16} className="text-purple-500"/> 이중 조항 계약 발행
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <select value={dA} onChange={e=>setDA(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-lg outline-none">
                  <option value="">대상 A</option>
                  {allStudents.map(s => <option key={s.uid} value={s.uid}>{s.name}</option>)}
                </select>
                <select value={dB} onChange={e=>setDB(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-lg outline-none">
                  <option value="">대상 B</option>
                  {allStudents.map(s => <option key={s.uid} value={s.uid}>{s.name}</option>)}
                </select>
              </div>
              <textarea value={dMissA} onChange={e=>setDMissA(e.target.value)} placeholder="A가 B에게 해야 할 조항" className="w-full h-16 bg-slate-50 border border-slate-200 p-2 text-sm rounded-lg outline-none focus:border-purple-500 resize-none" />
              <textarea value={dMissB} onChange={e=>setDMissB(e.target.value)} placeholder="B가 A에게 해야 할 조항" className="w-full h-16 bg-slate-50 border border-slate-200 p-2 text-sm rounded-lg outline-none focus:border-purple-500 resize-none" />
              <button onClick={handlePublishDual} className="mt-auto py-3 bg-purple-700 rounded-xl text-white text-sm font-bold hover:bg-purple-800 transition">이중 계약 체결 (강제)</button>
          </div>
       </div>
    );
};
