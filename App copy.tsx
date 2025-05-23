// App.tsx 또는 WebView를 사용하는 컴포넌트
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { WebView } from 'react-native-webview';
import { Alert, Platform, PermissionsAndroid, BackHandler, StatusBar, View } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import DeviceInfo from 'react-native-device-info';
import SplashScreen from 'react-native-splash-screen';
import PushNotification from 'react-native-push-notification';

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

// 디버깅 스크립트 - 상수로 분리
const DEBUGGING_SCRIPT = `
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

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [isWebViewLoaded, setIsWebViewLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  // 스플래시 화면 숨기기
  useEffect(() => {
    if (isWebViewLoaded) {
      SplashScreen.hide();
    }
  }, [isWebViewLoaded]);

  /**
   * Next.js 앱에 메시지를 보내는 함수
   * @param message - 전송할 메시지 객체
   */
  const sendMessageToWebView = useCallback((message: WebViewMessage) => {
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
        // const messageDisplay = document.createElement('div');
        // messageDisplay.innerText = 'Expo에서 메시지 수신: ' + JSON.stringify(window.expoMessage);
        // messageDisplay.style.padding = '10px';
        // messageDisplay.style.margin = '10px';
        // messageDisplay.style.backgroundColor = '#f0f0f0';
        // messageDisplay.style.border = '1px solid #ccc';
        // document.body.appendChild(messageDisplay);
        
        console.log('Expo 메시지가 주입되었습니다:', window.expoMessage);
        true;
      })();
    `;
    
    webViewRef.current.injectJavaScript(injectedJavaScript);
  }, []);

  /**
   * 리프레시 토큰을 Next.js 앱으로 전송하는 함수
   */
  const sendRefreshToken = useCallback(async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        sendMessageToWebView({
          type: 'AUTO_LOGIN',
          token: refreshToken,
        });
      }
    } catch (error) {
      console.error('리프레시 토큰 전송 오류:', error);
    }
  }, [sendMessageToWebView]);

  /**
   * WebView로부터 메시지를 수신하는 핸들러
   */
  const handleWebViewMessage = useCallback((event: WebViewEvent) => {
    try {
      const message: WebViewMessage = JSON.parse(event.nativeEvent.data);
      const { type, token } = message;

      switch (type) {
        case 'TOKEN_UPDATE':
          if (token) {
            AsyncStorage.setItem('refreshToken', token)
              .then(() => setIsAuthenticated(true))
              .catch(err => console.error('토큰 저장 오류:', err));
          }
          break;
        case 'LOGOUT':
          AsyncStorage.removeItem('refreshToken')
            .then(() => setIsAuthenticated(false))
            .catch(err => console.error('토큰 삭제 오류:', err));
          break;
        default:
          console.log('알 수 없는 메시지 타입:', type);
      }
    } catch (error) {
      console.error('메시지 파싱 오류:', error);
    }
  }, []);

  /**
   * FCM 토큰을 서버로 전송하는 함수
   * @param fcmToken - FCM 토큰
   */
  const sendFCMTokenToServer = useCallback(async (fcmToken: string) => {
    try {
      // 디바이스 정보 수집
      const deviceId = await DeviceInfo.getUniqueId();
      const deviceInfo = {
        fcmToken,
        platform: Platform.OS,
        platformVersion: Platform.Version,
        deviceId,
        deviceName: await DeviceInfo.getDeviceName(),
        deviceModel: await DeviceInfo.getModel(),
        systemVersion: await DeviceInfo.getSystemVersion(),
        appVersion: await DeviceInfo.getVersion(),
        buildNumber: await DeviceInfo.getBuildNumber()
      };

      sendMessageToWebView({
        type: 'FCM_TOKEN_UPDATE',
        data: deviceInfo
      });
    } catch (error) {
      console.error('FCM 토큰 전송 오류:', error);
    }
  }, [sendMessageToWebView]);

  // 알림 권한 요청 함수
  const requestNotificationPermission = useCallback(async () => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: "알림 권한",
            message: "앱 알림을 받기 위해서는 권한이 필요합니다.",
            buttonNeutral: "나중에 결정",
            buttonNegative: "거부",
            buttonPositive: "허용"
          }
        );
        console.log(
          granted === PermissionsAndroid.RESULTS.GRANTED
            ? '알림 권한이 허용되었습니다'
            : '알림 권한이 거부되었습니다'
        );
      } catch (err) {
        console.warn('알림 권한 요청 오류:', err);
      }
    }
  }, []);

  // 앱 시작시 권한 요청
  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  // WebView 로드 완료 시 리프레시 토큰 전송
  useEffect(() => {
    if (isWebViewLoaded) {
      sendRefreshToken();
    }
  }, [isWebViewLoaded, sendRefreshToken]);

  // FCM 초기화 및 토큰 설정
  useEffect(() => {
    const initializeFCM = async () => {
      try {
        // iOS에서 권한 요청
        if (Platform.OS === 'ios') {
          const authStatus = await messaging().requestPermission();
          const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

          if (enabled) {
            console.log('iOS 알림 권한이 승인되었습니다');
          }
        }

        // FCM 토큰 가져오기
        const fcmToken = await messaging().getToken();
        if (fcmToken) {
          console.log('FCM 토큰:', fcmToken);
          // 토큰을 임시 저장
          await AsyncStorage.setItem('fcmToken', fcmToken);
        }

        // 토큰 갱신 감지
        return messaging().onTokenRefresh(async newToken => {
          console.log('FCM 토큰이 갱신되었습니다:', newToken);
          await AsyncStorage.setItem('fcmToken', newToken);
          
          // 인증된 상태인 경우 새 토큰 즉시 전송
          if (isAuthenticated) {
            sendFCMTokenToServer(newToken);
          }
        });
      } catch (error) {
        console.error('FCM 초기화 오류:', error);
        return () => {};
      }
    };

    const unsubscribeTokenRefresh = initializeFCM();
    return () => {
      unsubscribeTokenRefresh.then(unsubscribe => unsubscribe());
    };
  }, [isAuthenticated, sendFCMTokenToServer]);

  // 인증 상태가 변경될 때 FCM 토큰 전송
  useEffect(() => {
    const sendStoredFCMToken = async () => {
      if (isAuthenticated) {
        try {
          const fcmToken = await AsyncStorage.getItem('fcmToken');
          if (fcmToken) {
            sendFCMTokenToServer(fcmToken);
          }
        } catch (error) {
          console.error('저장된 FCM 토큰 전송 오류:', error);
        }
      }
    };

    sendStoredFCMToken();
  }, [isAuthenticated, sendFCMTokenToServer]);

  // 포그라운드 메시지 핸들러
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      // 커스텀 알림 표시
      PushNotification.localNotification({
        channelId: "default",
        title: remoteMessage.notification?.title || '새로운 알림',
        message: remoteMessage.notification?.body || '',
        playSound: true,
        soundName: 'notification_sound.mp3',
        vibrate: true,
        vibration: 300,
        priority: 'high',
        importance: 'high',
        largeIcon: 'ic_launcher',
        smallIcon: 'ic_notification',
        color: '#000000',
        autoCancel: true,
        bigText: remoteMessage.notification?.body || '',
        subText: new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true }),
        actions: ['확인'],
      });
    });

    return unsubscribe;
  }, []);

  // WebView 에러 핸들러
  const handleWebViewError = useCallback((error: any) => {
    console.error('WebView 오류:', error);
  }, []);

  // WebView 로드 완료 핸들러
  const handleLoadEnd = useCallback(() => {
    setIsWebViewLoaded(true);
  }, []);

  // 뒤로가기 핸들러
  const handleBackPress = useCallback(() => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }
    return false;
  }, [canGoBack]);

  // 뒤로가기 이벤트 리스너 등록
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [handleBackPress]);

  // WebView 네비게이션 상태 변경 핸들러
  const handleNavigationStateChange = useCallback((navState: any) => {
    setCanGoBack(navState.canGoBack);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar 
        backgroundColor="transparent"
        translucent={true} 
        barStyle="light-content" // 또는 "dark-content"
      />
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://www.ezpickup.kr/bizes' }}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        javaScriptCanOpenWindowsAutomatically={true}
        injectedJavaScript={DEBUGGING_SCRIPT}
        onLoadEnd={handleLoadEnd}
        onError={handleWebViewError}
        onNavigationStateChange={handleNavigationStateChange}
        style={{ flex: 1 }}
      />
    </View>
  );
}