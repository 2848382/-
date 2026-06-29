export interface StoreItem {
  id: string;
  name: string;
  price: number;
  effect?: { type: string; val: number };
  desc: string;
}

export const STORE_ITEMS: StoreItem[] = [
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

export const VENDING_ITEMS: StoreItem[] = [
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
