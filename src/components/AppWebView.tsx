import React, { useRef, useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  BackHandler, 
  StatusBar, 
  Platform 
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebViewManager, WebViewMessage } from '../utils/WebViewManager';
import { FCMManager } from '../utils/FCMManager';

// 실제 웹 서버 URL로 변경해주세요
// const WEB_URL = 'http://192.168.219.106:3000';
const WEB_URL = 'http://192.168.219.106:3000'; // 임시 테스트용

// 개발 환경에서는 로컬 서버 사용 가능
// const WEB_URL = __DEV__ ? 'http://10.0.2.2:3000' : 'https://your-domain.com';

const AppWebView: React.FC = () => {
  const webViewRef = useRef<WebView>(null);
  const [webViewManager, setWebViewManager] = useState<WebViewManager | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(WEB_URL);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    console.log('🚀 AppWebView 초기화 시작...');

    // FCM 초기화
    const initFCM = async () => {
      try {
        const fcmManager = FCMManager.getInstance();
        const token = await fcmManager.initialize();
        if (token) {
          console.log('✅ FCM 초기화 완료');
        } else {
          console.log('⚠️ FCM 초기화 실패 (권한 없음)');
        }
      } catch (error) {
        console.error('❌ FCM 초기화 오류:', error);
      }
    };

    // WebViewManager 초기화
    const manager = new WebViewManager(webViewRef.current);
    setWebViewManager(manager);

    // FCM 초기화
    initFCM();

    // Android 뒤로 가기 버튼 처리
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      
      // 앱 종료 확인
      Alert.alert(
        '앱 종료',
        '앱을 종료하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { text: '종료', style: 'destructive', onPress: () => BackHandler.exitApp() }
        ]
      );
      return true;
    });

    return () => {
      backHandler.remove();
      console.log('🧹 AppWebView 정리 완료');
    };
  }, [canGoBack]);

  // 웹에서 메시지 수신
  const handleMessage = async (event: any) => {
    try {
      const message: WebViewMessage = JSON.parse(event.nativeEvent.data);
      console.log('📥 웹 메시지 수신:', message.type);
      
      if (webViewManager) {
        await webViewManager.handleWebMessage(message);
      }
    } catch (error) {
      console.error('❌ 메시지 파싱 실패:', error);
    }
  };

  // 페이지 로드 시작
  const handleLoadStart = () => {
    setIsLoading(true);
    console.log('🔄 페이지 로드 시작...', WEB_URL);
  };

  // 페이지 로드 완료
  const handleLoadEnd = async () => {
    setIsLoading(false);
    console.log('✅ 페이지 로드 완료', WEB_URL);
    
    if (webViewManager) {
      webViewManager.setReady(true);
      await webViewManager.injectInitialData();
      
      // FCM 토큰을 웹으로 전송
      const fcmManager = FCMManager.getInstance();
      const token = fcmManager.getFcmToken();
      const deviceInfo = fcmManager.getDeviceInfo();
      
      if (token && deviceInfo) {
        await webViewManager.sendMessageToWeb({
          type: 'FCM_TOKEN_READY',
          data: {
            token,
            deviceInfo,
            platform: Platform.OS
          }
        });
        console.log('📱 FCM 토큰을 웹으로 전송 완료');
      }
    }
  };

  // 네비게이션 상태 변경
  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    setCurrentUrl(navState.url);
    
    console.log('🌐 네비게이션 상태:', {
      url: navState.url,
      title: navState.title,
      loading: navState.loading,
      canGoBack: navState.canGoBack,
      canGoForward: navState.canGoForward
    });
    
    // URL 변경 로그
    if (navState.url !== currentUrl) {
      console.log('🌐 URL 변경:', navState.url);
    }
  };

  // 에러 처리
  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('❌ WebView 에러:', nativeEvent);
    
    Alert.alert(
      '연결 오류',
      '네트워크 연결을 확인해주세요.',
      [
        {
          text: '재시도',
          onPress: () => webViewRef.current?.reload(),
        },
        {
          text: '취소',
          style: 'cancel'
        }
      ],
    );
  };

  // HTTP 에러 처리
  const handleHttpError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('🌐 HTTP 에러:', nativeEvent.statusCode, nativeEvent.description);
    
    if (nativeEvent.statusCode >= 400) {
      Alert.alert(
        'HTTP 오류',
        `서버 오류가 발생했습니다. (${nativeEvent.statusCode})\n${nativeEvent.description}`,
        [
          {
            text: '재시도',
            onPress: () => webViewRef.current?.reload(),
          },
          {
            text: '취소',
            style: 'cancel'
          }
        ],
      );
    }
  };

  // 파일 다운로드 처리
  const handleFileDownload = ({ nativeEvent }: any) => {
    console.log('📥 파일 다운로드:', nativeEvent.downloadUrl);
    
    Alert.alert(
      '파일 다운로드',
      '파일을 다운로드하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '다운로드', onPress: () => {
          // 실제 구현에서는 react-native-fs 등을 사용하여 다운로드 처리
          console.log('다운로드 시작:', nativeEvent.downloadUrl);
        }}
      ]
    );
  };

  // 사용자 정의 User-Agent (WebView 감지용)
  const customUserAgent = `YourApp/1.0 ReactNativeWebView Mobile ${Platform.OS}`;

  console.log('🌐 WebView 렌더링 시작 - URL:', WEB_URL);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#ffffff" 
        translucent={false}
      />
      
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_URL }}
        style={styles.webview}
        
        // 기본 설정
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        
        // 쿠키 및 캐시 설정
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        cacheEnabled={true}
        incognito={false}
        
        // 미디어 설정
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        
        // 성능 최적화
        renderToHardwareTextureAndroid={true}
        removeClippedSubviews={true}
        
        // User Agent 설정
        userAgent={customUserAgent}
        
        // 이벤트 핸들러
        onMessage={handleMessage}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onNavigationStateChange={handleNavigationStateChange}
        onError={handleError}
        onHttpError={handleHttpError}
        onFileDownload={handleFileDownload}
        
        // iOS 설정
        bounces={false}
        scrollEnabled={true}
        automaticallyAdjustContentInsets={false}
        
        // Android 설정
        mixedContentMode="compatibility"
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        saveFormDataDisabled={false}
        
        // 보안 설정
        originWhitelist={['*']}
        allowsFullscreenVideo={true}
        
        // 네트워크 설정
        cacheMode="LOAD_DEFAULT"
        
        // 추가 설정
        pullToRefreshEnabled={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        
        // 줌 설정
        scalesPageToFit={Platform.OS === 'android'}
        
        // 로딩 상태 표시
        // renderLoading={() => <LoadingScreen />}
      />
      
      {/* 개발 모드에서 디버그 정보 표시 */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <StatusBar barStyle="light-content" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  debugInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppWebView; 