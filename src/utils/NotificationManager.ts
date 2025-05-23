import { Platform, Alert } from 'react-native';
import PushNotification from 'react-native-push-notification';
import { SoundManager } from './SoundManager';

export interface LocalNotificationData {
  title: string;
  body: string;
  data?: any;
  playSound?: boolean;
}

export class NotificationManager {
  private static instance: NotificationManager;
  private soundManager: SoundManager;
  private isInitialized: boolean = false;

  private constructor() {
    this.soundManager = SoundManager.getInstance();
  }

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  // 초기화
  async initialize(): Promise<void> {
    try {
      console.log('🔔 NotificationManager 초기화 시작...');
      
      if (!this.isInitialized) {
        this.configurePushNotifications();
        this.isInitialized = true;
      }
      
      console.log('✅ NotificationManager 초기화 완료');
    } catch (error) {
      console.error('❌ NotificationManager 초기화 실패:', error);
    }
  }

  // PushNotification 설정
  private configurePushNotifications(): void {
    PushNotification.configure({
      // 알림 권한 요청 (iOS)
      onRegister: function (token) {
        console.log('📱 푸시 알림 토큰:', token);
      },

      // 알림 수신
      onNotification: function (notification: any) {
        console.log('📨 로컬 알림 수신:', notification);
        
        // 필수: iOS에서 완료 콜백 호출
        if (notification.finish) {
          notification.finish();
        }
      },

      // 알림 등록 실패
      onRegistrationError: function(err) {
        console.error('❌ 푸시 알림 등록 실패:', err);
      },

      // 권한 설정
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      // 앱이 종료된 상태에서 시작할 때 알림 확인
      popInitialNotification: true,

      // 즉시 권한 요청
      requestPermissions: Platform.OS === 'ios',
    });

    // Android 알림 채널 생성
    if (Platform.OS === 'android') {
      this.createAndroidChannel();
    }
  }

  // Android 알림 채널 생성
  private createAndroidChannel(): void {
    const channelId = this.soundManager.getAndroidSoundChannelId();
    const soundName = this.soundManager.getNotificationSoundPath();
    
    console.log('📱 Android 채널 생성 시작 - ID:', channelId, '사운드:', soundName);
    
    PushNotification.createChannel(
      {
        channelId: channelId,
        channelName: "픽업 앱 알림",
        channelDescription: "픽업 앱의 알림을 받습니다",
        soundName: soundName,
        importance: 4, // HIGH
        vibrate: true,
        playSound: true,
      },
      (created) => {
        console.log(`📱 Android 채널 생성 결과: ${created ? '성공' : '실패 또는 이미 존재'}`);
        console.log('📱 채널 설정 - ID:', channelId, '사운드:', soundName);
        
        // 채널이 생성되지 않았다면 기본 채널로 재시도
        if (!created) {
          console.log('📱 기본 채널로 재시도...');
          PushNotification.createChannel(
            {
              channelId: 'default',
              channelName: "기본 알림",
              channelDescription: "기본 알림 채널",
              soundName: soundName,
              importance: 4,
              vibrate: true,
              playSound: true,
            },
            (defaultCreated) => console.log(`📱 기본 채널 생성: ${defaultCreated}`)
          );
        }
      }
    );
  }

  // 로컬 알림 표시 (포그라운드에서 FCM 메시지를 받았을 때)
  async showLocalNotification(notification: LocalNotificationData): Promise<void> {
    try {
      console.log('📨 로컬 알림 표시:', notification.title);

      // 진동 효과 (즉시 실행)
      if (notification.playSound !== false) {
        await this.soundManager.playNotificationSound();
      }

      // 실제 푸시 알림 표시
      PushNotification.localNotification({
        title: notification.title,
        message: notification.body,
        soundName: notification.playSound !== false ? this.soundManager.getNotificationSoundPath() : undefined,
        channelId: this.soundManager.getAndroidSoundChannelId(),
        userInfo: notification.data,
        playSound: notification.playSound !== false,
        vibrate: true,
        vibration: 300,
        priority: 'high',
        visibility: 'public',
        importance: 'high',
        autoCancel: true,
        largeIcon: '', // 앱 아이콘 사용
        smallIcon: 'ic_notification', // res/drawable에서 사용할 작은 아이콘
      });

    } catch (error) {
      console.error('❌ 로컬 알림 표시 실패:', error);
      
      // 폴백: 기본 Alert 표시
      Alert.alert(
        notification.title,
        notification.body,
        [
          { text: '확인', style: 'default' },
          ...(notification.data?.url ? [{
            text: '보기',
            style: 'default' as const,
            onPress: () => this.handleNotificationPress(notification.data)
          }] : [])
        ]
      );
    }
  }

  // 알림 클릭 처리
  private handleNotificationPress(data: any): void {
    console.log('🔗 알림 클릭됨:', data);
    
    // 웹뷰로 특정 URL 이동 등의 처리
    if (data?.url) {
      console.log('🌐 URL로 이동:', data.url);
    }
  }

  // 예약 알림
  async scheduleNotification(notification: LocalNotificationData, date: Date): Promise<void> {
    console.log('⏰ 예약 알림 설정:', notification.title, date);
    
    PushNotification.localNotificationSchedule({
      title: notification.title,
      message: notification.body,
      date: date,
      soundName: notification.playSound !== false ? this.soundManager.getNotificationSoundPath() : undefined,
      channelId: this.soundManager.getAndroidSoundChannelId(),
      userInfo: notification.data,
    });
  }

  // 모든 알림 취소
  async cancelAllNotifications(): Promise<void> {
    console.log('🗑️ 모든 알림 취소');
    PushNotification.cancelAllLocalNotifications();
  }

  // 특정 알림 취소
  async cancelNotification(id: string): Promise<void> {
    console.log('🗑️ 알림 취소:', id);
    PushNotification.cancelLocalNotifications({ id });
  }
} 