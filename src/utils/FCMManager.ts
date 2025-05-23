// src/utils/FCMManager.ts
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Platform, Alert, PermissionsAndroid } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { TokenManager } from './TokenManager';
import { NotificationManager } from './NotificationManager';

export interface DeviceInfoType {
  deviceId: string;
  deviceType: 'android' | 'ios';
  deviceInfo: string;
  appVersion: string;
  osVersion: string;
  brand: string;
  model: string;
}

export class FCMManager {
  private static instance: FCMManager;
  private fcmToken: string | null = null;
  private deviceInfo: DeviceInfoType | null = null;
  private onTokenUpdateCallback: ((token: string, deviceInfo: DeviceInfoType) => void) | null = null;
  private notificationManager: NotificationManager;

  private constructor() {
    this.notificationManager = NotificationManager.getInstance();
  }

  public static getInstance(): FCMManager {
    if (!FCMManager.instance) {
      FCMManager.instance = new FCMManager();
    }
    return FCMManager.instance;
  }

  // FCM 초기화
  async initialize(): Promise<string | null> {
    try {
      console.log('🔔 FCM 초기화 시작...');

      // NotificationManager 초기화
      await this.notificationManager.initialize();

      // Android 권한 요청
      if (Platform.OS === 'android') {
        await this.requestAndroidPermissions();
      }

      // iOS/Android 통합 권한 요청
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('❌ FCM 권한이 거부되었습니다.');
        Alert.alert(
          '알림 권한 필요', 
          '푸시 알림을 받으려면 알림 권한을 허용해주세요.',
          [{ text: '확인' }]
        );
        return null;
      }

      // FCM 토큰 가져오기
      const token = await messaging().getToken();
      this.fcmToken = token;

      // 디바이스 정보 설정
      this.deviceInfo = await this.collectDeviceInfo();

      // 토큰을 로컬에 저장
      await TokenManager.saveFcmToken(token, this.deviceInfo);

      // 토큰 새로고침 리스너 등록
      messaging().onTokenRefresh(this.handleTokenRefresh.bind(this));

      // 메시지 리스너 등록
      this.setupMessageHandlers();

      console.log('✅ FCM 초기화 완료');
      console.log('📱 FCM 토큰:', token.substring(0, 50) + '...');
      
      return token;
    } catch (error) {
      console.error('❌ FCM 초기화 실패:', error);
      return null;
    }
  }

  // Android 권한 요청
  private async requestAndroidPermissions(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('✅ Android 알림 권한 허용됨');
      } else {
        console.log('❌ Android 알림 권한 거부됨');
      }
    } catch (error) {
      console.error('Android 권한 요청 실패:', error);
    }
  }

  // 디바이스 정보 수집
  private async collectDeviceInfo(): Promise<DeviceInfoType> {
    const deviceId = await DeviceInfo.getUniqueId();
    const deviceType = Platform.OS as 'android' | 'ios';
    const systemName = DeviceInfo.getSystemName();
    const systemVersion = DeviceInfo.getSystemVersion();
    const brand = await DeviceInfo.getBrand();
    const model = DeviceInfo.getModel();
    const appVersion = DeviceInfo.getVersion();

    return {
      deviceId,
      deviceType,
      deviceInfo: `${systemName} ${systemVersion} (${brand} ${model})`,
      appVersion,
      osVersion: systemVersion,
      brand,
      model,
    };
  }

  // 토큰 새로고침 처리
  private async handleTokenRefresh(token: string): Promise<void> {
    console.log('🔄 FCM 토큰 새로고침:', token.substring(0, 50) + '...');
    
    this.fcmToken = token;
    
    // 새 토큰을 로컬에 저장
    await TokenManager.saveFcmToken(token, this.deviceInfo);
    
    // 콜백이 있으면 실행 (WebViewManager에서 웹으로 전송하기 위해)
    if (this.onTokenUpdateCallback && this.deviceInfo) {
      this.onTokenUpdateCallback(token, this.deviceInfo);
    }
  }

  // 토큰 업데이트 콜백 설정
  setOnTokenUpdateCallback(callback: (token: string, deviceInfo: DeviceInfoType) => void): void {
    this.onTokenUpdateCallback = callback;
  }

  // 메시지 핸들러 설정
  private setupMessageHandlers(): void {
    // 포그라운드 메시지 처리
    messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      console.log('📩 포그라운드 메시지 수신:', remoteMessage);
      
      if (remoteMessage.notification) {
        // NotificationManager를 사용하여 커스텀 사운드와 함께 알림 표시
        await this.notificationManager.showLocalNotification({
          title: remoteMessage.notification.title || '알림',
          body: remoteMessage.notification.body || '새로운 알림이 도착했습니다.',
          data: remoteMessage.data,
          playSound: true // 커스텀 사운드 재생
        });
      }
    });

    // 백그라운드/종료 상태에서 메시지로 앱 열기
    messaging().onNotificationOpenedApp((remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      console.log('📱 백그라운드에서 알림으로 앱 열기:', remoteMessage);
      this.handleNotificationAction(remoteMessage);
    });

    // 앱이 종료된 상태에서 알림으로 앱 열기
    messaging()
      .getInitialNotification()
      .then((remoteMessage: FirebaseMessagingTypes.RemoteMessage | null) => {
        if (remoteMessage) {
          console.log('🚀 종료 상태에서 알림으로 앱 열기:', remoteMessage);
          this.handleNotificationAction(remoteMessage);
        }
      });
  }

  // 알림 클릭 액션 처리
  private handleNotificationAction(remoteMessage: FirebaseMessagingTypes.RemoteMessage): void {
    console.log('🔗 알림 액션 처리:', remoteMessage.data);

    // 딥링크 또는 특정 URL 처리
    if (remoteMessage.data?.url) {
      // WebViewManager를 통해 웹에서 특정 URL로 이동하도록 할 수 있음
      console.log('🌐 URL로 이동:', remoteMessage.data.url);
    }

    // 특정 화면으로 네비게이션
    if (remoteMessage.data?.screen) {
      console.log('📱 화면 이동:', remoteMessage.data.screen);
    }
  }

  // 현재 FCM 토큰 반환
  getFcmToken(): string | null {
    return this.fcmToken;
  }

  // 디바이스 정보 반환
  getDeviceInfo(): DeviceInfoType | null {
    return this.deviceInfo;
  }

  // FCM 토큰 삭제
  async clearToken(): Promise<void> {
    try {
      await messaging().deleteToken();
      this.fcmToken = null;
      await TokenManager.clearFcmToken();
      console.log('✅ FCM 토큰 삭제 완료');
    } catch (error) {
      console.error('❌ FCM 토큰 삭제 실패:', error);
    }
  }

  // 토큰 상태 확인
  async checkTokenStatus(): Promise<boolean> {
    try {
      const hasPermission = await messaging().hasPermission();
      const token = await messaging().getToken();
      
      return !!(hasPermission && token);
    } catch (error) {
      console.error('FCM 토큰 상태 확인 실패:', error);
      return false;
    }
  }

  // 수동으로 토큰 새로고침
  async refreshToken(): Promise<string | null> {
    try {
      await messaging().deleteToken();
      const newToken = await messaging().getToken();
      
      if (newToken) {
        this.fcmToken = newToken;
        await TokenManager.saveFcmToken(newToken, this.deviceInfo);
        
        if (this.onTokenUpdateCallback && this.deviceInfo) {
          this.onTokenUpdateCallback(newToken, this.deviceInfo);
        }
      }
      
      return newToken;
    } catch (error) {
      console.error('FCM 토큰 새로고침 실패:', error);
      return null;
    }
  }
}