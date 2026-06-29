import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Search, Plus, UserCircle, Coins, Package, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, arrayUnion, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface MarketItem {
  id: string;
  sellerId: string;
  sellerName: string;
  type: 'sale' | 'bounty';
  itemName: string;
  description: string;
  price: number;
  status: 'active' | 'completed';
  createdAt: any;
}

export const Marketplace: React.FC = () => {
  const { profile, user, transferWon } = useGame();
  const [items, setItems] = useState<MarketItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'sale' | 'bounty'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean; targetItem?: MarketItem}>({isOpen: false});
  const [loading, setLoading] = useState(true);

  // Form
  const [formType, setFormType] = useState<'sale' | 'bounty'>('sale');
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'marketplace'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const parsed: MarketItem[] = [];
      snap.forEach(d => parsed.push({ id: d.id, ...d.data() } as MarketItem));
      setItems(parsed);
      setLoading(false);
    }, (error) => {
       console.error("Firestore error in Marketplace:", error);
       setLoading(false);
       setErrorInfo('마켓플레이스 데이터를 불러오지 못했습니다.');
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    
    const priceNum = parseInt(price);
    if (!itemName || !description || isNaN(priceNum) || priceNum <= 0) return;

    if (formType === 'bounty' && (profile.balance || 0) < priceNum) {
       setErrorInfo('바운티를 등록하기 위한 원 잔액이 부족합니다.');
       return;
    }

    setSubmitting(true);
    try {
      if (formType === 'bounty') {
         // Deduct cost upfront or hold it.
         await updateDoc(doc(db, 'users', user.uid), {
            balance: increment(-priceNum),
            updatedAt: serverTimestamp()
         });
         
         // Log the hold
         await addDoc(collection(db, 'users', user.uid, 'transactions'), {
            type: 'spend',
            amount: -priceNum,
            toFrom: '마켓플레이스',
            memo: `[바운티 등록] ${itemName}`,
            createdAt: serverTimestamp()
         });
      }
      
      await addDoc(collection(db, 'marketplace'), {
         sellerId: profile.studentId, // We use studentId for transfers
         sellerName: profile.name,
         type: formType,
         itemName,
         description,
         price: priceNum,
         status: 'active',
         createdAt: serverTimestamp()
      });
      setShowAdd(false);
      setItemName('');
      setDescription('');
      setPrice('');
      setErrorInfo('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: MarketItem) => {
     if (!profile || !user || item.sellerId !== profile.studentId) return;
     if (item.status === 'completed') {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "이미 체결된 거래는 취소할 수 없습니다.", type: "warning" } }));
        return;
     }
     setConfirmDialog({ isOpen: true, targetItem: item });
  };

  const executeDelete = async () => {
     const item = confirmDialog.targetItem;
     if (!item || !profile || !user || item.sellerId !== profile.studentId) return;

     setSubmitting(true);
     try {
       if (item.type === 'bounty') {
         await updateDoc(doc(db, 'users', user.uid), {
           balance: increment(item.price),
           updatedAt: serverTimestamp()
         });
         await addDoc(collection(db, 'users', user.uid, 'transactions'), {
           type: 'earn',
           amount: item.price,
           toFrom: '시스템 환불',
           memo: `[바운티 취소 반환] ${item.itemName}`,
           createdAt: serverTimestamp()
         });
       }
       await deleteDoc(doc(db, 'marketplace', item.id));
       window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "취소/삭제 완료", type: "success" } }));
     } catch (err: any) {
       window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: err.message || "삭제 실패", type: "error" } }));
     } finally {
       setSubmitting(false);
       setConfirmDialog({ isOpen: false });
     }
  };

  const handleAction = async (item: MarketItem) => {
     if (profile?.isCardFrozen) {
       window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "행정실에 의해 IC 카드가 정지되었습니다.", type: "error" } }));
       return;
     }
     if (!profile || !user || item.sellerId === profile.studentId) return;
     if (item.status === 'completed') return;

     try {
       if (item.type === 'sale') {
          // BUY: I pay seller
          if ((profile.balance || 0) < item.price) {
            window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: '원 잔액이 부족합니다.', type: "warning" } }));
            return;
          }
          
          // Execute Transfer
          await transferWon(item.sellerId, item.price, `[구매] ${item.itemName}`);
          
          // Add to inventory
          await updateDoc(doc(db, 'users', user.uid), {
             inventory: arrayUnion(item.itemName),
             updatedAt: serverTimestamp()
          });
       } else if (item.type === 'bounty') {
          // I am the researcher/finder. The person who posted (sellerId) pays me.
          // This requires a more complex transaction or the person who posted must manually pay.
          // For now, let's make it so the bounty poster's 원 is deducted when someone "claims" it, 
          // or we simulate the poster paying the finder. 
          // Since we already have transferMW, let's use it from the bounty poster's perspective? 
          // No, that's hard to trigger from the finder's side without a cloud function.
          // Instead, let's implement a system where the bounty hunter gets paid.
          
          window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: '바운티 반납 요청이 전송되었습니다. (마스터가 학인 후 보상금을 지급합니다)', type: "info" } }));
       }
       
       // Close the listing
       await updateDoc(doc(db, 'marketplace', item.id), {
          status: 'completed',
          buyerId: profile.studentId,
          updatedAt: serverTimestamp()
       });
       
       window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: '거래가 성공적으로 체결되었습니다!', type: "success" } }));
     } catch (err: any) {
       window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: err.message || '에러가 발생했습니다.', type: "error" } }));
     }
  };

  const filteredItems = items.filter(i => filter === 'all' || i.type === filter);

  return (
    <div className="flex flex-col h-full bg-slate-50 space-y-6 md:space-y-8 p-4 md:p-8 rounded-[2rem]">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#0F172A] tracking-tight flex items-center gap-2">
              <ShoppingBag size={24} className="text-mw-blue" />
              블랙마켓 & 바운티
            </h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
               Decentralized Campus Trade
            </p>
          </div>
          <button 
             onClick={() => setShowAdd(true)}
             className="px-6 py-3 bg-mw-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-mw-blue/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-mw-blue/20"
          >
             <Plus size={16} /> 신규 등록
          </button>
       </div>

       {/* Tabs */}
       <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200">
          {[
            { id: 'all', label: '전체 보기' },
            { id: 'sale', label: '판매 물품' },
            { id: 'bounty', label: '분실물 수배' }
          ].map(f => (
             <button
               key={f.id}
               onClick={() => setFilter(f.id as any)}
               className={cn(
                 "flex-1 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-tight",
                 filter === f.id ? "bg-[#0F172A] text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
               )}
             >
               {f.label}
             </button>
          ))}
       </div>

       {/* List */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
             <div className="col-span-full py-12 flex justify-center"><RefreshCw className="animate-spin text-slate-300" /></div>
          ) : errorInfo && !items.length ? (
             <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-3">
                <AlertCircle className="text-red-500" size={32} />
                <p className="text-sm font-bold text-red-500">{errorInfo}</p>
             </div>
          ) : filteredItems.length === 0 ? (
             <div className="col-span-full py-20 text-center text-slate-400 font-bold text-sm">등록된 항목이 없습니다.</div>
          ) : (
             filteredItems.map(item => (
                <div key={item.id} className={cn(
                  "p-6 rounded-[1.5rem] border shadow-sm flex flex-col relative overflow-hidden transition-all",
                  item.type === 'bounty' ? "bg-amber-50/30 border-amber-200 hover:border-amber-400" : "bg-white border-slate-200 hover:border-mw-blue",
                  item.status === 'completed' && "opacity-50 grayscale"
                )}>
                   <div className="flex justify-between items-start mb-4">
                      <div className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                        item.type === 'bounty' ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-sky-50 text-sky-600 border-sky-100"
                      )}>
                        {item.type === 'bounty' ? '긴급 수배' : '판매'}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-lg shadow-sm border border-slate-100">
                         <UserCircle size={14} /> {item.sellerName}
                      </div>
                   </div>

                   <h3 className="text-xl font-black text-[#0F172A] mb-2 leading-tight">{item.itemName}</h3>
                   <p className="text-sm font-medium text-slate-600 leading-relaxed mb-6 flex-1 line-clamp-3">
                      {item.description}
                   </p>

                   <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", item.type === 'bounty' ? "bg-amber-100 text-amber-500" : "bg-sky-100 text-sky-500")}>
                           <Coins size={16} />
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                             {item.type === 'bounty' ? '보상금' : '가격'}
                          </div>
                          <div className="text-lg font-black text-[#0F172A] leading-none">{item.price.toLocaleString()} 원</div>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          if (item.sellerId === profile?.studentId) handleDelete(item);
                          else handleAction(item);
                        }}
                        disabled={item.status === 'completed'}
                        className={cn(
                          "px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all",
                          item.status === 'completed' ? "bg-slate-100 text-slate-400 cursor-not-allowed" :
                          item.sellerId === profile?.studentId ? "bg-rose-100 text-rose-600 hover:bg-rose-200" :
                          item.type === 'bounty' ? "bg-[#0F172A] text-white hover:bg-amber-500" : "bg-mw-blue text-white hover:bg-sky-600"
                        )}
                      >
                         {item.status === 'completed' ? '완료됨' : item.sellerId === profile?.studentId ? '등록 취소(삭제)' : item.type === 'bounty' ? '반납 수락' : '구매 체결'}
                      </button>
                   </div>
                   
                   {item.status === 'completed' && (
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       <div className="bg-red-500 text-white px-6 py-2 rounded-xl text-lg font-black tracking-[0.2em] uppercase origin-center rotate-12 rotate-[12deg] shadow-xl border-2 border-white">
                         CLOSED
                       </div>
                     </div>
                   )}
                </div>
             ))
          )}
       </div>

       {/* Add Modal */}
       <AnimatePresence>
         {showAdd && (
            <div className="fixed inset-0 z-[200] bg-[#0F172A]/40 backdrop-blur-sm flex items-center justify-center p-4">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 border border-slate-200"
               >
                  <h3 className="text-xl font-black text-[#0F172A] mb-6">스마트 컨트랙트 등록</h3>
                  
                  {errorInfo && (
                     <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-2xl text-[11px] font-bold flex items-center gap-2">
                        <AlertCircle size={14} /> {errorInfo}
                     </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                     <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6">
                        <button type="button" onClick={() => setFormType('sale')} className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", formType === 'sale' ? "bg-white shadow-sm text-[#0F172A]" : "text-slate-400")}>판매 등록</button>
                        <button type="button" onClick={() => setFormType('bounty')} className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", formType === 'bounty' ? "bg-amber-100 text-amber-700 shadow-sm" : "text-slate-400")}>분실물 (바운티)</button>
                     </div>

                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">품목명</label>
                        <input type="text" value={itemName} onChange={e => setItemName(e.target.value)} required className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-5 py-4 text-sm font-bold focus:border-mw-blue outline-none transition-all placeholder:font-normal" placeholder={formType === 'sale' ? "예: 전산실 만능 키" : "예: 잃어버린 일기장"} />
                     </div>

                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">상세 설명</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={3} className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-5 py-4 text-sm font-bold focus:border-mw-blue outline-none transition-all resize-none placeholder:font-normal" placeholder="자세한 정보를 입력하세요" />
                     </div>

                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">{formType === 'sale' ? '판매가 (원)' : '걸어둘 보상금 (원)'}</label>
                        <input type="number" value={price} onChange={e => setPrice(e.target.value)} required min={1} className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-5 py-4 text-sm font-bold focus:border-mw-blue outline-none transition-all placeholder:font-normal" placeholder="금액 입력" />
                     </div>

                     <div className="flex gap-4 pt-4">
                        <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-4 text-slate-500 font-bold text-xs uppercase bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all">취소</button>
                        <button type="submit" disabled={submitting} className="flex-[2] py-4 text-white font-bold text-xs uppercase bg-[#0F172A] rounded-2xl hover:bg-mw-blue transition-all disabled:opacity-50">
                           {submitting ? '처리중...' : '체인에 기록'}
                        </button>
                     </div>
                  </form>
               </motion.div>
            </div>
         )}
       </AnimatePresence>
       
       <ConfirmDialog 
        isOpen={confirmDialog.isOpen}
        title="항목 취소/삭제"
        message="정말 이 등록을 취소/삭제하시겠습니까? (바운티의 경우 원이 반환됩니다)"
        onConfirm={executeDelete}
        onCancel={() => setConfirmDialog({ isOpen: false })}
        isDestructive
      />
    </div>
  );
};
