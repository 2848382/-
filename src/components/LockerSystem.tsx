import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../contexts/GameContext';
import { Lock, Search, Archive, KeyRound, Lightbulb, Combine, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Clue } from '../types';

import { getItemCategory, ItemCategory } from '../lib/utils'; // I will import what I just wrote

export const LockerSystem: React.FC = () => {
  const { profile, user } = useGame();
  
  const rawInventory = profile?.inventory || [];
  const [dbItems, setDbItems] = useState<Clue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | ItemCategory>('all');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsub = onSnapshot(collection(db, 'items'), (snap) => {
      setDbItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Clue)));
      setLoading(false);
    }, (err) => {
      console.error("Locker fetch error:", err);
      setError("데이터 로딩 실패");
      setLoading(false);
    });
    return () => unsub();
  }, []);
  
  const ALL_CLUES: Clue[] = [
    { id: 'c1', name: '찢어진 노트 조각 A', category: 'document', description: '알 수 없는 수식이 적혀 있다. S-0420이라는 글자가 보인다.' },
    { id: 'c2', name: '녹음기', category: 'item', description: '배터리가 방전되어 켜지지 않는다. 누군가 고의로 망가뜨린 흔적이 있다.' },
    { id: 'c3', name: '연구실 출입 키카드', category: 'item', description: '화학실 안쪽 비밀 공간으로 통하는 카드키. 마그네틱이 조금 손상되었다.' },
    { id: 'c4', name: '이상한 학생 기록부', category: 'record', description: '특정 학생의 결석 기록이 통째로 삭제되어 있다.' },
    { id: 'c5', name: '수백 개의 오답 노트', category: 'document', description: '놀랍게도 모든 문제의 오답이 일정한 패턴을 그리고 있다.' },
    { id: 'c6', name: '부서진 스마트폰', category: 'item', description: '액정이 심하게 깨져있다. 마지막 전송 문자는 "연결이 끊기고 있어".' },
    { id: 'c7', name: '기밀 로그 S-0420', category: 'document', description: '단말기에서 복구된 로그입니다. "모든 사건은 4시 20분에 초기화된다. 기억을 유지할 방법을 찾아야 한다."' }
  ];

  const ownedClues = rawInventory.map((itemName: string) => {
     const found = dbItems.find(c => c.name === itemName) || ALL_CLUES.find(c => c.name === itemName);
     const cat = getItemCategory(itemName);
     if (found) return { ...found, itemCategory: cat };
     return {
       id: `dyn_${itemName}`,
       name: itemName,
       category: 'item' as const,
       itemCategory: cat,
       description: '정체를 알 수 없는 시스템 습득물.'
     };
  });
  
  const filteredClues = activeTab === 'all' 
     ? ownedClues 
     : ownedClues.filter(c => c.itemCategory === activeTab);

  const [selectedClue, setSelectedClue] = useState<any | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisResult, setSynthesisResult] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newItemName.trim() || isAdding) return;

    setIsAdding(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        inventory: arrayUnion(newItemName.trim())
      });
      setNewItemName("");
    } catch (err) {
      console.error("Error adding item:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteItem = async (itemName: string) => {
    if (!user || !window.confirm(`'${itemName}'을(를) 정말 버리시겠습니까?`)) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        inventory: arrayRemove(itemName)
      });
      setSelectedClue(null);
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  };

  const TOTAL_SLOTS = 16;
  const slots = Array.from({ length: Math.max(TOTAL_SLOTS, filteredClues.length) }).map((_, i) => filteredClues[i] || null);

  const canCombine = ownedClues.length >= 3;

  const handleCombine = () => {
     setIsSynthesizing(true);
     setTimeout(() => {
        setIsSynthesizing(false);
        setSynthesisResult("모든 사건은 당일 오후 4시 20분에 시작됩니다. 터미널에 암호 'S-0420'을 입력하세요.");
     }, 2000);
  };

  const getCatLabel = (t: string) => {
    switch(t) {
       case 'all': return '전체 보관함';
       case 'clue': return '단서';
       case 'consumable': return '소모품';
       case 'special': return '특수 물품';
       case 'gift': return '선물';
       default: return '기타 확인불가';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#E2E8F0] p-6 md:p-10 min-h-[100dvh]">
       <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-300 flex items-center justify-center text-[#475569]">
                <Archive size={24} />
             </div>
             <div>
               <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">개인 사물함</h2>
               <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                  Locker System
               </p>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
            <form onSubmit={handleAddItem} className="hidden sm:flex items-center gap-1">
               <input 
                  type="text"
                  placeholder="물건 이름..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-slate-400 w-32"
               />
               <button 
                  type="submit"
                  disabled={!newItemName.trim() || isAdding}
                  className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-all"
               >
                  <Plus size={16} />
               </button>
            </form>

            <button 
               disabled={!canCombine}
               onClick={handleCombine}
               className={cn(
                 "px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm",
                 canCombine 
                   ? "bg-slate-800 text-white hover:bg-slate-700 active:scale-95" 
                   : "bg-slate-300 text-slate-400 cursor-not-allowed"
               )}
            >
               <Combine size={16} />
               단서 합성
            </button>
          </div>
       </div>

       {/* Mobile Add Form */}
       <form onSubmit={handleAddItem} className="flex sm:hidden items-center gap-1 mb-6">
          <input 
             type="text"
             placeholder="물건 이름 추가..."
             value={newItemName}
             onChange={(e) => setNewItemName(e.target.value)}
             className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-slate-400"
          />
          <button 
             type="submit"
             disabled={!newItemName.trim() || isAdding}
             className="px-4 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 disabled:opacity-50 font-black text-xs uppercase"
          >
             추가
          </button>
       </form>

       <div className="flex overflow-x-auto gap-2 pb-4 mb-2 scrollbar-hide">
          {['all', 'clue', 'consumable', 'special', 'gift', 'unknown'].map((tab) => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab as any)}
               className={cn(
                  "px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-colors border",
                  activeTab === tab 
                     ? "bg-[#0f172a] text-white border-[#0f172a] shadow-md"
                     : "bg-white text-slate-500 hover:bg-slate-50 border-slate-200"
               )}
             >
                {getCatLabel(tab)}
             </button>
          ))}
       </div>

       {/* Synthesis Result */}
       <AnimatePresence>
         {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-50">
               <div className="w-10 h-10 border-4 border-slate-400 border-t-transparent rounded-full animate-spin" />
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">물품 목록 확인 중...</p>
            </div>
         ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
               <AlertCircle size={40} className="text-red-500" />
               <p className="text-sm font-bold text-red-500">{error}</p>
            </div>
         ) : synthesisResult && (
           <motion.div 
             initial={{ opacity: 0, height: 0 }}
             animate={{ opacity: 1, height: 'auto' }}
             exit={{ opacity: 0, height: 0 }}
             className="mb-8"
           >
             <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-xl flex gap-4 items-start shadow-sm">
                <Lightbulb className="w-6 h-6 shrink-0 mt-1" />
                <div>
                   <h4 className="font-black mb-1">합성 성공: 새로운 추론 도출</h4>
                   <p className="text-sm font-bold opacity-90">{synthesisResult}</p>
                </div>
             </div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* Locker Grid */}
       {!loading && !error && (
         <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 md:gap-4 flex-1 content-start">
            {slots.map((item, idx) => (
               <motion.div
                  key={idx}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => item && setSelectedClue(item)}
                  className={cn(
                    "aspect-[3/4] relative rounded-lg border-2 shadow-inner transition-all flex flex-col",
                    item 
                      ? "bg-[#CBD5E1] border-slate-400 cursor-pointer" 
                      : "bg-[#94A3B8] border-slate-500 opacity-50"
                  )}
               >
                  {/* Locker Vents */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col gap-1 w-6">
                     <div className="h-1 bg-black/10 rounded-full" />
                     <div className="h-1 bg-black/10 rounded-full" />
                     <div className="h-1 bg-black/10 rounded-full" />
                     <div className="h-1 bg-black/10 rounded-full" />
                  </div>

                  {/* Locker Number */}
                  <div className="absolute top-2 left-2 text-[10px] font-mono font-black text-slate-600/50">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  
                  {/* Lock Dial Graphic */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-slate-600/30 flex items-center justify-center">
                     <div className="w-2 h-2 rounded-full bg-slate-600/30" />
                  </div>

                  {/* Content Indicator */}
                  {item && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-sky-900/10 backdrop-blur-[2px]">
                        <KeyRound className="text-[#0F172A] w-8 h-8 mb-2 drop-shadow-md" />
                        <span className="text-[10px] font-black text-[#0F172A] text-center px-2 line-clamp-2 leading-tight">
                           {item.name}
                        </span>
                     </div>
                  )}
                  {!item && (
                     <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="text-slate-600/30 w-6 h-6" />
                     </div>
                  )}
               </motion.div>
            ))}
         </div>
       )}

       {/* Item Detail Modal */}
       <AnimatePresence>
          {selectedClue && (
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedClue(null)}
               className="fixed inset-0 z-50 bg-[#0F172A]/80 backdrop-blur-sm flex items-center justify-center p-4"
             >
                <motion.div 
                   initial={{ scale: 0.9, y: 20 }}
                   animate={{ scale: 1, y: 0 }}
                   exit={{ scale: 0.9, y: 20 }}
                   onClick={e => e.stopPropagation()}
                   className="bg-[#F8FAFC] max-w-sm w-full rounded-2xl p-8 shadow-2xl"
                >
                   <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mx-auto mb-6">
                      <Search className="text-[#0F172A]" size={32} />
                   </div>
                   <div className="text-center mb-6">
                      <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest px-3 py-1 bg-sky-100 rounded-full">
                         {selectedClue.category}
                      </span>
                      <h3 className="text-xl font-black text-[#0F172A] tracking-tight mt-4 break-keep">{selectedClue.name}</h3>
                   </div>
                   
                   <div className="p-4 bg-white rounded-xl border border-slate-200 min-h-[100px] flex items-center justify-center">
                      <p className="text-sm font-bold text-slate-600 text-center leading-relaxed">
                         {selectedClue.description}
                      </p>
                   </div>
                   
                   <div className="flex flex-col gap-2 mt-6">
                      <button 
                        onClick={() => setSelectedClue(null)}
                        className="w-full py-4 rounded-xl bg-[#0F172A] text-white font-bold hover:bg-[#1E293B] transition-colors"
                      >
                        사물함에 넣기
                      </button>
                      <button 
                        onClick={() => handleDeleteItem(selectedClue.name)}
                        className="w-full py-3 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <Trash2 size={16} />
                        버리기 (영구 삭제)
                      </button>
                   </div>
                </motion.div>
             </motion.div>
          )}
          {isSynthesizing && (
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center"
             >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                >
                   <Combine className="w-16 h-16 text-white mb-6" />
                </motion.div>
                <p className="text-white font-black tracking-widest uppercase animate-pulse">단서 결합 중...</p>
             </motion.div>
          )}
       </AnimatePresence>
    </div>
  );
};
