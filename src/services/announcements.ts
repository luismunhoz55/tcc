import { AccessibilityInfo } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

export async function announce(message: string, spoken = true) {
  const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
  if (screenReaderEnabled) {
    AccessibilityInfo.announceForAccessibility(message);
  } else if (spoken) {
    Speech.stop();
    Speech.speak(message, { language: 'pt-BR', rate: 0.9 });
  }
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function stopAnnouncement() {
  Speech.stop();
}
