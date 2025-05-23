import { Platform, Vibration } from 'react-native';

// React Native Sound 대신 간단한 네이티브 사운드 재생 방법 사용
export class SoundManager {
  private static instance: SoundManager;

  private constructor() {
    console.log('✅ SoundManager 초기화 완료');
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  // 알림 사운드 재생 (시스템 진동으로 대체)
  async playNotificationSound(): Promise<void> {
    try {
      console.log('🔊 알림 효과 재생 시작...');
      
      // 진동으로 알림 효과 제공
      Vibration.vibrate([0, 250, 100, 250]);
      
      console.log('✅ 알림 효과 재생 완료 (진동)');
    } catch (error) {
      console.error('❌ 알림 효과 재생 실패:', error);
    }
  }

  // 사운드 파일 경로 반환 (푸시 알림용)
  getNotificationSoundPath(): string {
    if (Platform.OS === 'android') {
      return 'notification_sound'; // .mp3 확장자 제외
    } else {
      return 'notification_sound.caf'; // iOS는 CAF 형식 사용
    }
  }

  // 사운드 채널 ID (Android용)
  getAndroidSoundChannelId(): string {
    return 'pickup_app_notifications';
  }

  // 사운드 리소스 해제 (더 이상 필요없음)
  release(): void {
    console.log('🧹 SoundManager 정리 완료');
  }
} 