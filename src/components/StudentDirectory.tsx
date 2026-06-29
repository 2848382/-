import React, { useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { UserProfile, Bond } from "../types";
import { useGame } from "../contexts/GameContext";
import {
  Heart,
  UserPlus,
  Star,
  Zap,
  MessageSquare,
  Search,
  Award,
  Target,
  Gift,
  Coins,
  MessageCircle,
  Swords,
  AlertCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../lib/utils";

import { ActionMenu } from "./ActionMenu";

import { ConfirmDialog } from "./ui/ConfirmDialog";
import { InputDialog } from "./ui/InputDialog";

export const StudentDirectory: React.FC = () => {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(
    null,
  );
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [bonds, setBonds] = useState<Record<string, Bond>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterHighStress, setFilterHighStress] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile, sendMessage, sendMoney, sendGift } = useGame();

  // Dialog States
  const [inputDialog, setInputDialog] = useState<{isOpen: boolean; title: string; message: string; type: 'money' | 'gift' | 'dm'; defaultValue?: string}>({isOpen: false, title: '', message: '', type: 'money'});
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean; title: string; message: string; onConfirm: () => void}>({isOpen: false, title: '', message: '', onConfirm: () => {}});

  const handleSendMoney = async (amountStr: string) => {
    if (!selectedStudent) return;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) {
       window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "올바른 금액을 입력하세요.", type: "error" } }));
       return;
    }

    try {
      await sendMoney(selectedStudent.uid, amount);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: `${amount} 원을 성공적으로 보냈습니다.`, type: "success" } }));
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e.message, type: "error" } }));
    }
  };

  const handleSendGift = async (giftName: string) => {
    if (!selectedStudent || !giftName) return;
    try {
      await sendGift(selectedStudent.uid, giftName);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "선물을 보냈습니다.", type: "success" } }));
    } catch (e: any) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e.message, type: "error" } }));
    }
  };

  const handleSetRival = async () => {
    if (!selectedStudent || !auth.currentUser) return;
    const isRival = profile?.rivalId === selectedStudent.uid;
    const confirmMsg = isRival
      ? `${selectedStudent.name}님을 라이벌에서 해제하시겠습니까?`
      : `${selectedStudent.name}님을 라이벌로 지정하시겠습니까? 명성을 건 학업 경쟁이 시작됩니다.`;

    setConfirmDialog({
      isOpen: true,
      title: isRival ? "라이벌 해제" : "라이벌 지정",
      message: confirmMsg,
      onConfirm: async () => {
        if (!auth.currentUser) return;
        try {
          await updateDoc(doc(db, "users", auth.currentUser.uid), {
            rivalId: isRival ? null : selectedStudent.uid,
            updatedAt: serverTimestamp(),
          });
          window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: isRival ? "해제되었습니다." : "라이벌로 지정되었습니다.", type: "success" } }));
        } catch(e) {
          window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "오류가 발생했습니다.", type: "error" } }));
        }
      }
    });
  };

  const handleSendDM = async (msg: string) => {
    if (!selectedStudent || !msg) return;
    try {
      await sendMessage(selectedStudent.uid, msg);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "메시지를 보냈습니다.", type: "success" } }));
    } catch (e: any) {
      // GameContext handles cooldown error
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubStudents = onSnapshot(collection(db, "users"), (snap) => {
      setStudents(
        snap.docs
          .map((d) => d.data() as UserProfile)
          .filter((s) => s.uid !== auth.currentUser?.uid && s.role !== 'admin' && s.email !== '10049810a@gmail.com' && !s.isAdmin),
      );
      setLoading(false);
    }, (error) => {
      console.error("StudentDirectory Students Error:", error);
      setError("데이터 로딩 실패");
      setLoading(false);
    });

    if (auth.currentUser) {
      const unsubBonds = onSnapshot(
        collection(db, "users", auth.currentUser.uid, "bonds"),
        (snap) => {
          const bondMap: Record<string, Bond> = {};
          snap.docs.forEach((d) => {
            const b = d.data() as Bond;
            bondMap[b.toUid] = b;
          });
          setBonds(bondMap);
        }, (error) => console.error("StudentDirectory Bonds Error:", error)
      );
      return () => {
        unsubStudents();
        unsubBonds();
      };
    }

    return () => unsubStudents();
  }, []);

  const handleUpdateBond = async (
    targetId: string,
    field: keyof Bond,
    amount: number,
  ) => {
    if (!auth.currentUser) return;
    const bondRef = doc(db, "users", auth.currentUser.uid, "bonds", targetId);

    const existing = await getDoc(bondRef);
    if (!existing.exists()) {
      await setDoc(bondRef, {
        fromUid: auth.currentUser.uid,
        toUid: targetId,
        trust: field === "trust" ? Math.max(0, amount) : 0,
        hatred: field === "hatred" ? Math.max(0, amount) : 0,
        obsession: field === "obsession" ? Math.max(0, amount) : 0,
        pity: field === "pity" ? Math.max(0, amount) : 0,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(bondRef, {
        [field]: Math.max(
          0,
          Math.min(100, Number((existing.data()[field] || 0) + amount)),
        ),
        updatedAt: serverTimestamp(),
      });
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentId.includes(searchTerm);

    if (filterHighStress) {
      return matchesSearch && (s.stress || 0) >= 80;
    }

    return matchesSearch;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 md:gap-8 min-w-0">
      <section className="flex-1 mw-card flex flex-col min-w-0 relative">
        <div className="sticky top-0 z-10 p-6 md:p-8 border-b border-[var(--color-border)] bg-white/95 backdrop-blur-sm rounded-t-[1.5rem]">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-4 md:mb-6">
            <div>
              <h3 className="text-subhead text-[var(--color-primary-900)]">
                학생 명부
              </h3>
              <p className="text-micro text-[var(--color-neutral-400)] mt-1">
                2학년 2반 데이터베이스
              </p>
            </div>
            <div className="mw-badge bg-[var(--color-neutral-50)] text-[var(--color-neutral-700)] border border-[var(--color-border)] self-start sm:self-auto py-1.5 px-4">
              전체 인원: {students.length}명
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4 md:mb-6">
            <div className="relative group flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-neutral-400)] group-focus-within:text-[var(--color-primary-900)] transition-colors"
                size={18}
              />
              <input
                type="text"
                placeholder="이름 또는 학번 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mw-input pl-11"
              />
            </div>
            <button
              onClick={() => setFilterHighStress(!filterHighStress)}
              className={cn(
                "px-4 py-2 rounded-xl border font-bold text-[10px] uppercase tracking-widest transition-all shrink-0 flex items-center gap-2",
                filterHighStress 
                  ? "bg-red-500 text-white border-red-600 shadow-md animate-pulse" 
                  : "bg-white text-[var(--color-neutral-400)] border-[var(--color-border)] opacity-60 hover:opacity-100"
              )}
            >
              <AlertCircle size={14} />
              위험군 식별 (Stress 80+)
            </button>
          </div>
        </div>

        <div className="divide-y divide-[var(--color-border)] max-h-[500px] md:max-h-[600px] overflow-y-auto custom-scrollbar">
          {loading ? (
             <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-4 border-[var(--color-primary-900)] border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-bold text-[var(--color-neutral-400)] uppercase">데이터 분석 중...</p>
             </div>
          ) : error ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
               <AlertCircle className="text-red-500" size={32} />
               <p className="text-sm font-bold text-red-500">{error}</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-20 text-center text-[var(--color-neutral-400)] text-sm">
               검색 결과가 없습니다.
            </div>
          ) : (
            filteredStudents.map((student) => {
            const bond = bonds[student.uid];
            return (
              <div
                key={student.uid}
                onClick={() => setSelectedStudent(student)}
                className={cn(
                  "p-3 md:p-4 px-6 md:px-8 cursor-pointer hover:bg-[var(--color-neutral-50)] transition-all flex items-center justify-between group",
                  selectedStudent?.uid === student.uid && "bg-[var(--color-primary-50)]/50",
                )}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative shrink-0">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border-2 border-transparent transition-all overflow-hidden bg-[var(--color-neutral-100)]",
                        selectedStudent?.uid === student.uid &&
                          "border-[var(--color-primary-900)]",
                      )}
                    >
                      {student.photoURL ? (
                        <img
                          src={student.photoURL}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserPlus size={18} className="text-[var(--color-neutral-300)]" />
                      )}
                    </div>
                    {/* Online status dot */}
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-[var(--color-success)] border-2 border-white rounded-full"></div>
                  </div>
                  <div className="flex flex-row items-center gap-3 truncate">
                    <div className="text-sm font-black text-[var(--color-primary-900)] tracking-tight">
                      {student.name}
                    </div>
                    <span className="text-micro text-[var(--color-neutral-400)]">
                      {student.studentId}
                    </span>
                    {profile?.rivalId === student.uid && (
                      <Target size={14} className="text-[var(--color-danger)]" />
                    )}
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button className="p-2 bg-white border border-[var(--color-border)] text-[var(--color-neutral-600)] rounded-lg hover:bg-[var(--color-primary-900)] hover:text-white transition-all shadow-sm">
                    <MessageSquare size={16} />
                  </button>
                </div>
              </div>
            );
          }))}
        </div>
      </section>

      <section className="lg:w-[400px] xl:w-[450px] mw-card p-6 md:p-10 flex flex-col items-center min-h-[400px] lg:min-h-[600px] relative overflow-hidden">
        {selectedStudent ? (
          <div className="w-full space-y-8 md:space-y-10 relative z-10">
            <div className="text-center group">
              <div className="w-32 h-32 md:w-40 md:h-40 mx-auto rounded-3xl bg-[var(--color-neutral-50)] mb-6 flex items-center justify-center border border-[var(--color-border)] shadow-sm overflow-hidden transform transition-all group-hover:scale-105 group-hover:-rotate-1">
                {selectedStudent.photoURL ? (
                  <img
                    src={selectedStudent.photoURL}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserPlus size={56} className="text-[var(--color-neutral-200)]" />
                )}
              </div>
              <h4 className="text-display text-[var(--color-primary-900)]">
                {selectedStudent.name}
              </h4>
              <p className="text-micro text-[var(--color-neutral-400)] mt-2">
                Identity Card Protocol
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <BondAction
                icon={<Heart size={18} className="text-[var(--color-primary-500)]" />}
                label="협력"
                value={bonds[selectedStudent.uid]?.trust || 0}
                color="var(--color-success)"
                onClick={() =>
                  handleUpdateBond(selectedStudent.uid, "trust", 5)
                }
              />
              <BondAction
                icon={<Award size={18} className="text-[var(--color-primary-500)]" />}
                label="존경"
                value={bonds[selectedStudent.uid]?.hatred || 0}
                color="var(--color-purple-500)"
                onClick={() =>
                  handleUpdateBond(selectedStudent.uid, "hatred", 5)
                }
              />
              <BondAction
                icon={<Star size={18} className="text-[var(--color-primary-500)]" />}
                label="교류"
                value={bonds[selectedStudent.uid]?.obsession || 0}
                color="var(--color-warning)"
                onClick={() =>
                  handleUpdateBond(selectedStudent.uid, "obsession", 5)
                }
              />
              <BondAction
                icon={<Zap size={18} className="text-[var(--color-primary-500)]" />}
                label="우정"
                value={bonds[selectedStudent.uid]?.pity || 0}
                color="var(--color-primary-500)"
                onClick={() => handleUpdateBond(selectedStudent.uid, "pity", 5)}
              />
            </div>

            {/* [UI개선] 기존 흩어져 있던 액션 버튼들 2x2 그리드로 통일 */}
            <div className="grid grid-cols-2 gap-2.5 w-full mt-4">
              {[
                {
                  icon: <MessageCircle size={16} />,
                  label: "메시지",
                  onClick: () => setInputDialog({ isOpen: true, title: "메시지 보내기", message: `${selectedStudent.name}님에게 보낼 메시지를 입력하세요:`, type: 'dm', defaultValue: '' }),
                  color: "var(--color-primary-500)",
                },
                {
                  icon: <Coins size={16} />,
                  label: "송금",
                  onClick: () => setInputDialog({ isOpen: true, title: "송금하기", message: `${selectedStudent.name}님에게 보낼 금액(원)을 입력하세요:`, type: 'money', defaultValue: '1000' }),
                  color: "var(--color-success)",
                },
                {
                  icon: <Gift size={16} />,
                  label: "선물",
                  onClick: () => setInputDialog({ isOpen: true, title: "선물하기", message: `${selectedStudent.name}님에게 보낼 선물 이름을 입력하세요:`, type: 'gift', defaultValue: '초코우유 기프티콘' }),
                  color: "#ec4899",
                },
                {
                  icon: <Swords size={16} />,
                  label: profile?.rivalId === selectedStudent.uid ? "라이벌 해제" : "라이벌 지정",
                  onClick: handleSetRival,
                  color: profile?.rivalId === selectedStudent.uid ? "var(--color-danger)" : "var(--color-warning)",
                },
              ].map(({ icon, label, onClick, color }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-sub)] hover:bg-[var(--color-neutral-100)] active:scale-[0.97] transition-all font-bold text-sm text-[var(--color-text-primary)]"
                >
                  <span style={{ color }}>{icon}</span>
                  {label}
                </button>
              ))}
            </div>

            {/* 행동하기 버튼은 전체 너비로 아래에 */}
            <button
              onClick={() => setShowActionMenu(true)}
              className="w-full mt-2.5 mw-btn-primary py-3.5 rounded-2xl flex items-center justify-center gap-2"
            >
              <Zap size={17} className="text-amber-400" />
              행동하기
            </button>

            <div className="bg-[var(--color-neutral-50)] p-5 rounded-2xl text-[11px] leading-relaxed text-[var(--color-neutral-500)] border border-[var(--color-border)] italic font-medium">
              "{selectedStudent.name}(이)와의 긍정적인 관계 형성은 학교 생활에
              큰 도움이 됩니다. 서로 존중하는 학급 분위기를 만들어가세요."
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-[var(--color-neutral-200)] space-y-4">
            <UserPlus size={80} strokeWidth={1} />
            <div className="text-center">
              <p className="text-subhead uppercase text-[var(--color-neutral-400)]">
                Select a Pupil
              </p>
              <p className="text-micro mt-2 text-[var(--color-neutral-300)]">
                Connection required for data analysis
              </p>
            </div>
          </div>
        )}
      </section>

      <AnimatePresence>
        {showActionMenu && selectedStudent && (
          <ActionMenu
            targetUid={selectedStudent.uid}
            targetName={selectedStudent.name}
            onClose={() => setShowActionMenu(false)}
          />
        )}
      </AnimatePresence>

      <InputDialog
        isOpen={inputDialog.isOpen}
        title={inputDialog.title}
        message={inputDialog.message}
        defaultValue={inputDialog.defaultValue}
        onConfirm={(val) => {
          if (inputDialog.type === 'money') handleSendMoney(val);
          else if (inputDialog.type === 'gift') handleSendGift(val);
          else if (inputDialog.type === 'dm') handleSendDM(val);
        }}
        onCancel={() => setInputDialog(prev => ({ ...prev, isOpen: false }))}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

const BondAction = ({ icon, label, value, color, onClick, className = "" }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "p-4 rounded-2xl border border-[var(--color-border)] bg-white flex flex-col gap-1.5 hover:bg-[var(--color-neutral-50)] transition-all active:scale-95 shadow-sm",
      className,
    )}
  >
    <div className="flex items-center gap-2 justify-center w-full">
      {icon}
      <span className="text-micro text-[var(--color-neutral-400)]">
        {label}
      </span>
    </div>
    <span className="text-xl font-black text-[var(--color-primary-900)] text-center w-full">{value}</span>
    
    {/* [UI개선] 게이지 추가 */}
    <div className="mt-2 h-1 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: color || "var(--color-primary-500)",
        }}
      />
    </div>
  </button>
);
