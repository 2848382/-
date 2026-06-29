import React, { useState, useEffect } from 'react';

export const IOSInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    // Detect if in standalone mode (already installed)
    const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator as any).standalone;

    // Check if we should show the prompt
    if (isIos() && !isInStandaloneMode()) {
      const hasDismissed = localStorage.getItem('iosInstallPromptDismissed');
      if (!hasDismissed) {
        // Show after 3 seconds
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const dismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('iosInstallPromptDismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[999] bg-white text-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-200 animate-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-sm">홈 화면에 추가하세요</h3>
          <div className="text-xs text-slate-500 mt-1 leading-snug">
            사파리 하단의 <span className="inline-flex justify-center items-center w-5 h-5 mx-0.5 bg-slate-100 rounded border"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></span> <strong>공유</strong> 버튼을 누르고<br/>
            <strong>홈 화면에 추가</strong>를 선택하면 앱처럼 사용할 수 있습니다.
          </div>
        </div>
        <button onClick={dismiss} className="p-1 text-slate-400 hover:text-slate-600 shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  );
};
