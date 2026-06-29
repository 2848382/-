import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, doc, updateDoc, writeBatch, Timestamp, onSnapshot } from 'firebase/firestore';
import { Users, Play, RotateCcw, ShieldAlert, Gift, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useToast } from '../contexts/ToastContext';
import { useDialog } from '../contexts/DialogContext';

export const MasterManittoPanel: React.FC = () => {
  const { systemConfig, allStudents } = useGame();
  const { showToast } = useToast();
  const { confirm } = useDialog();
  const [isMatching, setIsMatching] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'manitto_assignments'), (snap) => {
      setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const toggleManitto = async () => {
    try {
      const configRef = doc(db, 'system', 'config');
      await updateDoc(configRef, {
        manittoEnabled: !systemConfig.manittoEnabled
      });
      showToast(systemConfig.manittoEnabled ? "마니또 시스템이 종료되었습니다." : "마니또 시스템이 활성화되었습니다.", "info");
    } catch (e) {
      showToast("설정 변경 실패", "error");
    }
  };

  const toggleReveal = async () => {
    try {
      const configRef = doc(db, 'system', 'config');
      await updateDoc(configRef, {
        manittoRevealed: !systemConfig.manittoRevealed
      });
      showToast(systemConfig.manittoRevealed ? "정체 공개가 취소되었습니다." : "모든 마니또의 정체가 공개되었습니다!", "success");
    } catch (e) {
      showToast("설정 변경 실패", "error");
    }
  };

  const startAutoMatch = async () => {
    if (!(await confirm({ title: '자동 매칭', message: "현재 모든 마니또 배정을 초기화하고 새로 매칭하시겠습니까? (익명성 유지를 위해 신중히 결정하세요)" }))) return;
    
    setIsMatching(true);
    try {
      const students = allStudents.filter(s => !s.isAdmin);
      if (students.length < 2) {
        showToast("매칭할 학생이 부족합니다 (최소 2명)", "warning");
        return;
      }

      // 셔플 알고리즘 (하나씩 밀기 방식 - 본인이 본인을 뽑지 않도록 보장)
      const shuffled = [...students].sort(() => Math.random() - 0.5);
      const batch = writeBatch(db);

      // 기존 배정 삭제 (단순화를 위해 전설적인 배치 삭제는 생략하고 덮어쓰기나 초기화 필요)
      // 실제로는 하나씩 ID를 지정해서 관리하는 게 좋음 (giverUid 기준)
      
      for (let i = 0; i < shuffled.length; i++) {
        const giver = shuffled[i];
        const receiver = shuffled[(i + 1) % shuffled.length];
        
        const assignmentRef = doc(db, 'manitto_assignments', giver.uid);
        batch.set(assignmentRef, {
          giverId: giver.uid,
          giverName: giver.name,
          receiverId: receiver.uid,
          receiverName: receiver.name,
          status: 'active',
          missionsDone: [],
          createdAt: Timestamp.now()
        });

        // 모든 학생에게 e-알리미 알림 전송
        const letterRef = doc(collection(db, 'letters'));
        batch.set(letterRef, {
          senderUid: 'SYSTEM',
          recipientUid: giver.uid,
          content: `[마니또] 새로운 마니또 배정이 완료되었습니다! 당신의 비밀 친구와 미션을 확인하세요.`,
          deliverAt: Timestamp.now(),
          isDelivered: true,
          isRead: false,
          createdAt: Timestamp.now()
        });
      }

      await batch.commit();
      showToast(`${shuffled.length}명의 마니또 배정이 완료되었습니다.`, "success");
    } catch (e) {
      console.error(e);
      showToast("매칭 중 오류 발생", "error");
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
        <div>
          <h3 className="font-bold text-indigo-900 flex items-center gap-2">
            <Gift size={18} /> 마니또 시스템 제어
          </h3>
          <p className="text-xs text-indigo-600 mt-1">학생들에게 비밀 마니또와 미션을 부여합니다.</p>
        </div>
        <button
          onClick={toggleManitto}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            systemConfig.manittoEnabled 
              ? 'bg-red-500 text-white shadow-lg' 
              : 'bg-indigo-600 text-white'
          }`}
        >
          {systemConfig.manittoEnabled ? '시스템 종료' : '시스템 시작'}
        </button>
      </div>

      <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
        <div>
          <h3 className="font-bold text-emerald-900 flex items-center gap-2">
            <Users size={18} /> 정체 전체 공개
          </h3>
          <p className="text-xs text-emerald-600 mt-1">이벤트 종료 후 모든 학생들의 마니또 관계를 공개합니다.</p>
        </div>
        <button
          onClick={toggleReveal}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            systemConfig.manittoRevealed 
              ? 'bg-amber-500 text-white shadow-lg' 
              : 'bg-emerald-600 text-white'
          }`}
        >
          {systemConfig.manittoRevealed ? '공개 취소' : '정체 공개'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={startAutoMatch}
          disabled={isMatching}
          className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-3xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-110 transition-transform">
            <RotateCcw size={24} />
          </div>
          <span className="font-bold text-slate-800 text-sm">무작위 자동 배정</span>
          <span className="text-[10px] text-slate-500 mt-1">모든 유저 새로 매칭</span>
        </button>

        <div className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-3xl">
          <div className="text-2xl font-black text-indigo-600">{assignments.length}</div>
          <span className="font-bold text-slate-800 text-sm">현재 배정 인원</span>
          <span className="text-[10px] text-slate-500 mt-1">활동 중인 마니또 쌍</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Users size={16} className="text-indigo-500" /> 배정 현황 (마스터 전용)
          </h4>
        </div>
        <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
          {assignments.length > 0 ? (
            assignments.map((as: any) => (
              <div key={as.id} className="p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">{as.giverName}</span>
                  <span className="text-slate-400">→</span>
                  <span className="font-bold text-indigo-600">{as.receiverName}</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  미션 {as.missionsDone?.length || 0}개 완료
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              배정된 마니또가 없습니다.
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
        <ShieldAlert size={18} className="text-amber-500 shrink-0" />
        <div className="text-[11px] text-amber-700 leading-relaxed">
          <strong>보안 주의:</strong> 마니또 시스템은 익명성이 핵심입니다. 마스터는 학생들에게 정체를 노출하지 않도록 주의하세요. 배정 현황은 마스터 패널에서만 확인 가능합니다.
        </div>
      </div>
    </div>
  );
};
