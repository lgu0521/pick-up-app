import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebViewService } from './webViewService';

export class FCMService {
  private webViewService: WebViewService;
  private maxRetries: number = 3;
  private retryDelay: number = 5000;

  constructor(webViewService: WebViewService) {
    this.webViewService = webViewService;
  }

  /**
   * FCM 토큰을 서버에 전송하는 함수
   */
  sendFCMTokenToServer = async (token: string) => {
    const deviceId = await AsyncStorage.getItem('deviceId');
    const platform = Platform.OS;
    
    try {
      const response = await fetch('https://api.ezpickup.kr/api/v1/fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          deviceId,
          platform
        }),
      });

      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }

      console.log('FCM 토큰 전송 성공');
    } catch (error) {
      console.error('FCM 토큰 전송 실패:', error);
      throw error;
    }
  };

  /**
   * FCM 토큰을 저장하고 서버에 전송하는 함수
   */
  saveAndSendFCMToken = async (token: string) => {
    try {
      await AsyncStorage.setItem('fcmToken', token);
      await this.sendFCMTokenToServer(token);
    } catch (error) {
      console.error('FCM 토큰 저장 및 전송 실패:', error);
      throw error;
    }
  };

  /**
   * FCM 토큰을 가져오는 함수
   */
  getFCMToken = async () => {
    try {
      const token = await messaging().getToken();
      return token;
    } catch (error) {
      console.error('FCM 토큰 가져오기 실패:', error);
      throw error;
    }
  };

  /**
   * FCM 토큰을 초기화하고 저장하는 함수
   */
  initializeFCMToken = async () => {
    let retryCount = 0;
    
    while (retryCount < this.maxRetries) {
      try {
        const token = await this.getFCMToken();
        await this.saveAndSendFCMToken(token);
        return;
      } catch (error) {
        retryCount++;
        if (retryCount === this.maxRetries) {
          console.error('FCM 토큰 초기화 최대 재시도 횟수 도달');
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  };

  /**
   * FCM 메시지 핸들러 설정
   */
  setupFCMHandlers = () => {
    // 포그라운드 메시지 처리
    messaging().onMessage(async remoteMessage => {
      console.log('포그라운드 메시지:', remoteMessage);
      this.webViewService.sendMessageToWebView({
        type: 'NOTIFICATION',
        data: remoteMessage
      });
    });

    // 백그라운드/종료 상태 메시지 처리
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('백그라운드 메시지:', remoteMessage);
      this.webViewService.sendMessageToWebView({
        type: 'NOTIFICATION',
        data: remoteMessage
      });
    });
  };
} 