import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, onSnapshot, updateDoc, setDoc, collection, getDocs, query, orderBy, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useGame } from "../contexts/GameContext";
import { UserProfile, ChatRoom, ChatMessage } from "../types";
import {
  ShieldAlert,
  Radio,
  Clock,
  AlertTriangle,
  Fingerprint,
  Activity,
  Zap,
  Users,
  Search,
  Save,
  X,
  Database,
  MessageSquare,
  Trash2,
  Send,
  Eye,
  ShieldCheck,
  Smartphone,
  Trophy,
  Archive,
  Brain,
  Sun,
  CloudRain,
  Disc,
  Wind,
  Gift
} from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { MasterRewardPanel } from "./MasterRewardPanel";
import { MasterMissionPanel } from "./MasterMissionPanel";
import { MasterRelationPanel } from "./MasterRelationPanel";
import { MasterScenarioPanel } from "./MasterScenarioPanel";
import { MasterMapPanel } from "./MasterMapPanel";
import { QuickCommandPad } from "./QuickCommandPad";
import { EmotionThermometer } from "./EmotionThermometer";
import { MasterEventLogView } from "./MasterEventLogView";
import { MasterManittoPanel } from "./MasterManittoPanel";
import { MasterLockerPanel } from "./Admin/MasterLockerPanel";
import { MasterNPCPanel } from "./Admin/MasterNPCPanel";
import { MasterGlobalEventPanel } from "./Admin/MasterGlobalEventPanel";
import { MasterSchedulePanel } from "./Admin/MasterSchedulePanel";
import { PlayerPerspectivePreview } from "./Admin/PlayerPerspectivePreview";
import { MasterAnomalyPanel } from "./Admin/MasterAnomalyPanel";
import { MasterChecklist } from "./Admin/MasterChecklist";
import { useDialog } from "../contexts/DialogContext";

export const MasterPanel: React.FC = () => {
  const { isAdmin, systemConfig } = useGame();
  const { confirm, prompt } = useDialog();
  const [previewUser, setPreviewUser] = useState<UserProfile | null>(null);
  const [loop, setLoop] = useState<number>(1);
  const [timerMins, setTimerMins] = useState<number>(15);
  const [timerSecs, setTimerSecs] = useState<number>(0);
  const [radioFreq, setRadioFreq] = useState<number>(88.1);
  const [systemActive, setSystemActive] = useState<boolean>(false);
  const [activeAlert, setActiveAlert] = useState<string>("");

  // User Management State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Communication Intercept State
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Automation / Custom Settings State
  const [questTitle, setQuestTitle] = useState("");
  const [questDesc, setQuestDesc] = useState("");
  const [questRewardWon, setQuestRewardWon] = useState(0);
  const [questRewardExp, setQuestRewardExp] = useState(0);

  const [botKeyword, setBotKeyword] = useState("");
  const [botReply, setBotReply] = useState("");

  const [rumorLoop, setRumorLoop] = useState(1);
  const [rumorContent, setRumorContent] = useState("");
  const [activeTab, setActiveTab] = useState<'system' | 'automation' | 'student' | 'advanced' | 'manitto' | 'locker' | 'npc' | 'events' | 'schedule' | 'anomaly'>('system');

  const [whispers, setWhispers] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    
    // System Config Listeners
    const unsub = onSnapshot(
      doc(db, "system", "config"),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          if (data.currentLoop) setLoop(data.currentLoop);
          if (data.radioFrequency) setRadioFreq(data.radioFrequency);
          if (data.activeAlert) setActiveAlert(data.activeAlert);
        }
      },
      (error) => console.error(error),
    );

    const unsubTimer = onSnapshot(
      doc(db, "system", "timer"),
      (docSnap) => {
        if (docSnap.exists()) {
          setSystemActive(docSnap.data().active || false);
        }
      },
      (error) => console.error(error),
    );

    // Initial User Fetch
    const unsubUsers = onSnapshot(
      query(collection(db, "users"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const userList = snapshot.docs.map(d => d.data() as UserProfile);
        setUsers(userList);
      },
      (err) => console.error("Failed to fetch users:", err)
    );

    // Fetch Chat Rooms
    const unsubRooms = onSnapshot(
      query(collection(db, "rooms"), orderBy("updatedAt", "desc")),
      (snapshot) => {
        const roomList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatRoom));
        setRooms(roomList);
      },
      (err) => console.error("Failed to fetch rooms:", err)
    );

    // Fetch Whispers
    const unsubWhispers = onSnapshot(
      query(collection(db, "whispers"), orderBy("createdAt", "desc")),
      (snapshot) => {
        setWhispers(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
      },
      (err) => console.error(err)
    );

    return () => {
      unsub();
      unsubTimer();
      unsubUsers();
      unsubRooms();
      unsubWhispers();
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!selectedRoom) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    const unsubMessages = onSnapshot(
      query(collection(db, "rooms", selectedRoom.id, "messages"), orderBy("createdAt", "asc")),
      (snapshot) => {
        const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
        setMessages(msgs);
        setIsLoadingMessages(false);
      },
      (err) => {
        console.error("Failed to fetch messages:", err);
        setIsLoadingMessages(false);
      }
    );

    return () => unsubMessages();
  }, [selectedRoom]);

  // Check if all players have 100 stress
  useEffect(() => {
     if (!isAdmin || !systemConfig || systemConfig.endingMode) return;
     const checkInfectionEnding = async () => {
         const nonAdminUsers = users.filter(u => u.role !== 'admin' && !u.isBanned);
         if (nonAdminUsers.length > 0 && nonAdminUsers.every(u => u.stress >= 100)) {
             try {
                 await updateDoc(doc(db, "system", "config"), { endingMode: 'B' });
             } catch(e) {}
         }
     };
     checkInfectionEnding();
  }, [users, isAdmin, systemConfig]);

  const handleUpdateLoop = async (v: number) => {
    setLoop(v);
    await setDoc(
      doc(db, "system", "config"),
      { currentLoop: v },
      { merge: true },
    );
    await setDoc(doc(db, "system", "events"), {
      type: "glitch",
      intensity: v,
      timestamp: Date.now(),
    });
  };

  const handleUpdateFreq = async (v: number) => {
    setRadioFreq(v);
    await setDoc(
      doc(db, "system", "config"),
      { radioFrequency: v },
      { merge: true },
    );
  };

  const handleUpdateAlert = async () => {
    await setDoc(doc(db, "system", "config"), {
      activeAlert: activeAlert || null
    }, { merge: true });
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "시스템 경고 메시지가 업데이트되었습니다.", type: 'success' } }));
  };

  const startDoomsday = async () => {
    const duration = (timerMins * 60 + timerSecs) * 1000;
    const endTime = Date.now() + duration;
    await setDoc(doc(db, "system", "timer"), {
      active: true,
      endTime,
    });
  };

  const stopDoomsday = async () => {
    await setDoc(doc(db, "system", "timer"), {
      active: false,
      endTime: null,
    });
  };

  const triggerJumpscare = async () => {
    await setDoc(doc(db, "system", "events"), {
      type: "jumpscare",
      id: Date.now(),
      intensity: "high",
    });
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "🚨 전교생에게 긴급 경고(점프스케어)가 발송되었습니다.", type: 'warning' } }));
  };

  // User Management Handlers
  const handleUserSelect = (user: UserProfile) => {
    setSelectedUser({ ...user });
  };

  const handleResetPassword = async (email: string) => {
    if (!email) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "해당 학생의 이메일 정보가 없습니다. (초기 회원가입 시 이메일 누락됨)", type: 'error' } }));
      return;
    }
    if (!(await confirm({ title: '확인', message: `${email} 주소로 비밀번호 재설정 이메일을 발송하시겠습니까?` }))) return;
    try {
      await sendPasswordResetEmail(auth, email);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "비밀번호 재설정 이메일이 발송되었습니다.", type: 'success' } }));
    } catch (err: any) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "이메일 발송에 실패했습니다: " + err.message, type: 'error' } }));
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    const promptWord = `삭제확인 ${selectedUser.name}`;
    const userInput = await prompt({ title: '데이터 삭제', message: `정말 [${selectedUser.name}] 학생의 모든 기록을 삭제하시겠습니까?\n이 작업은 시스템에서 학생 프로필과 진행도를 삭제하지만, Firebase Auth 시스템 상의 로그인은 유지될 수 있습니다.\n진행하시려면 "${promptWord}" 를 입력해주세요.` });
    
    if (userInput === promptWord) {
      try {
        await deleteDoc(doc(db, "users", selectedUser.uid));
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: `${selectedUser.name} 학생의 데이터가 삭제되었습니다. 해당 학생이 다시 접속하려면 올바른 이메일로 재가입해야 합니다.`, type: 'success' } }));
        setSelectedUser(null);
      } catch (e: any) {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "학생 데이터 삭제 실패: " + e.message, type: 'error' } }));
      }
    } else if (userInput !== null) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "입력한 확인 문구가 일치하지 않아 취소되었습니다.", type: 'warning' } }));
    }
  };

  const handleUserUpdate = async () => {
    if (!selectedUser) return;
    const original = users.find(u => u.uid === selectedUser.uid);
    if (!original) return;

    setIsSaving(true);
    try {
      const userRef = doc(db, "users", selectedUser.uid);
      
      const diff: Record<string, any> = {};
      const keysToCheck: (keyof UserProfile)[] = [
        "name", "studentId", "dormRoom", "bonding", "rebellion", "physical", 
        "stress", "academicAchievement", "attendanceDays", "memoryPoints", "balance", 
        "trauma", "loops", "penaltyPoints", "inventory", "badges", "role", 
        "isBanned", "isCardFrozen", "isStatsMasked", "blockedMenus", "uiTextOverrides",
        "hasAwakened", "voteDisplayOverride"
      ];
      
      for (const key of keysToCheck) {
        if (JSON.stringify(selectedUser[key]) !== JSON.stringify(original[key])) {
          diff[key] = selectedUser[key] !== undefined ? selectedUser[key] : null;
        }
      }
      
      if (Object.keys(diff).length > 0) {
        diff.updatedAt = serverTimestamp();
        await updateDoc(userRef, diff);
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "학생 프로필이 성공적으로 업데이트되었습니다.", type: 'success' } }));
      } else {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "변경된 내용이 없습니다.", type: 'info' } }));
      }
      
      setSelectedUser(null);
    } catch (err) {
      console.error("Update failed:", err);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "프로필 업데이트에 실패했습니다.", type: 'error' } }));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMessage = async (msgId: string) => {
    if (!selectedRoom) return;
    if (!(await confirm({ title: '메시지 삭제', message: "이 메시지를 영구적으로 삭제하시겠습니까?", isDestructive: true }))) return;
    try {
      await deleteDoc(doc(db, "rooms", selectedRoom.id, "messages", msgId));
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "메시지가 삭제되었습니다.", type: 'success' } }));
    } catch (err) {
      console.error("Delete failed:", err);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "삭제에 실패했습니다.", type: 'error' } }));
    }
  };

  const updateMessage = async (msgId: string, currentText: string) => {
    if (!selectedRoom) return;
    const newText = await prompt({ title: '쪽지 가로채기', message: "내용을 가로채어 수정할 텍스트를 입력하세요:", defaultValue: currentText });
    if (!newText || newText === currentText) return;
    try {
      await updateDoc(doc(db, "rooms", selectedRoom.id, "messages", msgId), {
        text: newText
      });
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "쪽지 내용이 관리자에 의해 변조되었습니다.", type: 'warning' } }));
    } catch (err) {
      console.error("Update failed:", err);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "수정에 실패했습니다.", type: 'error' } }));
    }
  };

  const publishQuest = async () => {
    if (!questTitle || !questDesc) return;
    try {
      await addDoc(collection(db, "system", "data", "quests"), {
        title: questTitle,
        description: questDesc,
        rewardWon: questRewardWon,
        rewardStamina: questRewardExp,
        isActive: true,
        createdAt: serverTimestamp()
      });
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "퀘스트가 성공적으로 발행되었습니다.", type: 'success' } }));
      setQuestTitle(""); setQuestDesc(""); setQuestRewardWon(0); setQuestRewardExp(0);
    } catch (e) {
      console.error(e);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "퀘스트 발행에 실패했습니다.", type: 'error' } }));
    }
  };

  const publishBotKeyword = async () => {
    if (!botKeyword || !botReply) return;
    try {
      await addDoc(collection(db, "system", "data", "botConfig"), {
        keyword: botKeyword,
        reply: botReply,
        createdAt: serverTimestamp()
      });
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "NPC 자동 응답 키워드가 저장되었습니다.", type: 'success' } }));
      setBotKeyword(""); setBotReply("");
    } catch (e) {
      console.error(e);
    }
  };

  const publishRumor = async () => {
    if (!rumorContent) return;
    try {
      await addDoc(collection(db, "system", "data", "rumorReservations"), {
        loopLevel: rumorLoop,
        content: rumorContent,
        isPublished: false,
        createdAt: serverTimestamp()
      });
      alert("익명 괴담 예약이 완료되었습니다.");
      setRumorContent("");
    } catch (e) {
      console.error(e);
    }
  };

  const issueCommand = async (type: 'jump' | 'sound' | 'toast' | 'intercept', payload: any, targetUid: string = 'ALL') => {
    try {
      await addDoc(collection(db, "system", "commands", "active"), {
        type,
        targetUid,
        payload,
        createdAt: serverTimestamp(),
        executed: false
      });
      alert("명령이 전송되었습니다.");
    } catch (e: any) {
      console.error("Command error:", e);
      alert("명령 전송 실패: " + e.message);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.studentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTargetName = (roomId: string) => {
    if (roomId === 'group_teacher') return "교무실 (전체 공지)";
    const parts = roomId.split('_');
    const uids = parts.filter(p => p !== 'group' && p !== 'teacher');
    const names = uids.map(uid => users.find(u => u.uid === uid)?.name || '알 수 없음');
    return names.join(' ⟷ ');
  };

  const displayRooms = selectedUser ? rooms.filter(r => r.id.includes(selectedUser.uid)) : rooms;

  if (!isAdmin) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center font-sans text-slate-900 text-xl font-bold">
        접근 권한이 없습니다. (관리자 전용)
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-3 text-slate-900">
              <ShieldCheck size={32} className="text-blue-600" />
              명원고등학교 관리 시스템
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-2">
              교원 및 시스템 관리자 전용 통합 제어 패널
            </p>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-3">
               {selectedUser === null && (
               <div className="flex items-center gap-2 mr-4 bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 pl-2">마스터 신분:</span>
                  <select 
                    onChange={async (e) => {
                       const name = e.target.value;
                       const adminUser = users.find(u => u.role === 'admin');
                       if (adminUser) {
                           await updateDoc(doc(db, "users", adminUser.uid), { name, updatedAt: serverTimestamp() });
                           alert(`마스터의 표시 이름이 [${name}]으로 변경되었습니다.`);
                       }
                    }}
                    className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded p-1 outline-none cursor-pointer"
                  >
                     <option value="">선택/변경...</option>
                     <option value="시스템">시스템 (System)</option>
                     <option value="담임 선생님">담임 선생님</option>
                  </select>
               </div>
               )}
               <div className="flex items-center gap-2 text-sm font-bold text-blue-600">
                 <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                 시스템 온라인
               </div>
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              {new Date().toLocaleString()}
            </div>
          </div>
        </header>

        <MasterChecklist />

        {/* 탭 네비게이션 */}
        <div className="flex gap-4 border-b border-slate-200 overflow-x-auto custom-scrollbar pb-2">
          <button 
            onClick={() => setActiveTab('system')} 
            className={cn("px-6 py-3 font-bold rounded-t-xl transition-colors whitespace-nowrap", activeTab === 'system' ? "bg-white text-blue-600 border-t border-l border-r border-slate-200 shadow-sm" : "text-slate-500 hover:bg-slate-100")}
          >
            ⚙️ 시스템 통제
          </button>
          <button 
            onClick={() => setActiveTab('automation')} 
            className={cn("px-6 py-3 font-bold rounded-t-xl transition-colors whitespace-nowrap", activeTab === 'automation' ? "bg-white text-blue-600 border-t border-l border-r border-slate-200 shadow-sm" : "text-slate-500 hover:bg-slate-100")}
          >
            🤖 시나리오 자동화
          </button>
          <button 
            onClick={() => setActiveTab('student')} 
            className={cn("px-6 py-3 font-bold rounded-t-xl transition-colors whitespace-nowrap", activeTab === 'student' ? "bg-white text-blue-600 border-t border-l border-r border-slate-200 shadow-sm" : "text-slate-500 hover:bg-slate-100")}
          >
            👥 학생 통제
          </button>
          <button 
            onClick={() => setActiveTab('advanced')} 
            className={cn("px-6 py-3 font-bold rounded-t-xl transition-colors whitespace-nowrap", activeTab === 'advanced' ? "bg-white text-blue-600 border-t border-l border-r border-slate-200 shadow-sm" : "text-slate-500 hover:bg-slate-100")}
          >
            🛡️ 심화 통제
          </button>
          <button 
            onClick={() => setActiveTab('manitto')} 
            className={cn("px-6 py-3 font-bold rounded-t-xl transition-colors whitespace-nowrap", activeTab === 'manitto' ? "bg-white text-blue-600 border-t border-l border-r border-slate-200 shadow-sm" : "text-slate-500 hover:bg-slate-100")}
          >
            🎁 마니또 관리
          </button>
          <button 
            onClick={() => setActiveTab('locker')} 
            className={cn("px-6 py-3 font-bold rounded-t-xl transition-colors whitespace-nowrap", activeTab === 'locker' ? "bg-white text-blue-600 border-t border-l border-r border-slate-200 shadow-sm" : "text-slate-500 hover:bg-slate-100")}
          >
            📦 사물함 관제
          </button>
          <button 
            onClick={() => setActiveTab('npc')} 
            className={cn("px-6 py-3 font-bold rounded-t-xl transition-colors whitespace-nowrap", activeTab === 'npc' ? "bg-white text-blue-600 border-t border-l border-r border-slate-200 shadow-sm" : "text-slate-500 hover:bg-slate-100")}
          >
            🧠 NPC 세뇌
          </button>
          <button 
            onClick={() => setActiveTab('events')} 
            className={cn("px-6 py-3 font-bold rounded-t-xl transition-colors whitespace-nowrap", activeTab === 'events' ? "bg-white text-blue-600 border-t border-l border-r border-slate-200 shadow-sm" : "text-slate-500 hover:bg-slate-100")}
          >
            🌩️ 사건 발생
          </button>
          <button 
            onClick={() => setActiveTab('schedule')} 
            className={cn("px-6 py-3 font-bold rounded-t-xl transition-colors whitespace-nowrap", activeTab === 'schedule' ? "bg-white text-blue-600 border-t border-l border-r border-slate-200 shadow-sm" : "text-slate-500 hover:bg-slate-100")}
          >
            ⏳ 예약 공개
          </button>
          <button 
            onClick={() => setActiveTab('anomaly')} 
            className={cn("px-6 py-3 font-bold rounded-t-xl transition-colors whitespace-nowrap", activeTab === 'anomaly' ? "bg-white text-blue-600 border-t border-l border-r border-slate-200 shadow-sm" : "text-slate-500 hover:bg-slate-100")}
          >
            🚨 이상 탐지
          </button>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="space-y-12">
          {activeTab === 'anomaly' && (
            <section className="space-y-6">
              <MasterAnomalyPanel />
            </section>
          )}

          {activeTab === 'schedule' && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-3 border-l-4 border-amber-500 pl-4 text-slate-900">
                <Clock size={24} /> 예약된 정보 공개 관리
              </h2>
              <MasterSchedulePanel />
            </section>
          )}

          {activeTab === 'events' && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-3 border-l-4 border-amber-600 pl-4 text-slate-900">
                <Zap size={24} /> 글로벌 기묘한 현상 및 로그 관제
              </h2>
              <MasterGlobalEventPanel />
            </section>
          )}

          {activeTab === 'locker' && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-3 border-l-4 border-slate-600 pl-4 text-slate-900">
                <Archive size={24} /> 전교생 사물함 실시간 관제
              </h2>
              <MasterLockerPanel />
            </section>
          )}

          {activeTab === 'npc' && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-3 border-l-4 border-purple-600 pl-4 text-slate-900">
                <Brain size={24} /> NPC 지능 및 응답 규칙 통제
              </h2>
              <MasterNPCPanel />
            </section>
          )}

          {activeTab === 'manitto' && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-3 border-l-4 border-indigo-600 pl-4 text-slate-900">
                <Gift size={24} /> 마니또 시스템 관리
              </h2>
              <MasterManittoPanel />
            </section>
          )}

          {activeTab === 'student' && (
            <div className="space-y-12">
            <section className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-3 border-l-4 border-blue-600 pl-4 text-slate-900">
            <Database size={24} /> 학생 상태 감찰 및 통제
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* User List Panel */}
            <div className="lg:col-span-1 border border-slate-200 bg-white rounded-2xl flex flex-col h-[600px] shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <Search size={16} className="text-slate-400" />
                <input 
                  type="text" 
                  placeholder="이름 또는 학번으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-slate-900 text-sm w-full placeholder:text-slate-400"
                />
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredUsers.map(u => (
                  <button
                    key={u.uid}
                    onClick={() => handleUserSelect(u)}
                    className={cn(
                      "w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-between group",
                      selectedUser?.uid === u.uid && "bg-blue-50/50 border-l-4 border-l-blue-600 border-b-slate-100"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate flex items-center gap-2 text-slate-900">
                        {u.name}
                        {u.isBanned && <ShieldAlert size={12} className="text-rose-500" />}
                        {u.role === 'admin' && <ShieldCheck size={12} className="text-amber-500" />}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        {u.studentId}
                        {u.activeView && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">현재 위치: {u.activeView}</span>}
                      </div>
                    </div>
                    <Users size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                  </button>
                ))}
              </div>
              <div className="p-3 text-xs bg-slate-50 text-slate-500 text-center font-medium border-t border-slate-200">
                활성 학생 수: {users.length}명
              </div>
            </div>

            {/* Editor Panel */}
            <div className="lg:col-span-2 border border-slate-200 bg-white rounded-2xl flex flex-col h-[600px] shadow-sm relative overflow-hidden">
              <AnimatePresence mode="wait">
                {selectedUser ? (
                  <motion.div 
                    key="editor"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col h-full"
                  >
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-slate-900">
                        <Fingerprint size={20} className="text-blue-600" />
                        <span className="font-bold">프로필 수정: {selectedUser.name}</span>
                      </div>
                      <button 
                        onClick={() => setSelectedUser(null)}
                        className="text-slate-400 hover:text-slate-900 transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                      {/* Identity & Status Section */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                           <h3 className="text-sm font-bold text-slate-900">기본 정보 및 권한</h3>
                           {selectedUser.lastActive && (
                             <span className="text-[10px] text-slate-400 font-mono">
                               마지막 활동: {new Date(selectedUser.lastActive?.toMillis ? selectedUser.lastActive.toMillis() : Date.now()).toLocaleString()}
                             </span>
                           )}
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">이름</label>
                            <input 
                              type="text" 
                              value={selectedUser.name}
                              onChange={e => setSelectedUser({...selectedUser, name: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">학번</label>
                            <input 
                              type="text" 
                              value={selectedUser.studentId}
                              onChange={e => setSelectedUser({...selectedUser, studentId: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">호실</label>
                            <input 
                              type="text" 
                              value={selectedUser.dormRoom || ""}
                              onChange={e => setSelectedUser({...selectedUser, dormRoom: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500">역할 (Role)</label>
                            <select 
                              value={selectedUser.role || "student"}
                              onChange={e => setSelectedUser({...selectedUser, role: e.target.value as any})}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                            >
                              <option value="student">학생</option>
                              <option value="teacher">교사</option>
                              <option value="admin">관리자</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-3 pt-6 col-span-2">
                             <button
                               onClick={() => setPreviewUser(selectedUser)}
                               className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 px-3 rounded-lg font-bold border border-indigo-200 transition-colors mb-2 text-left w-fit flex items-center gap-2"
                             >
                               <Eye size={14} /> 플레이어 시점 미리보기
                             </button>
                             <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-rose-600">
                                <input 
                                  type="checkbox"
                                  checked={selectedUser.isBanned || false}
                                  onChange={e => setSelectedUser({...selectedUser, isBanned: e.target.checked})}
                                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 accent-rose-600"
                                />
                                시스템 접속 차단 (BAN)
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-600">
                                <input 
                                  type="checkbox"
                                  checked={selectedUser.isCardFrozen || false}
                                  onChange={e => setSelectedUser({...selectedUser, isCardFrozen: e.target.checked})}
                                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600"
                                />
                                학생증(IC 카드) 결제 동결
                             </label>
                             <button
                               onClick={() => handleResetPassword(selectedUser.email)}
                               className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 rounded-lg font-bold border border-slate-200 transition-colors mt-2 text-left w-fit"
                             >
                               비밀번호 재설정 이메일 발송
                             </button>
                             <button
                               onClick={handleDeleteUser}
                               className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 py-2 px-3 rounded-lg font-bold border border-rose-200 transition-colors mt-2 text-left w-fit"
                             >
                               학생 기록 및 계정 강제 삭제 (초기화)
                             </button>
                          </div>
                        </div>
                      </div>

                      {/* Economy Section */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                          <Activity size={16} className="text-blue-600" /> 재화 및 상벌점
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                               <label className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Smartphone size={12} /> 명원 포인트 (원)</label>
                               <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 transition-all focus-within:border-blue-500">
                                 <button 
                                   onClick={() => setSelectedUser({...selectedUser, balance: Math.max(0, (selectedUser.balance || 0) - 1000)})}
                                   className="px-4 text-slate-500 hover:bg-slate-100 hover:text-slate-900 border-r border-slate-200 font-bold"
                                 >-</button>
                                 <input 
                                   type="number" 
                                   value={(selectedUser as any).balance}
                                   onChange={e => setSelectedUser({...selectedUser, balance: parseInt(e.target.value) || 0})}
                                   className="w-full bg-transparent p-2.5 text-slate-900 outline-none text-center font-medium"
                                 />
                                 <button 
                                   onClick={() => setSelectedUser({...selectedUser, balance: (selectedUser.balance || 0) + 1000})}
                                   className="px-4 text-slate-500 hover:bg-slate-100 hover:text-slate-900 border-l border-slate-200 font-bold"
                                 >+</button>
                               </div>
                            </div>
                          {[
                            { key: 'memoryPoints', label: '기억 파편', icon: <Zap size={12} /> },
                            { key: 'penaltyPoints', label: '벌점', icon: <ShieldAlert size={12} className="text-rose-500" /> },
                          ].map(eco => (
                            <div key={eco.key} className="space-y-1">
                               <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">{eco.icon} {eco.label}</label>
                               <input 
                                 type="number" 
                                 value={(selectedUser as any)[eco.key]}
                                 onChange={e => setSelectedUser({...selectedUser, [eco.key]: parseInt(e.target.value) || 0})}
                                 className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                               />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Inventory & Badges */}
                      <div className="grid grid-cols-2 gap-8">
                         <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                              <Database size={16} className="text-blue-600" /> 인벤토리 아이템 조작
                            </h3>
                            <textarea 
                              value={selectedUser.inventory?.join(', ')}
                              onChange={e => setSelectedUser({...selectedUser, inventory: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                              placeholder="아이템1, 아이템2..."
                              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900 h-24 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all custom-scrollbar font-medium"
                            />
                         </div>
                         <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                              <Trophy size={16} className="text-amber-500" /> 뱃지 조작
                            </h3>
                            <textarea 
                              value={selectedUser.badges?.join(', ')}
                              onChange={e => setSelectedUser({...selectedUser, badges: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                              placeholder="뱃지1, 뱃지2..."
                              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900 h-24 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all custom-scrollbar font-medium"
                            />
                         </div>
                      </div>

                      {/* TRPG Stats */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                           <ShieldAlert size={16} className="text-purple-600" /> TRPG 스테이터스 강제 수정
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { key: 'bonding', label: '결속력', color: 'text-sky-600' },
                            { key: 'rebellion', label: '반항심', color: 'text-rose-600' },
                            { key: 'physical', label: '신체능력', color: 'text-emerald-600' },
                            { key: 'stress', label: '스트레스', color: 'text-amber-600' },
                          ].map(stat => (
                            <div key={stat.key} className="space-y-1">
                              <label className={cn("text-xs font-bold", stat.color)}>{stat.label}</label>
                              <input 
                                type="number" 
                                min="0" 
                                max="100"
                                value={(selectedUser as any)[stat.key]}
                                onChange={e => setSelectedUser({...selectedUser, [stat.key]: parseInt(e.target.value) || 0})}
                                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* 심화 통제 (Per User) */}
                      <div className="space-y-4">
                         <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                           <ShieldAlert size={16} className="text-rose-600" /> 심화 학생 통제
                         </h3>
                         <div className="flex flex-col gap-3">
                           <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                             <input 
                               type="checkbox"
                               checked={selectedUser.isStatsMasked || false}
                               onChange={e => setSelectedUser({...selectedUser, isStatsMasked: e.target.checked})}
                               className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                             />
                             스탯 마스킹 (상태창 수치를 '???'로 블라인드 처리)
                           </label>
                           <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-indigo-700">
                             <input 
                               type="checkbox"
                               checked={selectedUser.hasAwakened || false}
                               onChange={e => setSelectedUser({...selectedUser, hasAwakened: e.target.checked})}
                               className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                             />
                             진실 자각 상태 (단어장의 언어가 본래의 의미로 변환됨)
                           </label>
                           <div className="space-y-1 mt-2">
                             <label className="text-xs font-semibold text-slate-500">투표 결과 조작 (표수 덮어쓰기. 미입력 시 정상출력)</label>
                             <input 
                               type="number" 
                               value={selectedUser.voteDisplayOverride ?? ""}
                               onChange={e => setSelectedUser({...selectedUser, voteDisplayOverride: e.target.value ? parseInt(e.target.value) : undefined})}
                               placeholder="예: 99 (투표 화면에 항상 99표로 표시됨)"
                               className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:border-indigo-500 font-mono"
                             />
                           </div>
                           <div className="space-y-1 mt-2">
                             <label className="text-xs font-semibold text-slate-500">메뉴 봉쇄 (쉼표로 구분. 예: 상점, 쪽지, 사물함)</label>
                             <input 
                               type="text" 
                               value={selectedUser.blockedMenus?.join(', ') || ""}
                               onChange={e => setSelectedUser({...selectedUser, blockedMenus: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                               className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-900 outline-none focus:border-blue-500"
                             />
                           </div>
                           <div className="space-y-1 mt-2">
                             <label className="text-xs font-semibold text-slate-500">UI 텍스트 변조 (JSON 형식. 예: {"{"} "상점": "폐쇄됨" {"}"})</label>
                             <textarea 
                               value={selectedUser.uiTextOverrides ? JSON.stringify(selectedUser.uiTextOverrides) : "{}"}
                               onChange={e => {
                                 try {
                                   const parsed = JSON.parse(e.target.value);
                                   setSelectedUser({...selectedUser, uiTextOverrides: parsed});
                                 } catch(err) {} 
                               }}
                               className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900 h-24 text-sm outline-none focus:border-blue-500 font-mono"
                             />
                             <p className="text-[10px] text-slate-400">올바른 JSON 형식이 아니면 저장되지 않습니다.</p>
                           </div>
                         </div>
                      </div>
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                       <button onClick={() => setSelectedUser(null)} className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 transition-all font-bold text-sm">
                         취소
                       </button>
                       <button 
                         onClick={handleUserUpdate}
                         disabled={isSaving}
                         className="px-8 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all font-bold text-sm flex items-center gap-2 disabled:opacity-50 shadow-sm"
                       >
                         {isSaving ? <Activity className="animate-spin" size={16} /> : <Save size={16} />}
                         프로필 변경사항 덮어쓰기
                       </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-40 gap-4 text-center p-8 text-slate-400">
                    <Fingerprint size={80} className="mb-2" />
                    <p className="font-semibold">좌측 목록에서 학생을 선택하여 프로필을 수정하세요.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* 신규: 마스터 보상 관리 및 특별 미션 패널 */}
        <section className="space-y-6 mt-12">
           <h2 className="text-xl font-bold flex items-center gap-3 border-l-4 border-indigo-600 pl-4 text-slate-900">
             <Trophy size={24} className="text-indigo-600" /> 보상 및 특별 관리
           </h2>
           <MasterRewardPanel />
           <MasterMissionPanel />
           <MasterRelationPanel />
           <MasterScenarioPanel />
           <QuickCommandPad />
        </section>

        {/* Dual Contract Section */}
        <section className="space-y-6 mt-12 bg-indigo-50 border border-indigo-100 p-8 rounded-2xl shadow-sm">
           <h2 className="text-xl font-bold flex items-center gap-3 border-l-4 border-indigo-600 pl-4 text-slate-900">
             <ShieldAlert size={24} className="text-indigo-600" /> 이중 계약 발행 (Dual Contract)
           </h2>
           <p className="text-sm font-medium text-slate-600 mb-6">
             두 명의 플레이어 간 상호 의존적 또는 배타적인 특별 퀘스트를 발행합니다. 시스템이 자동으로 모니터링합니다.
           </p>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-slate-200">
              <div className="space-y-4">
                 <h3 className="font-bold text-sm text-slate-900 border-b pb-2">플레이어 A 설정</h3>
                 <input id="dualUserA" type="text" placeholder="플레이어 A의 UID" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm" />
                 <textarea id="dualMissionA" placeholder="플레이어 A의 미션 목표" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm h-20" />
                 <input id="dualRewardMW_A" type="number" placeholder="성공 보상 원 (A)" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <div className="space-y-4">
                 <h3 className="font-bold text-sm text-slate-900 border-b pb-2">플레이어 B 설정</h3>
                 <input id="dualUserB" type="text" placeholder="플레이어 B의 UID" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm" />
                 <textarea id="dualMissionB" placeholder="플레이어 B의 미션 목표" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm h-20" />
                 <input id="dualRewardMW_B" type="number" placeholder="성공 보상 원 (B)" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm" />
              </div>
              <button 
                onClick={async () => {
                  const pA = (document.getElementById('dualUserA') as HTMLInputElement).value;
                  const pB = (document.getElementById('dualUserB') as HTMLInputElement).value;
                  const mA = (document.getElementById('dualMissionA') as HTMLTextAreaElement).value;
                  const mB = (document.getElementById('dualMissionB') as HTMLTextAreaElement).value;
                  const rA = parseInt((document.getElementById('dualRewardMW_A') as HTMLInputElement).value) || 0;
                  const rB = parseInt((document.getElementById('dualRewardMW_B') as HTMLInputElement).value) || 0;
                  if(!pA || !pB || !mA || !mB) return alert('모든 필드를 입력하세요.');
                  await addDoc(collection(db, "dual_contracts"), {
                      playerAUid: pA, playerBUid: pB,
                      missionA: mA, missionB: mB,
                      rewardA: { balance: rA }, rewardB: { balance: rB },
                      status: 'active', createdAt: serverTimestamp()
                  });
                  alert('이중 계약이 발행되었습니다.');
                }}
                className="md:col-span-2 w-full py-3 bg-indigo-600 rounded-xl text-white font-bold hover:bg-indigo-700 transition"
              >
                이중 계약 (시스템 서약) 발행
              </button>
           </div>
        </section>

        {/* Communication Intercept Section */}
        <section className="space-y-6 mt-12">
          <h2 className="text-xl font-bold flex items-center gap-3 border-l-4 border-amber-500 pl-4 text-slate-900">
            <MessageSquare size={24} className="text-amber-500" /> 채팅 감청 / 메시지 변조 UI
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Rooms List */}
             <div className="lg:col-span-1 border border-slate-200 bg-white rounded-2xl flex flex-col h-[500px] shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-between gap-2">
                   <div className="flex items-center gap-2"><Eye size={16} /> 감시 중인 채널</div>
                   {selectedUser && <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">필터: {selectedUser.name}</span>}
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   {displayRooms.map(room => (
                      <button 
                        key={room.id}
                        onClick={() => setSelectedRoom(room)}
                        className={cn(
                          "w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors group",
                          selectedRoom?.id === room.id && "bg-amber-50/50 border-l-4 border-l-amber-500 border-b-slate-100"
                        )}
                      >
                         <div className="text-[10px] text-slate-400 mb-1 font-mono">{room.id}</div>
                         <div className="text-sm font-bold truncate text-slate-900">{getTargetName(room.id)}</div>
                         {room.lastMessage && (
                            <div className="text-xs text-slate-500 truncate mt-1">"{room.lastMessage}"</div>
                         )}
                      </button>
                   ))}
                </div>
             </div>

             {/* Message View */}
             <div className="lg:col-span-2 border border-slate-200 bg-white rounded-2xl flex flex-col h-[500px] relative shadow-sm overflow-hidden">
                <AnimatePresence mode="wait">
                  {selectedRoom ? (
                    <motion.div 
                      key="roomView"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col h-full"
                    >
                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900">{getTargetName(selectedRoom.id)}</span>
                          <button onClick={() => setSelectedRoom(null)} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                          {isLoadingMessages ? (
                              <div className="flex items-center justify-center p-12"><Activity className="animate-spin text-amber-500" /></div>
                          ) : messages.length === 0 ? (
                              <div className="text-center p-12 text-slate-400 text-sm font-medium">채널에 기록된 메시지가 없습니다.</div>
                          ) : (
                              messages.map(msg => {
                                const sender = users.find(u => u.uid === msg.senderId);
                                return (
                                  <div key={msg.id} className="group border border-slate-100 p-3.5 rounded-xl bg-slate-50 hover:border-slate-300 transition-all flex justify-between items-start">
                                      <div>
                                        <div className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-2">
                                            {sender?.name || '알 수 없는 사용자'} <span className="text-slate-400 font-normal text-[10px]">{msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleString() : '전송 중...'}</span>
                                        </div>
                                        <div className="text-sm text-slate-700 leading-relaxed max-w-xl">{msg.text}</div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button 
                                          onClick={() => updateMessage(msg.id, msg.text)}
                                          className="opacity-0 group-hover:opacity-100 p-2 text-blue-500 hover:bg-blue-50 transition-all rounded-lg"
                                          title="메시지 가로채기 (변조)"
                                        >
                                          <Search size={16} /> {/* or another edit icon */}
                                        </button>
                                        <button 
                                          onClick={() => deleteMessage(msg.id)}
                                          className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-50 transition-all rounded-lg"
                                          title="메시지 기록 삭제"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                  </div>
                                );
                              })
                          )}
                        </div>
                    </motion.div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 text-center p-8">
                        <MessageSquare size={60} className="mb-2 opacity-50" />
                        <p className="font-semibold">감찰할 채널을 선택해 트래픽을 확인하세요.</p>
                    </div>
                  )}
                </AnimatePresence>
             </div>
          </div>
        </section>
            </div>
        )}

      {activeTab === 'system' && (
         <div className="space-y-8">
          <section className="space-y-6">
             <h2 className="text-xl font-bold flex items-center gap-3 border-l-4 border-indigo-500 pl-4 text-slate-900">
               <Activity size={24} className="text-indigo-500" /> 플레이어 감찰 지표 및 실시간 로그
             </h2>
             <EmotionThermometer />
             <div className="h-[400px]">
               <MasterEventLogView />
             </div>
          </section>

          {/* 전교생 긴급 경고 발송 (Global Broadcast) */}
          <section className="space-y-6">
             <h2 className="text-xl font-bold flex items-center gap-3 border-l-4 border-rose-500 pl-4 text-slate-900">
               <Radio size={24} className="text-rose-500" /> 전교생 긴급 경고 발송
             </h2>
             <div className="border border-slate-200 bg-white rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                <div className="flex flex-col md:flex-row gap-8">
                   <div className="flex-1 space-y-3">
                      <label className="text-sm font-bold text-slate-900">상단 고정 시스템 경고 메시지</label>
                      <div className="flex gap-3">
                         <input 
                           type="text" 
                           value={activeAlert}
                           onChange={e => setActiveAlert(e.target.value)}
                           placeholder="학생 앱 화면 최상단에 고정될 메시지를 입력하세요..."
                           className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none text-sm transition-all font-medium"
                         />
                         <button 
                           onClick={handleUpdateAlert}
                           className="px-6 py-3 bg-rose-600 rounded-xl text-white font-bold text-sm hover:bg-rose-700 active:scale-95 transition-all flex items-center gap-2 shadow-sm whitespace-nowrap"
                         >
                            <ShieldAlert size={16} /> 경고 발송
                         </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 font-medium">이 메시지는 모든 학생의 기기에 실시간으로 노출됩니다.</p>
                   </div>
                   
                   <div className="flex-1 border border-slate-100 bg-slate-50 rounded-xl p-6">
                      <label className="text-sm font-bold text-slate-900 mb-4 block">긴급 액션 / 타임루프 제어</label>
                      <div className="grid grid-cols-2 gap-4">
                         <button onClick={triggerJumpscare} className="p-4 border border-rose-200 bg-white text-rose-600 rounded-xl hover:bg-rose-50 hover:border-rose-300 font-bold text-sm transition-all flex flex-col items-center justify-center gap-2 shadow-sm">
                            <Zap size={20} /> Jumpscare 트리거
                         </button>
                         <button onClick={() => handleUpdateLoop(Math.min(10, loop + 1))} className="p-4 border border-blue-200 bg-white text-blue-600 rounded-xl hover:bg-blue-50 hover:border-blue-300 font-bold text-sm transition-all flex flex-col items-center justify-center gap-2 shadow-sm">
                            <Activity size={20} /> 타임루프 단계 상승
                         </button>
                         <button 
                           onClick={async () => {
                             await updateDoc(doc(db, "system", "config"), { confessionOpen: !systemConfig?.confessionOpen });
                           }} 
                           className={cn("p-4 border rounded-xl font-bold text-sm transition-all flex flex-col items-center justify-center gap-2 shadow-sm col-span-2", systemConfig?.confessionOpen ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}
                         >
                            <MessageSquare size={20} /> 
                            {systemConfig?.confessionOpen ? "자백 시스템 닫기 (현재 열림)" : "자백 시스템 열기 (현재 닫힘)"}
                         </button>
                      </div>
                   </div>
                </div>
             </div>
           </section>

           {/* 앱 업데이트 강제 알림, 전체 사운드 강제 재생, 전체 학생 스트레스 초기화 */}
           <section className="space-y-6 mt-12">
              <h2 className="text-xl font-bold flex items-center gap-3 border-l-4 border-rose-500 pl-4 text-slate-900">
                <AlertTriangle size={24} className="text-rose-500" /> 공용 시스템 상태 이상 설정
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="border border-slate-200 bg-white rounded-2xl p-6 space-y-4 shadow-sm flex flex-col">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">🔄 앱 업데이트 강제 알림</h3>
                    <p className="text-xs text-slate-500 font-medium pb-4">전교생의 화면에 페이크 강제 업데이트 알림을 띄웁니다.</p>
                    <button onClick={() => {
                        if(window.confirm('전교생에게 강제 업데이트 알림을 보내시겠습니까?')) {
                          issueCommand('toast', { message: "단말기 OS 업데이트가 필요합니다. 시스템이 재시작됩니다.", style: "error", icon: "refresh" }, 'ALL');
                        }
                    }} className="w-full py-3 bg-red-600 rounded-xl text-white font-bold text-sm hover:bg-red-700 mt-auto transition-colors">강제 업데이트 알림 전송</button>
                 </div>
                 
                 <div className="border border-slate-200 bg-white rounded-2xl p-6 space-y-4 shadow-sm flex flex-col">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">🔊 전체 사운드 강제 재생</h3>
                    <div className="space-y-2 mt-auto">
                      <input type="text" id="soundTargetSystem" placeholder="대상 UID (비워두면 ALL전교생)" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 text-slate-900" />
                      <input type="text" id="soundFileSystem" placeholder="오디오 파일 URL 혹은 경로" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 text-slate-900" />
                      <button onClick={() => {
                        const target = (document.getElementById('soundTargetSystem') as HTMLInputElement)?.value || 'ALL';
                        const sound = (document.getElementById('soundFileSystem') as HTMLInputElement)?.value;
                        if(sound) issueCommand('sound', { sound }, target);
                      }} className="w-full py-3 bg-indigo-600 rounded-xl text-white font-bold text-sm hover:bg-indigo-700 transition-colors">전체 재생 시키기</button>
                    </div>
                 </div>

                 <div className="border border-slate-200 bg-white rounded-2xl p-6 space-y-4 shadow-sm flex flex-col">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">🧘 루프 종료 시 스트레스 초기화</h3>
                    <p className="text-xs text-slate-500 font-medium pb-4">모든 학생의 스트레스 수치를 0으로 강제 초기화합니다. (스토리 루프 초기화 결산 시 사용)</p>
                    <button onClick={async () => {
                       if(!window.confirm('모든 학생의 스트레스를 0으로 초기화하시겠습니까?')) return;
                       const targets = users.filter(u => u.role !== 'admin');
                       let count = 0;
                       for (const user of targets) {
                          await updateDoc(doc(db, "users", user.uid), { stress: 0 });
                          count++;
                       }
                       alert(`${count}명의 스트레스가 초기화되었습니다.`);
                    }} className="w-full py-3 bg-emerald-600 rounded-xl text-white font-bold text-sm hover:bg-emerald-700 mt-auto transition-colors">전체 스트레스 초기화</button>
                 </div>
              </div>
           </section>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12 mt-6">
             {/* Doomsday Timer */}
             <div className="border border-slate-200 bg-white rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-sm">
               <h2 className="text-xl font-bold mb-6 flex items-center gap-3 border-b border-slate-100 pb-4 text-slate-900">
                 <Clock size={20} className="text-rose-600" /> 락다운 카운트다운 설정
               </h2>

               <div className="space-y-6 relative z-10">
                 <div className="flex items-center gap-4">
                   <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-100">
                     <label className="block text-xs font-semibold text-slate-500 mb-2">분 (Minutes)</label>
                     <input
                       type="number"
                       value={timerMins}
                       onChange={(e) => setTimerMins(parseInt(e.target.value))}
                       className="w-full bg-white border border-slate-200 rounded-lg text-slate-900 p-3 font-mono text-2xl text-center outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all font-bold"
                     />
                   </div>
                   <div className="text-3xl font-bold text-slate-300 mt-4">:</div>
                   <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-100">
                     <label className="block text-xs font-semibold text-slate-500 mb-2">초 (Seconds)</label>
                     <input
                       type="number"
                       value={timerSecs}
                       onChange={(e) => setTimerSecs(parseInt(e.target.value))}
                       className="w-full bg-white border border-slate-200 rounded-lg text-slate-900 p-3 font-mono text-2xl text-center outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all font-bold"
                     />
                   </div>
                 </div>

                 <div className="flex gap-4">
                   <button
                     onClick={startDoomsday}
                     className="flex-1 bg-rose-600 text-white rounded-xl font-bold py-4 hover:bg-rose-700 transition-colors shadow-sm"
                   >
                     카운트다운 시작
                   </button>
                   {systemActive && (
                     <button onClick={stopDoomsday} className="flex-1 bg-white border border-slate-300 text-slate-600 rounded-xl font-bold py-4 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                       카운트다운 중지
                     </button>
                   )}
                 </div>
               </div>
             </div>

             <div className="border border-slate-200 bg-white rounded-2xl p-6 md:p-8 relative shadow-sm">
               <h2 className="text-xl font-bold mb-6 flex items-center gap-3 border-b border-slate-100 pb-4 text-slate-900">
                 <Radio size={20} className="text-blue-600" /> EVP 라디오 주파수 조작
               </h2>
               <div className="space-y-8 relative z-10">
                   <input
                     type="range"
                     min="87.5"
                     max="108.0"
                     step="0.1"
                     value={radioFreq}
                     onChange={(e) => handleUpdateFreq(parseFloat(e.target.value))}
                     className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                   />
                 <div className="text-center p-8 bg-slate-50 border border-slate-100 rounded-xl shadow-inner">
                   <div className="text-5xl font-black text-slate-900 tracking-tight">
                     {radioFreq.toFixed(1)} <span className="text-lg text-slate-400 font-bold ml-1">MHz</span>
                   </div>
                   <p className="text-sm text-slate-500 mt-3 font-medium">라디오 기능을 해금한 학생이 이 주파수를 맞추면 숨겨진 반응이 출력됩니다.</p>
                 </div>
               </div>
             </div>

             {/* Ending Control Panel */}
             <div className="border border-slate-200 bg-white rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-sm md:col-span-2">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-3 border-b border-slate-100 pb-4 text-slate-900">
                  <Disc size={20} className="text-indigo-600" /> 엔딩 강제 트리거 (수동)
                </h2>
                <div className="space-y-4">
                   <p className="text-sm font-medium text-slate-600">수동으로 엔딩 시퀀스를 발동시킵니다. 카운트다운이나 생존자 지표와 무관하게 즉시 발동됩니다.</p>
                   
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <button onClick={async () => { if(window.confirm('엔딩 A를 발동하시겠습니까?')) await updateDoc(doc(db, "system", "config"), { endingMode: 'A' }) }} className="p-4 border border-slate-200 bg-slate-50 text-slate-900 rounded-xl hover:bg-slate-100 font-bold text-sm transition-all text-center">
                          엔딩 A : 탈출 (진실)
                       </button>
                       <button onClick={async () => { if(window.confirm('엔딩 B를 발동하시겠습니까?')) await updateDoc(doc(db, "system", "config"), { endingMode: 'B' }) }} className="p-4 border border-rose-200 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 font-bold text-sm transition-all text-center">
                          엔딩 B : 감염 (붕괴)
                       </button>
                       <button onClick={async () => { if(window.confirm('엔딩 C를 발동하시겠습니까?')) await updateDoc(doc(db, "system", "config"), { endingMode: 'C' }) }} className="p-4 border border-amber-200 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 font-bold text-sm transition-all text-center">
                          엔딩 C : 락다운 (타임아웃)
                       </button>
                   </div>

                   {systemConfig?.endingMode && (
                       <div className="mt-4 p-4 bg-sky-50 text-sky-700 font-bold rounded-xl text-center text-sm border border-sky-200 animate-pulse flex justify-center items-center gap-4">
                          현재 [엔딩 {systemConfig.endingMode}] 가 발동 중입니다!
                          <button onClick={async () => await updateDoc(doc(db, "system", "config"), { endingMode: null })} className="underline text-sky-900 hover:text-sky-950">강제 취소</button>
                       </div>
                   )}
                </div>
             </div>

           </div>
         </div>
      )}

      {activeTab === 'automation' && (
         <div className="space-y-8">
           <section className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-3 border-l-4 border-emerald-500 pl-4 text-slate-900">
                <Activity size={24} className="text-emerald-500" /> 시나리오 자동화
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Quests */}
                <div className="border border-slate-200 bg-white rounded-2xl p-6 space-y-5 flex flex-col shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2"><Trophy size={16} className="text-amber-500"/> 신규 퀘스트 발행</h3>
                    <input
                       type="text"
                       value={questTitle}
                       onChange={(e) => setQuestTitle(e.target.value)}
                       placeholder="퀘스트 제목 (예: 과학실의 비밀)"
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                    />
                    <textarea
                       value={questDesc}
                       onChange={(e) => setQuestDesc(e.target.value)}
                       placeholder="퀘스트 설명 (조건, 내용 등)"
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none flex-1 min-h-[100px] font-medium"
                    />
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                          <span className="absolute left-3 top-3 text-xs text-slate-400 font-bold">원</span>
                          <input
                              type="number"
                              value={questRewardWon || ''}
                              onChange={(e) => setQuestRewardWon(parseInt(e.target.value) || 0)}
                              placeholder="지급 포인트"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 text-slate-900 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                          />
                        </div>
                        <div className="flex-1 relative">
                          <span className="absolute left-3 top-3 text-xs text-slate-400 font-bold">EXP</span>
                          <input
                              type="number"
                              value={questRewardExp || ''}
                              onChange={(e) => setQuestRewardExp(parseInt(e.target.value) || 0)}
                              placeholder="경험치"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 text-slate-900 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                          />
                        </div>
                    </div>
                    <button onClick={publishQuest} className="w-full py-3 bg-emerald-600 rounded-xl text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm mt-auto">
                       퀘스트 발행하기
                    </button>
                </div>

                {/* Bot Keywords */}
                <div className="border border-slate-200 bg-white rounded-2xl p-6 space-y-5 flex flex-col shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2"><MessageSquare size={16} className="text-blue-500"/> NPC 챗봇 자동 응답 설정</h3>
                    <input
                       type="text"
                       value={botKeyword}
                       onChange={(e) => setBotKeyword(e.target.value)}
                       placeholder="인식할 키워드 (예: 지하실, 열쇠)"
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                    />
                    <textarea
                       value={botReply}
                       onChange={(e) => setBotReply(e.target.value)}
                       placeholder="학생이 키워드를 포함한 메시지를 보냈을 때 챗봇이 보낼 자동 답장 내용"
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none flex-1 min-h-[100px] font-medium"
                    />
                    <button onClick={publishBotKeyword} className="w-full py-3 bg-emerald-600 rounded-xl text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm mt-auto">
                       응답 규칙 저장
                    </button>
                </div>

                {/* Rumor Reservations */}
                <div className="border border-slate-200 bg-white rounded-2xl p-6 space-y-5 flex flex-col shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2"><Radio size={16} className="text-purple-500"/> 익명 괴담 (루머) 예약 발송</h3>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <label className="text-xs font-semibold text-slate-500">트리거 될 타임루프 단계</label>
                        <input
                            type="number"
                            value={rumorLoop}
                            onChange={(e) => setRumorLoop(parseInt(e.target.value) || 1)}
                            className="w-20 bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-sm text-center outline-none focus:border-emerald-500 font-medium"
                        />
                    </div>
                    <textarea
                       value={rumorContent}
                       onChange={(e) => setRumorContent(e.target.value)}
                       placeholder="게시판에 익명으로 올라올 괴담 내용을 입력하세요."
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none flex-1 min-h-[100px] font-medium"
                    />
                    <button onClick={publishRumor} className="w-full py-3 bg-emerald-600 rounded-xl text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm mt-auto">
                       루프 괴담 예약하기
                    </button>
                </div>

                {/* Trust Collapse */}
                <div className="border border-slate-200 bg-white rounded-2xl p-6 space-y-5 flex flex-col shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2"><Activity size={16} className="text-rose-600"/> 신뢰도 붕괴 스캔 및 배신</h3>
                    <p className="text-sm text-slate-600 font-medium">결속력(Bonding)이 20 이하인 학생들을 모두 찾아 '배신의 증명' 개인 미션을 즉시 강제 발행합니다.</p>
                    <button onClick={async () => {
                       const targets = users.filter(u => (u.bonding || 50) <= 20);
                       if(targets.length === 0) {
                         alert("조건에 부합하는 학생이 없습니다.");
                         return;
                       }
                       if(!window.confirm(`${targets.length}명의 학생에게 배신 임무를 발행하시겠습니까?`)) return;
                       
                       for(const u of targets) {
                         await addDoc(collection(db, 'private_missions'), {
                           targetUid: u.uid,
                           title: '배신의 증명',
                           description: '당신은 동료들에 대해 깊은 불신을 품고 있습니다. 오늘 루프가 끝나기 전, 가장 결속력이 높은 학생 한 명의 신뢰를 무너뜨릴 결정적인 거짓말을 하거나, 그들의 아이템을 훔치십시오.',
                           reward: { memoryPoints: 50, stamina: 30 },
                           isCompleted: false,
                           isVisible: true,
                           createdAt: serverTimestamp()
                         });
                       }
                       alert(`${targets.length}명에게 배신 임무가 하달되었습니다.`);
                    }} className="w-full py-3 bg-rose-600 rounded-xl text-white font-bold text-sm hover:bg-rose-700 transition-all shadow-sm mt-auto">
                       집단 배신 임무 발행
                    </button>
                </div>

                {/* Dead Drop Generator */}
                <div className="border border-slate-200 bg-white rounded-2xl p-6 space-y-5 flex flex-col shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2"><Archive size={16} className="text-slate-700"/> 데드드롭 (비상 보급품) 발행</h3>
                    <input
                       type="text"
                       id="deadDropLoc"
                       placeholder="은닉 장소 (예: 과학실 3번 사물함 뒤)"
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                    />
                    <input
                       type="text"
                       id="deadDropCode"
                       placeholder="비밀번호 혹은 해제 조건"
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                    />
                    <textarea
                       id="deadDropContent"
                       placeholder="드랍 내용물 및 보상"
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none h-20 font-medium"
                    />
                    <button onClick={async () => {
                       const loc = (document.getElementById('deadDropLoc') as HTMLInputElement)?.value;
                       const code = (document.getElementById('deadDropCode') as HTMLInputElement)?.value;
                       const contents = (document.getElementById('deadDropContent') as HTMLTextAreaElement)?.value;
                       if(!loc || !contents) return alert("필수 값을 입력하세요.");
                       await addDoc(collection(db, "system", "data", "deadDrops"), {
                           location: loc, passcode: code, contents, isClaimed: false, createdAt: serverTimestamp()
                       });
                       alert("데드드롭이 맵 상에 발행되었습니다.");
                    }} className="w-full py-3 bg-slate-700 rounded-xl text-white font-bold text-sm hover:bg-slate-800 transition-all shadow-sm mt-auto">
                       데드드롭 생성 
                    </button>
                </div>

                {/* Group Vote Trigger */}
                <div className="border border-slate-200 bg-white rounded-2xl p-6 space-y-5 flex flex-col shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2"><Users size={16} className="text-blue-600"/> 집단 투표(선택) 발행</h3>
                    <input
                       type="text"
                       id="groupVoteTitle"
                       placeholder="투표 안건 (예: 누구를 희생시킬 것인가?)"
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                    <textarea
                       id="groupVoteOptions"
                       placeholder="선택지 (쉼표 단위로 구분. 예: 찬성,반대)"
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none h-20 font-medium"
                    />
                    <button onClick={async () => {
                       const title = (document.getElementById('groupVoteTitle') as HTMLInputElement)?.value;
                       const optsStr = (document.getElementById('groupVoteOptions') as HTMLTextAreaElement)?.value;
                       if(!title || !optsStr) return alert("필수 값을 입력하세요.");
                       const options = optsStr.split(',').map(s=>s.trim()).filter(Boolean);
                       await addDoc(collection(db, "system", "data", "groupVotes"), {
                           title, options, isActive: true, status: 'open', results: {}, createdAt: serverTimestamp()
                       });
                       alert("전교생 대상 집단 투표가 시작되었습니다.");
                    }} className="w-full py-3 bg-blue-600 rounded-xl text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-sm mt-auto">
                       집단 투표 시작
                    </button>
                </div>
            </div>
           </section>
        </div>
      )}

      {activeTab === 'advanced' && (
         <div className="space-y-8">
           <MasterMapPanel />
           <section className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-3 border-l-4 border-indigo-500 pl-4 text-slate-900">
                <ShieldAlert size={24} className="text-indigo-500" /> 학교 환경 및 미스터리 통제 (Global Settings)
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                 {/* Climate Control */}
                 <div className="md:col-span-12 border border-slate-200 bg-white rounded-3xl p-6 shadow-sm">
                   <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 mb-4">
                     <CloudRain size={16} className="text-blue-500"/> 학교 대기 및 기후 상태 강제 변경 (Atmosphere)
                   </h3>
                   <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                      {[
                        { id: 'normal', name: '맑음/평온', icon: <Sun size={20} />, color: 'bg-orange-50 text-orange-600 border-orange-100' },
                        { id: 'ominous', name: '음산함/흐림', icon: <Disc size={20} />, color: 'bg-slate-100 text-slate-600 border-slate-200' },
                        { id: 'rain', name: '폭우/천둥', icon: <CloudRain size={20} />, color: 'bg-blue-50 text-blue-600 border-blue-100' },
                        { id: 'glitch', name: '시스템 오류', icon: <Zap size={20} />, color: 'bg-purple-50 text-purple-600 border-purple-100' },
                        { id: 'doomsday', name: '종말/화재', icon: <AlertTriangle size={20} />, color: 'bg-rose-50 text-rose-600 border-rose-100' },
                        { id: 'frozen', name: '극한의 추위', icon: <Wind size={20} />, color: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
                      ].map(env => (
                        <button 
                          key={env.id}
                          onClick={async () => {
                            await updateDoc(doc(db, "system", "config"), { atmosphere: env.id });
                            alert(`학교 분위기가 [${env.name}]으로 변경되었습니다.`);
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all hover:scale-105 active:scale-95 group",
                            systemConfig?.atmosphere === env.id ? env.color + " shadow-md border-2" : "bg-white border-slate-100 text-slate-400 grayscale hover:grayscale-0"
                          )}
                        >
                          <div className="mb-2 group-hover:animate-bounce">{env.icon}</div>
                          <span className="text-[10px] font-black tracking-tighter">{env.name}</span>
                        </button>
                      ))}
                   </div>
                 </div>

                 <div className="md:col-span-6 border border-slate-200 bg-white rounded-2xl p-6 space-y-4 shadow-sm">
                   <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">💬 가짜 시스템 알림 전송</h3>
                   <div className="space-y-2">
                     <input type="text" id="toastTarget" placeholder="대상 UID (비워두면 ALL전교생)" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 text-slate-900" />
                     <input type="text" id="toastMessage" placeholder="노출할 메시지" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 text-slate-900" />
                     <button onClick={() => {
                       const target = (document.getElementById('toastTarget') as HTMLInputElement).value || 'ALL';
                       const message = (document.getElementById('toastMessage') as HTMLInputElement).value;
                       if(message) issueCommand('toast', { message }, target);
                     }} className="w-full py-2 bg-indigo-600 rounded-lg text-white font-bold text-sm hover:bg-indigo-700 transition">전송</button>
                   </div>
                </div>

                <div className="border border-slate-200 bg-white rounded-2xl p-6 space-y-4 shadow-sm">
                   <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">🚪 전교생 강제 화면 이동</h3>
                   <div className="space-y-2">
                     <input type="text" id="redirectTarget" placeholder="대상 UID (비워두면 ALL전교생)" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 text-slate-900" />
                     <select id="redirectScreen" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 text-slate-900">
                       <option value="">이동할 화면 선택...</option>
                       <option value="home">대시보드 (Home)</option>
                       <option value="board">공지사항 (NoticeBoard)</option>
                       <option value="map">학교 지도 (Map)</option>
                       <option value="terminal">터미널 (Terminal)</option>
                       <option value="market">상점 (Market)</option>
                       <option value="relations">관계도 (Relations)</option>
                     </select>
                     <button onClick={() => {
                       const target = (document.getElementById('redirectTarget') as HTMLInputElement).value || 'ALL';
                       const screen = (document.getElementById('redirectScreen') as HTMLSelectElement).value;
                       if(screen) issueCommand('jump', { path: screen }, target);
                     }} className="w-full py-2 bg-rose-600 rounded-lg text-white font-bold text-sm hover:bg-rose-700 transition">강제 이동</button>
                   </div>
                </div>

                <div className="border border-slate-200 bg-white rounded-2xl p-6 space-y-4 shadow-sm md:col-span-2">
                   <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex justify-between items-center">
                     <span>👁️ 심문 모드 활성화 (Interrogation Mode)</span>
                   </h3>
                   <p className="text-xs text-slate-600 font-medium mb-3">
                     특정 채팅방을 시스템 감시(심문실) 상태로 전환합니다. 이 모드에서는 학생들이 보내지 못하고 삭제한 타이핑 초안이 모두 시스템에 기록됩니다.
                   </p>
                   <div className="flex gap-2">
                     <select id="interrogationRoomId" className="flex-1 bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm">
                        <option value="">감시할 채팅방 선택...</option>
                        {rooms.map(r => <option key={r.id} value={r.id}>{getTargetName(r.id)}</option>)}
                     </select>
                     <button onClick={async () => {
                         const roomId = (document.getElementById('interrogationRoomId') as HTMLSelectElement).value;
                         if(!roomId) return alert("채팅방을 선택하세요.");
                         if(window.confirm("이 채팅방에 심문 모드를 활성화하시겠습니까?")) {
                             await updateDoc(doc(db, "system", "config"), { interrogationRoomId: roomId });
                             await addDoc(collection(db, "interrogation_sessions"), {
                                roomId, isActive: true, deletedDrafts: [], activatedBy: "admin", createdAt: serverTimestamp()
                             });
                             alert("심문 모드가 활성화되었습니다.");
                         }
                     }} className="bg-red-600 text-white font-bold px-4 rounded-lg hover:bg-red-700 text-sm transition-colors">활성화</button>
                     <button onClick={async () => {
                         await updateDoc(doc(db, "system", "config"), { interrogationRoomId: null });
                         alert("심문 모드가 비활성화되었습니다.");
                     }} className="bg-slate-200 text-slate-700 font-bold px-4 rounded-lg hover:bg-slate-300 text-sm transition-colors">해제</button>
                   </div>
                   {systemConfig?.interrogationRoomId && (
                     <div className="mt-2 text-xs font-bold text-red-600 bg-red-50 p-2 rounded-md">현재 적용 중: {systemConfig.interrogationRoomId}</div>
                   )}
                </div>
                
                <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-sm flex flex-col max-h-[300px]">
                   <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-2 flex items-center justify-between">
                     <span>🕵️ 대나무숲(익명) 검열</span>
                     <span className="text-[10px] bg-rose-100 text-rose-700 px-1 py-0.5 rounded">실시간 단속됨</span>
                   </h3>
                   <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                     {whispers.length === 0 ? <p className="text-sm text-slate-400">게시물이 없습니다.</p> : whispers.map(w => (
                       <div key={w.id} className="p-2 border border-slate-100 bg-slate-50 rounded text-sm relative group flex justify-between items-start">
                         <div>
                           <div className="text-[10px] text-slate-400">{w.createdAt ? new Date(w.createdAt.seconds * 1000).toLocaleString() : ''}</div>
                           <div className="text-slate-700">{w.content}</div>
                         </div>
                         <button onClick={async () => {
                           if(window.confirm('삭제할까요?')) {
                             await deleteDoc(doc(db, "whispers", w.id));
                           }
                         }} className="text-rose-500 opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-100 rounded">
                           <Trash2 size={14}/>
                         </button>
                       </div>
                     ))}
                   </div>
                </div>

                {/* [신규 B] 신뢰도 붕괴 트리거 섹션 */}
                <div className="border border-slate-200 bg-white rounded-2xl p-6 space-y-4 shadow-sm md:col-span-2">
                   <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex justify-between items-center">
                     <span>💔 신뢰도 붕괴 위험 감지 (Bonding &le; 20)</span>
                   </h3>
                   <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                     {users.filter(u => typeof u.bonding === 'number' && u.bonding <= 20).length === 0 ? (
                       <p className="text-xs text-slate-500">현재 신뢰도 붕괴 위험군 타겟이 없습니다.</p>
                     ) : (
                       users.filter(u => typeof u.bonding === 'number' && u.bonding <= 20).map(u => (
                         <div key={u.uid} className="flex justify-between items-center p-3 bg-rose-50 border border-rose-100 rounded-lg">
                           <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                             {u.name} 
                             <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-[10px]">위험도: {u.bonding}</span>
                           </div>
                           <button onClick={async () => {
                             if(window.confirm(`${u.name}에게 배신 유혹을 발동할까요?`)) {
                               await addDoc(collection(db, 'private_missions'), {
                                 targetUid: u.uid, title: "선택의 기로", description: "당신은 선택의 기로에 서 있습니다.", isVisible: true, isCompleted: false, createdAt: serverTimestamp()
                               });
                               alert('배신 유혹 발동이 완료되었습니다.');
                             }
                           }} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors">
                             [배신 유혹 발동]
                           </button>
                         </div>
                       ))
                     )}
                   </div>
                </div>

                {/* [신규 C] 앱 접속 패턴 섹션 */}
                <div className="border border-slate-200 bg-white rounded-2xl p-6 space-y-4 shadow-sm md:col-span-2">
                   <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex justify-between items-center">
                     <span>🟢 실시간 앱 접속 패턴</span>
                     <span className="text-xs text-slate-500 font-normal">
                       온라인: <strong className="text-green-600">{users.filter(u => u.lastActive?.seconds && Date.now() - u.lastActive.seconds*1000 < 5*60*1000).length}명</strong>
                     </span>
                   </h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-60 overflow-y-auto custom-scrollbar pr-2 pb-2">
                     {users.slice().sort((a,b) => ((b.lastActive?.seconds||0) - (a.lastActive?.seconds||0))).map(u => {
                       const lastTime = u.lastActive?.seconds ? u.lastActive.seconds * 1000 : 0;
                       const diff = Date.now() - lastTime;
                       const isOnline = lastTime > 0 && diff < 5 * 60 * 1000;
                       const isRecent = lastTime > 0 && diff >= 5 * 60 * 1000 && diff < 30 * 60 * 1000;
                       
                       let statusColor = "bg-slate-50 border-slate-200 text-slate-500";
                       let statusText = "오프라인";
                       let light = "bg-slate-300";
                       
                       if(isOnline) { 
                         statusColor = "bg-green-50 border-green-200 text-green-800 shadow-sm"; 
                         statusText = "온라인 (5분 이내)"; 
                         light = "bg-green-500 animate-pulse"; 
                       } else if(isRecent) { 
                         statusColor = "bg-amber-50 border-amber-200 text-amber-800"; 
                         statusText = "최근 (30분 이내)"; 
                         light = "bg-amber-500"; 
                       }

                       return (
                         <div key={u.uid} className={cn("p-3 rounded-xl border flex flex-col gap-1 transition-colors", statusColor)}>
                           <div className="flex justify-between items-start">
                             <div className="font-bold flex items-center gap-2 text-sm">
                               <div className={cn("w-2 h-2 rounded-full", light)} />
                               {u.name}
                             </div>
                             <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/60">{statusText}</div>
                           </div>
                           <div className="text-xs opacity-80 mt-1">
                             <span className="font-bold">현재 화면:</span> {u.activeView || '알 수 없음'}
                           </div>
                           <div className="text-[10px] opacity-60">
                             최종 접속: {lastTime > 0 ? new Date(lastTime).toLocaleTimeString() : '기록 없음'}
                           </div>
                         </div>
                       );
                     })}
                   </div>
                </div>

              </div>
           </section>
         </div>
      )}
        <footer className="text-center text-slate-400 text-xs font-medium py-12 border-t border-slate-200 mt-12 mb-8 hover:text-slate-500 transition-colors">
          명원고등학교 교원 및 시스템 관리자 전용 통합 제어 패널 (Master Control Panel) • 루트 액세스 활성화됨
        </footer>
      </div>
      
      {previewUser && (
        <PlayerPerspectivePreview user={previewUser} onClose={() => setPreviewUser(null)} />
      )}
    </div>
    </div>
  );
};
