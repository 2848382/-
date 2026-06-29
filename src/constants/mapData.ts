// src/constants/mapData.ts
export const TILE_W = 64;  // 타일 너비 (픽셀)
export const TILE_H = 32;  // 타일 높이 (픽셀, 너비의 절반)

export function toIso(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row) * (TILE_W / 2),
    y: (col + row) * (TILE_H / 2),
  };
}

export type RoomType =
  | 'classroom' | 'special' | 'facility' | 'store'
  | 'danger' | 'hidden' | 'admin' | 'outdoor'
  // [신규] 부속 요소
  | 'stair'       // 계단
  | 'stair_emergency' // 비상구 계단
  | 'elevator'    // 엘리베이터
  | 'corridor'    // 복도 (바닥만, 블록 없음)
  | 'bridge'      // 구름다리 (건물 간 연결)
  | 'toilet'      // 화장실
  | 'cctv'        // CCTV 감시 구역 표시
  | 'fire_exit'   // 비상구
  | 'utility';    // 전기실/기계실 등 기반 시설

export interface IsoMapArea {
  id: string;
  name: string;
  floor: string;
  building: string;
  features: string[];
  description: string;
  status: string;
  minLoop?: number;
  col: number;           // 그리드 열 (0부터)
  row: number;           // 그리드 행 (0부터)
  colSpan: number;       // 가로 칸 수
  rowSpan: number;       // 세로 칸 수
  height: number;        // 블록 높이 (층수 느낌, 1 ~ 3)
  roomType: RoomType;
  isCheckable: boolean;  // 체크인 가능 여부
  hasStore?: boolean;    // 매점 여부
  hasVending?: boolean;  // 자판기 여부
  storeType?: 'store' | 'vending';
  // [신규] 부속 요소 전용
  accessoryType?: 'stair_up' | 'stair_down' | 'stair_both'
                | 'elevator' | 'bridge_h' | 'bridge_v'
                | 'toilet_m' | 'toilet_f' | 'toilet_both'
                | 'fire_exit' | 'cctv' | 'utility';
  connectsTo?: string;   // 구름다리가 연결하는 다른 building
  connectsFloor?: string; // 계단/엘리베이터가 연결하는 층
  requiresLoop?: number;  // 이 루프 이상에서만 사용 가능 (기존 minLoop와 별개)
}

export const MAP_DATA: Record<string, Record<string, IsoMapArea[]>> = {
  '본관': {
    '4층': [
      { id: "main-4f-roof", name: "테라스 & 옥상 정원", col: 0, row: 0, colSpan: 8, rowSpan: 4, height: 1, roomType: 'outdoor', floor: "4층", building: "본관", features: ["휴식", "바람 쐬기"], description: "탁 트인 옥상 정원. 흡연 구역은 아니지만 간혹 불량 학생들이 출몰한다.", status: "평온 (스트레스 -5/min)", isCheckable: true },
      { id: "main-4f-astro", name: "소형 천문 관측 돔", col: 8, row: 0, colSpan: 4, rowSpan: 4, height: 2, roomType: 'special', floor: "4층", building: "본관", features: ["관측", "탐색"], description: "학교의 명물인 천체 관측 돔. 주로 천문 동아리가 사용한다.", status: "잠김 (권한 필요)", isCheckable: false },
      { id: "main-4f-stair", name: "옥상 계단", col: 0, row: 5, colSpan: 1, rowSpan: 2, height: 1, roomType: 'stair', accessoryType: 'stair_up', floor: "4층", building: "본관", features: ["옥상 접근"], description: "옥상으로 올라가는 계단.", status: "통행 가능", isCheckable: false },
    ],
    '3층': [
      { id: "main-301", name: "301호", col: 0, row: 0, colSpan: 2, rowSpan: 3, height: 1, roomType: 'classroom', floor: "3층", building: "본관", features: ["수업", "자습"], description: "3학년 1반 교실. 수능의 압박감이 공기마저 무겁게 만든다.", status: "학업 스트레스 (스테미나 -2/min)", isCheckable: true },
      { id: "main-302", name: "302호", col: 2, row: 0, colSpan: 2, rowSpan: 3, height: 1, roomType: 'classroom', floor: "3층", building: "본관", features: ["수업", "자습"], description: "3학년 2반 교실.", status: "평범 (변화 없음)", isCheckable: true },
      { id: "main-303", name: "303호", col: 4, row: 0, colSpan: 2, rowSpan: 3, height: 1, roomType: 'classroom', floor: "3층", building: "본관", features: ["수업", "자습"], description: "3학년 3반 교실.", status: "평범 (변화 없음)", isCheckable: true },
      { id: "main-304", name: "304호", col: 6, row: 0, colSpan: 2, rowSpan: 3, height: 1, roomType: 'classroom', floor: "3층", building: "본관", features: ["수업", "자습"], description: "3학년 4반 교실.", status: "평범 (변화 없음)", isCheckable: true },
      { id: "main-3f-maker", name: "미래창조과학관", col: 8, row: 0, colSpan: 3, rowSpan: 3, height: 1, roomType: 'facility', floor: "3층", building: "본관", features: ["제작", "위험물 취급"], description: "3D 프린터와 각종 실험 기구가 가득한 실습실.", status: "약간 위험 (주의 필요)", isCheckable: true },
      { id: "main-3f-wee", name: "위클래스", col: 8, row: 4, colSpan: 3, rowSpan: 3, height: 1, roomType: 'facility', floor: "3층", building: "본관", features: ["정신력 회복"], description: "전문 상담교사가 상주하는 아늑한 방.", status: "편안함 (정신력 +10/min)", isCheckable: true },
      { id: "main-3f-stair-l", name: "계단 (서쪽)", col: 0, row: 7, colSpan: 1, rowSpan: 2, height: 1, roomType: 'stair', accessoryType: 'stair_both', floor: "3층", building: "본관", features: ["층간 이동"], description: "본관 서쪽 계단.", status: "통행 가능", isCheckable: false },
      { id: "main-3f-stair-r", name: "계단 (동쪽)", col: 10, row: 7, colSpan: 1, rowSpan: 2, height: 1, roomType: 'stair', accessoryType: 'stair_both', floor: "3층", building: "본관", features: ["층간 이동"], description: "본관 동쪽 계단.", status: "통행 가능", isCheckable: false },
      { id: "main-3f-toilet", name: "화장실", col: 8, row: 7, colSpan: 2, rowSpan: 2, height: 1, roomType: 'toilet', accessoryType: 'toilet_both', floor: "3층", building: "본관", features: ["필수 시설"], description: "본관 3층 화장실. 루프가 높아지면 거울에서 이상한 것이 보인다.", status: "평범", isCheckable: true },
    ],
    '2층': [
      { id: "main-201", name: "201호", col: 0, row: 0, colSpan: 2, rowSpan: 3, height: 1, roomType: 'classroom', floor: "2층", building: "본관", features: ["수업"], description: "2학년 1반 교실.", status: "평범 (변화 없음)", isCheckable: true },
      { id: "main-202", name: "202호", col: 2, row: 0, colSpan: 2, rowSpan: 3, height: 1, roomType: 'classroom', floor: "2층", building: "본관", features: ["수업"], description: "2학년 2반 교실.", status: "평범 (변화 없음)", isCheckable: true },
      { id: "main-203", name: "203호", col: 4, row: 0, colSpan: 2, rowSpan: 3, height: 1, roomType: 'classroom', floor: "2층", building: "본관", features: ["수업"], description: "2학년 3반 교실.", status: "평범 (변화 없음)", isCheckable: true },
      { id: "main-204", name: "204호", col: 6, row: 0, colSpan: 2, rowSpan: 3, height: 1, roomType: 'classroom', floor: "2층", building: "본관", features: ["수업"], description: "2학년 4반 교실.", status: "평범 (변화 없음)", isCheckable: true },
      { id: "main-2f-office", name: "본교무실", col: 8, row: 0, colSpan: 3, rowSpan: 3, height: 1, roomType: 'admin', floor: "2층", building: "본관", features: ["정보 획득", "퀘스트 수락"], description: "선생님들의 업무 공간. 묘한 긴장감이 흐른다.", status: "조심스러움", isCheckable: true },
      { id: "main-2f-lang", name: "어학실(외국어실)", col: 8, row: 4, colSpan: 3, rowSpan: 3, height: 1, roomType: 'special', floor: "2층", building: "본관", features: ["어학 학습"], description: "듣기 평가와 회화 수업용 최신 장비 구비.", status: "정숙", isCheckable: true },
      { id: "main-2f-vending", name: "자판기 A", col: 6, row: 4, colSpan: 1, rowSpan: 1, height: 1, roomType: 'store', floor: "2층", building: "본관", features: ["상점", "음료 구매"], description: "본관 2층 학년실 앞에 설치된 음료수 자판기.", status: "평온", isCheckable: true, hasVending: true, storeType: 'vending' },
      { id: "main-2f-stair-l", name: "계단 (서쪽)", col: 0, row: 7, colSpan: 1, rowSpan: 2, height: 1, roomType: 'stair', accessoryType: 'stair_both', floor: "2층", building: "본관", features: ["층간 이동"], description: "본관 서쪽 계단.", status: "통행 가능", isCheckable: false },
      { id: "main-2f-stair-r", name: "계단 (동쪽)", col: 10, row: 7, colSpan: 1, rowSpan: 2, height: 1, roomType: 'stair', accessoryType: 'stair_both', floor: "2층", building: "본관", features: ["층간 이동"], description: "본관 동쪽 계단.", status: "통행 가능", isCheckable: false },
      { id: "main-2f-elevator", name: "엘리베이터", col: 7, row: 7, colSpan: 1, rowSpan: 1, height: 1, roomType: 'elevator', accessoryType: 'elevator', floor: "2층", building: "본관", features: ["층간 이동"], description: "교직원용 엘리베이터.", status: "제한 접근", isCheckable: false },
      { id: "main-2f-toilet", name: "화장실", col: 8, row: 7, colSpan: 2, rowSpan: 2, height: 1, roomType: 'toilet', accessoryType: 'toilet_both', floor: "2층", building: "본관", features: ["필수 시설"], description: "본관 2층 화장실.", status: "평범", isCheckable: true },
      { id: "main-2f-bridge", name: "구름다리 (본관↔별관)", col: 11, row: 3, colSpan: 2, rowSpan: 1, height: 1, roomType: 'bridge', accessoryType: 'bridge_h', connectsTo: '별관', connectsFloor: '2층', floor: "2층", building: "본관", features: ["건물 간 이동"], description: "본관과 별관을 연결하는 실내 구름다리. 높이가 있어 아찔하다.", status: "통행 가능", isCheckable: true },
    ],
    '1층': [
      { id: "main-101", name: "101호", col: 0, row: 0, colSpan: 2, rowSpan: 3, height: 1, roomType: 'classroom', floor: "1층", building: "본관", features: ["수업"], description: "1학년 1반 교실. 신입생들의 풋풋함이 남아있다.", status: "활기참", isCheckable: true },
      { id: "main-102", name: "102호", col: 2, row: 0, colSpan: 2, rowSpan: 3, height: 1, roomType: 'classroom', floor: "1층", building: "본관", features: ["수업"], description: "1학년 2반 교실.", status: "평범 (변화 없음)", isCheckable: true },
      { id: "main-103", name: "103호", col: 4, row: 0, colSpan: 2, rowSpan: 3, height: 1, roomType: 'classroom', floor: "1층", building: "본관", features: ["수업"], description: "1학년 3반 교실.", status: "평범 (변화 없음)", isCheckable: true },
      { id: "main-104", name: "104호", col: 6, row: 0, colSpan: 2, rowSpan: 3, height: 1, roomType: 'classroom', floor: "1층", building: "본관", features: ["수업"], description: "1학년 4반 교실.", status: "평범 (변화 없음)", isCheckable: true },
      { id: "main-105-hidden", name: "105호 (폐쇄)", col: 0, row: 4, colSpan: 2, rowSpan: 3, height: 1, roomType: 'hidden', floor: "1층", building: "본관", features: ["???"], description: "오래전 폐쇄되었던 미지의 공간. 칠판에 알 수 없는 붉은 글씨가 있다.", status: "매우 위험 (스트레스 +50/min)", isCheckable: false, minLoop: 5 },
      { id: "main-1f-admin", name: "행정실 / 교장실", col: 8, row: 0, colSpan: 3, rowSpan: 3, height: 1, roomType: 'admin', floor: "1층", building: "본관", features: ["특수 권한"], description: "학교의 최고 권력기관.", status: "압박감", isCheckable: false },
      { id: "main-1f-health", name: "보건실", col: 8, row: 4, colSpan: 3, rowSpan: 3, height: 1, roomType: 'facility', floor: "1층", building: "본관", features: ["HP 회복", "디버프 해제"], description: "따뜻한 침대와 구급약. 땡땡이 치기 좋은 곳.", status: "안도감 (스테미나 +20/min)", isCheckable: true },
      { id: "main-1f-store", name: "본관 매점 (Hotspot)", col: 4, row: 4, colSpan: 2, rowSpan: 2, height: 1, roomType: 'store', floor: "1층", building: "본관", features: ["상점", "아이템 구매", "NPC 조우"], description: "빵, 우유, 필기구 등을 파는 학교 매점. 가끔 아주머니가 이상한 소문을 들려주기도 한다.", status: "활기참", isCheckable: true, hasStore: true, storeType: 'store' },
      { id: "main-1f-council", name: "학생 자치실", col: 6, row: 4, colSpan: 2, rowSpan: 3, height: 1, roomType: 'special', floor: "1층", building: "본관", features: ["이벤트 진행", "인맥망"], description: "학생회 간부들이 권력을 행사하는 공간.", status: "분주함", isCheckable: true },
      { id: "main-1f-stair-l", name: "계단 (서쪽)", col: 0, row: 7, colSpan: 1, rowSpan: 2, height: 1, roomType: 'stair', accessoryType: 'stair_both', connectsFloor: '2층', floor: "1층", building: "본관", features: ["층간 이동"], description: "본관 서쪽 계단. 모든 층을 연결한다.", status: "통행 가능", isCheckable: false },
      { id: "main-1f-stair-r", name: "계단 (동쪽)", col: 10, row: 7, colSpan: 1, rowSpan: 2, height: 1, roomType: 'stair', accessoryType: 'stair_both', connectsFloor: '2층', floor: "1층", building: "본관", features: ["층간 이동"], description: "본관 동쪽 비상계단. 비상구와 연결된다.", status: "통행 가능", isCheckable: false },
      { id: "main-1f-elevator", name: "엘리베이터", col: 7, row: 7, colSpan: 1, rowSpan: 1, height: 1, roomType: 'elevator', accessoryType: 'elevator', connectsFloor: '전층', floor: "1층", building: "본관", features: ["층간 이동", "특수 권한"], description: "교직원 및 장애인용 엘리베이터. 학생 사용 시 벌점.", status: "제한 접근", isCheckable: false },
      { id: "main-1f-toilet", name: "화장실", col: 8, row: 7, colSpan: 2, rowSpan: 2, height: 1, roomType: 'toilet', accessoryType: 'toilet_both', floor: "1층", building: "본관", features: ["필수 시설"], description: "본관 1층 화장실. 루프가 반복될수록 거울이 이상하게 보이기 시작한다.", status: "평범", isCheckable: true },
      { id: "main-1f-fire-exit", name: "비상구", col: 11, row: 0, colSpan: 1, rowSpan: 3, height: 1, roomType: 'fire_exit', accessoryType: 'fire_exit', floor: "1층", building: "본관", features: ["비상 탈출"], description: "비상 시 탈출구. 열면 경보가 울린다.", status: "잠김", isCheckable: false, minLoop: 3 },
    ]
  },
  '별관': {
    '3층': [
      { id: "annex-3f-broad", name: "방송실 & 편집실", col: 0, row: 0, colSpan: 3, rowSpan: 3, height: 1, roomType: 'special', floor: "3층", building: "별관", features: ["방송 권한", "정보 전파"], description: "학교 방송과 교내망을 통제할 수 있는 핵심 시설.", status: "통제 구역", isCheckable: true },
      { id: "annex-3f-music", name: "음악실", col: 4, row: 0, colSpan: 3, rowSpan: 4, height: 1, roomType: 'special', floor: "3층", building: "별관", features: ["예술 스탯"], description: "방음벽이 설치되어 있지만 가끔 텅 빈 곳에서 피아노 소리가 들린다.", status: "서늘함", isCheckable: true },
      { id: "annex-3f-art", name: "미술실", col: 8, row: 0, colSpan: 3, rowSpan: 4, height: 1, roomType: 'special', floor: "3층", building: "별관", features: ["예술 스탯", "숨겨진 단서"], description: "기괴한 조각상과 물감 냄새가 진동하는 방.", status: "불길함", isCheckable: true },
    ],
    '2층': [
      { id: "annex-2f-media", name: "프리미엄 시청각실", col: 0, row: 0, colSpan: 4, rowSpan: 4, height: 1, roomType: 'facility', floor: "2층", building: "별관", features: ["대형 스크린", "정모 장소"], description: "영화관 같은 시설. 매우 어둡다.", status: "은밀함", isCheckable: true },
      { id: "annex-2f-gym", name: "다목적 강당", col: 5, row: 0, colSpan: 5, rowSpan: 6, height: 2, roomType: 'facility', floor: "2층", building: "별관", features: ["대규모 이벤트", "체력 훈련"], description: "입학식이나 체육 대회가 열리는 넓은 공간.", status: "울림", isCheckable: true },
      { id: "annex-2f-vending", name: "자판기 B (Hotspot)", col: 5, row: 7, colSpan: 1, rowSpan: 1, height: 1, roomType: 'store', floor: "2층", building: "별관", features: ["상점", "기괴한 음료?"], description: "강당 입구 근처에 덩그러니 서 있는 자판기.", status: "평온", isCheckable: true, hasVending: true, storeType: 'vending', minLoop: 1 },
      { id: "annex-2f-stair", name: "계단", col: 5, row: 8, colSpan: 1, rowSpan: 2, height: 1, roomType: 'stair', accessoryType: 'stair_both', floor: "2층", building: "별관", features: ["층간 이동"], description: "별관 계단.", status: "통행 가능", isCheckable: false },
      { id: "annex-2f-bridge", name: "구름다리 (별관↔본관)", col: 0, row: 3, colSpan: 2, rowSpan: 1, height: 1, roomType: 'bridge', accessoryType: 'bridge_h', connectsTo: '본관', connectsFloor: '2층', floor: "2층", building: "별관", features: ["건물 간 이동"], description: "별관에서 본관으로 이어지는 구름다리.", status: "통행 가능", isCheckable: true },
    ],
    '1층': [
      { id: "annex-1f-cafeteria", name: "대급식실", col: 0, row: 0, colSpan: 5, rowSpan: 5, height: 1, roomType: 'facility', floor: "1층", building: "별관", features: ["식사", "체력 회복"], description: "하루의 피로를 씻어주는 식당.", status: "소란스러움 (스테미나 +10)", isCheckable: true },
      { id: "annex-1f-store", name: "무인 매점 라운지", col: 6, row: 0, colSpan: 3, rowSpan: 3, height: 1, roomType: 'store', floor: "1층", building: "별관", features: ["아이템 구매"], description: "24시간 운영되는 무인 자판기와 휴게실.", status: "안전 구역", isCheckable: true, hasStore: true, storeType: 'store' },
      { id: "annex-1f-kitchen", name: "조리실", col: 0, row: 6, colSpan: 4, rowSpan: 3, height: 1, roomType: 'danger', floor: "1층", building: "별관", features: ["칼", "불", "식자재"], description: "관계자 외 출입 금지. 식칼과 뜨거운 오븐이 있다.", status: "접근 제한", isCheckable: false },
      { id: "annex-1f-stair", name: "계단", col: 5, row: 5, colSpan: 1, rowSpan: 2, height: 1, roomType: 'stair', accessoryType: 'stair_both', floor: "1층", building: "별관", features: ["층간 이동"], description: "별관 계단.", status: "통행 가능", isCheckable: false },
      { id: "annex-1f-toilet", name: "화장실", col: 10, row: 3, colSpan: 2, rowSpan: 2, height: 1, roomType: 'toilet', accessoryType: 'toilet_both', floor: "1층", building: "별관", features: ["필수 시설"], description: "별관 1층 화장실.", status: "평범", isCheckable: true },
    ],
    'B1': [
      { id: "pool-b1", name: "지하 실내 수영장", col: 0, row: 0, colSpan: 6, rowSpan: 8, height: 1, roomType: 'danger', floor: "B1", building: "별관", features: ["스테미나 회복", "피지컬 훈련"], description: "25m 4레인의 최신식 수영장. 밤에는 조명이 꺼져 매우 어둡고 물소리가 울려 퍼짐.", status: "오싹함 (스트레스 +10/min)", isCheckable: true },
      { id: "annex-shower", name: "탈의실 & 샤워실", col: 7, row: 0, colSpan: 3, rowSpan: 3, height: 1, roomType: 'facility', floor: "B1", building: "별관", features: ["탈의", "샤워"], description: "수영장용 남녀 탈의실 및 샤워장. 항상 물기가 남아있다.", status: "습함", isCheckable: true },
      { id: "annex-b1-pump", name: "기계실 & 펌프실", col: 7, row: 4, colSpan: 3, rowSpan: 3, height: 1, roomType: 'hidden', floor: "B1", building: "별관", features: ["메인 전원 통제"], description: "건물 전체의 정수 및 전력을 제어하는 심장부.", status: "기계 소음", isCheckable: false, minLoop: 5 },
      { id: "annex-b1-stair", name: "지하 계단", col: 10, row: 4, colSpan: 1, rowSpan: 2, height: 1, roomType: 'stair', accessoryType: 'stair_down', floor: "B1", building: "별관", features: ["층간 이동"], description: "지하로 내려가는 계단. 물기가 있어 미끄럽다.", status: "주의 필요", isCheckable: false },
    ]
  },
  '기숙사': {
    '3층': [
      { id: "dorm-3f-rooms", name: "3층 방 (301~308호)", col: 0, row: 0, colSpan: 8, rowSpan: 3, height: 1, roomType: 'classroom', floor: "3층", building: "기숙사", features: ["취침", "개인 공간"], description: "사생들의 프라이빗 룸.", status: "안락함", isCheckable: true },
      { id: "dorm-3f-lounge", name: "3층 휴게실", col: 0, row: 4, colSpan: 4, rowSpan: 3, height: 1, roomType: 'facility', floor: "3층", building: "기숙사", features: ["소문 교환", "TV 시청"], description: "TV와 냉장고가 있는 휴게 공간.", status: "편안함", isCheckable: true },
      { id: "dorm-3f-shower", name: "3층 공용 샤워장", col: 5, row: 4, colSpan: 3, rowSpan: 3, height: 1, roomType: 'facility', floor: "3층", building: "기숙사", features: ["샤워", "청결"], description: "수증기가 가득 찬 새벽에는 누구와 마주칠지 모른다.", status: "습함", isCheckable: true },
      { id: "dorm-3f-stair", name: "계단", col: 8, row: 4, colSpan: 1, rowSpan: 2, height: 1, roomType: 'stair', accessoryType: 'stair_both', floor: "3층", building: "기숙사", features: ["층간 이동"], description: "기숙사 계단.", status: "통행 가능", isCheckable: false },
      { id: "dorm-3f-toilet", name: "화장실", col: 8, row: 1, colSpan: 2, rowSpan: 2, height: 1, roomType: 'toilet', accessoryType: 'toilet_both', floor: "3층", building: "기숙사", features: ["필수 시설"], description: "기숙사 3층 화장실.", status: "평범", isCheckable: true },
    ],
    '2층': [
      { id: "dorm-2f-rooms", name: "2층 방 (201~208호)", col: 0, row: 0, colSpan: 8, rowSpan: 3, height: 1, roomType: 'classroom', floor: "2층", building: "기숙사", features: ["취침", "개인 공간"], description: "사생들의 방.", status: "안락함", isCheckable: true },
      { id: "dorm-2f-lounge", name: "2층 휴게실", col: 0, row: 4, colSpan: 4, rowSpan: 3, height: 1, roomType: 'facility', floor: "2층", building: "기숙사", features: ["휴식"], description: "TV와 공용 냉장고.", status: "편안함", isCheckable: true },
      { id: "dorm-2f-shower", name: "2층 공용 샤워장", col: 5, row: 4, colSpan: 3, rowSpan: 3, height: 1, roomType: 'facility', floor: "2층", building: "기숙사", features: ["샤워"], description: "샤워장.", status: "습함", isCheckable: true },
      { id: "dorm-2f-stair", name: "계단", col: 8, row: 4, colSpan: 1, rowSpan: 2, height: 1, roomType: 'stair', accessoryType: 'stair_both', floor: "2층", building: "기숙사", features: ["층간 이동"], description: "기숙사 계단.", status: "통행 가능", isCheckable: false },
      { id: "dorm-2f-toilet", name: "화장실", col: 8, row: 1, colSpan: 2, rowSpan: 2, height: 1, roomType: 'toilet', accessoryType: 'toilet_both', floor: "2층", building: "기숙사", features: ["필수 시설"], description: "기숙사 2층 화장실.", status: "평범", isCheckable: true },
    ],
    '1층': [
      { id: "dorm-1f-lobby", name: "1층 로비", col: 0, row: 0, colSpan: 4, rowSpan: 4, height: 1, roomType: 'facility', floor: "1층", building: "기숙사", features: ["통행", "게시판"], description: "기숙사 출입을 위한 로비. 커다란 전면 거울과 공지사항 게시판이 있다.", status: "정숙", isCheckable: true },
      { id: "dorm-1f-admin", name: "사감실", col: 5, row: 0, colSpan: 3, rowSpan: 3, height: 1, roomType: 'admin', floor: "1층", building: "기숙사", features: ["CCTV 감시", "통금 관리"], description: "CCTV 화면이 수십 개 켜져 있는 사감의 본거지.", status: "엄격한 통제", isCheckable: false },
      { id: "dorm-1f-study", name: "대형 자습실 (정독실)", col: 0, row: 5, colSpan: 5, rowSpan: 4, height: 1, roomType: 'facility', floor: "1층", building: "기숙사", features: ["집중 자습", "성적 부스트"], description: "숨소리조차 내기 힘든 억압된 학업 공간.", status: "수면 부족 (스테미나 -15/min)", isCheckable: true },
      { id: "dorm-1f-laundry", name: "세탁실", col: 6, row: 4, colSpan: 2, rowSpan: 2, height: 1, roomType: 'facility', floor: "1층", building: "기숙사", features: ["의류 수리"], description: "수많은 세탁기가 밤낮없이 돌아간다.", status: "시끄러움", isCheckable: true },
      { id: "dorm-1f-vending", name: "자판기 C", col: 6, row: 7, colSpan: 1, rowSpan: 1, height: 1, roomType: 'store', floor: "1층", building: "기숙사", features: ["상점"], description: "새벽에 몰래 음료수를 뽑아 먹을 수 있는 기숙사 휴게실 앞 자판기.", status: "평온", isCheckable: true, hasVending: true, storeType: 'vending' },
      { id: "dorm-1f-stair", name: "계단", col: 8, row: 8, colSpan: 1, rowSpan: 2, height: 1, roomType: 'stair', accessoryType: 'stair_both', floor: "1층", building: "기숙사", features: ["층간 이동"], description: "기숙사 계단.", status: "통행 가능", isCheckable: false },
      { id: "dorm-1f-elevator", name: "기숙사 엘리베이터", col: 5, row: 4, colSpan: 1, rowSpan: 1, height: 1, roomType: 'elevator', accessoryType: 'elevator', floor: "1층", building: "기숙사", features: ["층간 이동"], description: "기숙사 전용 엘리베이터.", status: "통행 가능", isCheckable: false },
    ]
  }
};

export const ALL_MAP_AREAS: IsoMapArea[] = Object.values(MAP_DATA)
  .flatMap(building => Object.values(building).flat());
