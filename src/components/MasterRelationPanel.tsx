import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Relationship, RelationshipType } from '../types';
import { useGame } from '../contexts/GameContext';
import { Users, Link2, Unlink, Activity } from 'lucide-react';
import { RELATIONSHIP_CONFIGS } from '../constants/relationships';
import { RelationshipGraph } from './RelationshipGraph';

export const MasterRelationPanel: React.FC = () => {
    const { allStudents } = useGame();
    const [relations, setRelations] = useState<Relationship[]>([]);
    
    // Create new relation form
    const [rInit, setRInit] = useState('');
    const [rTarget, setRTarget] = useState('');
    const [rType, setRType] = useState<RelationshipType>('pair');
    const [isSecret, setIsSecret] = useState(false);
    const [isMasterOnly, setIsMasterOnly] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'relationships'));
        const unsub = onSnapshot(q, snap => {
            setRelations(snap.docs.map(d => ({id: d.id, ...d.data()} as Relationship)));
        });
        return () => unsub();
    }, []);

    const handleCreate = async () => {
        if(!rInit || !rTarget || !rType) return;
        if(rInit === rTarget) return alert("자신과 관계를 맺을 수 없습니다!");

        try {
            await addDoc(collection(db, 'relationships'), {
                type: rType,
                initiatorUid: rInit,
                targetUid: rTarget,
                isSecret,
                isMasterOnly,
                status: 'active',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            alert("강제 관계가 생성되었습니다.");
            setRInit(''); setRTarget(''); setIsSecret(false); setIsMasterOnly(false);
        } catch(e) {
            alert("생성 실패");
        }
    };

    const handleBreak = async (id: string, label: string) => {
        if(!confirm(`[${label}] 관계를 강제 파기(삭제) 하시겠습니까?`)) return;
        await deleteDoc(doc(db, 'relationships', id));
    };

    const getName = (uid: string) => allStudents.find(s=>s.uid===uid)?.name || '알 수 없음';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-sm flex flex-col space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <Link2 size={16} className="text-indigo-500" /> 관계 강제 생성
                </h3>
                <div className="grid grid-cols-2 gap-2">
                   <select value={rInit} onChange={e=>setRInit(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-2 text-sm outline-none rounded-lg focus:border-indigo-500">
                     <option value="">주체 (Initiator)</option>
                     {allStudents.map(s => <option key={s.uid} value={s.uid}>{s.name} ({s.studentId})</option>)}
                   </select>
                   <select value={rTarget} onChange={e=>setRTarget(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-2 text-sm outline-none rounded-lg focus:border-indigo-500">
                     <option value="">대상 (Target)</option>
                     {allStudents.map(s => <option key={s.uid} value={s.uid}>{s.name} ({s.studentId})</option>)}
                   </select>
                </div>
                <select value={rType} onChange={e=>setRType(e.target.value as RelationshipType)} className="w-full bg-slate-50 border border-slate-200 p-2 text-sm outline-none rounded-lg focus:border-indigo-500">
                   {Object.values(RELATIONSHIP_CONFIGS).map((rc: any) => (
                      <option key={rc.type} value={rc.type}>{rc.label} {rc.isMasterOnly?'(마스터)':''}</option>
                   ))}
                </select>
                <div className="flex flex-col gap-2">
                   <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={isSecret} onChange={e=>setIsSecret(e.target.checked)} className="rounded" />
                      비밀 관계 (타인에게 보이지 않음)
                   </label>
                   <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={isMasterOnly} onChange={e=>setIsMasterOnly(e.target.checked)} className="rounded" />
                      마스터 선언 관계 (학생은 이 관계를 파기할 수 없음)
                   </label>
                </div>
                <button onClick={handleCreate} className="mt-auto py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm">
                   마스터 권한으로 체결
                </button>
            </div>

            <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-sm flex flex-col max-h-[400px]">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 mb-3">
                    <Users size={16} className="text-blue-500" /> 현재 관계망 감찰
                </h3>
                <div className="overflow-y-auto custom-scrollbar pr-2 space-y-2 flex-1">
                   {relations.length === 0 ? <p className="text-sm text-slate-400">형성된 관계가 없습니다.</p> : 
                     relations.map(rel => {
                         const config = RELATIONSHIP_CONFIGS[rel.type];
                         return (
                            <div key={rel.id} className="p-3 border border-slate-100 bg-slate-50 rounded-lg flex justify-between items-center group hover:border-slate-300 transition-all">
                               <div>
                                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                     <span className="text-indigo-600">{config?.label || rel.type}</span>
                                     {rel.isSecret && <span className="text-[9px] bg-slate-200 text-slate-600 px-1 rounded">비밀</span>}
                                     {rel.isMasterOnly && <span className="text-[9px] bg-amber-100 text-amber-600 px-1 rounded">마스터</span>}
                                     {rel.status !== 'active' && <span className="text-[9px] bg-rose-100 text-rose-600 px-1 rounded">{rel.status}</span>}
                                  </div>
                                  <div className="text-sm text-slate-600 mt-1">
                                    <span className="font-semibold text-slate-900">{getName(rel.initiatorUid)}</span>
                                    <span className="mx-2 text-slate-400 text-xs">상호작용</span>
                                    <span className="font-semibold text-slate-900">{getName(rel.targetUid)}</span>
                                  </div>
                               </div>
                               <button onClick={() => handleBreak(rel.id, config?.label || rel.type)} className="p-2 text-rose-500 hover:bg-rose-100 rounded opacity-0 group-hover:opacity-100 transition-opacity" title="강제 파기">
                                  <Unlink size={16} />
                               </button>
                            </div>
                         );
                     })
                   }
                </div>
            </div>

            {/* 시각화 그래프 영역 (풀 위드) */}
            <div className="lg:col-span-2 border border-slate-200 bg-white rounded-2xl p-6 shadow-sm flex flex-col min-h-[500px]">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 mb-3">
                    <Activity size={16} className="text-blue-500" /> 관계망 시각화
                </h3>
                <div className="flex-1 relative">
                    <RelationshipGraph 
                        nodes={allStudents.map(s => ({
                           id: s.uid,
                           name: s.name,
                           isMe: false,
                           stress: s.stress || 0
                        }))}
                        edges={relations.map(r => ({
                           source: r.initiatorUid,
                           target: r.targetUid,
                           type: r.type,
                           isSecret: r.isSecret,
                           isMasterOnly: r.isMasterOnly
                        }))}
                        onNodeClick={(n) => {
                           console.log("Master clicked node:", n.name);
                        }}
                    />
                </div>
            </div>
        </div>
    );
};
