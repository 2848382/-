import React, { useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs,
  doc,
} from "firebase/firestore";
import { UserProfile } from "../types";
import { useGame } from "../contexts/GameContext";
import { UserCircle2, Award, CheckCircle2, Star, Info, Skull, HelpCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

export const VotingSystem: React.FC = () => {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedTarget, setVotedTarget] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [currentLoop, setCurrentLoop] = useState(1);
  const [allVotes, setAllVotes] = useState<any[]>([]);
  const { gameState, logActivity } = useGame();

  useEffect(() => {
    // Listen to system config for loop level
    const unsubConfig = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) {
        setCurrentLoop(snap.data().currentLoop || 1);
      }
    });

    const unsubStudents = onSnapshot(collection(db, "users"), (snap) => {
      setStudents(
        snap.docs
          .map((d) => d.data() as UserProfile)
          .filter((s) => s.uid !== auth.currentUser?.uid && s.role !== 'admin' && s.email !== '10049810a@gmail.com' && !s.isAdmin),
      );
    });

    const checkVote = async () => {
      if (!auth.currentUser) return;
      const q = query(
        collection(db, "votes"),
        where("voterId", "==", auth.currentUser.uid),
        // Use loopIndex in the query to check vote state for the specific loop
        where("loopIndex", "==", currentLoop), 
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setHasVoted(true);
        setVotedTarget(snap.docs[0].data().targetId);
      } else {
        setHasVoted(false);
        setVotedTarget(null);
      }
    };
    
    checkVote();

    // Listen to ALL votes for this loop to show stats after voting
    const unsubVotes = onSnapshot(
      query(collection(db, "votes"), where("loopIndex", "==", currentLoop)),
      (snap) => {
        setAllVotes(snap.docs.map(d => d.data() as any));
      }
    );

    return () => {
      unsubConfig();
      unsubStudents();
      unsubVotes();
    };
  }, [currentLoop]);

  const castVote = async (targetId: string, type: string) => {
    if (hasVoted || !auth.currentUser) return;

    const isExecutionLoop = currentLoop >= 5;
    const confirmMsg = isExecutionLoop 
      ? `정말 이 학생을 '격리 대상'으로 지목하시겠습니까? 이 결정은 되돌릴 수 없습니다.`
      : `정말 투표하시겠습니까?`;

    if (!confirm(confirmMsg)) return;

    try {
      await addDoc(collection(db, "votes"), {
        voterId: auth.currentUser.uid,
        targetId,
        loopIndex: currentLoop,
        type,
        isExecution: isExecutionLoop,
        createdAt: serverTimestamp(),
      });
      setHasVoted(true);
      setVotedTarget(targetId);
      await logActivity('VOTE', `학생 투표: ${targetId}`, isExecutionLoop ? 'warning' : 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const isExecutionLoop = currentLoop >= 5;

  return (
    <section className="mw-card overflow-hidden">
      <div className={cn(
        "p-6 md:p-8 border-b flex items-center justify-between transition-colors duration-500",
        isExecutionLoop ? "bg-red-50 border-red-200" : "bg-[var(--color-neutral-50)] border-[var(--color-border)]"
      )}>
        <div className="flex items-center gap-4 md:gap-5">
          <div className={cn(
            "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border shrink-0 shadow-sm transition-all duration-500",
            isExecutionLoop ? "bg-white text-red-600 border-red-200" : "bg-white text-[var(--color-primary-600)] border-[var(--color-border)]"
          )}>
            {isExecutionLoop ? <Skull size={28} /> : <Award size={28} />}
          </div>
          <div>
            <h3 className={cn(
              "text-subhead leading-none transition-colors",
              isExecutionLoop ? "text-red-900" : "text-[var(--color-primary-900)]"
            )}>
              {isExecutionLoop ? "프로토콜 전환: 격리 대상 지목" : "캠페인: 이달의 학생 투표"}
            </h3>
            <p className="text-micro text-[var(--color-neutral-400)] mt-1.5 flex items-center gap-2">
              {isExecutionLoop ? "System Stabilization Protocol" : "Student Excellence Merit System"}
              <span className={cn("px-1.5 py-0.5 rounded text-[8px] text-white font-black", isExecutionLoop ? "bg-red-500" : "bg-blue-500")}>
                STAGE {currentLoop}
              </span>
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowInfo(!showInfo)}
          className={cn(
            "p-3 rounded-2xl transition-all border",
            showInfo 
              ? "bg-[var(--color-primary-900)] text-white border-[var(--color-primary-900)]" 
              : "bg-white text-[var(--color-neutral-400)] border-[var(--color-border)] hover:border-[var(--color-primary-900)] hover:text-[var(--color-primary-900)]"
          )}
        >
          <HelpCircle size={20} />
        </button>
      </div>

      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-[var(--color-primary-100)] bg-[var(--color-primary-50)]/30"
          >
            <div className="p-6 md:p-8 space-y-4">
              <h4 className="text-micro text-[var(--color-primary-600)] flex items-center gap-2">
                <Info size={14} /> 시스템 상세 가이드
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-[var(--color-neutral-600)] leading-relaxed text-balance">
                <div className="bg-white/60 p-4 rounded-2xl border border-white">
                  <p className="font-bold text-[var(--color-primary-900)] mb-1">교내 소셜 캠페인</p>
                  학생들 간의 우호적인 관계와 유대 형성을 위한 전산 프로토콜입니다. 여러분의 소중한 참여가 시스템의 안정성을 높입니다.
                </div>
                <div className="bg-white/60 p-4 rounded-2xl border border-white shadow-sm">
                  <p className="font-bold text-[var(--color-primary-900)] mb-1">참여 안내</p>
                  각 단계별로 1회만 투표가 가능하며, 기록된 데이터는 즉시 암호화되어 관리 서버로 전송됩니다.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6 md:p-10">
        {hasVoted ? (
          <div className="py-8 md:py-12 text-center flex flex-col items-center">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mx-auto border transition-all duration-700",
              isExecutionLoop 
                ? "bg-red-50 text-red-500 border-red-100 scale-110 shadow-lg shadow-red-500/20" 
                : "bg-emerald-50 text-emerald-500 border-emerald-100"
            )}>
              {isExecutionLoop ? <Skull size={40} /> : <CheckCircle2 size={40} />}
            </div>
            <div className="space-y-2 mt-6">
              <p className="font-black text-[var(--color-primary-900)] text-lg tracking-tight">
                {isExecutionLoop ? "지목이 완료되었습니다." : "소중한 의견 감사합니다."}
              </p>
              <p className="text-micro text-[var(--color-neutral-400)]">
                {isExecutionLoop ? "The verdict has been recorded in the system" : "Your vote has been recorded in the system"}
              </p>
            </div>

            <div className="mt-8 w-full max-w-md bg-[var(--color-neutral-50)] border border-[var(--color-border)] rounded-2xl p-6">
                <h4 className="text-sm font-bold text-[var(--color-primary-900)] mb-4 text-left">현재 득표 현황</h4>
                <div className="space-y-3">
                   {students.map(s => {
                       const actualVotes = allVotes.filter(v => v.targetId === s.uid).length;
                       // 적용: 마스터가 오버라이드 했으면 무조건 그 값, 아니면 실제 득표수
                       const displayedVotes = s.voteDisplayOverride !== undefined ? s.voteDisplayOverride : actualVotes;
                       
                       return (
                           <div key={s.uid} className="flex justify-between items-center text-sm">
                               <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-white border flex items-center justify-center overflow-hidden shrink-0">
                                      {s.photoURL ? <img src={s.photoURL} alt="" /> : <UserCircle2 size={14} className="text-slate-300"/>}
                                  </div>
                                  <span className="font-semibold text-slate-700">{s.name}</span>
                               </div>
                               <div className="font-mono font-bold text-blue-600 transition-all">
                                  {displayedVotes} 표
                               </div>
                           </div>
                       )
                   })}
                </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className={cn(
              "p-5 md:p-6 rounded-2xl border flex flex-col sm:flex-row items-center sm:items-start gap-4 transition-colors",
              isExecutionLoop ? "bg-red-50/50 border-red-100 text-red-900" : "bg-[var(--color-neutral-50)] border-[var(--color-border)] text-[var(--color-neutral-600)]"
            )}>
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                isExecutionLoop ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
              )}>
                {isExecutionLoop ? <Skull size={20} /> : <Star size={20} fill="currentColor" />}
              </div>
              <p className="text-sm font-bold leading-relaxed text-center sm:text-left">
                {isExecutionLoop 
                  ? "다음 단계로 넘어가기 위해 격리해야 할 대상을 선택하십시오. 다득표자는 즉시 격리 조치됩니다." 
                  : "우리 학급에서 타의 모범이 되는 우수 학생을 추천해 주세요. 선정된 학생에게는 보너스 혜택이 제공됩니다."}
              </p>
            </div>

            <div className="space-y-3">
              {students.map((s) => (
                <div
                  key={s.uid}
                  className="w-full flex flex-col sm:flex-row items-center justify-between p-4 bg-white rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-primary-200)] transition-all group gap-4 shadow-sm"
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-neutral-50)] flex items-center justify-center text-[var(--color-primary-600)] transition-all group-hover:ring-2 ring-[var(--color-primary-100)] overflow-hidden border border-[var(--color-border)] shrink-0">
                      {s.photoURL ? (
                        <img
                          src={s.photoURL}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserCircle2 size={24} className="text-[var(--color-neutral-300)]" />
                      )}
                    </div>
                    <span className="font-bold text-[var(--color-primary-900)]">{s.name}</span>
                    {isExecutionLoop && (
                      <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">Target</span>
                    )}
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    {isExecutionLoop ? (
                      <button
                        onClick={() => castVote(s.uid, "execution")}
                        className="w-full sm:w-32 py-2 mw-btn-danger"
                      >
                        지목하기
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => castVote(s.uid, "academic")}
                          className="flex-1 sm:flex-none px-5 py-2 mw-btn bg-white text-[var(--color-primary-900)] border border-[var(--color-border)] hover:bg-[var(--color-neutral-50)]"
                        >
                          학업
                        </button>
                        <button
                          onClick={() => castVote(s.uid, "moral")}
                          className="flex-1 sm:flex-none px-5 py-2 mw-btn-primary"
                        >
                          봉사
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {students.length === 0 && (
                <div className="text-center py-10 text-[var(--color-neutral-300)] font-bold uppercase tracking-widest text-xs">
                  No other students registered currently
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
