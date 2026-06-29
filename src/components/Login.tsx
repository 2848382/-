import React, { useState } from "react";
import { auth, db } from "../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { motion } from "motion/react";
import {
  UserPlus,
  LogIn,
  AlertCircle,
  ShieldCheck,
  Mail,
  Lock,
  ShieldAlert,
} from "lucide-react";
import { cn } from "../lib/utils";
import { UserProfile } from "../types";

export const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // TRPG Setup State
  const [setupStep, setSetupStep] = useState(0); // 0: auth, 1: status, 2: details
  const [stats, setStats] = useState({
    academic: 50,
    bonding: 50,
    rebellion: 50,
    physical: 50,
    stress: 0,
  });
  const [details, setDetails] = useState({
    dormRoom: "",
    characteristics: "",
    hiddenFlaw: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isSignUp && setupStep < 2) {
      setSetupStep(setupStep + 1);
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        const user = result.user;
        const secureCode = Math.floor(
          10000000 + Math.random() * 90000000,
        ).toString();
        const autoStudentId = "S-" + Math.floor(1000 + Math.random() * 9000);

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email,
          name,
          studentId: autoStudentId,
          academicAchievement: stats.academic,
          bonding: stats.bonding,
          rebellion: stats.rebellion,
          physical: stats.physical,
          stress: stats.stress,
          dormRoom: details.dormRoom,
          characteristics: details.characteristics,
          hiddenFlaw: details.hiddenFlaw,
          inventory: [],
          favoriteApps: ["board", "terminal", "market", "archive"],
          badges: [],
          penaltyPoints: 0,
          trauma: 0,
          loops: 1,
          statsEditCount: 0,
          isLegacyUser: false,
          memoryPoints: 100,
          balance: 100000,
          secureCode: secureCode,
          emailVerified: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      let msg = "인증 중 오류가 발생했습니다.";

      if (err.message.includes("auth/operation-not-allowed")) {
        msg = `[관리자 설정] 파이어베이스 콘솔(gen-lang-client-0589233561)의 Authentication > Sign-in method에서 "Email/Password"가 '사용 설정됨'인지 다시 확인해주세요. 저장 버튼을 누르셨는지도 확인 부탁드립니다.`;
      } else if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password"
      ) {
        msg = "등록되지 않은 학생이거나 비밀번호가 일치하지 않습니다.";
      } else if (err.code === "auth/email-already-in-use") {
        msg = "이미 등록된 이메일 계정입니다.";
      } else if (err.code === "auth/weak-password") {
        msg = "비밀번호가 너무 취약합니다. (최소 6자 이상)";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F8F9FB] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-mw-blue selection:text-white">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none select-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 text-[400px] font-black text-mw-blue -rotate-12 transform -translate-x-1/2 -translate-y-1/2 leading-none">
          M
        </div>
        <div className="absolute bottom-1/4 right-1/4 text-[400px] font-black text-horror-red rotate-12 transform translate-x-1/2 translate-y-1/2 leading-none">
          W
        </div>
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-xl p-8 md:p-12 border border-[#E5E7EB] relative z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-mw-blue text-white rounded-2xl mb-6 shadow-lg transform transition-transform hover:scale-105">
            <ShieldCheck size={40} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-mw-blue tracking-tight uppercase leading-none">
            MyeongWon Portal
          </h1>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-px w-6 bg-[#F3F4F6]" />
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-normal">
              명원고등학교 학생 포털 시스템
            </p>
            <div className="h-px w-6 bg-[#F3F4F6]" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && setupStep === 0 && (
            <div className="space-y-5">
              <div className="space-y-1.5 group">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-normal">
                  Character Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-12 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 text-sm font-bold focus:bg-white focus:border-mw-blue/30 outline-none transition-all placeholder:text-gray-300"
                  placeholder="캐릭터 이름"
                />
              </div>
              <div className="space-y-1.5 group">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-normal">
                  Virtual Interface (Email)
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"
                    size={18}
                    strokeWidth={2.5}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-14 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-12 pr-4 text-sm font-bold focus:bg-white focus:border-mw-blue/30 outline-none transition-all"
                    placeholder="가상 계정 (email@school.ac.kr)"
                  />
                </div>
              </div>

              <div className="space-y-1.5 group">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-normal">
                  Passcode
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"
                    size={18}
                    strokeWidth={2.5}
                  />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-14 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-12 pr-4 text-sm font-bold focus:bg-white focus:border-mw-blue/30 outline-none transition-all"
                    placeholder="비밀번호"
                  />
                </div>
              </div>
            </div>
          )}

          {isSignUp && setupStep === 1 && (
            <div className="space-y-5">
              <div className="text-center mb-2">
                <h4 className="text-base font-bold text-mw-blue tracking-tight uppercase">
                  Status Allocation
                </h4>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-normal">
                  Student Database Sync
                </p>
              </div>

              <div className={cn(
                 "text-center py-2 rounded-xl text-xs font-black tracking-widest",
                 (200 - (stats.academic + stats.bonding + stats.rebellion + stats.physical) < 0) 
                   ? "bg-rose-100 text-rose-600 animate-pulse" 
                   : (200 - (stats.academic + stats.bonding + stats.rebellion + stats.physical) === 0)
                     ? "bg-emerald-100 text-emerald-600"
                     : "bg-slate-100 text-slate-500"
               )}>
                 잔여 포인트: {200 - (stats.academic + stats.bonding + stats.rebellion + stats.physical)} / 200
              </div>

              {[
                {
                  key: "academic",
                  label: "시간표 확인",
                  color: "accent-blue-500",
                  editable: true,
                },
                { key: "bonding", label: "유대감", color: "accent-pink-500", editable: true },
                {
                  key: "rebellion",
                  label: "반항심",
                  color: "accent-orange-500",
                  editable: true,
                },
                { key: "physical", label: "피지컬", color: "accent-green-500", editable: true },
                { key: "stress", label: "스트레스", color: "accent-red-500", editable: false },
              ].map((stat) => (
                <div key={stat.key} className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-bold text-mw-blue uppercase tracking-normal">
                      {stat.label}
                    </label>
                    <span className="text-xs font-mono font-bold text-mw-blue">
                      {(stats as any)[stat.key]} / 100
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    disabled={!stat.editable}
                    value={(stats as any)[stat.key]}
                    onChange={(e) => {
                      if (stat.editable) {
                        setStats({
                          ...stats,
                          [stat.key]: parseInt(e.target.value),
                        });
                      }
                    }}
                    className={cn(
                      "w-full h-1.5 bg-[#F3F4F6] rounded-lg appearance-none",
                      stat.editable ? `cursor-pointer ${stat.color}` : "cursor-not-allowed opacity-50"
                    )}
                  />
                </div>
              ))}
            </div>
          )}

          {isSignUp && setupStep === 2 && (
            <div className="space-y-5">
              <div className="text-center mb-2">
                <h4 className="text-base font-bold text-mw-blue tracking-tight uppercase">
                  Personal Records
                </h4>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-normal">
                  Identification Metadata
                </p>
              </div>
              <div className="space-y-1.5 group">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-normal">
                  Dormitory Room
                </label>
                <input
                  type="text"
                  value={details.dormRoom}
                  onChange={(e) =>
                    setDetails({ ...details, dormRoom: e.target.value })
                  }
                  className="w-full h-12 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 text-sm font-bold focus:bg-white focus:border-mw-blue/30 outline-none transition-all"
                  placeholder="예: 302호"
                />
              </div>
              <div className="space-y-1.5 group">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-normal">
                  Characteristics
                </label>
                <input
                  type="text"
                  value={details.characteristics}
                  onChange={(e) =>
                    setDetails({ ...details, characteristics: e.target.value })
                  }
                  className="w-full h-12 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 text-sm font-bold focus:bg-white focus:border-mw-blue/30 outline-none transition-all"
                  placeholder="캐릭터의 특징"
                />
              </div>
              <div className="space-y-1.5 group">
                <label className="text-[10px] font-bold text-horror-red uppercase ml-1 tracking-normal flex items-center gap-2">
                  <ShieldAlert size={10} /> Hidden Flaw (Secret)
                </label>
                <textarea
                  value={details.hiddenFlaw}
                  onChange={(e) =>
                    setDetails({ ...details, hiddenFlaw: e.target.value })
                  }
                  className="w-full h-24 bg-red-50/10 border border-[#E5E7EB] rounded-xl p-4 text-sm font-bold focus:bg-white focus:border-horror-red/30 outline-none transition-all resize-none"
                  placeholder="당신만이 아는 약점 혹은 트라우마..."
                />
                <p className="text-[8px] text-horror-red/40 italic font-medium ml-1">
                  * 이 기록은 타인에게 공개되지 않습니다.
                </p>
              </div>
            </div>
          )}

          {!isSignUp && (
            <>
              <div className="space-y-1.5 group">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-normal">
                  Virtual Interface
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"
                    size={18}
                    strokeWidth={2.5}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-14 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-12 pr-4 text-sm font-bold focus:bg-white focus:border-mw-blue/30 outline-none transition-all"
                    placeholder="email@school.ac.kr"
                  />
                </div>
              </div>

              <div className="space-y-1.5 group">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-normal">
                  Secret Passcode
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"
                    size={18}
                    strokeWidth={2.5}
                  />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-14 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-12 pr-4 text-sm font-bold focus:bg-white focus:border-mw-blue/30 outline-none transition-all"
                    placeholder="비밀번호"
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold text-red-600 leading-relaxed uppercase tracking-tighter">
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (isSignUp && setupStep === 1 && (200 - (stats.academic + stats.bonding + stats.rebellion + stats.physical)) !== 0)}
            className={cn(
              "w-full h-14 rounded-xl text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3",
              isSignUp
                ? "bg-horror-red hover:bg-[#A30000]"
                : "bg-mw-blue hover:bg-[#15233D]",
            )}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />}
                <span className="tracking-normal uppercase text-xs">
                  {isSignUp
                    ? setupStep === 2
                      ? "최종 등록 및 입학"
                      : "다음 단계로"
                    : "포털 인증 및 입장"}
                </span>
              </>
            )}
          </button>

          {isSignUp && setupStep > 0 && (
            <button
              type="button"
              onClick={() => setSetupStep(setupStep - 1)}
              className="w-full text-[10px] font-bold text-gray-400 uppercase tracking-normal mt-1 hover:text-mw-blue transition-colors"
            >
              Back to previous step
            </button>
          )}
        </form>

        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="text-[11px] font-bold text-mw-blue hover:text-mw-blue/70 transition-colors uppercase tracking-tight underline underline-offset-4"
          >
            {isSignUp
              ? "이미 등록된 학생입니까? 로그인"
              : "시스템에 처음 방문하셨습니까? 학생 등록"}
          </button>
        </div>
      </motion.div>

      <div className="absolute bottom-8 left-0 w-full text-center">
        <div className="inline-flex items-center gap-3 bg-white px-5 py-2 rounded-full border border-[#E5E7EB] shadow-sm">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[9px] text-gray-400 font-bold tracking-normal uppercase">
            Security Level: Authorized
          </span>
        </div>
      </div>
    </div>
  );
};
