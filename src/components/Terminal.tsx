import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Unlock, ShieldAlert, MonitorDot, Delete, RefreshCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { useGame } from '../contexts/GameContext';
import { updateDoc, doc, serverTimestamp, arrayUnion, getDocs, collection, query, where, limit, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const Terminal: React.FC = () => {
  const { profile } = useGame();
  const [passcode, setPasscode] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [unlockedImage, setUnlockedImage] = useState<string | null>(null);

  const [jumpscare, setJumpscare] = useState(false);

  // In a real app, this might come from Firestore system config.
  // We'll hardcode '0420' as the secret code for demonstration.
  const SECRET_CODE = '0420';
  const IMAGE_URL = 'https://images.unsplash.com/photo-1579291418706-0bfa7d207fcc?q=80&w=600&auto=format&fit=crop';

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
        if (jumpscare) return;
        setPasscode(prev => {
            const next = prev + e.key.toUpperCase();
            if (next.includes("CURSE01")) {
                triggerTerminalTrap();
                return "";
            }
            return next; // Wait, actually it's easier to just use a separate state for payload
        });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [jumpscare]);

  const [payloadBuffer, setPayloadBuffer] = useState("");
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
        if (jumpscare) return;
        setPayloadBuffer(prev => {
           const next = (prev + e.key).toUpperCase().slice(-8);
           if (next === "CURSE_01" || next === "CURSE01") {
               triggerTerminalTrap();
               return "";
           }
           return next;
        });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [jumpscare]);

  const triggerTerminalTrap = async () => {
      setJumpscare(true);
      if (profile) {
          await updateDoc(doc(db, 'users', profile.uid), {
             stress: Math.min(100, (profile?.stress || 0) + 30),
             updatedAt: serverTimestamp()
          });
      }
      navigator.vibrate?.([200, 100, 200, 100, 500]);
      setStatus('error');
      setTimeout(() => setJumpscare(false), 2000);
  };

  const handleKeyClick = (key: string) => {
    if (status === 'success' || status === 'checking') return;
    
    if (key === 'clear') {
      setPasscode('');
      setStatus('idle');
      return;
    }
    
    if (key === 'del') {
      setPasscode(prev => prev.slice(0, -1));
      setStatus('idle');
      return;
    }

    if (passcode.length < 4) {
      const newCode = passcode + key;
      setPasscode(newCode);
      
      if (newCode.length === 4) {
        verifyCode(newCode);
      }
    }
  };

  const verifyCode = (code: string) => {
    setStatus('checking');
    setTimeout(() => {
      if (code === SECRET_CODE || (profile?.role === 'admin' && code === '0000')) {
        setStatus('success');
        setTimeout(async () => {
          setUnlockedImage(IMAGE_URL);
          // Unlock item in inventory
          if (profile) {
              
              // Find the specific item from DB (e.g. named "기밀 로그 S-0420" or from config)
              const configSnap = await getDoc(doc(db, 'system', 'config'));
              const configItemName = configSnap.exists() && configSnap.data().terminalRewardItem ? configSnap.data().terminalRewardItem : '기밀 로그 S-0420';
              
              const itemQuery = query(collection(db, 'items'), where('name', '==', configItemName), limit(1));
              const itemSnap = await getDocs(itemQuery);
              let obtainedName = configItemName; // fallback
              
              if (!itemSnap.empty) {
                 obtainedName = itemSnap.docs[0].data().name;
              }

              await updateDoc(doc(db, 'users', profile.uid), {
                 inventory: arrayUnion(obtainedName),
                 updatedAt: serverTimestamp()
              });
          }
        }, 800);
      } else {
        setStatus('error');
        setTimeout(() => {
          setPasscode('');
          setStatus('idle');
        }, 1500);
      }
    }, 1000);
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'del'];

  return (
    <div className="flex flex-col h-full bg-[#0F172A] p-6 rounded-[2rem] shadow-2xl overflow-hidden relative border border-slate-700">
      <AnimatePresence>
         {jumpscare && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1, filter: "invert(100%) hue-rotate(180deg) blur(2px)" }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[9999] bg-black flex items-center justify-center pointer-events-none mix-blend-difference"
            >
               <div className="absolute inset-0 bg-[#FF0000] opacity-50 mix-blend-color-burn animate-pulse" />
               <motion.img 
                  animate={{ scale: [1, 1.5, 1], filter: ["contrast(1)", "contrast(5)", "contrast(1)"] }}
                  transition={{ duration: 0.1, repeat: Infinity }}
                  src="https://upload.wikimedia.org/wikipedia/commons/3/3a/Television_static.gif"
                  className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-overlay"
               />
               <motion.h1 
                  animate={{ scale: [1, 1.2, 1], x: [-10, 10, -10], y: [-10, 10, -10] }}
                  transition={{ duration: 0.1, repeat: Infinity }}
                  className="text-white text-9xl font-black text-center z-10"
                  style={{ textShadow: "0 0 50px red" }}
               >
                  CURSE_01
               </motion.h1>
            </motion.div>
         )}
       </AnimatePresence>
       
      {/* Decorative */}
      <div className="absolute top-0 right-0 p-8 opacity-5 text-sky-500 scale-150 -rotate-12 pointer-events-none">
         <MonitorDot size={200} />
      </div>

      <div className="flex items-center gap-3 mb-10 z-10">
         <div className="w-10 h-10 rounded-xl bg-[#1E293B] border border-slate-700 flex items-center justify-center text-sky-400">
            <Lock size={20} />
         </div>
         <div>
           <h2 className="text-xl font-black text-white tracking-tight">System Terminal</h2>
           <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-1">
              Unauthorized access prohibited
           </div>
         </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center z-10 w-full max-w-sm mx-auto">
        
        {/* Display Screen */}
        <div className={cn(
          "w-full h-24 bg-[#050505] rounded-2xl mb-8 flex items-center justify-center border transition-colors relative overflow-hidden",
          status === 'error' ? "border-rose-500/50" : status === 'success' ? "border-emerald-500/50" : "border-slate-800",
          status === 'success' && "bg-emerald-950/20"
        )}>
           <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(255,255,255,0.05)_50%,transparent_100%)] bg-[length:100%_4px] opacity-20 pointer-events-none" />
           
           <div className="flex gap-4">
             {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-4 h-4 rounded-full flex items-center justify-center">
                  <div className={cn(
                    "w-3 h-3 rounded-full transition-all duration-300",
                    passcode.length > i ? (status === 'error' ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" : status === 'success' ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]" : "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]") : "bg-slate-800"
                  )} />
                </div>
             ))}
           </div>

           {status === 'checking' && (
             <div className="absolute bottom-2 right-3 text-[9px] font-mono text-sky-400 uppercase tracking-widest animate-pulse">
                Verify...
             </div>
           )}
           {status === 'error' && (
             <div className="absolute bottom-2 right-3 text-[9px] font-mono text-rose-500 uppercase tracking-widest">
                Access Denied
             </div>
           )}
           {status === 'success' && (
             <div className="absolute bottom-2 right-3 text-[9px] font-mono text-emerald-500 uppercase tracking-widest">
                Access Granted
             </div>
           )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {keys.map((key) => (
             <button
               key={key}
               onClick={() => handleKeyClick(key)}
               disabled={status === 'checking' || status === 'success'}
               className={cn(
                 "h-14 font-mono text-lg font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50",
                 key === 'clear' || key === 'del' ? "bg-[#1E293B] text-slate-400 border border-slate-700/50 hover:bg-slate-800" : "bg-[#1E293B] text-white border border-slate-700/50 hover:bg-sky-900/40 hover:border-sky-500/30"
               )}
             >
               {key === 'clear' ? <RefreshCcw size={18} className="mx-auto" /> : key === 'del' ? <Delete size={18} className="mx-auto" /> : key}
             </button>
          ))}
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
         {unlockedImage && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="absolute inset-0 z-50 bg-[#050505]/90 backdrop-blur-md flex flex-col p-6 items-center justify-center"
           >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-md bg-white p-2 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.2)]"
              >
                 <img src={unlockedImage} alt="Confidential Data" className="w-full h-auto rounded-xl" />
                 <div className="p-4 text-center">
                    <h3 className="text-lg font-black text-[#0F172A] tracking-tight">기밀 아카이브 열람 성공</h3>
                    <p className="text-[11px] font-bold text-slate-400 mt-2">숨겨진 데이터를 정상적으로 복구했습니다.</p>
                    <div className="mt-4 p-3 bg-slate-100 rounded-xl">
                       <p className="text-xs font-bold text-slate-700">새로운 단서가 사물함(인벤토리)에 보관되었습니다.</p>
                    </div>
                 </div>
              </motion.div>
              <button 
                onClick={() => { setUnlockedImage(null); setPasscode(''); setStatus('idle'); }}
                className="mt-8 px-6 py-3 bg-[#1E293B] text-white rounded-xl font-bold text-sm tracking-widest hover:bg-white hover:text-[#0F172A] transition-all uppercase"
              >
                 닫기
              </button>
           </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
};
