import React from 'react';
import { 
  View, 
  Text, 
  ActivityIndicator, 
  StyleSheet, 
  Image, 
  StatusBar,
  Platform
} from 'react-native';

interface SplashScreenProps {
  message?: string;
  showProgress?: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ 
  message = '앱을 시작하는 중...', 
  showProgress = true 
}) => {
  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#007AFF" 
        translucent={false}
      />
      
      {/* 앱 로고 */}
      <View style={styles.logoContainer}>
        {/* 실제 로고 이미지가 있다면 사용 */}
        {/* <Image source={require('../assets/logo.png')} style={styles.logo} /> */}
        
        {/* 텍스트 로고 */}
        <Text style={styles.appName}>YourApp</Text>
        <Text style={styles.tagline}>웹과 네이티브의 완벽한 조화</Text>
      </View>
      
      {/* 로딩 인디케이터 */}
      {showProgress && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.message}>{message}</Text>
        </View>
      )}
      
      {/* 하단 정보 */}
      <View style={styles.footer}>
        <Text style={styles.version}>Version 1.0.0</Text>
        <Text style={styles.copyright}>© 2024 YourCompany</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'Roboto',
      },
    }),
  },
  tagline: {
    fontSize: 16,
    color: '#E6F3FF',
    textAlign: 'center',
    marginBottom: 40,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'Roboto',
      },
    }),
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 120,
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    color: '#ffffff',
    marginTop: 16,
    textAlign: 'center',
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'Roboto',
      },
    }),
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  version: {
    fontSize: 14,
    color: '#B3D9FF',
    marginBottom: 4,
  },
  copyright: {
    fontSize: 12,
    color: '#B3D9FF',
  },
});

export default SplashScreen; 