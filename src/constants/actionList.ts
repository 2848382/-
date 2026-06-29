import { InteractionAction } from '../types';

export const ACTIONS: InteractionAction[] = [
  // Phase 1: Daily Life (Loop 0-2)
  {
    id: 'greet',
    label: '인사하기',
    loopLevel: 0,
    effect: {
      self: { stress: -1 },
      target: { bonding: 1 }
    },
    message: '친구가 밝게 웃으며 인사를 받아줍니다.'
  },
  {
    id: 'praise',
    label: '칭찬하기',
    loopLevel: 1,
    effect: {
      self: { stress: -1 },
      target: { bonding: 3, stress: -2 }
    },
    message: '진심 어린 칭찬에 상대방의 표정이 밝아집니다.'
  },
  {
    id: 'buy_snack',
    label: '매점 사주기',
    loopLevel: 0,
    cost: { balance: 500 },
    effect: {
      self: { bonding: 2 },
      target: { bonding: 5, stress: -5 }
    },
    message: '맛있는 간식과 함께 유대감이 쌓입니다.'
  },
  {
    id: 'copy_homework',
    label: '숙제 베끼기',
    loopLevel: 0,
    effect: {
      self: { academicAchievement: -2, rebellion: 1 },
      target: { bonding: 2 }
    },
    message: '친구의 숙제 노트를 빌려 아슬아슬하게 세이프.'
  },
  {
    id: 'help_perf',
    label: '수행평가 돕기',
    loopLevel: 0,
    cost: { stamina: 10 },
    effect: {
      self: { stress: 5, academicAchievement: 3 },
      target: { bonding: 5, academicAchievement: 3 }
    },
    message: '서로 도와가며 수행평가를 성공적으로 마칩니다.'
  },
  {
    id: 'lend_note',
    label: '노트 빌려주기',
    loopLevel: 0,
    effect: {
      self: { academicAchievement: 1 },
      target: { bonding: 3, academicAchievement: 1 }
    },
    message: '정성스런 필기 노트를 건네주었습니다.'
  },
  {
    id: 'lunch',
    label: '급식 같이먹기',
    loopLevel: 0,
    effect: {
      self: { stress: -2 },
      target: { bonding: 2, stress: -2 }
    },
    message: '오늘 급식은 꽤 괜찮은 것 같습니다.'
  },
  {
    id: 'three_leg',
    label: '2인3각 팀맺기',
    loopLevel: 1,
    cost: { stamina: 15 },
    effect: {
      self: { physical: 2 },
      target: { bonding: 3, physical: 2 }
    },
    message: '하나 둘, 하나 둘! 발이 딱딱 맞네요.'
  },
  {
    id: 'drink_bet',
    label: '음료수 내기',
    loopLevel: 1,
    effect: {
      self: { stress: -5 },
      target: { bonding: 2 }
    },
    message: '가위바위보! 공짜 음료수는 역시 최고입니다.'
  },
  {
    id: 'gossip',
    label: '뒷담화 동조',
    loopLevel: 1,
    effect: {
      self: { rebellion: 2 },
      target: { bonding: 5 }
    },
    message: '누군가의 험담을 나누며 기묘한 동질감을 느낍니다.'
  },
  {
    id: 'romance_advice',
    label: '연애상담',
    loopLevel: 1,
    effect: {
      self: { stress: 2 },
      target: { bonding: 5, stress: 2 }
    },
    message: '풋풋하고 간지러운 눈밑 떨리는 고민들.'
  },
  {
    id: 'fan_share',
    label: '덕질 공유',
    loopLevel: 1,
    effect: {
      self: { stress: -10 },
      target: { bonding: 10, stress: -10 }
    },
    message: '좋아하는 것에 대해 떠드는 시간은 언제나 짧습니다.'
  },
  {
    id: 'study_tip',
    label: '공부비법 전수',
    loopLevel: 1,
    effect: {
      self: { academicAchievement: -1 },
      target: { bonding: 2, academicAchievement: 5 }
    },
    message: '핵심만 쏙쏙 골라낸 비법 노하우를 전달했습니다.'
  },
  {
    id: 'selfie',
    label: '셀카 찍기',
    loopLevel: 2,
    effect: {
      self: { stress: -1 },
      target: { bonding: 3 }
    },
    message: '포털 프로필에 올릴 멋진 사진을 남겼습니다.'
  },
  {
    id: 'light_prank',
    label: '가벼운 장난',
    loopLevel: 2,
    effect: {
      self: { bonding: 1 },
      target: { stress: 1 }
    },
    message: '뒤에서 "어흥!" 깜짝 놀란 표정이 재밌네요.'
  },
  {
    id: 'conv_store',
    label: '편의점 동행',
    loopLevel: 2,
    cost: { balance: 1000 },
    effect: {
      self: { stress: -2 },
      target: { bonding: 2 }
    },
    message: '학교 근처 편의점까지의 짧은 산책.'
  },
  {
    id: 'ask_problem',
    label: '모르는문제 질문',
    loopLevel: 2,
    effect: {
      self: { academicAchievement: 1 },
      target: { bonding: 2, academicAchievement: 1 }
    },
    message: '친구가 친절하게 문제 풀이를 도와줍니다.'
  },
  {
    id: 'shoulder_rub',
    label: '어깨 주무르기',
    loopLevel: 2,
    cost: { stamina: 5 },
    effect: {
      self: { physical: 1 },
      target: { bonding: 2, stress: -2 }
    },
    message: '피로가 싹 가시는 손맛입니다.'
  },
  {
    id: 'borrow_pen',
    label: '필기구 빌리기',
    loopLevel: 2,
    effect: {
      self: { academicAchievement: 1 },
      target: { bonding: 1 }
    },
    message: '고마워, 덕분에 수업을 들을 수 있겠어.'
  },
  {
    id: 'go_home',
    label: '함께 하교',
    loopLevel: 2,
    effect: {
      self: { stress: -5 },
      target: { bonding: 5, stress: -5 }
    },
    message: '노을 지는 교문 밖을 함께 걸어 나옵니다.'
  },
  {
    id: 'take_penalty',
    label: '벌점 대신받기',
    loopLevel: 2,
    effect: {
      self: { stress: 20 },
      target: { bonding: 50 }
    },
    message: '희생을 통해 깨지지 않을 신뢰를 얻었습니다.'
  },

  // Phase 2: Suspicion (Loop 3-5)
  {
    id: 'threaten',
    label: '협박하기',
    loopLevel: 3,
    effect: {
      self: { rebellion: 5 },
      target: { stress: 15, bonding: -10 }
    },
    message: '날카로운 말로 상대를 압박합니다.'
  },
  {
    id: 'extract_info',
    label: '정보 캐내기',
    loopLevel: 3,
    effect: {
      self: { rebellion: 2 },
      target: { stress: 5, bonding: -2 }
    },
    message: '교묘한 질문으로 감춰진 비밀을 유도합니다.'
  },
  {
    id: 'secret_note',
    label: '비밀쪽지 전달',
    loopLevel: 3,
    effect: {
      self: { rebellion: 5 },
      target: { bonding: 5, rebellion: 5 }
    },
    message: '선생님 몰래 건네는 은밀한 대화.'
  },
  {
    id: 'teacher_loc',
    label: '선생님 위치공유',
    loopLevel: 3,
    effect: {
      self: { rebellion: 5 },
      target: { bonding: 3, rebellion: 5 }
    },
    message: '"사감 떴어, 피해!"'
  },
  {
    id: 'club_room',
    label: '동아리실 잠입',
    loopLevel: 4,
    cost: { stamina: 20 },
    effect: {
      self: { rebellion: 10, stress: 5 },
      target: { bonding: 5, rebellion: 10, stress: 5 }
    },
    message: '아무도 없는 어두운 동아리실에서 단서를 찾습니다.'
  },
  {
    id: 'cctv_blind',
    label: 'CCTV 사각공유',
    loopLevel: 4,
    effect: {
      self: { rebellion: 10 },
      target: { bonding: 5, rebellion: 10 }
    },
    message: '학교의 눈을 피하는 안전지대를 공유했습니다.'
  },
  {
    id: 'strange_rumor',
    label: '이상한 소문묻기',
    loopLevel: 4,
    effect: {
      self: { stress: 5 },
      target: { stress: 5 }
    },
    message: '"너도 들었어? 밤마다 들린다는 그 소리..."'
  },
  {
    id: 'night_school',
    label: '밤의 학교초대',
    loopLevel: 5,
    cost: { stamina: 30 },
    effect: {
      self: { rebellion: 15, stress: 10 },
      target: { bonding: 10, rebellion: 15, stress: 10 }
    },
    message: '달빛만이 비치는 교실, 우리 뿐인 공간.'
  },
  {
    id: 'copy_id',
    label: '학생증 복사',
    loopLevel: 5,
    cost: { balance: 5000 },
    effect: {
      self: { rebellion: 20 },
      target: { bonding: -5 }
    },
    message: '시스템의 허점을 찌르는 금지된 행위.'
  },
  {
    id: 'teacher_bad',
    label: '선생님 험담',
    loopLevel: 5,
    effect: {
      self: { rebellion: 10 },
      target: { bonding: 5, rebellion: 10 }
    },
    message: '관리자들에 대한 강한 불신과 반항심.'
  },
  {
    id: 'joint_invest',
    label: '구역 공동조사',
    loopLevel: 5,
    cost: { stamina: 25 },
    effect: {
      self: { stress: 10 },
      target: { bonding: 5, stress: 10 }
    },
    message: '학교의 숨겨진 장소에서 기괴한 것을 목격합니다.'
  },
  {
    id: 'stat_reveal',
    label: '스탯 비교하기',
    loopLevel: 5,
    effect: {
      self: { stress: 5 },
      target: { stress: 2 }
    },
    message: '서로의 능력치와 비밀이 투명하게 드러납니다.'
  },

  // Phase 3: The Hidden Side (Loop 6+)
  {
    id: 'hidden_flaw',
    label: '약점 언급',
    loopLevel: 6,
    effect: {
      self: { bonding: -20 },
      target: { stress: 30, bonding: -50 }
    },
    message: '가장 아픈 상처를 후벼 팝니다.'
  },
  {
    id: 'mouth_shut',
    label: '강제로 입 막기',
    loopLevel: 6,
    effect: {
      self: { physical: 10 },
      target: { stress: 20, bonding: -100 }
    },
    message: '비명이 새어 나가지 못하도록 거칠게 제압합니다.'
  },
  {
    id: 'remind_loop',
    label: '감춰진 기억 일깨우기',
    loopLevel: 7,
    effect: {
      self: { loops: 1 },
      target: { stress: 100 }
    },
    message: '반복되는 죽음과 절망의 기억이 쏟아져 들어옵니다.'
  },
  {
    id: 'force_logout',
    label: '강제 시스템 로그아웃 시도',
    loopLevel: 7,
    effect: {
      self: { rebellion: 100 },
      target: { stress: 50, memoryPoints: -100 }
    },
    message: '포털에서 존재를 지우려는 위험한 시도.'
  },
  {
    id: 'throw_bait',
    label: '상대를 미끼로 던지기',
    loopLevel: 8,
    effect: {
      self: { physical: 20 },
      target: { bonding: -500, stress: 100 }
    },
    message: '나만 살면 돼. 어둠 속으로 친구를 밀어넣습니다.'
  },
  {
    id: 'mirror_push',
    label: '거울 세계로 밀기',
    loopLevel: 8,
    effect: {
      self: { bonding: -100 },
      target: { stress: 80, trauma: 50 }
    },
    message: '현실의 너는 이제 필요 없어.'
  },
  {
    id: 'share_hallu',
    label: '기괴한 환각 공유',
    loopLevel: 8,
    effect: {
      self: { stress: 40, loops: 1 },
      target: { stress: 40, loops: 1 }
    },
    message: '뒤틀린 공간의 공포를 함께 체험합니다.'
  },
  {
    id: 'hack_acc',
    label: '포털 계정 해킹',
    loopLevel: 9,
    effect: {
      self: { balance: 10000, rebellion: 50 },
      target: { balance: -10000, stress: 30 }
    },
    message: '모든 개인정보와 자산을 강탈했습니다.'
  },
  {
    id: 'blood_note',
    label: '피로 쓴 쪽지 건네기',
    loopLevel: 9,
    effect: {
      self: { stress: 10 },
      target: { stress: 50 }
    },
    message: '...살...려...줘...'
  },
  {
    id: 'erase_exist',
    label: '존재 지우기',
    loopLevel: 9,
    effect: {
      self: { rebellion: 100 },
      target: { bonding: -1000, stress: 200 }
    },
    message: '[시스템 오류] 대상의 데이터가 소멸 중입니다.'
  },

  // Master/Special Actions
  {
    id: 'purify_hug',
    label: '정화의 포옹',
    loopLevel: 3,
    isSpecial: true,
    effect: {
      self: { stress: -20, loops: -1 },
      target: { stress: -50, loops: -1 }
    },
    message: '따스한 온기가 절망을 씻어냅니다.'
  },
  {
    id: 'final_escape',
    label: '함께 탈출 시도',
    loopLevel: 9,
    isSpecial: true,
    effect: {
      self: { stress: 100, bonding: 100 },
      target: { stress: 100, bonding: 100 }
    },
    message: '이곳을 벗어나면, 우리는 정말 우리가 될 수 있을까?'
  },
  {
    id: 'erase_record',
    label: '기록 말소',
    loopLevel: 5,
    isSpecial: true,
    effect: {
      self: { rebellion: 10 },
      target: { academicAchievement: -100, penaltyPoints: -100 }
    },
    message: '모든 학업 기록과 벌점이 깨끗이 지워졌습니다.'
  },
  {
    id: 'demand_submit',
    label: '절대적 복종 요구',
    loopLevel: 7,
    isSpecial: true,
    effect: {
      self: { rebellion: 30 },
      target: { bonding: 200, academicAchievement: -50 }
    },
    message: '너는 이제 나의 소유물이야.'
  },
  {
    id: 'inject_code',
    label: '시스템 코드 주입',
    loopLevel: 6,
    isSpecial: true,
    effect: {
      self: { rebellion: 20 },
      target: { stress: 20, physical: 20 }
    },
    message: '데이터가 뒤틀리며 무작위 변환이 일어납니다.'
  },
  {
    id: 'sacrifice_self',
    label: '희생 자처하기',
    loopLevel: 8,
    isSpecial: true,
    effect: {
      self: { stress: 200, stamina: -100 },
      target: { stress: -100, bonding: 500 }
    },
    message: '나를 잊지 마. 그거면 충분해.'
  },
  {
    id: 'forbid_song',
    label: '금지된 노래 부르기',
    loopLevel: 6,
    isSpecial: true,
    effect: {
      self: { rebellion: 30 },
      target: { stress: 50 }
    },
    message: '뇌를 긁는 듯한 기괴한 성미가 울려 퍼집니다.'
  },
  {
    id: 'cover_cctv',
    label: 'CCTV 눈 가리기',
    loopLevel: 4,
    isSpecial: true,
    effect: {
      self: { rebellion: 30 },
      target: { bonding: 10 }
    },
    message: '잠시뿐이지만, 관리자의 눈에서 자유로워집니다.'
  },
  {
    id: 'fake_whisper',
    label: '사감 선생님 사칭 위스퍼',
    loopLevel: 5,
    isSpecial: true,
    effect: {
      self: { rebellion: 20 },
      target: { rebellion: -20, stress: 10 }
    },
    message: '지배력의 도구로 권위를 이용합니다.'
  },
  {
    id: 'truth_door',
    label: '진실의 문 열기',
    loopLevel: 9,
    isSpecial: true,
    effect: {
      self: { loops: 9 },
      target: { loops: 9 }
    },
    message: '드디어 마지막이군요. 축하합니다.'
  }
];
