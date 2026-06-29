// Firebase Messaging Service Worker
// iOS PWA에서 백그라운드 알림 처리

importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

// Firebase 설정 — 환경변수를 SW에서 직접 쓸 수 없으므로 하드코딩 필요
// 배포 시 실제 값으로 교체
firebase.initializeApp({
  apiKey:            "AIzaSyCBvQDz6eBJWInUsbA252oTuoFj0c59auk",
  authDomain:        "gen-lang-client-0589233561.firebaseapp.com",
  projectId:         "gen-lang-client-0589233561",
  storageBucket:     "gen-lang-client-0589233561.firebasestorage.app",
  messagingSenderId: "723915680100",
  appId:             "1:723915680100:web:a0fafce1f9e1180e797271",
});

const messaging = firebase.messaging();

// 백그라운드 메시지 수신
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const data = payload.data || {};

  // iOS 기준 최적화 — 텍스트만, 이미지/액션 없음
  const options = {
    body:    body || '명원고등학교 포털 알림',
    icon:    '/icon-192.svg',
    badge:   '/badge-72.svg',   // 상단 상태바 흑백 아이콘 (iOS)
    tag:     data.type || 'default',  // 같은 tag면 덮어씀 (중복 방지)
    silent:  false,
    data:    data,
    // Android만 지원 (iOS는 무시됨)
    // actions: [...],
    // image: '...',
  };

  self.registration.showNotification(
    title || '명원고등학교',
    options
  );
});

// 알림 클릭 시 앱 열기 + 해당 뷰로 이동
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const view = event.notification.data?.view || 'home';
  const url  = `/?view=${view}`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열려있는 앱 탭이 있으면 포커스
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', view });
          return;
        }
      }
      // 없으면 새 탭 열기
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
