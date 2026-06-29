import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PrivateMission, Letter, AnonymousTip, Relationship, DualContract, ClueNode } from '../types';
import { Lock, Mail, Target, Users, Key, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const SecretArchive: React.FC = () => {
  const { user, profile, isAdmin } = useGame();
  const [missions, setMissions] = useState<PrivateMission[]>([]);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [tips, setTips] = useState<AnonymousTip[]>([]);
  const [relations, setRelations] = useState<Relationship[]>([]);
  const [contracts, setContracts] = useState<DualContract[]>([]);
  const [clues, setClues] = useState<ClueNode[]>([]);
  
  const [activeTab, setActiveTab] = useState<'missions' | 'letters' | 'tips' | 'relations' | 'contracts' | 'clues'>('missions');

  useEffect(() => {
    if (!user) return;

    // 개인 미션 구독
    const qMissions = query(collection(db, 'private_missions'), where('targetUid', '==', user.uid));
    const unsubMissions = onSnapshot(qMissions, (snap) => {
      setMissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as PrivateMission)).filter(m => isAdmin || ['private', 'public', 'revealed'].includes(m.visibility || 'private')));
    });

    // 받은 편지 (발신/수신 모두) - 여기서는 단순화하여 하나로 쿼리 불가능하므로 분리
    const unsubLettersFrom = onSnapshot(query(collection(db, 'letters'), where('senderUid', '==', user.uid)), (snap) => {
      setLetters(prev => {
        const others = prev.filter(p => p.senderUid !== user.uid);
        return [...others, ...snap.docs.map(d => ({ id: d.id, ...d.data() } as Letter)).filter(l => isAdmin || ['private', 'participants', 'public', 'revealed'].includes(l.visibility || 'private'))];
      });
    });
    const unsubLettersTo = onSnapshot(query(collection(db, 'letters'), where('recipientUid', '==', user.uid)), (snap) => {
      setLetters(prev => {
        const others = prev.filter(p => p.recipientUid !== user.uid);
        return [...others, ...snap.docs.map(d => ({ id: d.id, ...d.data() } as Letter)).filter(l => isAdmin || ['private', 'participants', 'public', 'revealed'].includes(l.visibility || 'private'))];
      });
    });

    // 익명 제보
    const unsubTipsFrom = onSnapshot(query(collection(db, 'anonymous_tips'), where('senderUid', '==', user.uid)), (snap) => {
      setTips(prev => {
        const others = prev.filter(p => p.senderUid !== user.uid);
        return [...others, ...snap.docs.map(d => ({ id: d.id, ...d.data() } as AnonymousTip)).filter(t => isAdmin || ['private', 'participants', 'public', 'revealed'].includes(t.visibility || 'private'))];
      });
    });
    const unsubTipsTo = onSnapshot(query(collection(db, 'anonymous_tips'), where('recipientUid', '==', user.uid)), (snap) => {
      setTips(prev => {
        const others = prev.filter(p => p.recipientUid !== user.uid);
        return [...others, ...snap.docs.map(d => ({ id: d.id, ...d.data() } as AnonymousTip)).filter(t => isAdmin || ['private', 'participants', 'public', 'revealed'].includes(t.visibility || 'private'))];
      });
    });

    // 내 관계
    const qRelations = query(collection(db, 'relationships'), where('participants', 'array-contains', user.uid));
    const unsubRelations = onSnapshot(qRelations, (snap) => {
      setRelations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Relationship)).filter(r => isAdmin || ['participants', 'public', 'revealed'].includes(r.visibility || 'participants')));
    });

    // 이중계약 (A or B)
    const unsubContractsA = onSnapshot(query(collection(db, 'dual_contracts'), where('playerAUid', '==', user.uid)), snap => {
        setContracts(prev => {
            const others = prev.filter(p => p.playerAUid !== user.uid);
            return [...others, ...snap.docs.map(d => ({ id: d.id, ...d.data() } as DualContract)).filter(c => isAdmin || ['participants', 'public', 'revealed'].includes(c.visibility || 'participants'))];
        });
    });
    const unsubContractsB = onSnapshot(query(collection(db, 'dual_contracts'), where('playerBUid', '==', user.uid)), snap => {
        setContracts(prev => {
            const others = prev.filter(p => p.playerBUid !== user.uid);
            return [...others, ...snap.docs.map(d => ({ id: d.id, ...d.data() } as DualContract)).filter(c => isAdmin || ['participants', 'public', 'revealed'].includes(c.visibility || 'participants'))];
        });
    });

    return () => {
      unsubMissions();
      unsubLettersFrom(); unsubLettersTo();
      unsubTipsFrom(); unsubTipsTo();
      unsubRelations();
      unsubContractsA(); unsubContractsB();
    };
  }, [user]);

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="mw-card p-6 flex items-center gap-4 bg-slate-900 text-white">
        <Lock size={32} className="text-yellow-400" />
        <div>
          <h2 className="text-xl font-black">비밀 정보함</h2>
          <p className="text-sm text-slate-300">오직 당신만 열람할 수 있는 기밀 문서입니다.</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {(['missions', 'letters', 'tips', 'relations', 'contracts', 'clues'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
          >
            {tab === 'missions' && '개인 미션'}
            {tab === 'letters' && '편지'}
            {tab === 'tips' && '익명 제보'}
            {tab === 'relations' && '내 관계'}
            {tab === 'contracts' && '이중계약'}
            {tab === 'clues' && '단서'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {activeTab === 'missions' && missions.length === 0 && <p className="text-slate-500 text-center py-8">등록된 개인 미션이 없습니다.</p>}
        {activeTab === 'missions' && missions.map(m => (
          <div key={m.id} className="mw-card p-4 border-l-4 border-l-blue-500">
            <h3 className="font-bold">{m.title}</h3>
            <p className="text-sm text-slate-600 mt-1">{m.description}</p>
            <div className="mt-2 text-xs font-bold text-slate-400">
              상태: {m.isCompleted ? <span className="text-emerald-500">완료</span> : '진행 중'}
            </div>
          </div>
        ))}

        {activeTab === 'letters' && letters.length === 0 && <p className="text-slate-500 text-center py-8">주고받은 편지가 없습니다.</p>}
        {activeTab === 'letters' && letters.map(l => (
          <div key={l.id} className="mw-card p-4 border-l-4 border-l-purple-500">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-purple-600">
                {l.senderUid === user?.uid ? '보낸 편지' : '받은 편지'}
              </span>
              {!l.isRead && l.recipientUid === user?.uid && <span className="px-2 py-0.5 bg-rose-100 text-rose-600 rounded text-[10px] font-bold">안 읽음</span>}
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{l.content}</p>
          </div>
        ))}

        {/* Similar maps for tips, relations, contracts, clues */}
        {activeTab === 'tips' && tips.map(t => (
          <div key={t.id} className="mw-card p-4 border-l-4 border-l-amber-500">
            <div className="text-xs font-bold text-amber-600 mb-2">{t.senderUid === user?.uid ? '내가 보낸 제보' : '내게 온 제보'}</div>
            <p className="text-sm text-slate-700">{t.content}</p>
          </div>
        ))}

        {activeTab === 'relations' && relations.map(r => (
           <div key={r.id} className="mw-card p-4 border-l-4 border-l-rose-500">
             <div className="text-sm font-bold">관계 유형: {r.type}</div>
             <div className="text-xs text-slate-500 mt-1">상태: {r.status}</div>
           </div>
        ))}

        {activeTab === 'contracts' && contracts.map(c => (
           <div key={c.id} className="mw-card p-4 border-l-4 border-l-indigo-500">
             <div className="text-sm font-bold">내 임무: {c.playerAUid === user?.uid ? c.missionA : c.missionB}</div>
             <div className="text-xs text-slate-500 mt-1">계약 상태: {c.status}</div>
           </div>
        ))}

      </div>
    </div>
  );
};
