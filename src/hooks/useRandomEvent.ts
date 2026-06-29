import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useGame } from '../contexts/GameContext';

const RANDOM_EVENTS = [
  { 
    text: "복도 끝에서 정체불명의 발소리가 들려옵니다.", 
    masked: "복도 끝에서 기이한 소리가 들렸습니다.", 
    threat: "low" 
  },
  { 
    text: "CCTV의 붉은 불빛이 당신을 집요하게 따라오는 것 같습니다.", 
    masked: "감시 구역에 진입했습니다.", 
    threat: "medium" 
  },
  { 
    text: "교실 창문에 비친 당신의 그림자가 잠시 따로 움직인 것 같습니다.", 
    masked: "창문에 기묘한 형상이 비쳤습니다.", 
    threat: "medium" 
  },
  { 
    text: "사물함 안에서 누군가 똑똑, 하고 노크를 합니다.", 
    masked: "사물함에서 소음이 발생했습니다.", 
    threat: "high" 
  },
  { 
    text: "주머니 속에 없던 검은 종이 조각이 들어있습니다.", 
    masked: "알 수 없는 물건을 발견했습니다.", 
    threat: "low" 
  },
  { 
    text: "먼 곳에서 비명 소리가 들린 것 같지만, 주변은 고요합니다.", 
    masked: "환청이 들린 것 같습니다.", 
    threat: "medium" 
  }
];

export const useRandomEvent = () => {
  const { user, profile, systemConfig } = useGame();
  const [isRolling, setIsRolling] = useState(false);

  const rollRandomEvent = async () => {
    if (!user || !profile || isRolling) return null;
    
    setIsRolling(true);
    
    // 30% chance to actually trigger an event notice
    const hit = Math.random() < 0.4;
    
    if (hit) {
      const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
      
      try {
        await addDoc(collection(db, 'event_logs'), {
          uid: user.uid,
          type: 'random_event',
          description: event.text,
          descriptionMasked: event.masked,
          threatLevel: event.threat,
          loopIndex: systemConfig?.currentLoop || 1,
          createdAt: serverTimestamp()
        });

        // Trigger a global notification via toast (using the existing master_jump/app-toast dispatch pattern)
        window.dispatchEvent(new CustomEvent('app-toast', { 
           detail: { 
             message: `[기묘한 현상] ${event.masked}`, 
             type: 'warning' 
           } 
        }));

        setIsRolling(false);
        return event;
      } catch (err) {
        console.error("Failed to record random event:", err);
      }
    }

    setIsRolling(false);
    return null;
  };

  return { rollRandomEvent, isRolling };
};
