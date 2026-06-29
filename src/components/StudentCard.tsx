import React, { useState, useEffect } from "react";
import { useGame } from "../contexts/GameContext";
import { motion, AnimatePresence } from "motion/react";
import {
  QrCode,
  ShieldCheck,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Send,
  Landmark,
  ScanLine,
  AlertTriangle,
  Wifi,
  User,
} from "lucide-react";
import { cn } from "../lib/utils";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Transaction, UserProfile } from "../types";
import { QRCodeSVG } from "qrcode.react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Avatar } from "./ui/Avatar";
import { BottomSheet } from "./ui/BottomSheet";

export const StudentCard: React.FC = () => {
  const { profile, transferWon } = useGame();
  const [showTransactions, setShowTransactions] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showMyQR, setShowMyQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [searchingStudent, setSearchingStudent] = useState<UserProfile | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, "users", profile.uid, "transactions"),
      orderBy("createdAt", "desc"),
      limit(20),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Transaction,
      );

      // Inject eerie transaction if loop >= 7
      if (profile.loops >= 7 && Math.random() > 0.3) {
        txs.unshift({
          id: "eerie-" + Date.now(),
          amount: 0,
          type: "eerie",
          toFrom: "????",
          memo: "????",
          createdAt: { seconds: Date.now() / 1000 },
          isGlitch: true,
        });
      }

      setTransactions(txs);
    }, (error) => {
      console.error("Transactions Listener Error:", error.message);
    });

    return () => unsubscribe();
  }, [profile?.uid, profile?.loops]);

  useEffect(() => {
    if (transferTargetId.length === 4) {
      const searchStudent = async () => {
        const q = query(
          collection(db, "users"),
          where("studentId", ">=", "S-"),
          limit(100),
        );
        const snap = await getDocs(q);
        const match = snap.docs.find((d) => {
          const data = d.data() as UserProfile;
          const sid = data.studentId as string;
          return sid.endsWith(transferTargetId) && d.id !== profile?.uid && data.role !== 'admin' && data.email !== '10049810a@gmail.com' && !data.isAdmin;
        });
        if (match) {
          setSearchingStudent(match.data() as UserProfile);
          setError(null);
        } else {
          setSearchingStudent(null);
          setError("Student not found");
        }
      };
      searchStudent();
    } else {
      setSearchingStudent(null);
      setError(null);
    }
  }, [transferTargetId]);

  if (!profile) return null;

  const handleTransfer = async () => {
    if (!searchingStudent || !transferAmount) return;
    const amt = parseInt(transferAmount);
    if (isNaN(amt) || amt <= 0) return setError("Invalid amount");
    if (amt > (profile.balance || 0)) return setError("Insufficient balance");

    try {
      await transferWon(transferTargetId, amt, "");
      setShowTransfer(false);
      setTransferTargetId("");
      setTransferAmount("");
      setSearchingStudent(null);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: `${searchingStudent.name} 학생에게 ${amt} 원을 송금했습니다.`, type: "success" } }));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const isGlitchMode = profile.loops >= 7;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-[420px] mw-card p-6 md:p-8 flex flex-col items-center shadow-lg relative min-h-[500px]">
        <div className="w-full flex justify-between items-center mb-6 md:mb-8">
          <div className="text-sm md:text-base font-black text-[var(--color-primary-900)] flex items-center gap-2">
            <ShieldCheck className="text-[var(--color-primary-500)]" size={20} strokeWidth={2.5} /> 원 뱅킹
          </div>
          <div className="mw-badge bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/30 font-bold uppercase shadow-sm whitespace-nowrap">
            Verified Account
          </div>
        </div>

        <motion.div
           onClick={() => setShowTransactions(true)}
           className={cn(
             "relative w-full aspect-[1.586/1] rounded-[1.25rem] shadow-[0_16px_32px_rgba(0,0,50,0.2)] bg-gradient-to-br from-[var(--color-primary-800)] to-[var(--color-primary-950)] p-5 flex flex-col justify-between overflow-hidden cursor-pointer hover:-translate-y-1 transition-transform duration-300 group z-10",
             isGlitchMode && "animate-pulse"
           )}
        >
          {/* Background shapes */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--color-primary-500)]/20 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-[var(--color-primary-500)]/30 transition-colors duration-500"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -ml-10 -mb-10"></div>

          {/* Top Bar */}
          <div className="flex justify-between items-start z-10 w-full">
            <div className="flex flex-col">
              <span className="text-[11px] md:text-sm font-black tracking-widest text-white/95 drop-shadow-md pb-0.5">
                {profile.isStatsMasked ? "MYEONGWON ??????" : "명원고등학교 학생증"}
              </span>
              <span className="text-[7px] md:text-[8px] uppercase tracking-widest text-[var(--color-primary-200)]/70">
                MyeongWon High School
              </span>
            </div>
            <div className="text-[10px] md:text-xs font-black italic text-white/90 tracking-tighter mix-blend-overlay">
              원 <span className="text-[var(--color-primary-200)]">CHECK</span>
            </div>
          </div>
          
          {/* Middle Section */}
          <div className="flex justify-between items-center z-10 w-full mt-2 flex-1">
            <div className="flex flex-col h-full justify-around py-1 w-full">
              {/* IC Chip & Contactless */}
              <div className="flex items-center gap-3">
                 <div className="w-10 h-7 md:w-11 md:h-8 rounded-md bg-gradient-to-br from-[#e6c27a] via-[#ffd700] to-[#b8860b] shadow-inner opacity-95 relative overflow-hidden flex flex-col items-center justify-center">
                    <div className="w-[80%] h-px bg-yellow-900/30 absolute top-1/2"></div>
                    <div className="w-px h-[80%] bg-yellow-900/30 absolute left-1/3"></div>
                    <div className="w-px h-[80%] bg-yellow-900/30 absolute right-1/3"></div>
                 </div>
                 <Wifi size={18} className="rotate-90 text-[var(--color-primary-100)]/80" strokeWidth={3} />
              </div>
            </div>
          </div>

          {/* Bottom Section - Embossed Details */}
          <div className="z-10 mt-auto flex flex-col w-full pt-2">
            <div 
              className="font-mono text-base md:text-lg text-white/80 tracking-[0.15em] md:tracking-[0.2em] font-medium"
              style={{ textShadow: "0.5px 0.5px 1px rgba(255,255,255,0.4), -0.5px -0.5px 1px rgba(0,0,0,0.8)" }}
            >
              9409 {profile.studentId.substring(0, 4) || '0000'} **** {profile.studentId.substring(profile.studentId.length - 4) || 'XXXX'}
            </div>
            
            <div className="flex items-center justify-center w-full my-1">
              <div 
                className="text-[8px] md:text-[9px] uppercase font-bold tracking-widest text-white/80 flex gap-2 items-center mr-8"
                style={{ textShadow: "0.5px 0.5px 1px rgba(255,255,255,0.4), -0.5px -0.5px 1px rgba(0,0,0,0.8)" }}
              >
                <span>VALID<br/>THRU</span>
                <span className="text-xs md:text-sm tracking-widest font-mono">12/26</span>
              </div>
            </div>

            <div className="flex justify-between items-end w-full">
              <div 
                className="text-xs md:text-sm uppercase font-bold tracking-widest text-white/80"
                style={{ textShadow: "0.5px 0.5px 1px rgba(255,255,255,0.4), -0.5px -0.5px 1px rgba(0,0,0,0.8)" }}
              >
                {profile.name}
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-rose-500/80 mix-blend-screen shadow-inner"></div>
                <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-amber-500/80 mix-blend-screen -ml-2.5 md:-ml-3 shadow-inner"></div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-8 md:mt-10 flex flex-col items-center w-full">
          <span className="text-micro text-[var(--color-neutral-400)] mb-1">연결 계좌 잔액</span>
          <div className="flex items-baseline gap-1.5 text-[var(--color-primary-900)]">
            <span className="text-4xl md:text-5xl font-black tracking-tighter">{new Intl.NumberFormat("ko-KR").format(profile.balance || 0)}</span>
            <span className="text-xl md:text-2xl font-bold ml-1 text-[var(--color-primary-600)]">원</span>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mt-8 md:mt-10 w-full z-10">
          <button
            onClick={() => setShowTransfer(true)}
            className="mw-btn-sub shadow-sm py-4 md:py-4.5 rounded-xl text-sm"
          >
            <Send size={18} className="text-[var(--color-primary-500)]" />
            <span>송금하기</span>
          </button>
          <button
            onClick={() => setShowScanner(true)}
            className="mw-btn-sub shadow-sm py-4 md:py-4.5 rounded-xl text-sm"
          >
            <ScanLine size={18} className="text-[var(--color-primary-500)]" />
            <span>스캔하기</span>
          </button>
          <button
            onClick={() => setShowMyQR(true)}
            className="mw-btn-primary shadow-[0_8px_20px_rgba(0,0,50,0.2)] px-5 md:px-6 py-4 md:py-4.5 rounded-xl"
            aria-label="My QR Code"
          >
            <QrCode size={20} />
          </button>
        </div>
      </div>

      {/* Transaction Bottom Sheet */}
      <BottomSheet 
        isOpen={showTransactions} 
        onClose={() => setShowTransactions(false)}
        title="금융 활동 로그"
      >
        <div className="space-y-3 pb-8">
          {transactions.length > 0 ? (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl transition-all border group",
                  tx.isGlitch || tx.type === 'eerie'
                    ? "bg-red-50/50 border-red-200/50 animate-pulse-slow"
                    : "bg-white border-[var(--color-border)] hover:border-[var(--color-primary-200)]",
                )}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                      tx.isGlitch || tx.type === 'eerie'
                        ? "bg-red-900 text-red-500"
                        : tx.type === "spend"
                          ? "bg-rose-50 text-rose-500"
                          : "bg-emerald-50 text-emerald-500",
                    )}
                  >
                    {tx.isGlitch || tx.type === 'eerie' ? (
                      <AlertTriangle size={18} />
                    ) : tx.amount < 0 ? (
                      <ArrowUpRight size={18} />
                    ) : (
                      <ArrowDownLeft size={18} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "font-black text-[13px] tracking-tight truncate w-32 md:w-56 leading-none mb-1",
                        tx.isGlitch || tx.type === 'eerie' ? "text-red-900 font-mono" : "text-[var(--color-primary-900)]",
                      )}
                    >
                      {tx.isGlitch || tx.type === 'eerie' ? "ERR_UNKNOWN_FLOW" : tx.memo}
                    </div>
                    <div className="text-micro text-[var(--color-neutral-400)] flex items-center gap-1">
                      {tx.toFrom && <span className="font-bold text-[var(--color-neutral-500)]">{tx.toFrom}</span>}
                      <span>•</span>
                      {tx.createdAt?.seconds
                        ? new Date(tx.createdAt.seconds * 1000).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : "Processing..."}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className={cn(
                      "text-sm font-black tracking-tight",
                      tx.isGlitch || tx.type === 'eerie'
                        ? "text-red-600 font-mono italic"
                        : tx.amount < 0 ? "text-rose-600" : "text-emerald-600",
                    )}
                  >
                    {tx.amount < 0 ? "-" : "+"}
                    {new Intl.NumberFormat("ko-KR").format(Math.abs(tx.amount))}
                    <span className="text-[10px] ml-0.5">원</span>
                  </div>
                </div>
              </div>
            ) )
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-[var(--color-neutral-300)]">
              <Landmark size={32} strokeWidth={1.5} className="mb-3" />
              <p className="text-micro uppercase tracking-widest">거래 내역이 없습니다</p>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Smart Transfer Popup */}
      <AnimatePresence>
        {showTransfer && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-8 md:p-10 space-y-8 border border-[var(--color-border)]"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-subhead text-[var(--color-primary-900)]">Smart Transfer</h3>
                <button onClick={() => setShowTransfer(false)} className="text-[var(--color-neutral-400)]">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-micro text-[var(--color-neutral-400)] ml-1">Target ID (Last 4 Digits)</label>
                  <div className="relative mt-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="7099"
                      value={transferTargetId}
                      onChange={(e) => setTransferTargetId(e.target.value)}
                      className="mw-input pl-12"
                    />
                  </div>
                </div>

                {searchingStudent && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="p-4 bg-[var(--color-success)]/10 rounded-2xl border border-[var(--color-success)]/20 flex items-center gap-3"
                  >
                    <Avatar src={searchingStudent.photoURL} name={searchingStudent.name} size="sm" />
                    <div>
                      <div className="font-bold text-[var(--color-success)] text-sm">{searchingStudent.name} 학생</div>
                      <div className="text-micro text-[var(--color-success)]/60">{searchingStudent.studentId}</div>
                    </div>
                  </motion.div>
                )}

                {error && <div className="text-[var(--color-danger)] text-[10px] font-bold px-2">{error}</div>}

                <div>
                  <label className="text-micro text-[var(--color-neutral-400)] ml-1">Amount (원)</label>
                  <input
                    type="number"
                    placeholder="Enter amount..."
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="mw-input mt-2"
                  />
                </div>
              </div>

              <button
                onClick={handleTransfer}
                disabled={!searchingStudent || !transferAmount}
                className="w-full mw-btn-primary py-4 disabled:opacity-50"
              >
                Execute Transfer
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* My QR Code Popup */}
      <AnimatePresence>
        {showMyQR && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 space-y-6 border border-[var(--color-border)]"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-subhead text-[var(--color-primary-900)]">내 QR 코드</h3>
                <button onClick={() => setShowMyQR(false)} className="text-[var(--color-neutral-400)]">
                  <X size={24} />
                </button>
              </div>
              <div className="flex flex-col items-center justify-center py-6">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-[var(--color-border)]">
                  <QRCodeSVG value={profile.studentId} size={200} />
                </div>
                <div className="mt-6 text-center">
                  <div className="font-bold text-lg text-[var(--color-primary-900)]">{profile.name}</div>
                  <div className="text-micro text-[var(--color-neutral-400)] font-bold uppercase">{profile.studentId}</div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Scanner Popup */}
      <AnimatePresence>
        {showScanner && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4 border border-[var(--color-border)] overflow-hidden"
            >
              <div className="flex justify-between items-center px-2">
                <h3 className="text-subhead text-[var(--color-primary-900)]">QR 스캐너</h3>
                <button onClick={() => setShowScanner(false)} className="text-[var(--color-neutral-400)]">
                  <X size={24} />
                </button>
              </div>
              <div className="rounded-2xl overflow-hidden bg-black aspect-square relative">
                <Scanner
                  onScan={(result) => {
                    if (result && result.length > 0) {
                      const code = result[0].rawValue;
                      if (code.includes("S-")) {
                        const last4 = code.slice(-4);
                        setTransferTargetId(last4);
                        setShowScanner(false);
                        setShowTransfer(true);
                      }
                    }
                  }}
                  allowMultiple={true}
                  scanDelay={2000}
                />
              </div>
              <div className="text-center text-micro text-[var(--color-neutral-400)] font-bold">
                상대방의 QR 코드를 스캔하여 송금하세요
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
