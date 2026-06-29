import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ReloadPrompt: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {(offlineReady || needRefresh) && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 right-4 z-[9999] sm:left-auto sm:right-6 sm:w-80"
        >
          <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-[var(--color-border)] p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-bold text-[var(--color-neutral-900)]">
                  {offlineReady ? '앱이 준비되었습니다' : '새로운 업데이트가 있습니다'}
                </h4>
                <p className="text-xs text-[var(--color-neutral-700)] mt-0.5 leading-relaxed">
                  {offlineReady
                    ? '오프라인에서도 명원고등학교 포털을 사용할 수 있습니다.'
                    : '새로운 기능이나 수정사항이 적용되었습니다.'}
                </p>
              </div>
              <button
                onClick={close}
                className="p-1 hover:bg-[var(--color-neutral-100)] rounded-full text-[var(--color-neutral-400)]"
              >
                <X size={16} />
              </button>
            </div>
            
            {needRefresh && (
              <button
                onClick={() => updateServiceWorker(true)}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold active:scale-95 transition-transform shadow-md"
              >
                <RefreshCw size={14} />
                지금 업데이트
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
