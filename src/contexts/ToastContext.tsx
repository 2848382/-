import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, AlertTriangle, CheckCircle, Info } from 'lucide-react';

type ToastType = 'info' | 'success' | 'warning' | 'error';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // [신규: 글로벌 이벤트 리스너]
  React.useEffect(() => {
    const handleGlobalToast = (event: any) => {
      const { message, type } = event.detail;
      showToast(message, type);
    };
    window.addEventListener('app-toast', handleGlobalToast as EventListener);
    return () => window.removeEventListener('app-toast', handleGlobalToast as EventListener);
  }, [showToast]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 w-full max-w-[90vw] sm:max-w-md pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="pointer-events-auto"
            >
              <div className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 bg-[var(--color-surface)]/95 backdrop-blur-md ${getTypeStyles(toast.type)}`}>
                <div className="shrink-0 mt-0.5">
                  {getTypeIcon(toast.type)}
                </div>
                <p className="text-sm font-bold flex-1 text-[var(--color-neutral-900)] leading-snug whitespace-pre-wrap">
                  {toast.message}
                </p>
                <button 
                  onClick={() => removeToast(toast.id)}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-[var(--color-neutral-400)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

const getTypeStyles = (type: ToastType) => {
  switch (type) {
    case 'success': return 'border-emerald-200 bg-emerald-50';
    case 'warning': return 'border-amber-200 bg-amber-50';
    case 'error': return 'border-red-200 bg-red-50';
    default: return 'border-indigo-200 bg-indigo-50';
  }
};

const getTypeIcon = (type: ToastType) => {
  switch (type) {
    case 'success': return <CheckCircle size={18} className="text-emerald-500" />;
    case 'warning': return <AlertTriangle size={18} className="text-amber-500" />;
    case 'error': return <AlertTriangle size={18} className="text-red-500" />;
    default: return <Info size={18} className="text-indigo-500" />;
  }
};
