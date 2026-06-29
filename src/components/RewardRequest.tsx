import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useGame } from '../contexts/GameContext';
import { RewardRequest as RewardRequestType } from '../types';
import { Gift, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '../lib/utils'; // if needed

export const RewardRequest: React.FC = () => {
  const { user, profile, systemConfig } = useGame();
  const [requests, setRequests] = useState<RewardRequestType[]>([]);
  const [type, setType] = useState<'stat' | 'item'>('stat');
  const [statChanges, setStatChanges] = useState<Record<string, number>>({});
  const [itemName, setItemName] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchRequests = async () => {
      const q = query(
        collection(db, 'reward_requests'),
        where('requesterId', '==', user.uid),
        // order by requires composite index usually, we sort locally or just order if no error
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as RewardRequestType));
      data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setRequests(data);
      setLoading(false);
    };
    fetchRequests();
  }, [user]);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !reason) return;
    if (pendingCount >= 3) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "대기 중인 신청이 너무 많습니다.", type: 'warning' } }));
      return;
    }

    setSubmitting(true);
    try {
      const newReq = {
        requesterId: user.uid,
        requesterName: profile.name,
        type,
        reason,
        status: 'pending' as const,
        createdAt: serverTimestamp(),
        ...(type === 'stat' ? { statChanges } : { itemName })
      };
      
      await addDoc(collection(db, 'reward_requests'), newReq);
      
      // Add event log
      await addDoc(collection(db, 'event_logs'), {
        uid: user.uid,
        type: 'stat_change',
        description: `보상 신청: ${reason}`,
        descriptionMasked: `활동 기록: ${reason}`,
        loopIndex: systemConfig?.currentLoop || 1,
        createdAt: serverTimestamp(),
      });

      setReason('');
      setItemName('');
      setStatChanges({});
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "보상 신청이 완료되었습니다.", type: 'success' } }));
      // locally append
      setRequests([{...newReq as any, id: Date.now().toString()}].concat(requests) as any[]);
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "오류가 발생했습니다.", type: 'error' } }));
    }
    setSubmitting(false);
  };

  const handleStatChange = (stat: string, val: string) => {
    const num = parseInt(val) || 0;
    if (num < -50 || num > 50) return;
    setStatChanges(prev => ({ ...prev, [stat]: num }));
  };

  if (loading) return <div>로딩중...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
          <Gift size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">보상 신청</h2>
          <p className="text-sm text-slate-500">탐사 및 행동 보상을 신청하세요. (대기 중인 신청 {pendingCount}/3)</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
        <div className="space-y-2">
           <label className="text-sm font-bold text-slate-900">보상 유형</label>
           <div className="flex gap-4">
             <label className="flex items-center gap-2 cursor-pointer">
               <input type="radio" checked={type === 'stat'} onChange={() => setType('stat')} />
               <span className="text-sm font-medium">스탯 변경</span>
             </label>
             <label className="flex items-center gap-2 cursor-pointer">
               <input type="radio" checked={type === 'item'} onChange={() => setType('item')} />
               <span className="text-sm font-medium">아이템 획득</span>
             </label>
           </div>
        </div>

        {type === 'stat' ? (
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900">스탯 수치 (±50)</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['academic', 'physical', 'bonding', 'rebellion', 'stress', 'stamina', 'balance', 'trauma'].map(stat => (
                <div key={stat}>
                   <span className="block text-xs text-slate-500 mb-1">{stat}</span>
                   <input 
                     type="number" 
                     className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm"
                     value={statChanges[stat] || ''} 
                     onChange={e => handleStatChange(stat, e.target.value)} 
                     placeholder="0"
                   />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900">아이템명</label>
            <input 
               type="text" 
               required 
               className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm"
               value={itemName} 
               onChange={e => setItemName(e.target.value)} 
               placeholder="예: 낡은 일기장" 
             />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-900">신청 사유 (필수)</label>
          <textarea 
            required 
            maxLength={100}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm min-h-[100px]"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="어떤 행동의 결과로 이 보상을 신청하는지 명확히 적어주세요."
          />
        </div>

        <button 
          type="submit" 
          disabled={submitting || pendingCount >= 3}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
        >
          {submitting ? '신청 중...' : '신청서 제출'}
        </button>
      </form>

      <div className="space-y-4">
        <h3 className="font-bold text-slate-900">내 신청 현황</h3>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">신청 내역이 없습니다.</div>
        ) : (
          requests.map(req => (
            <div key={req.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start justify-between">
              <div>
                 <div className="flex items-center gap-2 mb-1">
                   {req.status === 'pending' && <span className="text-amber-500 font-bold text-xs flex items-center gap-1"><Clock size={12}/> 대기중</span>}
                   {req.status === 'approved' && <span className="text-emerald-500 font-bold text-xs flex items-center gap-1"><CheckCircle size={12}/> 승인됨</span>}
                   {req.status === 'rejected' && <span className="text-rose-500 font-bold text-xs flex items-center gap-1"><XCircle size={12}/> 거절됨</span>}
                   <span className="text-slate-400 text-xs text-mono">{new Date(req.createdAt?.toMillis?.() || Date.now()).toLocaleString()}</span>
                 </div>
                 <div className="font-medium text-sm text-slate-900">{req.reason}</div>
                 <div className="text-xs text-slate-500 mt-1">
                   {req.type === 'stat' ? '스탯 변경 신청' : `아이템 획득: ${req.itemName}`}
                 </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
