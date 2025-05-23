import { TokenManager } from './TokenManager';
import { FCMManager, DeviceInfoType } from './FCMManager';

export interface WebViewMessage {
  type: 'SAVE_TOKENS' | 'CLEAR_TOKENS' | 'REQUEST_TOKENS' | 'TOKEN_RESPONSE' |
        'SAVE_FCM_TOKEN' | 'CLEAR_FCM_TOKEN' | 'REQUEST_FCM_TOKEN' | 'FCM_TOKEN_RESPONSE' |
        'FCM_TOKEN_READY' | 'NAVIGATE_TO' | 'RELOAD_PAGE' | 'SHOW_ALERT';
  accessToken?: string;
  refreshToken?: string;
  fcmToken?: string;
  deviceInfo?: DeviceInfoType;
  url?: string;
  title?: string;
  message?: string;
  data?: any;
}

export class WebViewManager {
  private webViewRef: any = null;
  private fcmManager: FCMManager;
  private isReady: boolean = false;

  constructor(webViewRef: any) {
    this.webViewRef = webViewRef;
    this.fcmManager = FCMManager.getInstance();
    this.setupFCMCallback();
  }

  // FCM 토큰 업데이트 콜백 설정
  private setupFCMCallback(): void {
    this.fcmManager.setOnTokenUpdateCallback((token: string, deviceInfo: DeviceInfoType) => {
      console.log('🔔 FCM 토큰 업데이트됨, 웹으로 전송 중...');
      this.sendMessageToWeb({
        type: 'FCM_TOKEN_RESPONSE',
        fcmToken: token,
        deviceInfo
      });
    });
  }

  // WebView 준비 완료 설정
  setReady(ready: boolean): void {
    this.isReady = ready;
    if (ready) {
      console.log('🌐 WebView 준비 완료');
    }
  }

  // 웹에서 메시지 수신 처리
  async handleWebMessage(message: WebViewMessage): Promise<void> {
    console.log('📥 웹에서 메시지 수신:', message.type);

    try {
      switch (message.type) {
        case 'SAVE_TOKENS':
          await this.handleSaveTokens(message);
          break;

        case 'CLEAR_TOKENS':
          await this.handleClearTokens();
          break;

        case 'REQUEST_TOKENS':
          await this.handleRequestTokens();
          break;

        case 'SAVE_FCM_TOKEN':
          await this.handleSaveFcmToken(message);
          break;

        case 'CLEAR_FCM_TOKEN':
          await this.handleClearFcmToken();
          break;

        case 'REQUEST_FCM_TOKEN':
          await this.handleRequestFcmToken();
          break;

        case 'NAVIGATE_TO':
          this.handleNavigateTo(message.url);
          break;

        case 'RELOAD_PAGE':
          this.handleReloadPage();
          break;

        default:
          console.warn('⚠️ 알 수 없는 메시지 타입:', message.type);
      }
    } catch (error) {
      console.error('❌ 메시지 처리 중 오류:', error);
    }
  }

  // 토큰 저장 처리
  private async handleSaveTokens(message: WebViewMessage): Promise<void> {
    if (message.accessToken) {
      const success = await TokenManager.saveTokens(message.accessToken, message.refreshToken);
      console.log(success ? '✅ 토큰 저장 완료' : '❌ 토큰 저장 실패');
    }
  }

  // 토큰 삭제 처리
  private async handleClearTokens(): Promise<void> {
    const success = await TokenManager.clearAllTokens();
    console.log(success ? '✅ 모든 토큰 삭제 완료' : '❌ 토큰 삭제 실패');
  }

  // 저장된 토큰 요청 처리
  private async handleRequestTokens(): Promise<void> {
    const tokens = await TokenManager.getTokens();
    
    if (tokens) {
      // AccessToken 만료 확인
      const isExpired = TokenManager.isTokenExpired(tokens.accessToken);
      
      if (!isExpired) {
        this.sendMessageToWeb({
          type: 'TOKEN_RESPONSE',
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        });
        console.log('✅ 저장된 토큰 전송 완료');
      } else {
        console.log('⚠️ 저장된 토큰이 만료됨');
        await TokenManager.clearTokens();
        this.sendMessageToWeb({
          type: 'TOKEN_RESPONSE'
        });
      }
    } else {
      this.sendMessageToWeb({
        type: 'TOKEN_RESPONSE'
      });
      console.log('📤 토큰 없음 응답 전송');
    }
  }

  // FCM 토큰 저장 처리
  private async handleSaveFcmToken(message: WebViewMessage): Promise<void> {
    if (message.fcmToken) {
      const success = await TokenManager.saveFcmToken(message.fcmToken, message.deviceInfo);
      console.log(success ? '✅ FCM 토큰 저장 완료' : '❌ FCM 토큰 저장 실패');
    }
  }

  // FCM 토큰 삭제 처리
  private async handleClearFcmToken(): Promise<void> {
    await Promise.all([
      TokenManager.clearFcmToken(),
      this.fcmManager.clearToken()
    ]);
    console.log('✅ FCM 토큰 삭제 완료');
  }

  // 저장된 FCM 토큰 요청 처리
  private async handleRequestFcmToken(): Promise<void> {
    // 먼저 저장된 FCM 토큰 확인
    const savedFcmData = await TokenManager.getFcmToken();
    
    if (savedFcmData) {
      this.sendMessageToWeb({
        type: 'FCM_TOKEN_RESPONSE',
        fcmToken: savedFcmData.fcmToken,
        deviceInfo: savedFcmData.deviceInfo
      });
      console.log('✅ 저장된 FCM 토큰 전송 완료');
    } else {
      // 저장된 FCM 토큰이 없으면 새로 생성
      console.log('🔔 FCM 토큰이 없음, 새로 생성 중...');
      const newFcmToken = await this.fcmManager.initialize();
      
      if (newFcmToken) {
        const deviceInfo = this.fcmManager.getDeviceInfo();
        this.sendMessageToWeb({
          type: 'FCM_TOKEN_RESPONSE',
          fcmToken: newFcmToken,
          deviceInfo: deviceInfo ?? undefined
        });
        console.log('✅ 새 FCM 토큰 생성 및 전송 완료');
      } else {
        this.sendMessageToWeb({
          type: 'FCM_TOKEN_RESPONSE'
        });
        console.log('❌ FCM 토큰 생성 실패');
      }
    }
  }

  // URL 네비게이션 처리
  private handleNavigateTo(url?: string): void {
    if (url && this.webViewRef && this.isReady) {
      const script = `window.location.href = '${url}'; true;`;
      this.webViewRef.injectJavaScript(script);
      console.log('🌐 페이지 이동:', url);
    }
  }

  // 페이지 새로고침 처리
  private handleReloadPage(): void {
    if (this.webViewRef && this.isReady) {
      this.webViewRef.reload();
      console.log('🔄 페이지 새로고침');
    }
  }

  // 웹으로 메시지 전송
  sendMessageToWeb(message: WebViewMessage): void {
    if (this.webViewRef && this.isReady) {
      const script = `
        if (window.handleNativeMessage) {
          window.handleNativeMessage('${JSON.stringify(message)}');
        }
        true;
      `;
      this.webViewRef.injectJavaScript(script);
      console.log('📤 웹으로 메시지 전송:', message.type);
    } else {
      console.warn('⚠️ WebView가 준비되지 않음, 메시지 대기열에 추가');
      // 실제 구현에서는 메시지 큐를 구현할 수 있음
    }
  }

  // 초기 토큰들 주입 (페이지 로드 완료 후)
  async injectInitialData(): Promise<void> {
    console.log('🚀 초기 데이터 주입 시작...');
    
    // 약간의 딜레이를 두고 순차적으로 전송
    setTimeout(async () => {
      await this.handleRequestTokens();
    }, 500);

    setTimeout(async () => {
      await this.handleRequestFcmToken();
    }, 1000);
  }

  // 긴급 메시지 전송 (즉시 전송)
  sendUrgentMessage(message: WebViewMessage): void {
    if (this.webViewRef) {
      const script = `
        if (window.handleNativeMessage) {
          window.handleNativeMessage('${JSON.stringify(message)}');
        }
        true;
      `;
      this.webViewRef.injectJavaScript(script);
      console.log('🚨 긴급 메시지 전송:', message.type);
    }
  }

  // 알림 표시
  showAlert(title: string, message: string): void {
    this.sendMessageToWeb({
      type: 'SHOW_ALERT',
      title,
      message
    });
  }

  // 현재 상태 확인
  getStatus(): { isReady: boolean; hasFCM: boolean } {
    return {
      isReady: this.isReady,
      hasFCM: !!this.fcmManager.getFcmToken()
    };
  }
} 