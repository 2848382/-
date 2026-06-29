export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface InteractionAction {
  id: string;
  label: string;
  loopLevel: number;
  cost?: {
    balance?: number;
    stamina?: number;
    stress?: number;
  };
  effect: {
    self: {
      academicAchievement?: number;
      stamina?: number;
      balance?: number;
      trauma?: number;
      bonding?: number;
      rebellion?: number;
      physical?: number;
      stress?: number;
      loops?: number;
      penaltyPoints?: number;
      memoryPoints?: number;
    };
    target: {
      academicAchievement?: number;
      stamina?: number;
      balance?: number;
      trauma?: number;
      bonding?: number;
      rebellion?: number;
      physical?: number;
      stress?: number;
      loops?: number;
      penaltyPoints?: number;
      memoryPoints?: number;
    };
  };
  message: string;
  isSpecial?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  studentId: string;
  academicAchievement: number;
  attendanceDays: number;
  memoryPoints: number;
  stamina: number;
  balance: number;
  trauma: number;
  loops: number;
  // TRPG Status
  bonding: number;
  rebellion: number;
  physical: number;
  stress: number;
  // User Configuration
  bio?: string;
  statsEditCount?: number;
  isLegacyUser?: boolean;
  favoriteApps?: string[];
  canEditStats?: boolean;
  // Student Input
  mbti?: string;
  dormRoom?: string;
  characteristics?: string;
  hiddenFlaw?: string;
  rivalId?: string;
  isMissing?: boolean;
  isBanned?: boolean;
  isCardFrozen?: boolean;
  completedQuests?: string[];
  lastActive?: any;
  inventory: string[];
  badges: string[];
  penaltyPoints: number;
  lastCheckIn?: {
    locationId: string;
    at: any;
  };
  checkInHistory?: {
    locationId: string;
    locationName: string;
    loopIndex: number;
    at: any;
  }[];
  secureCode: string;
  photoURL?: string;
  role?: 'student' | 'teacher' | 'admin';
  isAdmin?: boolean;
  emailVerified: boolean;
  fcmToken?: string;
  
  // 신규 마스터 통제용 필드
  activeView?: string; // 실시간 활동 모니터링
  isStatsMasked?: boolean; // 스탯 마스킹 블라인드 모드
  blockedMenus?: string[]; // 메뉴 봉쇄
  uiTextOverrides?: Record<string, string>; // UI 텍스트 변조 (key: 원본텍스트, value: 변조텍스트)

  // [신규: 입학 승인제 및 가상현실 마스킹 및 투표 오버라이드]
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedAt?: any;
  approvedBy?: string;
  hasAwakened?: boolean;
  voteDisplayOverride?: number;

  createdAt: any;
  updatedAt: any;
}

export interface MasterCommand {
  id?: string;
  type: 'jump' | 'sound' | 'toast' | 'intercept';
  targetUid?: string | 'ALL';
  payload: any;
  createdAt: any;
  executed?: boolean;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'spend' | 'receive' | 'transfer' | 'eerie';
  toFrom: string;
  memo: string;
  balanceAfter?: number;
  isGlitch?: boolean;
  createdAt: any;
}

export interface Bond {
  id: string;
  fromUid: string;
  toUid: string;
  trust: number;
  hatred: number;
  obsession: number;
  pity: number;
  lastAction?: string;
  updatedAt: any;
}

export interface Vote {
  id: string;
  voterId: string;
  targetId: string;
  loopIndex: number;
  type: 'sacrifice' | 'bystander';
  createdAt: any;
}

export interface Whisper {
  id: string;
  authorId?: string;
  content: string;
  isDistorted: boolean;
  type: 'system' | 'anonymous' | 'direct';
  createdAt: any;
}

export interface Clue {
  id: string;
  name: string;
  category: 'document' | 'item' | 'record';
  description: string;
  isCustom?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  isEdited?: boolean;
  reactions?: Record<string, string[]>; // emoji: [userIds]
  createdAt: any;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage?: string;
  updatedAt: any;
}

export interface GameState {
  academicAchievement: number;
  attendanceDays: number;
  stamina: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  rewardWon: number;
  rewardStamina: number;
  createdAt: any;
  isActive: boolean;
}

export interface BotConfig {
  id: string;
  keyword: string;
  reply: string;
  createdAt: any;
}

export interface RumorReservation {
  id: string;
  loopLevel: number;
  content: string;
  isPublished: boolean;
  createdAt: any;
}

export interface SystemConfig {
  bloodMode: boolean;
  glitchIntensity: number;
  currentLoop: number;
  radioFrequency: number;
  isShutdown: boolean;
  activeAlert: string | null;
  logs: string[];
  
  // [신규: 시스템 모드 필드]
  confessionOpen?: boolean;
  manittoEnabled?: boolean;
  manittoRevealed?: boolean;
  interrogationRoomId?: string;
  endingMode?: 'A' | 'B' | 'C' | null;
  atmosphere?: string;
  timePhase?: string;
}

// [신규: 추가 시스템 타입 정의]
export type RelationshipType =
  | 'pair'          // 짝꿍
  | 'rival'         // 라이벌
  | 'guard'         // 보호자-피보호자
  | 'accomplice'    // 공범
  | 'debt'          // 채무 관계
  | 'informant'     // 정보 거래
  | 'echo'          // 공동 기억
  | 'scapegoat'     // 희생양 계약
  | 'watcher'       // 감시자
  | 'mirror'        // 거울
  | 'benefactor'    // 은인-수혜자
  | 'paranoia'      // 편집증
  | 'pact'          // 동반 자살 계약
  | 'mentor'        // 선생-학생
  | 'nemesis'       // 적대
  | 'trauma_bond'   // 공유 트라우마
  | 'broker'        // 거래 중개인
  | 'curse';        // 저주

export interface RelationshipConfig {
  type: RelationshipType;
  label: string;
  labelMasked: string;
  description: string;
  merit: string;
  demerit: string;
  isSecret: boolean;
  isMasterOnly: boolean;
  canInitiatorBreak: boolean;
  canTargetBreak: boolean;
}

export type Visibility = 'gm_only' | 'private' | 'participants' | 'public' | 'revealed';

export interface RevealCondition {
  type: 'manual' | 'loop' | 'time' | 'player_status' | 'location_discovered';
  value: string | number;
}

export interface ActivityLog {
  id: string;
  actorUid: string;
  actorName?: string;
  actionType: string;
  targetType?: string;
  targetId?: string;
  severity: 'info' | 'warning' | 'danger';
  message: string;
  createdAt: any;
}

export interface Relationship {
  id: string;
  type: RelationshipType;
  initiatorUid: string;
  targetUid: string;
  participants?: string[];
  isSecret: boolean;
  isMasterOnly: boolean;
  visibility?: Visibility;
  revealCondition?: RevealCondition;
  isRevealed?: boolean;
  revealedAt?: any;
  status: 'pending' | 'active' | 'broken';
  metadata?: Record<string, unknown>;
  createdAt: any;
  updatedAt: any;
}

export interface RewardRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  type: 'stat' | 'item';
  statChanges?: {
    academic?: number;
    physical?: number;
    bonding?: number;
    rebellion?: number;
    stress?: number;
    stamina?: number;
    balance?: number;
    trauma?: number;
  };
  itemName?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  resolvedAt?: any;
}

export interface EventLog {
  id: string;
  uid: string;
  type: 'stat_change' | 'item_get' | 'relation_change' | 'vote' | 'quest' | 'action' | 'random_event' | 'custom';
  description: string;
  descriptionMasked: string;
  statSnapshot?: Partial<UserProfile>;
  loopIndex: number;
  createdAt: any;
}

export interface ClueNode {
  id: string;
  ownerUid: string;
  title: string;
  content: string;
  category: 'person' | 'place' | 'event' | 'item' | 'unknown';
  connections: string[];
  posX: number;
  posY: number;
  color?: string;
  placeId?: string;
  createdAt: any;
}

export interface PrivateMission {
  id: string;
  targetUid: string;
  title: string;
  description: string;
  reward?: { balance?: number; stamina?: number; memoryPoints?: number };
  isCompleted: boolean;
  isVisible: boolean;
  visibility?: Visibility;
  revealCondition?: RevealCondition;
  isRevealed?: boolean;
  revealedAt?: any;
  createdAt: any;
}

export interface AnonymousTip {
  id: string;
  senderUid: string;
  recipientUid: string;
  content: string;
  isRead: boolean;
  visibility?: Visibility;
  revealCondition?: RevealCondition;
  isRevealed?: boolean;
  revealedAt?: any;
  createdAt: any;
}

export interface DualContract {
  id: string;
  playerAUid: string;
  playerBUid: string;
  missionA: string;
  missionB: string;
  rewardA?: { balance?: number; stamina?: number };
  rewardB?: { balance?: number; stamina?: number };
  status: 'active' | 'resolved';
  visibility?: Visibility;
  revealCondition?: RevealCondition;
  isRevealed?: boolean;
  revealedAt?: any;
  createdAt: any;
}

export interface ScriptAction {
  type: 'send_message'
       | 'stat_change'
       | 'publish_notice'
       | 'issue_command'
       | 'unlock_mission'
       | 'custom_alert';
  targetUid?: string;
  payload: Record<string, unknown>;
  delaySeconds?: number;
}

export interface Will {
  id: string;
  authorUid: string;
  content: string;
  deliverTo: 'all' | string;
  deliverAtLoop: number;
  isDelivered: boolean;
  createdAt: any;
}

export interface Letter {
  id: string;
  senderUid: string;
  recipientUid: string;
  content: string;
  deliverAt: any;
  isDelivered: boolean;
  isRead: boolean;
  visibility?: Visibility;
  revealCondition?: RevealCondition;
  isRevealed?: boolean;
  revealedAt?: any;
  createdAt: any;
}

export interface ScenarioScript {
  id: string;
  title: string;
  loopIndex: number;
  dayLabel: string;
  actions: ScriptAction[];
  isExecuted: boolean;
  scheduledAt?: any;
  createdAt: any;
}

export interface InterrogationSession {
  id: string;
  roomId: string;
  isActive: boolean;
  deletedDrafts: {
    uid: string;
    text: string;
    deletedAt: any;
  }[];
  activatedBy: string;
  createdAt: any;
}

export interface Confession {
  id: string;
  authorUid: string;
  content: string;
  isAnonymous: true;
  loopIndex: number;
  stressReduction: number;
  createdAt: any;
}
