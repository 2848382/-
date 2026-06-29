import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useGame } from '../contexts/GameContext';
import { AnonymousTip } from '../types';
import { checkRateLimit } from '../hooks/useRateLimit';
import { MessageCircle, Send, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export const AnonymousTipBox: React.FC = () => {
  const { user, profile, allStudents } = useGame();
  const [tips, setTips] = useState<AnonymousTip[]>([]);
  const [outbox, setOutbox] = useState<AnonymousTip[]>([]);
  const [tab, setTab] = useState<'inbox' | 'outbox'>('inbox');
  const [loading, setLoading] = useState(true);

  // Send form
  const [targetUid, setTargetUid] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchTips = async () => {
      const qIn = query(collection(db, 'anonymous_tips'), where('recipientUid', '==', user.uid));
      const qOut = query(collection(db, 'anonymous_tips'), where('senderUid', '==', user.uid));
      
      const [snapIn, snapOut] = await Promise.all([getDocs(qIn), getDocs(qOut)]);
      
      const inData = snapIn.docs.map(d => ({ id: d.id, ...d.data() } as AnonymousTip))
                           .sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      const outData = snapOut.docs.map(d => ({ id: d.id, ...d.data() } as AnonymousTip))
                            .sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
                            
      setTips(inData);
      setOutbox(outData);
      setLoading(false);
    };
    fetchTips();
  }, [user]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !targetUid || !content) return;
    
    // Cooldown check (5 minutes)
    const rateCheck = await checkRateLimit(user.uid, profile.name, 'anonymous_tip', 'cooldown', 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: rateCheck.message, type: 'warning' } }));
      return;
    }

    setSending(true);
    try {
      const newTip = {
        senderUid: user.uid,
        recipientUid: targetUid,
        content,
        isRead: false,
        createdAt: serverTimestamp()
      };
      const ref = await addDoc(collection(db, 'anonymous_tips'), newTip);
      setOutbox([{...newTip as any, id: ref.id}].concat(outbox) as any);
      setContent('');
      setTargetUid('');
      
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "익명 제보가 전송되었습니다.", type: 'success' } }));
      setTab('outbox');
    } catch(e) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "오류가 발생했습니다.", type: 'error' } }));
    }
    setSending(false);
  };

  const markAsRead = async (id: string, isRead: boolean) => {
    if(isRead) return;
    await updateDoc(doc(db, 'anonymous_tips', id), { isRead: true });
    setTips(tips.map(t => t.id === id ? { ...t, isRead: true } : t));
  };

  if (loading) return <div>로딩중...</div>;

  const unreadCount = tips.filter(t => !t.isRead).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-white">
            <MessageCircle size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">익명 제보함</h2>
            <p className="text-sm text-slate-500">누군가에게, 혹은 누군가로부터 발신자를 숨긴 채 도착합니다.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
        <button 
          onClick={() => setTab('inbox')}
          className={cn("flex-1 py-2 rounded-lg font-bold text-sm transition-all focus:outline-none flex justify-center items-center gap-2", tab === 'inbox' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
        >
           수신함 {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
        </button>
        <button 
          onClick={() => setTab('outbox')}
          className={cn("flex-1 py-2 rounded-lg font-bold text-sm transition-all focus:outline-none", tab === 'outbox' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
        >
           발신함 / 새 제보
        </button>
      </div>

      {tab === 'inbox' && (
        <div className="space-y-3">
          {tips.length === 0 ? (
             <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-slate-100">도착한 제보가 없습니다.</div>
          ) : (
             tips.map(tip => (
               <div key={tip.id} 
                    onClick={() => markAsRead(tip.id, tip.isRead)}
                    className={cn("p-5 rounded-xl border cursor-pointer transition-colors relative", tip.isRead ? "bg-slate-50 border-slate-100" : "bg-white border-blue-200 shadow-sm")}>
                 {!tip.isRead && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500" />}
                 <div className="text-xs font-bold text-slate-400 mb-2">발신: 익명</div>
                 <p className={cn("text-sm whitespace-pre-wrap leading-relaxed", tip.isRead ? "text-slate-600" : "text-slate-900 font-medium")}>{tip.content}</p>
                 <div className="text-[10px] text-slate-400 mt-4 font-mono">{new Date(tip.createdAt?.toMillis?.() || Date.now()).toLocaleString()}</div>
               </div>
             ))
          )}
        </div>
      )}

      {tab === 'outbox' && (
        <div className="space-y-6">
           <form onSubmit={handleSend} className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
             <div className="space-y-2">
               <label className="text-sm font-bold text-slate-700">수신자 선택 (선택된 대상에게만 전송)</label>
               <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={targetUid} onChange={e => setTargetUid(e.target.value)} required>
                 <option value="">학생을 선택하세요</option>
                 {allStudents.map(s => <option key={s.uid} value={s.uid}>{s.name} ({s.studentId})</option>)}
               </select>
             </div>
             <div className="space-y-2">
               <label className="text-sm font-bold text-slate-700">제보 내용</label>
               <textarea required maxLength={300} placeholder="내용을 입력하세요..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm h-24" value={content} onChange={e => setContent(e.target.value)} />
             </div>
             <button disabled={sending || !targetUid || !content} className="w-full py-3 bg-slate-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-700 disabled:opacity-50">
                <Send size={16}/> 제보 전송 완료 시 나를 추적할 수 없습니다
             </button>
           </form>

           <div className="space-y-3">
              <h3 className="font-bold text-slate-700 text-sm pl-1">내가 보낸 제보</h3>
              {outbox.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">보낸 제보가 없습니다.</div>
              ) : (
                outbox.map(tip => {
                  const targetName = allStudents.find(s => s.uid === tip.recipientUid)?.name || '알 수 없음';
                  return (
                    <div key={tip.id} className="p-4 bg-white border border-slate-100 rounded-xl flex justify-between items-start gap-4">
                       <div className="flex-1">
                          <div className="text-xs font-bold text-blue-600 mb-1">To: {targetName}</div>
                          <p className="text-sm text-slate-600 truncate">{tip.content}</p>
                       </div>
                       <div className="text-[10px] text-slate-400 flex flex-col items-end gap-1">
                          {tip.isRead ? <span className="text-emerald-500 flex items-center gap-0.5"><Check size={10}/> 읽음</span> : <span>읽지 않음</span>}
                       </div>
                    </div>
                  );
                })
              )}
           </div>
        </div>
      )}
    </div>
  );
};
