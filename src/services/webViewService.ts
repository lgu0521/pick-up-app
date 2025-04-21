import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WebViewMessage = {
  type: string;
  token?: string;
  data?: any;
};

export type WebViewEvent = {
  nativeEvent: {
    data: string;
  };
};

export class WebViewService {
  private webViewRef: React.RefObject<WebView>;
  private isWebViewLoaded: boolean;

  constructor(webViewRef: React.RefObject<WebView>, isWebViewLoaded: boolean) {
    this.webViewRef = webViewRef;
    this.isWebViewLoaded = isWebViewLoaded;
  }

  /**
   * WebView로 메시지를 보내는 함수
   */
  sendMessageToWebView = (message: WebViewMessage) => {
    if (!this.webViewRef.current) return;

    const injectedJavaScript = `
      (function() {
        window.expoMessage = ${JSON.stringify(message)};
        const messageEvent = new MessageEvent('message', {
          data: window.expoMessage,
          origin: '*',
          source: window
        });
        window.dispatchEvent(messageEvent);
        true;
      })();
    `;
    
    this.webViewRef.current.injectJavaScript(injectedJavaScript);
  };

  /**
   * 리프레시 토큰을 WebView로 전송하는 함수
   */
  sendRefreshToken = async () => {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (refreshToken) {
      this.sendMessageToWebView({
        type: 'AUTO_LOGIN',
        token: refreshToken
      });
    }
  };

  /**
   * WebView로부터 메시지를 수신하는 핸들러
   */
  handleWebViewMessage = (event: WebViewEvent) => {
    try {
      const message: WebViewMessage = JSON.parse(event.nativeEvent.data);
      const {type, token} = message;

      switch (type) {
        case 'TOKEN_UPDATE':
          if (token) AsyncStorage.setItem('refreshToken', token);
          break;
        case 'LOGOUT':
          AsyncStorage.removeItem('refreshToken');
          break;
        default:
          console.log('알 수 없는 메시지 타입:', type);
      }
    } catch (error) {
      console.error('메시지 파싱 오류:', error);
    }
  };

  /**
   * WebView 디버깅을 위한 JavaScript 코드
   */
  getDebuggingScript = () => `
    (function() {
      console.log('Next.js 페이지 로드됨');
      
      window.expoDebug = {
        messages: [],
        logMessage: function(msg) {
          this.messages.push(msg);
          console.log('expoDebug:', msg);
        }
      };
      
      if (window.ReactNativeWebView) {
        window.expoDebug.logMessage('ReactNativeWebView 브릿지 발견');
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'DEBUG',
          data: { message: 'WebView 브릿지 작동 중' }
        }));
      }
      
      window.addEventListener('message', function(event) {
        window.expoDebug.logMessage('메시지 이벤트 수신: ' + JSON.stringify(event.data));
        
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'MESSAGE_RECEIVED',
            data: event.data
          }));
        }
      });
      
      window.expoDebug.logMessage('디버그 스크립트 초기화 완료');
      true;
    })();
  `;
} 