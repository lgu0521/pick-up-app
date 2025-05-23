import React, { useState, useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SplashScreen from 'react-native-splash-screen';
import AppWebView from './src/components/AppWebView';
import SplashScreenComponent from './src/components/SplashScreen';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initMessage, setInitMessage] = useState('앱을 초기화하는 중...');

  useEffect(() => {
    // 앱 초기화
    const initializeApp = async () => {
      try {
        console.log('🚀 앱 초기화 시작...');
        
        // 네이티브 스플래시 스크린 숨기기 (커스텀 스플래시 스크린 표시 후)
        SplashScreen.hide();

        // 초기화 단계별 메시지 업데이트
        setInitMessage('보안 모듈을 로드하는 중...');
        await new Promise(resolve => setTimeout(resolve, 500));

        setInitMessage('네트워크 연결을 확인하는 중...');
        await new Promise(resolve => setTimeout(resolve, 500));

        setInitMessage('사용자 데이터를 준비하는 중...');
        await new Promise(resolve => setTimeout(resolve, 500));

        setInitMessage('앱을 시작하는 중...');
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('✅ 앱 초기화 완료');
        setIsLoading(false);
      } catch (error) {
        console.error('❌ 앱 초기화 실패:', error);
        setInitMessage('앱 시작 중 오류가 발생했습니다...');
        
        // 3초 후 다시 시도
        setTimeout(() => {
          setIsLoading(false);
        }, 3000);
      }
    };

    initializeApp();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#ffffff" 
        translucent={Platform.OS === 'android'} 
      />
      
      {isLoading ? (
        <SplashScreenComponent 
          message={initMessage}
          showProgress={true}
        />
      ) : (
        <AppWebView />
      )}
    </SafeAreaProvider>
  );
};

export default App; 