import React, { useMemo } from "react";
import { motion } from "motion/react";
import { Home, Map, MessageSquare, Users, User, Megaphone, BookOpen, Terminal, Database, Gift } from "lucide-react";
import { cn } from "../lib/utils";
import { useGame } from "../contexts/GameContext";

export type DashboardView =
  | "home"
  | "board"
  | "map"
  | "students"
  | "chat"
  | "profile"
  | "note"
  | "terminal"
  | "archive"
  | "market"
  | "vitals"
  | "scanner"
  | "radio"
  // [신규: 대시보드 뷰 추가]
  | "rewards"
  | "relations"
  | "logs"
  | "missions"
  | "tips"
  | "confession"
  | "manitto"
  | "secretbox";

interface NavigationProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onViewChange,
}) => {
  const { isMenuBlocked, getUiText } = useGame();
  
  const items = useMemo(() => {
    const rawItems = [
      { id: "home", icon: Home, label: getUiText("nav.home", "홈") },
      { id: "students", icon: Users, label: getUiText("nav.students", "주소록") },
      { id: "chat", icon: MessageSquare, label: getUiText("nav.chat", "메시지") },
      { id: "manitto", icon: Gift, label: getUiText("nav.manitto", "마니또") },
      { id: "profile", icon: User, label: getUiText("nav.profile", "학생증") },
    ];
    return rawItems.filter(item => !isMenuBlocked(item.id));
  }, [isMenuBlocked, getUiText]); // [UI-7] useMemo

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] md:relative md:bottom-auto">
      {/* Mobile Nav */}
      <div 
        className="flex md:hidden items-center justify-around bg-white/90 backdrop-blur-md border-t border-[var(--color-border)] px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.04)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: 'calc(4rem + env(safe-area-inset-bottom))' }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as DashboardView)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all relative flex-1 min-h-[44px]", // [UI-1] min-h-44
                active ? "text-[var(--color-primary-500)]" : "text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)]",
              )}
            >
              {/* [UI-1] 활성 상단 라인 */}
              {active && (
                <motion.div 
                  layoutId="nav-active-bar"
                  className="absolute top-0 w-8 h-[2px] bg-[var(--color-primary-500)] rounded-full" 
                />
              )}
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-bold tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export const DesktopNav: React.FC<NavigationProps> = ({
  currentView,
  onViewChange,
}) => {
  const { isMenuBlocked, getUiText } = useGame();

  const items = useMemo(() => {
    const rawItems = [
      { id: "home", icon: Home, label: getUiText("nav.home_long", "학교 홈") },
      { id: "students", icon: Users, label: getUiText("nav.students_long", "학생 주소록") },
      { id: "chat", icon: MessageSquare, label: getUiText("nav.chat_long", "메시지 함") },
      { id: "manitto", icon: Gift, label: getUiText("nav.manitto_long", "비밀 마니또") },
      { id: "profile", icon: User, label: getUiText("nav.profile_long", "마이 학생증") },
    ];
    return rawItems.filter(item => !isMenuBlocked(item.id));
  }, [isMenuBlocked, getUiText]); // [UI-7] useMemo

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[var(--color-border)] p-8 h-full">
      <div className="mb-10 pl-2">
        <h1 className="text-heading text-[var(--color-primary-900)]">
          명원고등학교
        </h1>
        <div className="text-micro text-[var(--color-neutral-400)] mt-1">
          Mobile Portal v5.0
        </div>
      </div>

      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as DashboardView)}
              className={cn(
                "w-full flex items-center gap-3.5 p-3.5 rounded-xl transition-all font-bold text-[0.875rem] tracking-tight relative group",
                active
                  ? "text-[var(--color-primary-900)] bg-[var(--color-primary-50)]"
                  : "text-[var(--color-neutral-500)] hover:text-[var(--color-primary-900)] hover:bg-[var(--color-neutral-50)]",
              )}
            >
              {/* [UI-1] 데스크탑 사이드바 호버/액티브 왼쪽 바 */}
              {(active || true) && (
                <div className={cn(
                  "absolute left-0 w-[3px] h-5 bg-[var(--color-primary-500)] rounded-r-full transition-all duration-200",
                  active ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0 group-hover:opacity-100 group-hover:scale-y-75"
                )} />
              )}
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto">
        <div className="p-5 bg-[var(--color-surface-sub)] rounded-[1.25rem] border border-[var(--color-border)]">
          <div className="text-micro text-[var(--color-neutral-400)] mb-2">
            시스템 상태
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[var(--color-success)] rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
            <span className="text-[11px] font-bold text-[var(--color-neutral-700)] tracking-tight">
              서버 정상 작동 중
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
