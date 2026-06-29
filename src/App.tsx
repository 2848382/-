import React, { useState, useEffect, useRef } from 'react';
import { cn } from './lib/utils';
import { GameProvider, useGame } from './contexts/GameContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { MainLayout } from './components/MainLayout';
import { MasterPanel } from './components/MasterPanel';
import { Shield } from 'lucide-react';
import { Navigation, DesktopNav, DashboardView } from './components/Navigation';
import { SchoolMap } from './components/SchoolMap';
import { StudentDirectory } from './components/StudentDirectory';
import { StudentCard } from './components/StudentCard';
import { ChatSystem } from './components/Chat/ChatSystem';
import { NoticeBoard } from './components/NoticeBoard';
import { PlayerNote } from './components/PlayerNote';
import { Terminal } from './components/Terminal';
import { LockerSystem } from './components/LockerSystem';
import { Marketplace } from './components/Marketplace';
import { VitalMonitor } from './components/VitalMonitor';
import { DoomsdayTimer } from './components/DoomsdayTimer';
import { EVPRadio } from './components/EVPRadio';
import { QRScanner } from './components/QRScanner';
import { GlitchLayout } from './components/GlitchLayout';
import { ProfilePage } from './components/ProfilePage';
import { ProfileEditModal } from './components/ProfileEditModal';

// [신규: 컴포넌트 임포트]
import { RewardRequest } from './components/RewardRequest';
import { RelationshipBoard } from './components/RelationshipBoard';
import { EventLogView } from './components/EventLogView';
import { PrivateMissionView } from './components/PrivateMissionView';
import { AnonymousTipBox } from './components/AnonymousTipBox';
import { ConfessionBox } from './components/ConfessionBox';
import { ManittoPanel } from './components/ManittoPanel';

import { SecretArchive } from './components/SecretArchive';

import { IOSInstallPrompt } from './components/IOSInstallPrompt';
import { ToastProvider } from './contexts/ToastContext';
import { DialogProvider } from './contexts/DialogContext';
import { ReloadPrompt } from './components/ReloadPrompt';
import { ThemeProvider } from './contexts/ThemeContext';

const AppContent: React.FC = () => {
  const { user, profile, loading, isAdmin, setActiveView } = useGame();
  const [view, setView] = useState<'portal' | 'master'>('portal');
  const [dashboardView, setDashboardView] = useState<DashboardView>(() => {
    // URL 파라미터에서 초기 뷰 읽기
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view') as DashboardView | null;
    const validViews: DashboardView[] = [
      'home', 'board', 'note', 'terminal', 'archive', 'market',
      'map', 'students', 'chat', 'vitals', 'scanner', 'radio', 'profile',
      'rewards', 'relations', 'logs', 'missions', 'tips', 'confession', 'secretbox'
    ];
    return viewParam && validViews.includes(viewParam) ? viewParam : 'home';
  });
  const [showGlobalOnboarding, setShowGlobalOnboarding] = useState(false);
  
  // 뷰 변경 시 history 스택 푸시
  const prevViewRef = useRef<DashboardView | null>(null);

  useEffect(() => {
    // 뷰가 바뀔 때마다 히스토리에 추가
    if (dashboardView !== 'home') {
      window.history.pushState({ view: dashboardView }, '', `?view=${dashboardView}`);
    } else if (prevViewRef.current && prevViewRef.current !== 'home') {
      window.history.pushState({ view: 'home' }, '', '/');
    }
    prevViewRef.current = dashboardView;
  }, [dashboardView]);

  // 뒤로가기 감지 및 Service Worker 리스너
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const prevView = event.state?.view as DashboardView | undefined;

      if (prevView && prevView !== dashboardView) {
        // 이전 뷰로 이동
        setDashboardView(prevView);
      } else if (!prevView) {
        // 히스토리 없으면 홈으로
        setDashboardView('home');
        // 앱이 꺼지지 않도록 빈 히스토리 추가
        window.history.pushState({ view: 'home' }, '', '/');
      }
    };

    window.addEventListener('popstate', handlePopState);

    // 초기 진입 시 히스토리 베이스 설정
    if (!window.history.state) {
      window.history.replaceState({ view: 'home' }, '', '/');
    }

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE' && event.data.view) {
        setDashboardView(event.data.view as DashboardView);
      }
    };

    // Service Worker에서 오는 네비게이션 메시지
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    // FCM 포그라운드 메시지 (usePushNotification에서 발행)
    const handleFCMMessage = ((event: CustomEvent) => {
      const { title, body, data } = event.detail;
      // 토스트 표시 (Toast 시스템이 있으면 연동, 없으면 기본 Notification API)
      if ('Notification' in window && Notification.permission === 'granted') {
        const notificationTitle = title || '명원고등학교';
        new Notification(notificationTitle, {
          body: body || '새로운 알림이 도착했습니다.',
          icon: '/icon-192.svg',
          badge: '/badge-72.svg',
          tag: data?.type || 'default',
        });
      }
    }) as EventListener;

    window.addEventListener('fcm-message', handleFCMMessage);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
      window.removeEventListener('fcm-message', handleFCMMessage);
    };
  }, [dashboardView]);

  React.useEffect(() => {
    setActiveView(dashboardView);
  }, [dashboardView]);

  React.useEffect(() => {
    // Only show onboarding if user has never edited their stats and basic info is missing
    const hasEdited = profile?.statsEditCount && profile.statsEditCount > 0;
    if (profile && !profile.dormRoom && !hasEdited && !loading) {
      setShowGlobalOnboarding(true);
    } else {
      setShowGlobalOnboarding(false);
    }
  }, [profile, loading]);


  React.useEffect(() => {
    const handleJump = (e: any) => {
      setDashboardView(e.detail);
    };
    window.addEventListener('master_jump', handleJump);
    return () => window.removeEventListener('master_jump', handleJump);
  }, []);

  // [신규: GM 접근 차단]
  React.useEffect(() => {
    if (view === 'master' && !isAdmin) {
      setView('portal');
    }
  }, [view, isAdmin]);

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row min-h-[100dvh] bg-[#F8FAFC]">
        {/* 데스크탑 네비게이션 스켈레톤 */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#E2E8F0] p-8 h-full">
          <div className="w-24 h-6 bg-slate-200 rounded-md mb-10 animate-pulse"></div>
          <div className="space-y-4">
            <div className="h-11 bg-slate-200 rounded-2xl animate-pulse"></div>
            <div className="h-11 bg-slate-200 rounded-2xl animate-pulse"></div>
            <div className="h-11 bg-slate-200 rounded-2xl animate-pulse"></div>
          </div>
        </aside>

        <div className="flex-1 overflow-y-auto w-full">
          <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 lg:space-y-8 mt-12 md:mt-0">
            {/* 상단 학생증 카드 스켈레톤 */}
            <div className="w-full h-56 md:h-[240px] bg-slate-200/60 rounded-[2.5rem] animate-pulse"></div>
            
            {/* 스탯/안내 바 스켈레톤 */}
            <div className="w-full h-24 bg-white rounded-3xl border border-[#E2E8F0] animate-pulse"></div>

            {/* 탭 메뉴 스켈레톤 */}
            <div className="w-full h-12 bg-slate-200/60 rounded-2xl animate-pulse"></div>

            {/* 하단 단축 메뉴 2x2 및 대시보드 스켈레톤 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
              <div className="md:col-span-8 space-y-6">
                <div className="p-6 md:p-10 bg-white rounded-[2rem] border border-[#E2E8F0] space-y-6 animate-pulse">
                  <div className="w-32 h-6 bg-slate-200 rounded-md"></div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="h-28 bg-slate-200/60 rounded-3xl"></div>
                    <div className="h-28 bg-slate-200/60 rounded-3xl"></div>
                    <div className="h-28 bg-slate-200/60 rounded-3xl"></div>
                    <div className="h-28 bg-slate-200/60 rounded-3xl"></div>
                  </div>
                </div>
              </div>
              <div className="md:col-span-4 space-y-6">
                <div className="h-48 bg-white rounded-[2rem] border border-[#E2E8F0] animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* 모바일 탭바 스켈레톤 */}
        <nav className="fixed bottom-0 left-0 right-0 h-[6rem] pb-[env(safe-area-inset-bottom)] bg-white/90 border-t border-[var(--color-border)] md:hidden flex justify-around items-center px-4 z-[100] animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-slate-200"></div>
          <div className="w-10 h-10 rounded-xl bg-slate-200"></div>
          <div className="w-10 h-10 rounded-xl bg-slate-200"></div>
          <div className="w-10 h-10 rounded-xl bg-slate-200"></div>
        </nav>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (view === 'master' && !isAdmin) {
    import('./services/activityLogService').then(({ logActivity }) => {
      logActivity(user.uid, profile?.name || 'Unknown', 'unauthorized_access', 'GM 전용 화면 접근 시도', 'danger');
    });
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "접근 권한이 없습니다.", type: "error" } }));
    setView('portal');
    return null;
  }

  if (view === 'master' && isAdmin) {
    return (
      <div className="relative">
        <button 
          onClick={() => setView('portal')}
          className="fixed bottom-8 left-8 z-[200] bg-white text-[#0F172A] p-4 rounded-full shadow-2xl font-bold flex items-center gap-2 border border-[#E2E8F0] hover:scale-110 active:scale-95 transition-all text-xs"
        >
          포털로 돌아가기
        </button>
        <MasterPanel />
      </div>
    );
  }

  const isApproved = isAdmin || profile?.approvalStatus === 'approved' || profile?.isLegacyUser || (profile?.createdAt && !profile?.approvalStatus);

  if (!isApproved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#F8FAFC] p-4 text-center">
        <Shield className="w-16 h-16 text-slate-300 mb-6" />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">입학 승인 대기 중</h1>
        <p className="text-slate-500 max-w-md mb-8">
          가입이 정상적으로 접수되었습니다.<br/>
          현재 학교 관리자(마스터)의 승인을 기다리고 있습니다.<br/>
          승인이 완료되면 앱을 사용할 수 있습니다.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-slate-800 text-white rounded-full font-medium"
        >
          새로고침
        </button>
      </div>
    );
  }

  const renderDashboardView = () => {
    switch (dashboardView) {
      case 'home': return <Dashboard onViewChange={setDashboardView} />;
      case 'board': return <NoticeBoard />;
      case 'note': return <PlayerNote />;
      case 'terminal': return <Terminal />;
      case 'archive': return <LockerSystem />;
      case 'market': return <Marketplace />;
      case 'map': return <SchoolMap />;
      case 'students': return <StudentDirectory />;
      case 'chat': return <ChatSystem />;
      case 'vitals': return <VitalMonitor />;
      case 'scanner': return <QRScanner />;
      case 'radio': return <EVPRadio />;
      case 'profile': return <ProfilePage />;
      
      // [신규: 라우팅 케이스]
      case 'rewards': return <RewardRequest />;
      case 'relations': return <RelationshipBoard />;
      case 'logs': return <EventLogView />;
      case 'missions': return <PrivateMissionView />;
      case 'tips': return <AnonymousTipBox />;
      case 'confession': return <ConfessionBox />;
      case 'manitto': return <ManittoPanel />;
      case 'secretbox': return <SecretArchive />;

      default: return <Dashboard onViewChange={setDashboardView} />;
    }
  };

  return (
    <GlitchLayout>
      <IOSInstallPrompt />
      <DoomsdayTimer />
      {showGlobalOnboarding && (
        <ProfileEditModal 
          isOpen={true} 
          onClose={() => setShowGlobalOnboarding(false)} 
          isOnboarding={true} 
        />
      )}
      <div className="flex flex-col md:flex-row min-h-[100dvh] bg-transparent">
        <DesktopNav currentView={dashboardView} onViewChange={setDashboardView} />
        <div 
          className={cn(
             "flex-1 min-w-0 overflow-y-auto h-[100dvh] flex flex-col md:!pb-0",
             dashboardView === 'map' ? "pb-0" : "pb-[calc(6rem+env(safe-area-inset-bottom))]"
          )}
        >
          <MainLayout 
            fullWidth={dashboardView === 'map'}
            onNavigate={(view) => setDashboardView(view as DashboardView)}
          >
            {isAdmin && view === 'portal' && (
              <button 
                onClick={() => setView('master')}
                className="w-full mb-6 bg-[#0F172A] text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-[0_4px_14px_rgba(15,23,42,0.2)] hover:scale-[1.01] active:scale-95 transition-all text-sm tracking-tight border border-[#1E293B]"
              >
                <Shield size={18} />
                학교 관리자 모드(Master Panel) 접속
              </button>
            )}
            {renderDashboardView()}
          </MainLayout>
        </div>
        <Navigation currentView={dashboardView} onViewChange={setDashboardView} />
      </div>
    </GlitchLayout>
  );
};

export default function App() {
  return (
    <GameProvider>
      <ThemeProvider>
        <DialogProvider>
          <ToastProvider>
            <AppContent />
            <ReloadPrompt />
          </ToastProvider>
        </DialogProvider>
      </ThemeProvider>
    </GameProvider>
  );
}
