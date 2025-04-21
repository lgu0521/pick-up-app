/**
 * @format
 */

import {AppRegistry, Platform} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import App from './App';
import {name as appName} from './app.json';

// 알림 채널 설정 (Android)
PushNotification.createChannel(
  {
    channelId: "default",
    channelName: "Default Channel",
    channelDescription: "A default channel for notifications",
    soundName: "notification_sound",
    importance: 4,
    vibrate: true,
    playSound: true,
  },
  (created) => console.log(`createChannel returned '${created}'`)
);

// 알림 설정
PushNotification.configure({
  onNotification: function (notification) {
    console.log("NOTIFICATION:", notification);
  },
  requestPermissions: Platform.OS === 'ios',
  popInitialNotification: true,
  soundName: 'notification_sound.mp3',
});

// Register background handler
// messaging().setBackgroundMessageHandler(async remoteMessage => {
//     console.log('백그라운드에서 메시지가 처리되었습니다!', remoteMessage);
// });

// iOS 전용 설정
if (Platform.OS === 'ios') {
    messaging().setForegroundNotificationPresentationOptions({
        alert: true,
        badge: true,
        sound: true,
    });
}

// 백그라운드 실행 여부 확인을 위한 컴포넌트
function HeadlessCheck({ isHeadless }) {
  if (isHeadless) {
    // iOS에서 백그라운드로 실행된 경우 null 반환
    return null;
  }

  // 포그라운드 실행인 경우 App 컴포넌트 반환
  return <App />;
}

AppRegistry.registerComponent(appName, () => HeadlessCheck);
