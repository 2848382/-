import React, { useEffect, useState } from "react";
import { useGame } from "../contexts/GameContext";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

export const GlitchLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { profile, systemConfig, systemEvents } = useGame();
  const [jumpscare, setJumpscare] = useState(false);

  useEffect(() => {
    if (systemEvents) {
      if (systemEvents.type === "jumpscare" && systemEvents.id) {
        const now = Date.now();
        if (now - systemEvents.id < 10000) { // Only trigger if within last 10s
          if ("vibrate" in navigator) {
            navigator.vibrate([200, 100, 200, 100, 500]);
          }
          setJumpscare(true);
          setTimeout(() => setJumpscare(false), 3000);
        }
      }
    }
  }, [systemEvents]);

  if (!profile) return <>{children}</>;

  const systemLoop = systemConfig?.currentLoop || 0;
  const maxLoop = Math.max(profile.loops || 0, systemLoop);
  const isHorror = maxLoop >= 7;

  return (
    <div
      className={cn(
        "relative min-h-[100dvh] w-full transition-all duration-1000",
        isHorror ? "bg-[#FFF0F0]" : "bg-[#F8FAFC]",
      )}
    >
      <AnimatePresence>
         {jumpscare && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1, filter: "invert(100%) hue-rotate(180deg) blur(2px)" }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[9999] bg-rose-600 mix-blend-exclusion pointer-events-none flex flex-col items-center justify-center p-8"
            >
               <h1 className="text-4xl md:text-7xl font-black text-black tracking-tighter mix-blend-overlay opacity-50 uppercase text-center rotate-[-5deg]">
                 당신 뒤에<br/>누군가 있습니다
               </h1>
            </motion.div>
         )}
      </AnimatePresence>
      
      {isHorror && (
        <>
          {/* Bloody Vignette */}
          <div className="pointer-events-none fixed inset-0 z-50 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(220,38,38,0.15)_100%)] mix-blend-multiply" />

          {/* Static Noise Overlay */}
          <div
            className="pointer-events-none fixed inset-0 z-[49] opacity-20 mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Occasional screen tear filter */}
          <motion.div
            className="pointer-events-none fixed inset-0 z-50 bg-black mix-blend-overlay"
            animate={{ opacity: [0, 0, 0.05, 0, 0.1, 0] }}
            transition={{
              repeat: Infinity,
              duration: 4,
              times: [0, 0.5, 0.51, 0.55, 0.56, 1],
            }}
          />
        </>
      )}

      {/* Container tracking horror mode */}
      <div
        className={cn(
          "relative z-10 w-full h-full",
          isHorror
            ? "[&_p]:animate-pulse [&_h3]:text-red-900 [&_h2]:text-red-950 [&_.text-mw-blue]:text-red-950 [&_.bg-mw-blue]:bg-red-800"
            : "",
        )}
      >
        {children}
      </div>
    </div>
  );
};
