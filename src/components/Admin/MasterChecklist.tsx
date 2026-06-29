import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getCountFromServer, getDocs, onSnapshot } from 'firebase/firestore';
import { useGame } from '../../contexts/GameContext';
import { CheckSquare, AlertCircle } from 'lucide-react';

export const MasterChecklist: React.FC = () => {
  const { allStudents, systemConfig } = useGame();
  const [counts, setCounts] = useState({
    pendingUsers: 0,
    unreadTips: 0,
    pendingRewards: 0,
    pendingRelations: 0,
    recentDanger: 0,
  });

  useEffect(() => {
    // This could be heavy with multiple listeners, so using a simple poll or just few lightweight queries.
    // For simplicity we will fetch count once or listen.
    const unsubR = onSnapshot(query(collection(db, 'reward_requests'), where('status', '==', 'pending')), s => setCounts(prev => ({...prev, pendingRewards: s.docs.length})));
    const unsubRel = onSnapshot(query(collection(db, 'relationships'), where('status', '==', 'pending')), s => setCounts(prev => ({...prev, pendingRelations: s.docs.length})));
    const unsubU = onSnapshot(query(collection(db, 'users'), where('approvalStatus', '==', 'pending')), s => setCounts(prev => ({...prev, pendingUsers: s.docs.length})));

    // recent danger logs
    const now = new Date();
    now.setHours(now.getHours() - 1);
    const unsubLog = onSnapshot(query(collection(db, 'activity_logs'), where('severity', '==', 'danger'), where('createdAt', '>=', now)), s => setCounts(prev => ({...prev, recentDanger: s.docs.length})));

    return () => {
      unsubR(); unsubRel(); unsubU(); unsubLog();
    };
  }, []);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <CheckSquare className="text-emerald-600" />
        세션 운영 점검표 (Checklist)
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard title="승인된 참가자" value={allStudents.filter(s => s.approvalStatus === 'approved').length} />
        <StatCard title="대기 사용자" value={counts.pendingUsers} alert={counts.pendingUsers > 0} />
        <StatCard title="대기 보상 신청" value={counts.pendingRewards} alert={counts.pendingRewards > 0} />
        <StatCard title="대기 관계 신청" value={counts.pendingRelations} alert={counts.pendingRelations > 0} />
        <StatCard title="최근 위험 행동" value={counts.recentDanger} alert={counts.recentDanger > 0} />
        <StatCard title="현재 루프" value={systemConfig?.currentLoop || 1} />
      </div>
    </div>
  );
};

const StatCard = ({ title, value, alert = false }: { title: string, value: string | number, alert?: boolean }) => (
  <div className={`p-4 rounded-xl border ${alert ? 'border-rose-300 bg-rose-50' : 'border-slate-100 bg-slate-50'}`}>
    <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
      {title}
      {alert && <AlertCircle size={14} className="text-rose-500" />}
    </div>
    <div className={`text-2xl font-black ${alert ? 'text-rose-600' : 'text-slate-800'}`}>
      {value}
    </div>
  </div>
);
