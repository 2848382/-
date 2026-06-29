import React from "react";
import { Coffee, X } from "lucide-react";
import { useGame } from "../../contexts/GameContext";
import { doc, updateDoc, increment, arrayUnion, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { handleFirestoreError, OperationType } from "../../lib/firestoreErrorHandler";

interface StoreItem {
  id: string;
  name: string;
  price: number;
  effect?: { type: string; val: number };
  desc: string;
}

const STORE_ITEMS: StoreItem[] = [
  { id: "bread", name: "소보로 빵", price: 1500, effect: { type: "stamina", val: 10 }, desc: "폭신폭신한 빵. 스테미나 +10" },
  { id: "milk", name: "초코 우유", price: 1200, effect: { type: "stress", val: -5 }, desc: "달콤한 초코맛. 스트레스 -5" },
  { id: "pen", name: "고급 필기구", price: 5000, effect: { type: "academic", val: 5 }, desc: "모나미의 최상위 라인업. 학업 스탯 +5" },
  { id: "noodle", name: "육개장 사발면", price: 1200, effect: { type: "stamina", val: 15 }, desc: "야자 시간의 친구. 스테미나 +15" },
  { id: "coffee", name: "캔커피", price: 1000, effect: { type: "stress", val: -3 }, desc: "잠을 쫓아주는 블랙 커피. 스트레스 -3" },
  { id: "band", name: "대일밴드", price: 800, effect: { type: "physical", val: 5 }, desc: "가벼운 상처 치료. 피지컬 +5" },
  { id: "note", name: "새싹 노트", price: 2000, effect: { type: "academic", val: 2 }, desc: "공부의지가 솟아나는 노트. 학업 스탯 +2" },
  { id: "jelly", name: "왕꿈틀이", price: 1000, effect: { type: "stress", val: -8 }, desc: "질겅질겅 씹어 식감을 즐긴다. 스트레스 -8" },
  { id: "chips", name: "포테이토 칩", price: 2000, effect: { type: "stamina", val: 8 }, desc: "짭짤한 감자칩. 스테미나 +8" },
  { id: "choco", name: "크런키", price: 1500, effect: { type: "stress", val: -5 }, desc: "바삭한 초콜릿바. 스트레스 -5" },
];

const VENDING_ITEMS: StoreItem[] = [
  { id: "can", name: "이온 음료", price: 1200, effect: { type: "stress", val: -5 }, desc: "수분 보충! 스트레스 -5" },
  { id: "choco", name: "에너지바", price: 1500, effect: { type: "stamina", val: 5 }, desc: "빠른 당 충전. 스테미나 +5" },
  { id: "cola", name: "코카콜라", price: 1500, effect: { type: "stress", val: -7 }, desc: "짜릿한 탄산. 스트레스 -7" },
  { id: "cider", name: "칠성사이다", price: 1400, effect: { type: "stress", val: -6 }, desc: "깔끔한 탄산. 스트레스 -6" },
  { id: "water", name: "생수", price: 800, effect: { type: "stamina", val: 2 }, desc: "갈증 해소. 스테미나 +2" },
  { id: "milktea", name: "밀크티", price: 1800, effect: { type: "stress", val: -8 }, desc: "홍차의 부드러움. 스트레스 -8" },
  { id: "greentea", name: "녹차", price: 1200, effect: { type: "academic", val: 2 }, desc: "머리가 맑아진다. 학업 +2" },
  { id: "vitamin", name: "비타2000", price: 1500, effect: { type: "physical", val: 5 }, desc: "피로 회복! 피지컬 +5" },
  { id: "mango", name: "망고 주스", price: 1600, effect: { type: "stress", val: -6 }, desc: "달콤한 과일 향. 스트레스 -6" },
  { id: "hot6", name: "핫식스", price: 1500, effect: { type: "stamina", val: 20 }, desc: "밤샘 전용. 스테미나 +20" },
];

interface StorePopupProps {
  type: "store" | "vending";
  currentLoop: number;
  areaId: string;
  onClose: () => void;
}

export const StorePopup: React.FC<StorePopupProps> = ({ type, currentLoop, areaId, onClose }) => {
  const { profile, user } = useGame();
  
  const isCursedVending = currentLoop >= 5 && type === "vending" && areaId === "annex-2f-vending";
  
  const handleBuy = async (item: StoreItem | "cursed") => {
    if (!profile || !user) return;
    if (profile.isCardFrozen) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "행정실에 의해 IC 카드가 정지되어 결제할 수 없습니다.", type: "error" } }));
      return;
    }

    const price = item === "cursed" ? 1000 : item.price;
    if ((profile.balance || 0) < price) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "잔액이 부족합니다.", type: "error" } }));
      return;
    }

    const pathRef = `users/${profile.uid}`;
    
    if (item === "cursed") {
      try {
        await updateDoc(doc(db, "users", profile.uid), {
          balance: increment(-price),
          stress: Math.min(100, (profile.stress || 0) + 20),
          updatedAt: serverTimestamp()
        });
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: `"기괴한 웃음 소리와 함께 정체불명의 액체가 나왔습니다."\n잔고 -${price}원, 스트레스 +20`, type: "error" } }));
      } catch(e) {
        handleFirestoreError(e, OperationType.UPDATE, pathRef);
      }
      return;
    }

    const updates: any = { balance: increment(-item.price) };
    if (item.effect?.type === "stamina") {
      updates.stamina = Math.min(100, (profile.stamina || 100) + item.effect.val);
    } else if (item.effect?.type === "stress") {
      updates.stress = Math.max(0, (profile.stress || 0) + item.effect.val);
    } else if (item.effect?.type === "academic") {
      updates.academicAchievement = Math.min(100, (profile.academicAchievement || 0) + item.effect.val);
    } else if (item.effect?.type === "physical") {
      updates.physical = Math.min(100, (profile.physical || 0) + item.effect.val);
    }
    
    updates.inventory = arrayUnion(item.name);
    updates.updatedAt = serverTimestamp();

    try {
        await updateDoc(doc(db, "users", profile.uid), updates);
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: `[${item.name}]을(를) 구매했습니다! (잔액: ${(profile.balance || 0) - item.price}원)\n${item.effect ? '스테이터스가 변동되었습니다.' : ''}`, type: "success" } }));
    } catch(e) {
        handleFirestoreError(e, OperationType.UPDATE, pathRef);
    }
  };

  const items = type === "store" ? STORE_ITEMS : VENDING_ITEMS;

  return (
    <div className="w-full bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden transform transition-all p-5 shadow-[0_0_40px_rgba(0,0,0,0.15)] flex flex-col max-h-[80vh]">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 shrink-0">
        <h3 className="font-black text-lg text-slate-800">
          {type === "store" ? "🏪 무인 매점" : "🥤 음료 자판기"}
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
          <X size={18} />
        </button>
      </div>

      <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl mb-4 shrink-0">
        <span className="text-xs font-bold text-slate-500">내 IC 카드 잔고:</span>
        <span className="font-black text-blue-600">{(profile?.balance || 0).toLocaleString()} 원</span>
        {profile?.isCardFrozen && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">정지됨</span>}
      </div>

      <div className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar">
        {items.map(item => (
          <div key={item.id} className="flex justify-between items-center bg-white border border-slate-100 p-3 rounded-xl hover:border-blue-200 transition-colors">
             <div>
               <div className="font-bold text-sm text-slate-800">{item.name}</div>
               <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
             </div>
             <button 
                onClick={() => handleBuy(item)}
                disabled={profile?.isCardFrozen || (profile?.balance || 0) < item.price}
                className="px-3 py-1.5 bg-[#0e0f37] text-white text-xs font-bold rounded-lg disabled:opacity-50 hover:bg-blue-800 transition-colors shrink-0 whitespace-nowrap"
             >
                {item.price.toLocaleString()} 원
             </button>
          </div>
        ))}
        {isCursedVending && (
          <div className="flex justify-between items-center bg-red-50 border border-red-200 p-3 rounded-xl mt-4">
             <div>
               <div className="font-bold text-sm text-red-900 line-through">ERROR_DRINK_%#</div>
               <div className="text-[10px] text-red-700 mt-0.5">정체불명의 검은 캔. 라벨이 지워져 있습니다.</div>
             </div>
             <button 
                onClick={() => handleBuy("cursed")}
                disabled={profile?.isCardFrozen || (profile?.balance || 0) < 1000}
                className="px-3 py-1.5 bg-red-900 text-white text-xs font-bold rounded-lg disabled:opacity-50 hover:bg-red-800 transition-colors flex items-center gap-1 shrink-0"
             >
                <Coffee size={12} /> 1,000 원
             </button>
          </div>
        )}
      </div>

      {type === "store" && profile?.loops && profile.loops >= 2 && (
         <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
           <div className="text-xs font-bold text-indigo-900 mb-1 flex items-center gap-1">매점 아주머니</div>
           <p className="text-[10px] text-indigo-700 font-medium whitespace-pre-wrap">
             "학생, 요새 왜 자꾸 똑같은 애들이 매점에 오나 몰라. 어제도 빵 사 간 애가 오늘 아침에 와서는 안 먹었다고 환불해 달라는 거 있지? 너도 조심해. 3 층 화장실은 웬만하면 피하고."
           </p>
         </div>
      )}
    </div>
  );
}
