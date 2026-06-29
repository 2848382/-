import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: string;
  showHandle?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = '85vh',
  showHandle = true,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // focus trapping could be added here
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[999]"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose();
            }}
            className="fixed bottom-env-safe left-0 right-0 z-[1000] bg-white rounded-t-[2rem] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] outline-none"
            style={{ maxHeight }}
            role="dialog"
            aria-modal="true"
          >
            {showHandle && (
              <div className="w-full flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-[var(--color-neutral-200)] rounded-full" />
              </div>
            )}

            <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--color-border)]">
              <h3 className="text-subhead text-[var(--color-primary-900)]">{title}</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-[var(--color-neutral-100)] text-[var(--color-neutral-400)] transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar" style={{ maxHeight: `calc(${maxHeight} - 64px)` }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
