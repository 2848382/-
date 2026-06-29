import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useGame } from "../contexts/GameContext";
import { ACTIONS } from "../constants/actionList";
import { InteractionAction } from "../types";
import { cn } from "../lib/utils";
import {
  Ghost,
  ShieldX,
  Zap,
  Heart,
  AlertTriangle,
  Terminal,
  X,
  CheckCircle2,
} from "lucide-react";

interface ActionMenuProps {
  targetUid: string;
  targetName: string;
  onClose: () => void;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  targetUid,
  targetName,
  onClose,
}) => {
  const { profile, interactWithStudent } = useGame();
  const [selectedAction, setSelectedAction] =
    useState<InteractionAction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;

  const currentLoop = profile.loops || 1;
  const isGlitchMode = currentLoop >= 6;
  const isMirrorWorld = currentLoop >= 5;

  const handleAction = async (action: InteractionAction) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setError(null);
    try {
      await interactWithStudent(targetUid, action);

      const successMessage = isGlitchMode
        ? "데이터가 오염되었습니다. 피사체의 공포가 수집되었습니다."
        : action.message;

      setResult(successMessage);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (e: any) {
      setError(e.message);
      setIsProcessing(false);
    }
  };

  const getGlitchLabel = (label: string) => {
    if (!isGlitchMode) return label;
    const chars = label.split("");
    return chars.map((c) => (Math.random() > 0.8 ? "..." : c)).join("");
  };

  const filteredActions = ACTIONS.filter(
    (a) => a.loopLevel <= currentLoop || a.id === "???",
  );

  // Group actions by phase
  const phases = [
    {
      name: isGlitchMode ? "Phase 1: Daily" : "학생 생활 가이드",
      level: [0, 1, 2],
    },
    {
      name: isGlitchMode ? "Phase 2: Suspicion" : "특별 상호작용",
      level: [3, 4, 5],
    },
    {
      name: isGlitchMode ? "Phase 3: Hidden" : "Unknown_Protocol",
      level: [6, 7, 8, 9],
    },
  ];

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-mw-blue/40 backdrop-blur-sm transition-all",
        isMirrorWorld && "mirror-world",
      )}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className={cn(
          "bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col relative border",
          isGlitchMode
            ? "border-horror-red overflow-hidden animate-pulse"
            : "border-[#E5E7EB]",
          isMirrorWorld && "mirror-world-content",
        )}
      >
        {isGlitchMode && (
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] mix-blend-overlay" />
        )}

        {/* Header */}
        <div
          className={cn(
            "p-8 flex justify-between items-center bg-[#F9FAFB] border-b border-[#E5E7EB]",
            isGlitchMode && "bg-black text-horror-red border-horror-red/30",
          )}
        >
          <div>
            <div className="flex items-center gap-3">
              <h2
                className={cn(
                  "text-2xl font-bold tracking-tight",
                  isGlitchMode && "glitch-text",
                )}
              >
                {isGlitchMode
                  ? "INTERACTION_PROTOCOL"
                  : `${targetName} 학생과 상호작용`}
              </h2>
              {isGlitchMode && <Terminal className="animate-pulse" />}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-normal opacity-40 mt-1">
              {isGlitchMode
                ? "AUTHORIZED_ACCESS_ONLY // ERROR_DETECTED"
                : "교육과정 내 정식 상호작용 리스트"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F3F4F6] rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-white">
          {result ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="h-full flex flex-col items-center justify-center space-y-6 text-center"
            >
              <div
                className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center",
                  isGlitchMode
                    ? "bg-red-950 text-red-500"
                    : "bg-emerald-50 text-emerald-600 border border-emerald-100",
                )}
              >
                {isGlitchMode ? (
                  <Ghost size={32} />
                ) : (
                  <CheckCircle2 size={32} />
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight text-mw-blue">
                  {result}
                </h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-normal">
                  기록이 전송되었습니다.
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {phases.map((phase, idx) => (
                <div key={idx} className="space-y-5">
                  <h4
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-normal pb-2 border-b",
                      isGlitchMode
                        ? "text-red-500 border-red-900"
                        : "text-gray-400 border-[#F3F4F6]",
                    )}
                  >
                    {phase.name}
                  </h4>
                  <div className="space-y-2">
                    {ACTIONS.filter((a) =>
                      phase.level.includes(a.loopLevel),
                    ).map((action) => {
                      const isLocked = action.loopLevel > currentLoop;
                      return (
                        <motion.button
                          key={action.id}
                          whileHover={!isLocked ? { x: 4 } : {}}
                          whileTap={!isLocked ? { scale: 0.98 } : {}}
                          onClick={() => !isLocked && handleAction(action)}
                          disabled={isLocked || isProcessing}
                          className={cn(
                            "w-full p-4 rounded-xl flex items-center justify-between text-left transition-all border group",
                            isLocked
                              ? "bg-gray-50 border-gray-100 opacity-40 cursor-not-allowed"
                              : isGlitchMode
                                ? "bg-black border-red-900 text-red-500 hover:bg-red-950"
                                : "bg-white border-[#E5E7EB] hover:border-mw-blue/20 hover:shadow-sm",
                            action.isSpecial &&
                              !isLocked &&
                              "border-amber-200 bg-amber-50/50",
                          )}
                        >
                          <div className="min-w-0">
                            <div
                              className={cn(
                                "text-sm font-bold tracking-tight truncate",
                                isLocked && "font-serif italic opacity-40",
                              )}
                            >
                              {isLocked
                                ? "?????????"
                                : getGlitchLabel(action.label)}
                            </div>
                            {!isLocked && action.cost && (
                              <div className="flex gap-2 mt-1">
                                {action.cost.balance && (
                                  <span className="text-[8px] font-bold uppercase text-amber-600">
                                    -{action.cost.balance}원
                                  </span>
                                )}
                                {action.cost.stamina && (
                                  <span className="text-[8px] font-bold uppercase text-mw-blue">
                                    -{action.cost.stamina}ST
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {!isLocked &&
                            (action.isSpecial ? (
                              <Zap size={14} className="text-amber-400" />
                            ) : action.loopLevel < 3 ? (
                              <Heart
                                size={14}
                                className="text-emerald-400/40 group-hover:text-emerald-500"
                              />
                            ) : action.loopLevel < 6 ? (
                              <ShieldX
                                size={14}
                                className="text-amber-400/40 group-hover:text-amber-500"
                              />
                            ) : (
                              <Ghost
                                size={14}
                                className="text-red-500 animate-bounce"
                              />
                            ))}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-center text-xs font-bold border-t border-red-100/50">
            {error}
          </div>
        )}

        {/* Footer info */}
        <div
          className={cn(
            "px-8 py-4 bg-[#F9FAFB] text-[9px] font-bold uppercase tracking-normal flex justify-between items-center text-gray-400 border-t border-[#E5E7EB]",
            isGlitchMode && "bg-black text-red-900 border-red-900/30",
          )}
        >
          <span>UUID: {targetUid.slice(0, 10).toUpperCase()}</span>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {isGlitchMode ? "STABILITY" : "PING"}:{" "}
              {isGlitchMode
                ? Math.max(0, 100 - currentLoop * 8) + "%"
                : "EXCELLENT"}
            </div>
            <span className="hidden sm:inline">
              LOC: {isMirrorWorld && isGlitchMode ? "CORE_ZONE" : "G-2-2"}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
