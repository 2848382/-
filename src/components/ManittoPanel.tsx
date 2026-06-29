import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, Timestamp, onSnapshot, getDoc } from 'firebase/firestore';
import { Gift, Heart, UserPlus, ClipboardList, Send, Package, Check, X, Search, Lock, HelpCircle, Coins, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../contexts/ToastContext';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';
import { increment } from 'firebase/firestore';

const MANITTO_MISSIONS = [
  "친구 남몰래 칭찬해 주기 (포스트잇 등 활용)",
  "매점에서 비밀 선물 사물함에 넣어 주기",
  "어려운 역할 혹은 청소 도와주기",
  "모르는 문제 혹은 과제 알려 주기",
  "비밀 편지 써서 몰래 전달하기",
  "오늘 하루 대화 3번 이상 시도하기",
  "대상 학생의 장점을 찾아 마스터에게 제보하기"
];

export const ManittoPanel: React.FC = () => {
  const { profile, allStudents, systemConfig } = useGame();
  const { showToast } = useToast();
  
  const [assignment, setAssignment] = useState<any>(null);
  const [receiverProfile, setReceiverProfile] = useState<any>(null);
  const [gifts, setGifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalMissions: 0, participantCount: 0 });
  
  // Form States
  const [targetStudentId, setTargetStudentId] = useState('');
  const [giftItem, setGiftItem] = useState('');
  const [giftMsg, setGiftMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Success State
  const [showSuccess, setShowSuccess] = useState<{
    show: boolean;
    mission: string;
    rewards: { label: string; value: string; icon: React.ReactNode }[];
  }>({ show: false, mission: '', rewards: [] });
  
  // Guess Form
  const [guessId, setGuessId] = useState('');
  
  const [activeTab, setActiveTab] = useState<'mission' | 'locker' | 'send' | 'guess'>('mission');

  useEffect(() => {
    if (!profile?.uid) return;

    // 1. Get my assignment
    const unsubAssignment = onSnapshot(doc(db, 'manitto_assignments', profile.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAssignment(data);
        setGuessId(data.guessStudentId || '');
        
        const recSnap = await getDoc(doc(db, 'users', data.receiverId));
        if (recSnap.exists()) {
          setReceiverProfile(recSnap.data());
        }
      } else {
        setAssignment(null);
      }
      setLoading(false);
    });

    // 2. Get my gifts
    const qGifts = query(collection(db, 'manitto_gifts'), where('receiverId', '==', profile.uid));
    const unsubGifts = onSnapshot(qGifts, (snap) => {
      setGifts(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
    });

    // 3. Stats
    const unsubStats = onSnapshot(collection(db, 'manitto_assignments'), (snap) => {
      let total = 0;
      snap.docs.forEach(d => {
        total += (d.data().missionsDone?.length || 0);
      });
      setStats({ totalMissions: total, participantCount: snap.docs.length });
    });

    return () => {
      unsubAssignment();
      unsubGifts();
      unsubStats();
    };
  }, [profile?.uid]);

  const sendGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!targetStudentId || !giftItem) {
      showToast("카드번호와 선물을 입력하세요.", "warning");
      return;
    }

    setIsSending(true);
    try {
      const q = query(collection(db, 'users'), where('studentId', '==', targetStudentId.toUpperCase()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        showToast("해당 카드번호를 가진 학생을 찾을 수 없습니다.", "error");
        return;
      }

      const receiver = snap.docs[0].data();
      
      await addDoc(collection(db, 'manitto_gifts'), {
        senderId: profile.uid,
        receiverId: receiver.uid,
        receiverStudentId: receiver.studentId,
        itemName: giftItem,
        message: giftMsg,
        status: 'pending',
        createdAt: Timestamp.now()
      });

      // e-알리미 알림 전송
      await addDoc(collection(db, 'letters'), {
        senderUid: 'SYSTEM',
        recipientUid: receiver.uid,
        content: `[마니또] 누군가 당신의 사물함에 선물을 넣었습니다! 사물함을 확인하세요.`,
        deliverAt: new Date(),
        isDelivered: true,
        isRead: false,
        createdAt: new Date()
      });

      showToast("선물을 사물함에 넣었습니다.", "success");
      setTargetStudentId('');
      setGiftItem('');
      setGiftMsg('');
      setActiveTab('mission');
    } catch (e) {
      showToast("전송 실패", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleGiftAction = async (giftId: string, action: 'accepted' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'manitto_gifts', giftId), {
        status: action
      });
      showToast(action === 'accepted' ? "선물을 수령했습니다!" : "선물을 거절했습니다.", "info");
    } catch (e) {
      showToast("처리 실패", "error");
    }
  };

  const completeMission = async (missionIndex: number) => {
    if (!assignment || !profile) return;
    const missions = assignment.missionsDone || [];
    if (missions.includes(missionIndex.toString())) return;

    try {
      const missionText = MANITTO_MISSIONS[missionIndex];
      const staminaGain = 15;
      const stressReduction = 10;
      const memoryPointsGain = 150;
      const bondingGain = 3;

      // Trigger Confetti immediately for instant feedback
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#ec4899']
      });

      // 1. Update assignment
      await updateDoc(doc(db, 'manitto_assignments', profile.uid), {
        missionsDone: [...missions, missionIndex.toString()],
        updatedAt: Timestamp.now()
      });
      
      // 2. Reward Update
      await updateDoc(doc(db, 'users', profile.uid), {
        stamina: Math.min(100, (profile.stamina || 0) + staminaGain),
        stress: Math.max(0, (profile.stress || 0) - stressReduction),
        memoryPoints: increment(memoryPointsGain),
        bonding: increment(bondingGain)
      });

      // Show Success UI with enhanced rewards
      setShowSuccess({
        show: true,
        mission: missionText,
        rewards: [
          { label: '스테미나', value: `+${staminaGain}`, icon: <Heart size={18} className="text-rose-500 fill-rose-500" /> },
          { label: '스트레스', value: `-${stressReduction}`, icon: <X size={18} className="text-emerald-500" /> },
          { label: '기억 파편', value: `${memoryPointsGain} MP`, icon: <Sparkles size={18} className="text-amber-500 fill-amber-500 animate-pulse" /> },
          { label: '유대감', value: `+${bondingGain}`, icon: <UserPlus size={18} className="text-indigo-500" /> }
        ]
      });

      // global notification
      window.dispatchEvent(new CustomEvent('app-toast', { 
        detail: { message: `🎉 미션 완료! 보상이 지급되었습니다.`, type: 'success' } 
      }));

    } catch (e) {
      showToast("업데이트 실패", "error");
    }
  };

  const submitGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !assignment) return;
    if (!guessId) return;

    try {
      // Find the actual giver for the user (The person whose receiverId is me)
      const q = query(collection(db, 'manitto_assignments'), where('receiverId', '==', profile.uid));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        showToast("매칭 정보를 찾을 수 없습니다.", "error");
        return;
      }

      const actualGiver = snap.docs[0].data();
      const actualGiverProfile = allStudents.find(s => s.uid === actualGiver.giverId);
      
      const isCorrect = actualGiverProfile?.studentId === guessId.toUpperCase();
      
      await updateDoc(doc(db, 'manitto_assignments', profile.uid), {
        guessStudentId: guessId.toUpperCase(),
        guessStatus: isCorrect ? 'correct' : 'incorrect'
      });

      if (isCorrect) {
        showToast("정답입니다! 당신의 마니또를 정확히 찾아내셨네요.", "success");
        // 알림 전송 (e-알리미)
        await addDoc(collection(db, 'letters'), {
          senderUid: 'SYSTEM',
          recipientUid: profile.uid,
          content: `[마니또] 정답입니다! 당신의 추격이 결실을 맺었습니다.`,
          deliverAt: new Date(),
          isDelivered: true,
          isRead: false,
          createdAt: new Date()
        });
      } else {
        showToast("아쉽게도 틀렸습니다. 패널티가 부여됩니다.", "error");
        // 패널티 적용: 스트레스 증가, 유대감 감소
        await updateDoc(doc(db, 'users', profile.uid), {
          stress: Math.min(100, (profile.stress || 0) + 10),
          bonding: Math.max(0, (profile.bonding || 0) - 5)
        });
        
        // 알림 전송 (e-알리미)
        await addDoc(collection(db, 'letters'), {
          senderUid: 'SYSTEM',
          recipientUid: profile.uid,
          content: `[마니또] 추리 실패. 패널티로 스트레스가 10 증가하고 유대감이 5 감소했습니다.`,
          deliverAt: new Date(),
          isDelivered: true,
          isRead: false,
          createdAt: new Date()
        });
      }
    } catch (e) {
      showToast("추리 등록 실패", "error");
    }
  };

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (!assignment) return (
    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
      <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
        <Lock size={40} />
      </div>
      <h3 className="font-bold text-slate-800">아직 마니또 배정 전입니다</h3>
      <p className="text-xs text-slate-500 leading-relaxed">
        마스터가 시스템을 시작하면 당신의 비밀 마니또가 공개됩니다.<br />잠시만 기다려 주세요.
      </p>
    </div>
  );

  // Masking helpers
  const maskName = (name: string) => {
    if (!name) return "???";
    if (name.length <= 2) return name[0] + "*";
    return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
  };

  const maskId = (id: string) => {
    if (!id) return "S-????";
    return id.substring(0, 3) + "**" + id.substring(id.length - 1);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 font-sans">
      {/* Tabs */}
      <div className="flex p-2 bg-slate-50 gap-1 border-b border-slate-100">
        <TabButton active={activeTab === 'mission'} onClick={() => setActiveTab('mission')} icon={<ClipboardList size={16} />} label="미션" />
        <TabButton active={activeTab === 'locker'} onClick={() => setActiveTab('locker')} icon={<Package size={16} />} label="보관함" count={gifts.filter(g => g.status === 'pending').length} />
        <TabButton active={activeTab === 'send'} onClick={() => setActiveTab('send')} icon={<Send size={16} />} label="선물하기" />
        <TabButton active={activeTab === 'guess'} onClick={() => setActiveTab('guess')} icon={<Search size={16} />} label="유추하기" />
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <AnimatePresence mode="wait">
          {activeTab === 'mission' && (
            <motion.div
              key="mission"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              {/* Target Profile Card */}
              <div className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                  <span className="text-[10px] font-bold tracking-widest opacity-80 uppercase">당신의 비밀 마니또</span>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black">
                      {receiverProfile?.department?.[0] || "?"}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{maskName(receiverProfile?.name)}</h3>
                      <p className="text-xs opacity-80">{maskId(receiverProfile?.studentId)} · {receiverProfile?.department}</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-8 -right-8 opacity-10 rotate-12">
                  <Heart size={120} fill="currentColor" />
                </div>
              </div>

              {/* Statistics */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tighter">전교 미션 수행률</h5>
                  <p className="text-lg font-black text-indigo-600">{stats.totalMissions}회 완료</p>
                </div>
                <div className="text-right">
                  <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tighter">참여 인원</h5>
                  <p className="text-sm font-bold text-slate-700">{stats.participantCount}명</p>
                </div>
              </div>

              {/* Missions List */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Check size={16} className="text-indigo-500" /> 수행 미션 리스트
                </h4>
                {MANITTO_MISSIONS.map((mission, idx) => {
                  const isDone = assignment.missionsDone?.includes(idx.toString());
                  return (
                    <button
                      key={idx}
                      onClick={() => !isDone && completeMission(idx)}
                      disabled={isDone}
                      className={cn(
                        "w-full p-4 rounded-2xl border text-left transition-all flex items-center gap-3",
                        isDone 
                          ? "bg-emerald-50 border-emerald-100 text-emerald-400"
                          : "bg-white border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border",
                        isDone ? "bg-emerald-100 border-emerald-200 text-emerald-600" : "bg-white border-slate-200 text-slate-300"
                      )}>
                        {isDone ? <Check size={14} /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-bold leading-relaxed">{mission}</span>
                        {!isDone && <p className="text-[9px] text-indigo-400 mt-0.5">보상: 스테미나 회복</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'locker' && (
            <motion.div
              key="locker"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle size={16} className="text-indigo-400" />
                <p className="text-[11px] text-slate-500">도착한 선물은 보관함에 보관되며, 수령 시에만 인벤토리에 반영됩니다.</p>
              </div>

              {gifts.length > 0 ? (
                gifts.map((gift) => (
                  <div key={gift.id} className="p-4 bg-white border border-slate-200 rounded-3xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                          <Package size={18} />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-800">{gift.itemName}</h5>
                          <p className="text-[10px] text-slate-400">{new Date(gift.createdAt?.toMillis()).toLocaleString()}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        gift.status === 'accepted' ? "bg-emerald-100 text-emerald-600" : 
                        gift.status === 'rejected' ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-600"
                      )}>
                        {gift.status === 'accepted' ? '수령됨' : gift.status === 'rejected' ? '반송됨' : '대기중'}
                      </span>
                    </div>
                    {gift.message && (
                      <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 italic">
                        "{gift.message}"
                      </div>
                    )}
                    {gift.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleGiftAction(gift.id, 'accepted')}
                          className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
                        >
                          수락하기
                        </button>
                        <button
                          onClick={() => handleGiftAction(gift.id, 'rejected')}
                          className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                        >
                          거절
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <Package size={32} className="mx-auto opacity-20" />
                  <p className="text-xs">사물함이 비어있습니다.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'send' && (
            <motion.div
              key="send"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <form onSubmit={sendGift} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">대상 카드 번호 (S-0000)</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input
                      type="text"
                      value={targetStudentId}
                      onChange={(e) => setTargetStudentId(e.target.value)}
                      placeholder="예: S-0123"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">전달할 물품</label>
                  <input
                    type="text"
                    value={giftItem}
                    onChange={(e) => setGiftItem(e.target.value)}
                    placeholder="매점에서 구매한 물건 등"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">비밀 메시지 (선택)</label>
                  <textarea
                    value={giftMsg}
                    onChange={(e) => setGiftMsg(e.target.value)}
                    placeholder="들키지 않도록 조심해서 메시지를 적어보세요."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs min-h-[100px] outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300"
                >
                  {isSending ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <><Send size={18} /> 선물 사물함에 넣기</>}
                </button>
              </form>
            </motion.div>
          )}

          {activeTab === 'guess' && (
            <motion.div
              key="guess"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-3">
                <HelpCircle size={18} className="text-indigo-500 shrink-0 mt-0.5" />
                <div className="text-[11px] text-indigo-700 leading-relaxed">
                  나를 몰래 도와주는 <strong>마니또</strong>가 누구인지 카드번호(S-XXXX)를 입력해 추리해 보세요!<br />
                  마스터가 정체를 공개하기 전까지 언제든 수정할 수 있습니다.
                </div>
              </div>

              <form onSubmit={submitGuess} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">추리할 학생의 카드 번호</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={guessId}
                      onChange={(e) => setGuessId(e.target.value)}
                      placeholder="예: S-0123"
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none uppercase font-mono"
                    />
                    <button
                      type="submit"
                      className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-md active:scale-95 transition-all"
                    >
                      확인
                    </button>
                  </div>
                </div>
              </form>

              {assignment.guessStatus && (
                <div className={cn(
                  "p-5 rounded-3xl border flex items-center gap-4",
                  assignment.guessStatus === 'correct' ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white",
                    assignment.guessStatus === 'correct' ? "bg-emerald-500" : "bg-red-500"
                  )}>
                    {assignment.guessStatus === 'correct' ? <Check size={20} /> : <X size={20} />}
                  </div>
                  <div>
                    <h5 className={cn("text-sm font-bold", assignment.guessStatus === 'correct' ? "text-emerald-900" : "text-red-900")}>
                      {assignment.guessStatus === 'correct' ? "추리 정답!" : "아직 추리 진행 중..."}
                    </h5>
                    <p className={cn("text-[10px]", assignment.guessStatus === 'correct' ? "text-emerald-600" : "text-red-600")}>
                      {assignment.guessStatus === 'correct' ? "정말 예리하시네요! 명탐정이신가요?" : "입력하신 학생은 당신의 마니또가 아닙니다."}
                    </p>
                  </div>
                </div>
              )}

              {systemConfig.manittoRevealed && (
                <div className="p-6 bg-slate-900 rounded-3xl text-white space-y-4">
                   <h4 className="text-sm font-bold text-indigo-400">최종 결과 공개</h4>
                   <div className="space-y-2">
                      <p className="text-xs opacity-70">나의 실제 마니또는...</p>
                      <RevealInfo profile={profile} allStudents={allStudents} />
                   </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess.show && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setShowSuccess(prev => ({ ...prev, show: false }))}
          >
            <motion.div
              initial={{ scale: 0.8, y: 100, opacity: 0, rotateX: 20 }}
              animate={{ scale: 1, y: 0, opacity: 1, rotateX: 0 }}
              exit={{ scale: 0.8, y: 50, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="w-full max-w-sm bg-white rounded-[48px] p-8 shadow-2xl relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500" />
              
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 shadow-inner"
                  >
                    <Check size={40} strokeWidth={3} />
                  </motion.div>
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-indigo-200 rounded-full -z-10"
                  />
                </div>

                <div className="space-y-1">
                  <motion.span 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-[10px] font-black text-indigo-500 uppercase tracking-widest"
                  >
                    Mission Accomplished
                  </motion.span>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight">마니또 미션 성공!</h2>
                </div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="w-full p-5 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center gap-2"
                >
                  <div className="text-[10px] font-bold text-slate-400 uppercase">수행한 미션</div>
                  <p className="text-sm font-bold text-slate-600 leading-snug break-keep">
                    {showSuccess.mission}
                  </p>
                </motion.div>

                <div className="grid grid-cols-2 gap-3 w-full">
                  {showSuccess.rewards.map((reward, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.5 + (i * 0.1), type: 'spring' }}
                      className="bg-white border border-slate-100 p-4 rounded-3xl flex flex-col items-center justify-center space-y-1 shadow-sm"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mb-1">
                        {reward.icon}
                      </div>
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-tighter">{reward.label}</span>
                      <span className="text-sm font-black text-slate-900">{reward.value}</span>
                    </motion.div>
                  ))}
                </div>

                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  onClick={() => setShowSuccess(prev => ({ ...prev, show: false }))}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl text-sm font-bold active:scale-95 transition-all shadow-lg"
                >
                  확인
                </motion.button>
              </div>

              <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-100/50 rounded-full blur-2xl" />
              <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-purple-100/50 rounded-full blur-2xl" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RevealInfo = ({ profile, allStudents }: any) => {
  const [giver, setGiver] = useState<any>(null);

  useEffect(() => {
    const fetchGiver = async () => {
      const q = query(collection(db, 'manitto_assignments'), where('receiverId', '==', profile.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const giverId = snap.docs[0].data().giverId;
        const giverProfile = allStudents.find((s: any) => s.uid === giverId);
        setGiver(giverProfile);
      }
    };
    fetchGiver();
  }, [profile.uid, allStudents]);

  if (!giver) return <div className="text-xs opacity-50">불러오는 중...</div>;

  return (
    <div className="flex items-center gap-4 p-4 bg-white/10 rounded-2xl border border-white/10">
       <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center font-black text-xl">
          {giver.name?.[0]}
       </div>
       <div>
          <div className="text-sm font-bold">{giver.name} 학생입니다!</div>
          <div className="text-[10px] opacity-60">{giver.studentId} · {giver.department}</div>
       </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label, count }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all relative",
      active ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
    )}
  >
    {icon}
    <span className="text-[10px] font-bold mt-1">{label}</span>
    {count !== undefined && count > 0 && (
      <span className="absolute top-1 right-3 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-slate-50">
        {count}
      </span>
    )}
  </button>
);

