import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, updateDoc, increment, getDoc, setDoc, query, collection, where, getDocs, runTransaction, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, AlertTriangle, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { useGame } from '../contexts/GameContext';

export const DoomsdayTimer: React.FC = () => {
  const { user, profile, systemTimer } = useGame();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isLockdown, setIsLockdown] = useState(false);
  const lockdownTriggered = useRef(false);

  const { active, endTime } = systemTimer;

  useEffect(() => {
    if (!active || !endTime) {
       setIsLockdown(false);
       setTimeLeft(0);
       lockdownTriggered.current = false;
       return;
    }

    const checkLockdownTrigger = async () => {
        if (lockdownTriggered.current || !user || !profile || profile.role !== 'admin') return;
        lockdownTriggered.current = true;
        
        try {
            await runTransaction(db, async (t) => {
                const sysRef = doc(db, "system", "config");
                const sysSnap = await t.get(sysRef);
                if (sysSnap.exists()) {
                    const currentLoop = sysSnap.data().currentLoop || 1;
                    t.update(sysRef, { currentLoop: currentLoop + 1 });
                    
                    // Note: Transactions shouldn't have side effects that aren't t.set/t.update
                    // But we can just increment and then do queries later. For simplicity we just use updateDoc outside
                }
            });
        } catch (e) {
            console.error("Lockdown TX Error:", e);
        }
    };

    const triggerEvent = async () => {
        if (lockdownTriggered.current || !profile || profile.role !== 'admin') return;
        lockdownTriggered.current = true;
        const sysSnap = await getDoc(doc(db, "system", "config"));
        if (sysSnap.exists()) {
             const currentLoop = sysSnap.data().currentLoop || 1;
             await updateDoc(doc(db, "system", "config"), { 
                 currentLoop: increment(1),
                 endingMode: 'C'  // <--- LOCKDOWN TRIGGERS ENDING C
             });
             
             // Check reserved rumors
             const rumorRef = collection(db, "system", "data", "rumorReservations");
             const q = query(rumorRef, where("loopLevel", "==", currentLoop + 1), where("isPublished", "==", false));
             const rumorSnaps = await getDocs(q);
             rumorSnaps.forEach(async (rDoc) => {
                 await addDoc(collection(db, "whispers"), {
                    content: rDoc.data().content,
                    type: "anonymous",
                    isDistorted: true,
                    createdAt: new Date()
                 });
                 await updateDoc(rDoc.ref, { isPublished: true });
             });
        }
    };

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      setTimeLeft(remaining);
      
      if (remaining === 0) {
         setIsLockdown(true);
         triggerEvent();
      } else {
         setIsLockdown(false);
      }
    }, 1000);

    // Initial check
    const now = Date.now();
    const remaining = Math.max(0, endTime - now);
    setTimeLeft(remaining);
    if (remaining === 0) {
      setIsLockdown(true);
      triggerEvent();
    }
    
    // Environment damage
    const drainInterval = setInterval(async () => {
       const curNow = Date.now();
       const curRemain = Math.max(0, endTime - curNow);
       if (curRemain > 0 && curRemain <= 180000 && profile && !profile.isBanned) {
          try {
              // Increase stress by 1 every 10 seconds, cap at 100
              await updateDoc(doc(db, "users", profile.uid), {
                 stress: increment(1),
                 updatedAt: serverTimestamp()
              });
          } catch(e) {}
       }
    }, 10000);
    
    return () => {
      clearInterval(interval);
      clearInterval(drainInterval);
    };
  }, [active, endTime, profile]);

  // If inactive, render nothing
  if (!active && !isLockdown) return null;

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const urgencyFormat = timeLeft < 60000; // Less than 1 minute -> pure red

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[150] pointer-events-none flex justify-center pt-2 md:pt-4">
        <div className={cn(
           "px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border pointer-events-auto transition-colors duration-1000",
           urgencyFormat ? "bg-rose-950/90 border-rose-500/50" : "bg-[#0A101D]/90 border-sky-900/50 backdrop-blur-md"
        )}>
           <Clock className={cn("animate-pulse", urgencyFormat ? "text-rose-500" : "text-sky-400")} size={16} />
           <span className={cn(
             "text-[10px] font-black tracking-widest uppercase",
             urgencyFormat ? "text-rose-200" : "text-slate-300"
           )}>
             심야 점호까지
           </span>
           <span className={cn(
             "text-lg font-mono font-black tracking-tighter",
             urgencyFormat ? "text-rose-500 shadow-rose-500/50" : "text-white"
           )} style={{ textShadow: urgencyFormat ? '0 0 10px rgba(244,63,94,0.5)' : 'none' }}>
             {timeString}
           </span>
        </div>
      </div>

      <AnimatePresence>
        {isLockdown && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[1000] bg-rose-950/90 flex flex-col items-center justify-center p-6 backdrop-blur-sm overflow-hidden"
            style={{ 
              backgroundImage: 'radial-gradient(ellipse at center, rgba(244,63,94,0.15) 0%, transparent 70%)'
            }}
          >
            {/* TV static noise overlay */}
            <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none bg-[url('https://upload.wikimedia.org/wikipedia/commons/3/3a/Television_static.gif')] bg-cover" />
            
            <motion.div
               animate={{ scale: [1, 1.05, 1] }}
               transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
               className="text-rose-500 mb-8"
            >
               <ShieldAlert size={120} strokeWidth={1} />
            </motion.div>
            
            <h1 className="text-6xl md:text-8xl font-black text-rose-500 tracking-[0.2em] uppercase mix-blend-screen mb-4" style={{ textShadow: '0 0 40px rgba(244,63,94,0.8), 0 0 10px rgba(244,63,94,0.8)' }}>
              LOCKDOWN
            </h1>
            
            <div className="text-rose-200 font-mono text-sm md:text-base text-center max-w-md uppercase tracking-widest leading-loose">
               심야 점호가 시작되었습니다.<br/>
               모든 구역의 출입이 통제됩니다.<br/>
               시스템에 대한 접근 권한이 만료되었습니다.
            </div>

            {/* Block all interaction */}
            <div className="absolute inset-0 z-[1001] cursor-not-allowed" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
