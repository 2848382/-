import React, { useMemo } from "react";
import { useGame } from "../contexts/GameContext";
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VotingSystem } from "./VotingSystem";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  User,
  Activity,
  Repeat,
  Database,
  Eye,
  ShieldAlert,
  EyeOff,
  ShoppingBag,
  Terminal as TerminalIcon,
  X,
  Heart,
  Star,
  Zap,
  MessageSquare,
  Droplet,
  ScanLine,
  Send,
  Map,
  QrCode,
  Megaphone,
  BookOpen,
  Radio,
  Archive,
  Plus,
  Calendar,
  Lock,
} from "lucide-react";
import { cn } from "../lib/utils";

import { StudentDirectory } from "./StudentDirectory";
import { SchoolMap } from "./SchoolMap";
import { StudentCard } from "./StudentCard";
import { QuestLog } from "./QuestLog";
import { DashboardStatus } from "./DashboardStatus";
import { Timetable } from "./Timetable";
import { ALL_APPS, AllAppsModal } from "./AllAppsModal";
import { StatBar } from "./ui/StatBar";
import { usePushNotification } from "../hooks/usePushNotification";

const Badge = React.memo(({ name, icon }: { name: string; icon: React.ReactNode }) => (

  <div className="flex flex-col items-center gap-1 group w-full">
    <div className="w-10 h-10 rounded-full bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-gray-400 group-hover:bg-mw-blue group-hover:text-white transition-all shadow-sm">
      {icon}
    </div>
    <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter group-hover:text-mw-blue transition-colors text-center truncate w-full">
      {name}
    </span>
  </div>
));

const PostIt = React.memo(({
  content,
  onRemove,
}: {
  content: string;
  onRemove: () => void;
}) => (
  <motion.div
    drag
    dragConstraints={{ top: -100, left: -200, right: 200, bottom: 400 }}
    className="fixed top-24 right-12 z-[100] w-40 p-5 bg-[#FEF9C3] shadow-lg border border-[#FDE047] rounded-sm -rotate-2 cursor-move"
  >
    <button
      onClick={onRemove}
      className="absolute top-2 right-2 opacity-20 hover:opacity-100 transition-opacity"
    >
      <X size={14} className="text-mw-blue" />
    </button>
    <p className="text-xs font-bold text-[#854D0E] leading-relaxed">
      {content}
    </p>
    <div className="mt-4 text-[7px] font-bold text-[#854D0E]/40 uppercase text-right tracking-normal">
      School Memo
    </div>
  </motion.div>
));

export const Dashboard: React.FC<{ onViewChange?: (view: any) => void }> = ({ onViewChange }) => {
  const {
    user,
    profile,
    isMenuBlocked,
    getUiText,
    systemConfig
  } = useGame();
  const [activeTab, setActiveTab] = React.useState("home");
  const [showAllApps, setShowAllApps] = React.useState(false);
  const { permission, requestPermission, isIOS, isStandalone } = usePushNotification();
  const [unreadSecrets, setUnreadSecrets] = React.useState(0);

  React.useEffect(() => {
    if (!user) return;
    
    // 읽지 않은 편지 구독
    const qLetters = query(collection(db, 'letters'), where('recipientUid', '==', user.uid), where('isRead', '==', false));
    const unsubLetters = onSnapshot(qLetters, snap => {
      const letterCount = snap.docs.length;
      
      // 익명 제보 구독 (중첩)
      const qTips = query(collection(db, 'anonymous_tips'), where('recipientUid', '==', user.uid), where('isRead', '==', false));
      const unsubTips = onSnapshot(qTips, snapTips => {
        setUnreadSecrets(letterCount + snapTips.docs.length);
      });
      return () => unsubTips();
    });

    return () => unsubLetters();
  }, [user]);

  if (!profile) return null;

  const tabs = useMemo(() => [
    { id: "home", label: "홈", icon: <Activity size={16} /> },
    { id: "academic", label: "시간표", icon: <Calendar size={16} /> },
    { id: "social", label: "학생", icon: <User size={16} /> },
  ], []); // [UI-7] useMemo

  const favoriteApps = useMemo(() => 
    ALL_APPS.filter(app => (profile.favoriteApps || ["board", "terminal", "market", "archive"]).includes(app.id) && !isMenuBlocked(app.id))
  , [profile.favoriteApps, isMenuBlocked]);

  return (
    <div className="space-y-8">
      {/* Push Notification Banner */}
      {permission === 'default' && (
        <div className="mw-card p-4 flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-navy-50)] border border-[var(--color-navy-100)] flex items-center justify-center shrink-0">
            <Bell size={18} className="text-[var(--color-navy-500)]" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-[var(--color-text-primary)] mb-0.5">
              알림 수신 설정
            </h4>
            {isIOS && !isStandalone ? (
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                Safari 하단 <strong className="text-[var(--color-text-secondary)]">공유 버튼 →</strong>{' '}
                <strong className="text-[var(--color-text-secondary)]">'홈 화면에 추가'</strong> 후<br/>
                알림을 받을 수 있습니다.
              </p>
            ) : (
              <>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-2.5">
                  보상 승인, 미션 공개, 루프 종료 알림을 받으세요.
                </p>
                <button
                  onClick={requestPermission}
                  className="text-xs font-bold bg-[var(--color-navy-900)] text-white px-4 py-2 rounded-xl active:scale-95 transition-transform shadow-sm"
                >
                  알림 허용
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {permission === 'granted' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-bold text-emerald-700">알림 수신 중</span>
        </div>
      )}

      {permission === 'denied' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-100 mb-4">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs font-bold text-red-600">
            알림이 차단됨 — 기기 설정에서 허용해주세요
          </span>
        </div>
      )}

      {/* Main Student Card placed at the Top */}
      <div className="w-full">
        <StudentCard />
      </div>

      {/* Secret Archive Unread Card */}
      {unreadSecrets > 0 && !isMenuBlocked('secretbox') && (
        <div 
          onClick={() => onViewChange?.('secretbox')}
          className="mw-card p-4 flex items-center justify-between cursor-pointer border-l-4 border-l-rose-500 bg-rose-50/50 hover:bg-rose-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-500">
              <Lock size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-rose-500 mb-0.5">기밀 경고</div>
              <div className="text-sm font-black text-slate-800">읽지 않은 비밀 정보 {unreadSecrets}건</div>
            </div>
          </div>
          <button className="px-3 py-1.5 bg-rose-500 text-white text-xs font-bold rounded-lg shadow-sm">
            확인하기
          </button>
        </div>
      )}

      {/* [UI-3] StatBar 적용 (스테미너) */}
      <div className="mw-card p-6">
        <StatBar 
          label="스테미너 (활동 지수)" 
          value={profile.stamina || 0} 
          color="stamina" 
          icon={<Zap size={14} />} 
          max={100}
        />
      </div>

      {/* Global System Alert */}
      <AnimatePresence>
        {systemConfig?.activeAlert && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full bg-[var(--color-primary-900)] rounded-3xl p-4 flex items-center gap-4 text-white overflow-hidden shadow-xl relative"
          >
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <ShieldAlert size={48} />
             </div>
             <div className="bg-[var(--color-danger)] p-3 rounded-2xl animate-pulse shrink-0">
                <Megaphone size={20} />
             </div>
             <div className="pr-12">
                <div className="text-[10px] font-black uppercase text-[var(--color-danger)] tracking-[0.2em] mb-0.5">Admin_Broadcast_Active</div>
                <div className="text-sm font-bold tracking-tight leading-tight">{systemConfig.activeAlert}</div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Tabs - Modern Style */}
      <nav className="flex bg-[var(--color-neutral-100)] p-1 rounded-2xl gap-1 sticky top-16 z-30 border border-[var(--color-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-tight transition-all relative overflow-hidden",
              activeTab === tab.id
                ? "text-[var(--color-primary-900)] bg-white shadow-sm"
                : "text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)]",
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </nav>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        {activeTab === "home" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
            <div className="md:col-span-8 space-y-6 lg:space-y-8">
              <div className="mw-card p-6 md:p-10">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-subhead text-[var(--color-primary-900)]">
                    빠른 실행 메뉴
                  </h3>
                  <button 
                    onClick={() => setShowAllApps(true)}
                    className="text-micro font-bold text-[var(--color-primary-500)] hover:underline"
                  >
                    전체보기
                  </button>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-5">
                  {favoriteApps.map(app => (
                    <Widget
                      key={app.id}
                      icon={<app.icon size={22} />}
                      title={getUiText(`app.${app.id}.name`, app.name)}
                      subtitle={app.id.toUpperCase()}
                      onClick={() => onViewChange?.(app.id)}
                    />
                  ))}
                  {!isMenuBlocked('all_apps') && (
                    <button
                      onClick={() => setShowAllApps(true)}
                      className="p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-3 border-2 border-dashed border-[var(--color-neutral-200)] hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)] transition-all bg-transparent group"
                    >
                      <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-[var(--color-neutral-400)] group-hover:text-[var(--color-primary-500)] shadow-sm border border-[var(--color-border)]">
                        <Plus size={24} />
                      </div>
                      <div className="text-[12px] font-black text-[var(--color-neutral-600)] group-hover:text-[var(--color-primary-900)]">앱 추가</div>
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="md:col-span-4 space-y-6 lg:space-y-8">
              <DashboardStatus />
            </div>
          </div>
        )}

        {activeTab === "academic" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            <div className="space-y-6 lg:space-y-8">
              <Timetable />
              <div className="mw-card p-6 md:p-8">
                <QuestLog />
              </div>
            </div>
            <div className="space-y-6 lg:space-y-8">
              <LibraryStatus isHighLoop={(profile.loops || 0) >= 6} />
            </div>
          </div>
        )}

        {activeTab === "social" && (
          <div className="space-y-6 lg:space-y-8">
            <StudentDirectory />
            <div className="mw-card p-6 md:p-8">
              <VotingSystem />
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showAllApps && (
          <AllAppsModal 
            onClose={() => setShowAllApps(false)} 
            onSelectApp={(id) => onViewChange?.(id)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const MiniStat = React.memo(({ icon, label, value, color, progress }: any) => (
  <div className="flex-1 min-w-[110px] bg-white/5 border border-white/10 rounded-2xl p-3 md:p-4 flex flex-col justify-center gap-2">
    <div className="flex items-center justify-between opacity-80">
      <div className="flex items-center gap-1.5 text-white">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-normal whitespace-nowrap">
          {label}
        </span>
      </div>
      <span className="text-xs md:text-sm font-black whitespace-nowrap text-white">
        {value}
      </span>
    </div>
    {progress !== undefined && (
      <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden shrink-0 mt-1">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000",
            color,
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    )}
  </div>
));

const DetailedStat = React.memo(({ label, value, color }: any) => (
  <div className="space-y-3">
    <div className="flex justify-between items-center px-1">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-normal">
        {label}
      </span>
      <span className="text-lg font-black text-[#1E293B]">
        {value}
        <span className="text-xs text-slate-400">/100</span>
      </span>
    </div>
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${value}%` }}
        className={cn("h-full rounded-full", color)}
      />
    </div>
  </div>
));

const LibraryStatus = ({ isHighLoop }: { isHighLoop: boolean }) => (
  <div className="mw-card p-6 md:p-10">
    <div className="flex items-center justify-between mb-8">
      <h3 className="text-heading text-[var(--color-primary-900)]">
        도서관 현황
      </h3>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            isHighLoop ? "bg-rose-500" : "bg-emerald-500",
          )}
        />
        <span
          className={cn(
            "text-[10px] font-black uppercase tracking-normal",
            isHighLoop ? "text-rose-500" : "text-emerald-500",
          )}
        >
          {isHighLoop ? "통제 불가" : "쾌적"}
        </span>
      </div>
    </div>
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-slate-200">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">
            잔여 좌석
          </div>
          <div className="text-3xl font-black text-[#0e0f37]">
            42 <span className="text-sm text-slate-300">/ 120</span>
          </div>
        </div>
        <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-slate-200">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">
            입장 대기
          </div>
          <div className="text-3xl font-black text-emerald-500">
            0 <span className="text-sm text-slate-300">명</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const StatItem = React.memo(({
  icon,
  label,
  value,
  progress,
  color = "stroke-[#0F172A]",
}: any) => {
  const radius = 40;
  const circumference = radius * Math.PI;
  const strokeDashoffset =
    progress !== undefined
      ? circumference - (progress / 100) * circumference
      : circumference;

  return (
    <div className="p-5 md:p-6 bg-white rounded-[2rem] border border-[#E2E8F0] hover:shadow-md transition-all flex flex-col items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.03)] min-h-[140px] relative">
      <div className="relative w-24 h-12 flex items-end justify-center mb-2">
        <svg
          viewBox="0 0 100 50"
          className="w-full h-full absolute bottom-0 overflow-visible"
        >
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {progress !== undefined && (
            <motion.path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              className={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          )}
        </svg>
        <div className="z-10 bg-white p-2 rounded-full shadow-sm border border-slate-100 mb-[-16px]">
          {icon}
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 mt-6">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-normal">
          {label}
        </span>
        <div className="text-xl font-black tracking-tight text-[#0F172A]">
          {value}
        </div>
      </div>
    </div>
  );
});

const Announcement = React.memo(({ title, date, category }: any) => (
  <div className="p-4 bg-[#F9FAFB] rounded-2xl flex items-center gap-4 hover:bg-mw-blue/5 transition-colors cursor-pointer group border border-[#E5E7EB]">
    <div className="px-3 py-1 bg-white rounded-lg text-[10px] font-bold text-mw-blue border border-[#E5E7EB] group-hover:bg-mw-blue group-hover:text-white transition-colors">
      {category}
    </div>
    <div className="flex-1 text-sm font-bold text-mw-blue truncate">
      {title}
    </div>
    <div className="text-[10px] font-mono text-gray-300">{date}</div>
  </div>
));

const MenuItem = ({ label, calories }: any) => (
  <div className="p-4 bg-[#F9FAFB] rounded-2xl flex flex-col border border-[#E5E7EB] hover:bg-white hover:border-mw-blue/10 transition-all">
    <span className="text-xs font-bold text-mw-blue mb-1">{label}</span>
    <span className="text-[10px] font-mono text-gray-400">{calories} KCAL</span>
  </div>
);

const Widget = React.memo(({ icon, title, subtitle, onClick, color }: any) => (
  <div
    onClick={onClick}
    className={cn(
      "p-4 rounded-3xl flex flex-col items-center justify-center text-center gap-3 border border-[#E2E8F0] hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer bg-white",
      color,
    )}
    style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}
  >
    <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 text-[#0F172A] mb-1">
      {icon}
    </div>
    <div className="space-y-1">
      <div className="text-[12px] font-black text-[#0F172A]">{title}</div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
        {subtitle}
      </div>
    </div>
  </div>
));

const ControlButton = ({ children, onClick, variant }: any) => {
  const base =
    "px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-normal transition-all active:scale-95";
  const styles = {
    primary: "modern-btn-primary",
    secondary: "modern-btn-secondary",
  };
  return (
    <button onClick={onClick} className={cn(base, (styles as any)[variant])}>
      {children}
    </button>
  );
};
