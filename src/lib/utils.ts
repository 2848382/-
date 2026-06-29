import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { UserProfile } from '../types';

// [신규: 용어 치환 시스템]
export function gameTerms(key: string, awakened: boolean): string {
  const masked: Record<string, string> = {
    'loop': '학기',
    'loopCount': '재학 기간',
    'loopEnd': '학기 종료',
    'reset': '학사 갱신',
    'memory': '과거 기록',
    'repeat': '반복 과정',
  };
  const revealed: Record<string, string> = {
    'loop': '루프',
    'loopCount': '루프 수치',
    'loopEnd': '루프 종료',
    'reset': '리셋',
    'memory': '루프 기억',
    'repeat': '반복',
  };
  return awakened ? (revealed[key] ?? key) : (masked[key] ?? key);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateStudentId() {
  const year = "26"; // Myeong-won 2026
  const classNum = "02";
  const num = Math.floor(Math.random() * 30 + 1).toString().padStart(2, '0');
  return `${year}-${classNum}-${num}`;
}

// [R2] 중복 어드민 필터 통합
export const MASTER_EMAIL = '10049810a@gmail.com';

export function isStudentProfile(profile: UserProfile, excludeUid?: string): boolean {
  return (
    profile.role !== 'admin' &&
    profile.email !== MASTER_EMAIL &&
    !profile.isAdmin &&
    (excludeUid ? profile.uid !== excludeUid : true)
  );
}

export type ItemCategory = 'clue' | 'consumable' | 'special' | 'gift' | 'unknown';

export function getItemCategory(itemName: string): ItemCategory {
  if (itemName.startsWith('단서:') || itemName.includes('조각') || itemName.includes('기록')) return 'clue';
  if (itemName.startsWith('Gift:')) return 'gift';
  const consumables = ['빵', '우유', '커피', '사발면', '칩', '젤리', '초코', '음료', '주스', '녹차', '밀크티', '사이다', '콜라', '생수', '에너지바', '비타'];
  if (consumables.some(c => itemName.includes(c))) return 'consumable';
  if (itemName.includes('???') || itemName.includes('ERROR')) return 'special';
  return 'unknown';
}

export interface LockConditions {
  minLoop?: number;
  maxStress?: number;
  minStamina?: number;
  minPhysical?: number;
  requiredItem?: string;
  requiredMemoryPoints?: number;
}

export function evaluateLockConditions(conditions: LockConditions, profile: UserProfile | null): { locked: boolean; reason?: string } {
  if (!profile) return { locked: true, reason: '로그인이 필요합니다.' };
  
  if (conditions.minLoop !== undefined && (profile.loops || 0) < conditions.minLoop) {
    return { locked: true, reason: `최소 루프 ${conditions.minLoop} 이상 필요합니다.` };
  }
  if (conditions.maxStress !== undefined && (profile.stress || 0) > conditions.maxStress) {
    return { locked: true, reason: `스트레스 수치가 너무 높습니다. (최대 ${conditions.maxStress})` };
  }
  if (conditions.minStamina !== undefined && (profile.stamina || 0) < conditions.minStamina) {
    return { locked: true, reason: `기력이 부족합니다. (최소 ${conditions.minStamina})` };
  }
  if (conditions.minPhysical !== undefined && (profile.physical || 0) < conditions.minPhysical) {
    return { locked: true, reason: `신체 능력이 부족합니다. (최소 ${conditions.minPhysical})` };
  }
  if (conditions.requiredItem !== undefined && !(profile.inventory || []).includes(conditions.requiredItem)) {
    return { locked: true, reason: `필요한 아이템이 없습니다: ${conditions.requiredItem}` };
  }
  if (conditions.requiredMemoryPoints !== undefined && (profile.memoryPoints || 0) < conditions.requiredMemoryPoints) {
    return { locked: true, reason: `기억 포인트가 부족합니다. (최소 ${conditions.requiredMemoryPoints})` };
  }
  
  return { locked: false };
}

