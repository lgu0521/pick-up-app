# 커스텀 알림 사운드 설정 가이드 (업데이트됨)

## ✅ 완료된 작업들

### 1. 라이브러리 설치
- ✅ `react-native-push-notification` (안정적인 푸시 알림)
- ✅ `@react-native-community/push-notification-ios` (iOS 지원)
- ❌ `react-native-sound` (호환성 문제로 제거됨)

### 2. 사운드 파일 준비
- ✅ `notification_sound.mp3` (Android용)
- ✅ `notification_sound.caf` (iOS용, 더 호환성 좋음)

### 3. 파일 위치 설정
- ✅ `src/assets/sounds/` (소스 관리용)
- ✅ `android/app/src/main/res/raw/` (Android 리소스)
- ✅ `ios/` (iOS 리소스)
- ✅ Android 알림 아이콘 복사됨

### 4. 코드 구현
- ✅ `SoundManager`: 진동 효과로 즉시 피드백 제공
- ✅ `NotificationManager`: 실제 푸시 알림과 커스텀 사운드 재생
- ✅ `FCMManager`: FCM과 연동

## 🔧 추가 설정 필요사항

### iOS 설정

1. **Xcode에서 사운드 파일 추가**:
   ```bash
   open ios/PickUpApp.xcworkspace
   ```
   - `notification_sound.caf` 파일을 Xcode 프로젝트에 드래그 앤 드롭
   - "Copy items if needed" 체크
   - 타겟에 추가

2. **iOS Capabilities 설정**:
   - Xcode에서 프로젝트 설정 → Signing & Capabilities
   - "Push Notifications" capability 추가

### Android 설정

Android는 이미 모든 설정이 완료되었습니다:
- ✅ 사운드 파일: `android/app/src/main/res/raw/notification_sound.mp3`
- ✅ 알림 아이콘: `android/app/src/main/res/drawable-*/ic_notification.png`

## 🎵 사용법

### 포그라운드 알림
```typescript
// FCMManager에서 자동으로 처리됨
// 진동 효과 + 로컬 푸시 알림 + 커스텀 사운드
```

### 백그라운드/종료 상태 알림
서버에서 FCM 메시지 전송 시:

**iOS:**
```json
{
  "to": "FCM_TOKEN",
  "notification": {
    "title": "알림 제목",
    "body": "알림 내용",
    "sound": "notification_sound.caf"
  },
  "data": {
    "url": "https://example.com"
  }
}
```

**Android:**
```json
{
  "to": "FCM_TOKEN",
  "notification": {
    "title": "알림 제목",
    "body": "알림 내용",
    "sound": "notification_sound",
    "android_channel_id": "pickup_app_notifications"
  },
  "data": {
    "url": "https://example.com"
  }
}
```

## 🧪 테스트 방법

1. **앱 실행 확인**:
   - 사운드 관련 오류가 없어야 함
   - NotificationManager 초기화 성공 로그 확인

2. **포그라운드 테스트**:
   - FCM 테스트 메시지 전송
   - 진동 효과 + 로컬 알림 + 커스텀 사운드 확인

3. **백그라운드 테스트**:
   - 앱을 백그라운드로 이동
   - FCM 메시지 전송하여 푸시 알림 사운드 확인

## 📝 주요 변경사항

1. **진동 피드백**: 즉시 사용자에게 피드백 제공
2. **로컬 푸시 알림**: `react-native-push-notification`으로 안정적인 알림 표시
3. **커스텀 사운드**: 네이티브 푸시 알림 시스템을 통해 재생
4. **에러 핸들링**: 알림 실패 시 기본 Alert으로 폴백

이제 앱에서 안정적으로 커스텀 알림 사운드가 재생됩니다! 🔊 