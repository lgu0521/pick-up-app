// ==== EXPO 앱 부분 ====

// App.js 또는 WebView를 사용하는 컴포넌트
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useRef, useState, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { Platform } from 'react-native';

// 메시지 타입 정의
type WebViewMessage = {
  type: string;
  token?: string;
  data?: any;
};

// WebView 이벤트 타입 정의
type WebViewEvent = {
  nativeEvent: {
    data: string;
  };
};

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [isWebViewLoaded, setIsWebViewLoaded] = useState(false);

  /**
   * Next.js 앱에 메시지를 보내는 함수
   * @param message - 전송할 메시지 객체
   */
  const sendMessageToWebView = (message: WebViewMessage) => {
    if (!webViewRef.current) return;

    const injectedJavaScript = `
      (function() {
        // 메시지를 글로벌 변수에 저장
        window.expoMessage = ${JSON.stringify(message)};
        
        // 메시지 이벤트 생성 및 전파
        const messageEvent = new MessageEvent('message', {
          data: window.expoMessage,
          origin: '*',
          source: window
        });
        window.dispatchEvent(messageEvent);
        
        // 메시지 히스토리 저장
        if (!window.receivedExpoMessages) window.receivedExpoMessages = [];
        window.receivedExpoMessages.push(window.expoMessage);
        
        // 디버깅용 UI 요소 추가
        const messageDisplay = document.createElement('div');
        messageDisplay.innerText = 'Expo에서 메시지 수신: ' + JSON.stringify(window.expoMessage);
        messageDisplay.style.padding = '10px';
        messageDisplay.style.margin = '10px';
        messageDisplay.style.backgroundColor = '#f0f0f0';
        messageDisplay.style.border = '1px solid #ccc';
        document.body.appendChild(messageDisplay);
        
        console.log('Expo 메시지가 주입되었습니다:', window.expoMessage);
        true;
      })();
    `;
    
    webViewRef.current.injectJavaScript(injectedJavaScript);
  };

  /**
   * 리프레시 토큰을 Next.js 앱으로 전송하는 함수
   */
  const sendRefreshToken = async () => {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (refreshToken) {
      sendMessageToWebView({
        type: 'AUTO_LOGIN',
        token: refreshToken
      });
    }
  };

  /**
   * WebView로부터 메시지를 수신하는 핸들러
   */
  const handleWebViewMessage = (event: WebViewEvent) => {
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
  const debuggingScript = `
    (function() {
      // 디버그 정보 기록
      console.log('Next.js 페이지 로드됨');
      
      // 디버그 객체 초기화
      window.expoDebug = {
        messages: [],
        logMessage: function(msg) {
          this.messages.push(msg);
          console.log('expoDebug:', msg);
        }
      };
      
      // WebView 브릿지 상태 확인
      if (window.ReactNativeWebView) {
        window.expoDebug.logMessage('ReactNativeWebView 브릿지 발견');
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'DEBUG',
          data: { message: 'WebView 브릿지 작동 중' }
        }));
      }
      
      // 메시지 이벤트 리스너 등록
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

  // WebView 로드 완료 시 리프레시 토큰 전송
  useEffect(() => {
    if (isWebViewLoaded) {
      sendRefreshToken();
    }
  }, [isWebViewLoaded]);

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: 'https://ezpickup.kr' }}
      onMessage={handleWebViewMessage}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      originWhitelist={['*']}
      mixedContentMode="compatibility"
      allowsInlineMediaPlayback={true}
      mediaPlaybackRequiresUserAction={false}
      javaScriptCanOpenWindowsAutomatically={true}
      injectedJavaScript={debuggingScript}
      onLoadEnd={() => setIsWebViewLoaded(true)}
      onError={(error) => {
        console.error('WebView 오류:', error);
      }}
      style={{ flex: 1 }}
    />
  );
}