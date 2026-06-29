import { useState, useEffect, useCallback } from 'react';
import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, app } from '../lib/firebase';
import { useGame } from '../contexts/GameContext';

// 알림 타입별 메시지 템플릿
export type NotificationType =
  | 'reward_approved'    // 보상 승인
  | 'reward_rejected'    // 보상 거절
  | 'mission_unlocked'   // 개인 미션 공개
  | 'loop_end'           // 루프 종료
  | 'stress_warning'     // 스트레스 경고
  | 'system_alert'       // 마스터 긴급 알림
  | 'relationship_new';  // 새 관계 신청

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

// 알림 타입별 iOS 최적화 텍스트 템플릿
export const NOTIFICATION_TEMPLATES: Record<NotificationType, { title: string; body: (name?: string) => string }> = {
  reward_approved:   { title: '명원고등학교', body: (name) => `${name ? name + '님의 ' : ''}보상 신청이 승인되었습니다. ✓` },
  reward_rejected:   { title: '명원고등학교', body: (name) => `${name ? name + '님의 ' : ''}보상 신청이 반려되었습니다.` },
  mission_unlocked:  { title: '명원고등학교', body: () => '새로운 특별 과제가 등록되었습니다. 확인하세요.' },
  loop_end:          { title: '명원고등학교', body: () => '학기가 종료됩니다. 앱을 확인해주세요.' },
  stress_warning:    { title: '명원고등학교 — 주의', body: () => '스트레스 수치가 위험 수준에 도달했습니다.' },
  system_alert:      { title: '명원고등학교 — 긴급', body: (msg) => msg || '시스템 긴급 알림이 있습니다.' },
  relationship_new:  { title: '명원고등학교', body: (name) => `${name || '누군가'}이(가) 관계 신청을 보냈습니다.` },
};

export const usePushNotification = () => {
  const { user } = useGame();
  const [token, setToken]           = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isIOS, setIsIOS]           = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // iOS 감지
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsIOS(ios);
    setIsStandalone(standalone);

    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      if (!('Notification' in window)) return;

      // iOS Safari (비PWA)에서는 알림 불가
      if (isIOS && !isStandalone) {
        console.warn('[Push] iOS에서는 홈 화면에 추가 후 알림 가능');
        return;
      }

      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === 'granted' && user) {
        try {
          const messaging = getMessaging(app);
          const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BHruqVK0B-Bm4tuZAfPz2hY4yG0C26idqfmfrgXuwdXKfck_R86O1mHfZrUMMhoc7spLGFWb0v0SZRLCTUdMy6M';

          if (!vapidKey) {
            console.warn('[Push] VAPID 키가 설정되지 않았습니다. .env에 VITE_FIREBASE_VAPID_KEY를 추가하세요.');
            return;
          }

          const currentToken = await getToken(messaging, { vapidKey });

          if (currentToken) {
            setToken(currentToken);
            await updateDoc(doc(db, 'users', user.uid), {
              fcmToken: currentToken,
              fcmUpdatedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          console.error('[Push] 토큰 발급 실패:', err);
        }
      }
    } catch (error) {
      console.error('[Push] 권한 요청 실패:', error);
    }
  }, [user, isIOS, isStandalone]);

  // 포그라운드 메시지 수신
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const messaging = getMessaging(app);
      const unsubscribe = onMessage(messaging, (payload: MessagePayload) => {
        // 포그라운드에서 수신 시 앱 내 토스트로 표시
        // (백그라운드는 Service Worker가 처리)
        const title = payload.notification?.title || '명원고등학교';
        const body  = payload.notification?.body  || '';

        // 커스텀 이벤트 발행 → ToastProvider에서 수신
        window.dispatchEvent(new CustomEvent('fcm-message', {
          detail: { title, body, data: payload.data }
        }));
      });
      return () => unsubscribe();
    } catch {
      // FCM 미지원 환경 (Safari 비PWA 등) 조용히 무시
    }
  }, []);

  return {
    token,
    permission,
    isIOS,
    isStandalone,
    canReceiveNotifications: !isIOS || isStandalone,
    requestPermission,
  };
};
