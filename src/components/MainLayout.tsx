import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useGame } from "../contexts/GameContext";
import { useTheme } from "../contexts/ThemeContext";
import { cn } from "../lib/utils";
import { LogOut, Bell, Sun, Moon } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { SystemConfig, Letter, PrivateMission } from "../types";
import { ScenarioBroadcastOverlay } from "./ScenarioBroadcastOverlay";
import { GlobalEndingOverlay } from "./GlobalEndingOverlay";
import { SignalBar } from "./ui/SignalBar";
import { useFirestoreConnection } from "../hooks/useFirestoreConnection";
import { NotificationDrawer } from "./NotificationDrawer";
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";

interface MainLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
  onNavigate?: (view: string) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, fullWidth = false, onNavigate }) => {
  const { user, profile, systemConfig } = useGame();
  const { theme, toggleTheme } = useTheme();
  const connectionStatus = useFirestoreConnection();

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const swipeStartY = React.useRef<number | null>(null);

  // [신규: 시스템 명령 처리]
  React.useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'system', 'commands', 'active'),
      where('executed', '==', false)
    );

    const unsub = onSnapshot(q, (snap) => {
      snap.docs.forEach(async (docSnap) => {
        const cmd = docSnap.data();
        
        // Check if command is for this user or ALL
        if (cmd.targetUid === 'ALL' || cmd.targetUid === user.uid) {
           // Processing logic here if needed (e.g. toasts have been handled elsewhere or can be added here)
           
           if (cmd.targetUid !== 'ALL') {
             await updateDoc(doc(db, 'system', 'commands', 'active', docSnap.id), {
               executed: true,
               executedAt: serverTimestamp()
             }).catch(err => console.error("Error updating command status:", err));
           }
        }
      });
    });

    return unsub;
  }, [user?.uid]);

  // [드로어: 알림 데이터 개별 구독 및 합계 계산]
  const [unreadLettersCount, setUnreadLettersCount] = React.useState(0);
  const [unreadMissionsCount, setUnreadMissionsCount] = React.useState(0);
  const [unreadTipsCount, setUnreadTipsCount] = React.useState(0);

  const totalUnread = unreadLettersCount + unreadMissionsCount + unreadTipsCount;

  React.useEffect(() => {
    if (!user) return;
    
    const qLetters = query(collection(db, 'letters'), where('recipientUid', '==', user.uid), where('isDelivered', '==', true), where('isRead', '==', false));
    const unsubLetters = onSnapshot(qLetters, snap => setUnreadLettersCount(snap.docs.length));

    const qMissions = query(collection(db, 'private_missions'), where('targetUid', '==', user.uid), where('isVisible', '==', true), where('isCompleted', '==', false));
    const unsubMissions = onSnapshot(qMissions, snap => setUnreadMissionsCount(snap.docs.length));

    const qTips = query(collection(db, 'anonymous_tips'), where('recipientUid', '==', user.uid), where('isRead', '==', false));
    const unsubTips = onSnapshot(qTips, snap => setUnreadTipsCount(snap.docs.length));

    return () => {
      unsubLetters();
      unsubMissions();
      unsubTips();
    };
  }, [user?.uid]);

  const handleSplat = (e: React.MouseEvent) => {
    if (systemConfig?.bloodMode || (profile?.loops && profile.loops >= 6)) {
      const splat = document.createElement("div");
      splat.className = "blood-splat";
      splat.style.left = `${e.clientX - 10}px`;
      splat.style.top = `${e.clientY - 10}px`;
      document.body.appendChild(splat);
      setTimeout(() => splat.remove(), 2000);
    }
  };

  const isMirrorWorld = (profile?.loops || 0) >= 5 || (systemConfig?.currentLoop || 0) >= 5;
  const isBloodMode =
    systemConfig?.bloodMode || (profile?.loops || 0) >= 8 || (systemConfig?.currentLoop || 0) >= 8;
  const maxLoop = Math.max(profile?.loops || 0, systemConfig?.currentLoop || 0);
  const isGlitchMode = maxLoop >= 7;
  const loopClass = maxLoop > 0
    ? `progressive-glitch-${Math.min(9, maxLoop)}`
    : "";

  // [신규: 스탯 기반 UI 연출 (물리 이상 시각 효과)]
  const isPhysicalLow = (profile?.physical || 50) <= 20;
  const isStaminaLow = (profile?.stamina || 100) <= 15;
  const currentAtmosphere = systemConfig?.atmosphere || 'normal';

  return (
    <div
      onClick={handleSplat}
      className={cn(
        "min-h-[100dvh] relative overflow-x-hidden bg-[var(--color-bg)] transition-all duration-1000",
        loopClass,
        isMirrorWorld && "mirror-world",
        isBloodMode && "blood-mode",
        isGlitchMode && "glitch-active",
        isPhysicalLow && "physical-low-mode",
        isStaminaLow && "stamina-low-mode",
        `atmosphere-${currentAtmosphere}`
      )}
    >
      <div className="scanlines-overlay" />

      {systemConfig?.isShutdown && (
        <div className="fixed inset-0 z-[1000] blue-screen p-20 overflow-hidden select-none">
          <div className="max-w-2xl mx-auto space-y-8">
            <h1 className="text-2xl font-black bg-white text-[#0000aa] inline-block px-4">
              SYSTEM_HALT
            </h1>
            <p className="text-lg leading-relaxed">
              A problem has been detected and MyeongWon Portal has been shut down
              to prevent damage to your consciousness.
            </p>
            <p className="text-lg">
              ERROR_CODE: CRITICAL_LOOP_FAILURE
              <br />
              MEMORY_LEAK:{" "}
              {Math.random().toString(16).slice(2, 10).toUpperCase()}
              <br />
              ENTITY_DETECTION: POSITIVE
            </p>
            <p className="text-lg animate-pulse">
              Please wait while the system attempts to stabilize the current
              loop...
            </p>
          </div>
        </div>
      )}

      {systemConfig?.activeAlert && (
        <div className="fixed inset-0 z-[900] pointer-events-none red-overlay p-4 flex items-center justify-center">
          <div className="text-6xl md:text-9xl font-black text-[var(--color-danger)]/20 uppercase tracking-[0.5em] select-none whitespace-nowrap overflow-hidden">
            {systemConfig.activeAlert}
          </div>
        </div>
      )}

      <div
        className={cn(
          "min-h-[100dvh] flex flex-col relative z-10",
          isMirrorWorld && "mirror-world-content",
        )}
      >
        <GlobalEndingOverlay />
        <ScenarioBroadcastOverlay />
        {profile?.loops && profile.loops >= 7 && (
          <div className="absolute inset-0 pointer-events-none z-50">
            <div className="scanline" />
            <div className="absolute inset-0 bg-red-500/5 animate-pulse mix-blend-overlay" />
          </div>
        )}
        
        {/* [UI-2] Header Improvements */}
        <header 
          className="px-4 md:px-8 h-14 sticky top-0 z-40 bg-[var(--color-surface)]/90 backdrop-blur-md border-b border-[var(--color-border)] flex justify-between items-center"
          onTouchStart={(e) => { swipeStartY.current = e.touches[0].clientY; }}
          onTouchMove={(e) => {
            if (swipeStartY.current === null) return;
            const delta = e.touches[0].clientY - swipeStartY.current;
            if (delta > 60 && !drawerOpen) {
              setDrawerOpen(true);
              swipeStartY.current = null;
            }
          }}
          onTouchEnd={() => { swipeStartY.current = null; }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-sm bg-[var(--color-primary-500)] rotate-45" />
            <span 
              className="text-subhead text-[var(--color-primary-900)] tracking-tight truncate max-w-[150px] sm:max-w-none cursor-pointer"
              onPointerDown={(e) => {
                 const timer = setTimeout(() => {
                    const code = window.prompt("HIDDEN BACKSTAGE ACCESS.\nEnter System Code:");
                    if (code === "0420") {
                       import('firebase/firestore').then(({ updateDoc, doc, serverTimestamp }) => {
                          if (!profile) return;
                          updateDoc(doc(db, 'users', profile.uid), {
                             inventory: [...(profile.inventory || []), '백스테이지_출입증'],
                             updatedAt: serverTimestamp()
                          });
                          alert("백스테이지 출입증이 발급되었습니다.");
                       });
                    }
                 }, 5000);
                 e.currentTarget.onpointerup = () => clearTimeout(timer);
                 e.currentTarget.onpointerleave = () => clearTimeout(timer);
              }}
            >
              명원고등학교
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* [SVG] Signal Bar Indicator */}
            <SignalBar status={connectionStatus} loop={profile?.loops || 0} />
            
            {/* [테마 토글] */}
            <button
               onClick={toggleTheme}
               className="p-2 text-[var(--color-neutral-400)] hover:text-[var(--color-primary-500)] transition-colors"
               aria-label="테마 전환"
            >
               {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* [드로어: 벨 버튼 토글] */}
            <button
              onClick={() => setDrawerOpen(prev => !prev)}
              className="p-2 relative transition-colors"
              style={{ color: drawerOpen ? '#3b82f6' : 'rgba(107,114,128,1)' }}
              aria-label="e-알리미"
            >
              <Bell size={20} />
              {totalUnread > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border border-white"
                />
              )}
            </button>

            <button
              onClick={() => signOut(auth)}
              className="ml-2 flex items-center gap-1.5 text-micro font-bold text-[var(--color-neutral-400)] hover:text-[var(--color-danger)] transition-colors uppercase"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Halt Session</span>
            </button>
          </div>
        </header>

        {/* [드로어] */}
        <NotificationDrawer 
          isOpen={drawerOpen} 
          onClose={() => setDrawerOpen(false)}
          onNavigate={(view) => {
            setDrawerOpen(false);
            if (onNavigate) onNavigate(view);
          }}
        />

        <main className={cn(
          "w-full",
          fullWidth
            ? "p-0 md:p-0 pb-0 md:pb-0"           // 맵: 패딩 없음, 최대 너비 없음
            : "p-4 md:p-8 max-w-6xl mx-auto pb-24 md:pb-8"  // 일반: 기존 유지
        )}>
          {children}
        </main>
      </div>
    </div>
  );
};
