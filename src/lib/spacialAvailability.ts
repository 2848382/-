import { IsoMapArea } from '../constants/mapData';
import { UserProfile } from '../types';

/**
 * [가용성 로직]
 * 기준일: 2026년 6월 2일 (한국 시간)
 * 1주차 (6/2 ~ 6/8)
 * 2주차 (6/9 ~ 6/15)
 * 3주차 (6/16 ~ 6/22)
 * 4주차 (6/23 ~ )
 */

const START_DATE = new Date('2026-06-02T00:00:00+09:00'); // KST

export interface RoomAvailability {
  isAvailable: boolean;
  maxCapacity: number;
  reason?: string;
  intensity: number; // 0.0 ~ 1.0 (폐쇄 강도)
}

/**
 * 오늘 날짜를 기준으로 주차를 계산합니다.
 */
export const getGameWeek = (now: Date = new Date()): number => {
  const diffInMs = now.getTime() - START_DATE.getTime();
  if (diffInMs < 0) return 0; // 아직 시작 전
  
  const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
  return Math.floor(diffInMs / oneWeekInMs) + 1;
};

/**
 * 결정론적 난수 생성 (오늘 날짜 + 방 ID 기반)
 * 모든 유저가 오늘 같은 방이 닫힌 것을 볼 수 있도록 함
 */
const getSeedRandom = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
};

export const getRoomAvailability = (
  room: IsoMapArea,
  profile: UserProfile | null,
  currentOccupancy: number = 0
): RoomAvailability => {
  const now = new Date();
  const week = getGameWeek(now);
  const trauma = profile?.trauma || 0;
  
  // 오늘 날짜 문자열 (YYYY-MM-DD)
  const dateStr = now.toISOString().split('T')[0];
  const seed = `${dateStr}-${room.id}`;
  const randomValue = getSeedRandom(seed);
  
  let intensity = 0;
  let maxCapacity = 999;
  
  // 1. 주차별 기본 폐쇄 확률 설정
  if (week === 1) intensity = 0.1; // 10% 폐쇄
  else if (week === 2) intensity = 0.3; // 30% 폐쇄
  else if (week === 3) intensity = 0.5; // 50% 폐쇄
  else if (week >= 4) intensity = 0.67; // 2/3 폐쇄 (1/3만 오픈)
  
  // 2. 트라우마 영향
  if (trauma > 80) {
    intensity = Math.max(intensity, 0.67);
    maxCapacity = 2; // 극한 상황: 최대 2명
  } else if (trauma > 50) {
    intensity = Math.max(intensity, 0.4);
    maxCapacity = Math.min(maxCapacity, 5);
  }

  // 3. 주차별 인원 제한 강화
  if (week >= 4) {
    maxCapacity = Math.min(maxCapacity, 2);
  } else if (week === 3) {
    maxCapacity = Math.min(maxCapacity, 4);
  }

  // 4. 가용성 판단
  // randomValue가 intensity보다 작으면 폐쇄된 구역
  const isAvailableByRandom = randomValue >= intensity;
  
  // 인원 초과 확인
  const isFull = currentOccupancy >= maxCapacity;
  
  // 마스터 전용 구역 등 특수 예외 처리 (mapData의 status 기준)
  const isOriginallyLocked = room.status.includes('잠김') || room.status.includes('위험');

  if (isOriginallyLocked) {
    return { isAvailable: false, maxCapacity, reason: '접근이 통제된 구역입니다.', intensity };
  }

  if (!isAvailableByRandom) {
    return { 
      isAvailable: false, 
      maxCapacity, 
      reason: week >= 4 ? '공간이 뒤틀려 접근할 수 없습니다.' : '오늘 이 구역은 이용할 수 없습니다.',
      intensity 
    };
  }

  if (isFull) {
    return { isAvailable: false, maxCapacity, reason: '현재 수용 인원을 초과했습니다.', intensity };
  }

  return { isAvailable: true, maxCapacity, intensity };
};
