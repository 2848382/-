import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useGame } from '../contexts/GameContext';
import { Relationship, UserProfile } from '../types';
import { RELATIONSHIP_CONFIGS } from '../constants/relationships';
import { gameTerms, cn } from '../lib/utils';
import { Network, Search, UserMinus } from 'lucide-react';

// [신규: RelationshipBoard]
import { RelationshipGraph } from './RelationshipGraph';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { checkRateLimit } from '../hooks/useRateLimit';

export const RelationshipBoard: React.FC = () => {
  const { user, profile, allStudents, systemConfig } = useGame();
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetUid, setTargetUid] = useState<string>('');
  const [relType, setRelType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog state
  const [confirmState, setConfirmState] = useState<{isOpen: boolean; relId?: string; isDestructive: boolean}>({
    isOpen: false,
    relId: undefined,
    isDestructive: false
  });

  // [애니메이션: 기능명] 온라인 플레이어 필터
  const onlineUids = allStudents
    .filter(s => {
      const last = (s as any).lastActive?.toDate?.();
      return last && (Date.now() - last.getTime()) < 5 * 60 * 1000;
    })
    .map(s => s.uid);

  // [애니메이션: 기능명] 루프 수치
  const loop = systemConfig?.currentLoop || 0;

  const hasAwakened = profile?.hasAwakened || false;

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'relationships'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Relationship));
      
      // 내 관계 필터링: (내가 initiator)이거나 (내가 target이고 비밀이 아닌 경우)
      const myRels = data.filter(r => 
        (r.initiatorUid === user.uid) || 
        (r.targetUid === user.uid && !r.isSecret && !r.isMasterOnly)
      );
      setRelationships(myRels);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleCreate = async () => {
    if (!user || !profile || !targetUid || !relType) return;
    
    // Cooldown: Max 2 per day
    const rateCheck = await checkRateLimit(user.uid, profile.name, 'relationship_request', 'daily', 2);
    if (!rateCheck.allowed) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: rateCheck.message, type: "warning" } }));
      return;
    }

    // Check if duplicate relation type exists between the two
    const duplicate = relationships.find(r => 
      ((r.initiatorUid === user.uid && r.targetUid === targetUid) || 
       (r.targetUid === user.uid && r.initiatorUid === targetUid)) && 
      r.type === relType &&
      r.status !== 'broken'
    );
    if (duplicate) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "이미 비슷한 활성 관계가 존재합니다.", type: "warning" } }));
      return;
    }

    try {
      const config = RELATIONSHIP_CONFIGS[relType];
      await addDoc(collection(db, 'relationships'), {
        type: relType,
        initiatorUid: user.uid,
        targetUid,
        isSecret: config.isSecret,
        isMasterOnly: config.isMasterOnly,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "관계 신청이 되었습니다.", type: "success" } }));
      setTargetUid('');
      setRelType('');
    } catch (e) {
      console.error(e);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "오류가 발생했습니다.", type: "error" } }));
    }
  };

  const handleBreak = async (relId: string, canBreak: boolean) => {
    if (!canBreak) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "해제 권한이 없습니다.", type: "error" } }));
      return;
    }
    setConfirmState({ isOpen: true, relId, isDestructive: true });
  };

  const executeBreak = async () => {
    if (!confirmState.relId) return;
    try {
      await updateDoc(doc(db, 'relationships', confirmState.relId), {
        status: 'broken',
        updatedAt: serverTimestamp()
      });
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "관계가 성공적으로 파기/철회되었습니다.", type: "success" } }));
    } catch (e) {
      console.error(e);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "관계 파기에 실패했습니다.", type: "error" } }));
    }
  };

  const availableConfigs = Object.values(RELATIONSHIP_CONFIGS).filter(c => !c.isMasterOnly);
  const filteredStudents = allStudents.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const performTextReplacement = (text: string) => {
    let replaced = text;
    ['loop', 'loopCount', 'loopEnd', 'reset', 'memory', 'repeat'].forEach(key => {
       const replacement = gameTerms(key, hasAwakened);
       // basic replace (this naive replace works for known strings)
       replaced = replaced.replace(new RegExp(`루프`, 'g'), gameTerms('loop', hasAwakened));
       // It's tricky to translate back from original texts, so we'll just rely on the UI texts knowing they use "루프" etc.
    });
    return replaced;
  };

  if (loading) return <div>로딩중...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600">
            <Network size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">관계망 보드</h2>
            <p className="text-sm text-slate-500">당신과 연결된 사람들의 실타래를 구조화합니다.</p>
          </div>
        </div>
      </div>

      {/* [SVG] 신규: 거미줄/힘 기반 관계 그래프 뷰어 */}
      <div className="h-[400px]">
         <RelationshipGraph 
            nodes={Array.from(new Map([...(profile ? [profile] : []), ...allStudents].map(s => [s.uid, s])).values()).map(s => ({
               id: s.uid,
               name: s.name,
               isMe: s.uid === user?.uid,
               stress: s.stress || 0
            }))}
            edges={relationships
               .filter(r => profile?.role === 'admin' || !r.isMasterOnly)
               .filter(r => 
                   Array.from(new Map([...(profile ? [profile] : []), ...allStudents].map(s => [s.uid, s])).values()).some(s => s.uid === r.initiatorUid) && 
                   Array.from(new Map([...(profile ? [profile] : []), ...allStudents].map(s => [s.uid, s])).values()).some(s => s.uid === r.targetUid)
               )
               .map(r => ({
               source: r.initiatorUid,
               target: r.targetUid,
               type: r.type,
               isSecret: r.isSecret,
               isMasterOnly: r.isMasterOnly
            }))}
            onNodeClick={(n) => {
               // BottomSheet와 연동하여 해당 학생 노드 검색 및 상태 확인
               setSearchTerm(n.name);
            }}
            loop={loop}
            onlineUids={onlineUids}
            betrayalPair={null} // 배신 이벤트 연동은 추후
         />
      </div>

      {/* 내 관계 목록 */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-900">현재 맺은 관계</h3>
        {relationships.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 text-slate-400 rounded-2xl border border-slate-100">
            설정된 관계가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {relationships.map(rel => {
              const config = RELATIONSHIP_CONFIGS[rel.type];
              if (!config) return null;
              const isInitiator = rel.initiatorUid === user?.uid;
              const otherId = isInitiator ? rel.targetUid : rel.initiatorUid;
              const otherUser = allStudents.find(s => s.uid === otherId);
              
              const label = hasAwakened ? config.label : config.labelMasked;
              const desc = performTextReplacement(config.description);
              
              // 상대방 이름 숨김 처리 (isSecret && target이 나일 때 - rules에서 안보이게 했지만, 내가 initiator일때는 보임)
              const otherName = (rel.isSecret && !isInitiator) ? '???' : (otherUser?.name || '알 수 없음');
              
              const canBreak = isInitiator ? config.canInitiatorBreak : config.canTargetBreak;

              return (
                <div key={rel.id} className={cn(
                  "p-5 rounded-2xl border bg-white shadow-sm flex flex-col",
                  rel.status === 'broken' ? "opacity-50 grayscale" : ""
                )}>
                  <div className="flex justify-between items-start mb-2">
                     <span className="px-2.5 py-1 bg-pink-100 text-pink-700 text-xs font-bold rounded-full">{label}</span>
                     <span className="text-xs font-medium text-slate-400 uppercase">{rel.status}</span>
                  </div>
                  <div className="font-bold text-slate-900 mb-1">{otherName}</div>
                  <p className="text-xs text-slate-500 mb-4">{desc}</p>
                  
                  <div className="mt-auto space-y-1">
                     <div className="text-[10px] text-emerald-600 font-medium">(+) {performTextReplacement(config.merit)}</div>
                     <div className="text-[10px] text-rose-600 font-medium">(-) {performTextReplacement(config.demerit)}</div>
                  </div>

                  {rel.status !== 'broken' && canBreak && (
                    <button 
                      onClick={() => handleBreak(rel.id, canBreak)}
                      className="mt-4 flex items-center justify-center gap-1 py-1.5 w-full border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                    >
                      <UserMinus size={14}/> 관계 파기
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 새 관계 신청 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-lg">새 관계 신청</h3>
        <p className="text-xs text-slate-500">일부 관계는 상대방의 동의 없이 성립되며(비밀 유지), 마스터의 검토를 거쳐 active 상태가 됩니다.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 block">대상 선택</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="학생 검색..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-500 mb-2"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50">
              {filteredStudents.map(s => (
                <div 
                  key={s.uid} 
                  onClick={() => setTargetUid(s.uid)}
                  className={cn(
                    "px-3 py-2 text-sm cursor-pointer border-b border-slate-100 last:border-0 hover:bg-blue-50 transition-colors",
                    targetUid === s.uid ? "bg-blue-100 font-bold" : "text-slate-600"
                  )}
                >
                  {s.studentId} - {s.name}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 flex flex-col">
            <label className="text-sm font-bold text-slate-700 block">관계 유형</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500"
              value={relType}
              onChange={e => setRelType(e.target.value)}
            >
              <option value="">관계를 선택하세요</option>
              {availableConfigs.map(c => (
                <option key={c.type} value={c.type}>{hasAwakened ? c.label : c.labelMasked}</option>
              ))}
            </select>
            
            {relType && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2 text-xs text-slate-600 space-y-1">
                <p><strong>설명:</strong> {performTextReplacement(RELATIONSHIP_CONFIGS[relType].description)}</p>
                <p className="text-emerald-600"><strong>이점:</strong> {performTextReplacement(RELATIONSHIP_CONFIGS[relType].merit)}</p>
                <p className="text-rose-600"><strong>위험:</strong> {performTextReplacement(RELATIONSHIP_CONFIGS[relType].demerit)}</p>
              </div>
            )}
            
            <button 
              onClick={handleCreate}
              disabled={!targetUid || !relType}
              className="mt-auto w-full py-3 bg-[#0F172A] text-white rounded-xl font-bold disabled:opacity-50"
            >
              신청 보내기
            </button>
          </div>
        </div>
      </div>
      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title="관계 파기"
        message="정말 이 관계를 파기/철회하시겠습니까? (패널티가 있을 수 있습니다)"
        confirmText="파기하기"
        onConfirm={executeBreak}
        onCancel={() => setConfirmState({ isOpen: false, isDestructive: false })}
        isDestructive={confirmState.isDestructive}
      />
    </div>
  );
};
