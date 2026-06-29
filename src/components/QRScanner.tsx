import React, { useState, useRef } from 'react';
import { useGame } from '../contexts/GameContext';
import { Scanner } from '@yudiel/react-qr-scanner';
import { ScanLine, X, AlertOctagon, Package, ImagePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useReducedMotion } from '../hooks/useReducedMotion';
import jsQR from 'jsqr';

export const QRScanner: React.FC = () => {
  const { user, profile } = useGame();
  const reduced = useReducedMotion();
  const [scanResult, setScanResult] = useState<{type: 'error' | 'success', message: string} | null>(null);
  const [cursed, setCursed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScan = async (result: string) => {
    if (!result || scanResult || cursed || !user) return;
    
    if (result === 'CURSE_01') {
      setCursed(true);
      await updateDoc(doc(db, 'users', user.uid), {
         stress: Math.min(100, (profile?.stress || 0) + 30),
         updatedAt: serverTimestamp()
      });
      navigator.vibrate?.([200, 100, 200, 100, 500]);
      setTimeout(() => setCursed(false), 2000); 
      setScanResult({ type: 'error', message: 'SEVERE ANOMALY DETECTED. STRESS LEVEL INCREASED.' });
    } else if (result === 'ITEM_01') {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          inventory: arrayUnion('의문의 일기장 조각'),
          updatedAt: serverTimestamp()
        });
        setScanResult({ type: 'success', message: '도감에 [의문의 일기장 조각]이 추가되었습니다.' });
      } catch (e) {
        console.error(e);
      }
    } else if (result.includes('S-')) {
      // Transfer logic... for now just show message
      setScanResult({ type: 'success', message: `송금 대상 인식 완료: ${result}` });
    } else {
      setScanResult({ type: 'error', message: '알 수 없는 코드입니다.' });
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;
        
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0, img.width, img.height);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          handleScan(code.data);
        } else {
          setScanResult({ type: 'error', message: '이미지에서 QR 코드를 인식하지 못했습니다.' });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0F172A] p-6 rounded-[2rem] overflow-hidden relative shadow-2xl">
       {/* Cursed Overlay Jumpscare */}
       <AnimatePresence>
         {cursed && (
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
                  ERROR
               </motion.h1>
            </motion.div>
         )}
       </AnimatePresence>

       <div className="flex items-center gap-3 mb-8 z-10">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-sky-400">
             <ScanLine size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black text-white tracking-tight">비전 스캐너</h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
               AR Pattern Recognition
            </p>
          </div>
          {/* 이미지로 불러오기 버튼 */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 flex flex-col items-center justify-center text-slate-300 transition-colors shadow-lg active:scale-95 border border-slate-700"
          >
            <ImagePlus size={20} />
          </button>
       </div>

       <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-sm mx-auto">
          <div className="w-full aspect-square bg-black rounded-[2rem] overflow-hidden relative shadow-inner border border-slate-700">
             <Scanner
                onScan={(detected) => {
                  if (detected && detected.length > 0) {
                     handleScan(detected[0].rawValue);
                  }
                }}
                allowMultiple={true}
                scanDelay={2000}
             />
             
             {/* [SVG] 스캔 대기 SVG 오버레이 */}
             <div className="absolute inset-0 pointer-events-none z-10">
               <svg viewBox="0 0 300 300" className="w-full h-full">
                 {/* 코너 브라켓 (뷰파인더 프레임) */}
                 {[
                   { x: 60, y: 60, r: 0 },
                   { x: 240, y: 60, r: 90 },
                   { x: 240, y: 240, r: 180 },
                   { x: 60, y: 240, r: 270 },
                 ].map(({ x, y, r }, i) => (
                   <g key={i} transform={`rotate(${r} ${x} ${y})`}>
                     <path
                       d={`M ${x - 20} ${y} L ${x} ${y} L ${x} ${y + 20}`}
                       fill="none"
                       stroke="#3b5bdb"
                       strokeWidth={3}
                       strokeLinecap="round"
                     />
                   </g>
                 ))}

                 {/* 스캔 라인 (위아래로 왕복) */}
                 <motion.line
                   x1={70} x2={230}
                   stroke="rgba(59, 91, 219, 0.7)"
                   strokeWidth={2}
                   filter="url(#scan-glow)"
                   animate={reduced ? {} : {
                     y1: [70, 230, 70],
                     y2: [70, 230, 70],
                   }}
                   transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                 />

                 {/* 스캔 라인 glow */}
                 <defs>
                   <filter id="scan-glow">
                     <feGaussianBlur stdDeviation="3" result="blur" />
                     <feMerge>
                       <feMergeNode in="blur" />
                       <feMergeNode in="SourceGraphic" />
                     </feMerge>
                   </filter>
                 </defs>

                 {/* 중심 십자선 */}
                 <line x1={148} y1={142} x2={152} y2={142} stroke="rgba(59,91,219,0.4)" strokeWidth={1} />
                 <line x1={150} y1={140} x2={150} y2={144} stroke="rgba(59,91,219,0.4)" strokeWidth={1} />
               </svg>
             </div>

             {/* [SVG] 스캔 성공 파문 애니메이션 */}
             <AnimatePresence>
               {scanResult?.type === 'success' && !reduced && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                   {[0, 1, 2].map(i => (
                     <motion.div
                       key={i}
                       className="absolute rounded-full border-2 border-emerald-400"
                       initial={{ width: 20, height: 20, opacity: 0.8 }}
                       animate={{ width: 200, height: 200, opacity: 0 }}
                       transition={{ duration: 1, delay: i * 0.2, ease: 'easeOut' }}
                     />
                   ))}
                 </div>
               )}
             </AnimatePresence>
          </div>
          
          <div className="mt-8 text-center text-slate-400 text-sm font-bold w-full">
            카메라를 QR 코드에 맞추거나, 우측 상단 버튼으로 이미지를 불러오세요.
          </div>

          <AnimatePresence>
            {scanResult && (
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: 20 }}
                 className="absolute bottom-0 inset-x-0 mx-4 mb-4"
               >
                 <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                       {scanResult.type === 'error' ? (
                          <AlertOctagon className="text-rose-500 shrink-0" size={20} />
                       ) : (
                          <Package className="text-emerald-500 shrink-0" size={20} />
                       )}
                       <div>
                         <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                           SCAN RESULT
                         </div>
                         <div className="text-sm font-bold text-white">
                           {scanResult.message}
                         </div>
                       </div>
                    </div>
                    <button onClick={() => setScanResult(null)} className="text-slate-500 hover:text-white mt-1">
                      <X size={16} />
                    </button>
                 </div>
               </motion.div>
            )}
          </AnimatePresence>
       </div>
    </div>
  );
};

