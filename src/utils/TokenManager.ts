import * as Keychain from 'react-native-keychain';

interface TokenData {
  accessToken: string;
  refreshToken?: string;
}

interface FcmTokenData {
  fcmToken: string;
  deviceInfo?: any;
  savedAt: string;
}

export class TokenManager {
  private static readonly SERVICE_NAME = 'YourAppTokens';
  private static readonly FCM_SERVICE_NAME = 'YourAppFCMToken';

  // 인증 토큰 저장
  static async saveTokens(accessToken: string, refreshToken?: string): Promise<boolean> {
    try {
      const tokenData: TokenData = { accessToken, refreshToken };
      
      await Keychain.setInternetCredentials(
        this.SERVICE_NAME,
        'user_tokens',
        JSON.stringify(tokenData)
      );
      
      console.log('✅ 토큰 저장 성공');
      return true;
    } catch (error) {
      console.error('❌ 토큰 저장 실패:', error);
      return false;
    }
  }

  // 인증 토큰 불러오기
  static async getTokens(): Promise<TokenData | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(this.SERVICE_NAME);
      
      if (credentials && credentials.password) {
        const tokenData: TokenData = JSON.parse(credentials.password);
        console.log('✅ 토큰 불러오기 성공');
        return tokenData;
      }
      
      return null;
    } catch (error) {
      console.error('❌ 토큰 불러오기 실패:', error);
      return null;
    }
  }

  // 인증 토큰 삭제
  static async clearTokens(): Promise<boolean> {
    try {
      await Keychain.resetGenericPassword({ service: this.SERVICE_NAME });
      console.log('✅ 토큰 삭제 성공');
      return true;
    } catch (error) {
      console.error('❌ 토큰 삭제 실패:', error);
      return false;
    }
  }

  // FCM 토큰 저장
  static async saveFcmToken(fcmToken: string, deviceInfo?: any): Promise<boolean> {
    try {
      const fcmData: FcmTokenData = { 
        fcmToken, 
        deviceInfo, 
        savedAt: new Date().toISOString() 
      };
      
      await Keychain.setInternetCredentials(
        this.FCM_SERVICE_NAME,
        'fcm_token',
        JSON.stringify(fcmData)
      );
      
      console.log('✅ FCM 토큰 저장 성공');
      return true;
    } catch (error) {
      console.error('❌ FCM 토큰 저장 실패:', error);
      return false;
    }
  }

  // FCM 토큰 불러오기
  static async getFcmToken(): Promise<{fcmToken: string, deviceInfo?: any} | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(this.FCM_SERVICE_NAME);
      
      if (credentials && credentials.password) {
        const fcmData: FcmTokenData = JSON.parse(credentials.password);
        console.log('✅ FCM 토큰 불러오기 성공');
        return { fcmToken: fcmData.fcmToken, deviceInfo: fcmData.deviceInfo };
      }
      
      return null;
    } catch (error) {
      console.error('❌ FCM 토큰 불러오기 실패:', error);
      return null;
    }
  }

  // FCM 토큰 삭제
  static async clearFcmToken(): Promise<boolean> {
    try {
      await Keychain.resetGenericPassword({ service: this.FCM_SERVICE_NAME });
      console.log('✅ FCM 토큰 삭제 성공');
      return true;
    } catch (error) {
      console.error('❌ FCM 토큰 삭제 실패:', error);
      return false;
    }
  }

  // JWT 토큰 만료 확인
  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch {
      return true;
    }
  }

  // 모든 토큰 삭제 (로그아웃 시)
  static async clearAllTokens(): Promise<boolean> {
    try {
      await Promise.all([
        this.clearTokens(),
        this.clearFcmToken()
      ]);
      console.log('✅ 모든 토큰 삭제 완료');
      return true;
    } catch (error) {
      console.error('❌ 토큰 전체 삭제 실패:', error);
      return false;
    }
  }
} 