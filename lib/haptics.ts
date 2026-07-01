import * as Haptics from 'expo-haptics'

// Best-effort haptic feedback. Guarded — Haptics throws on unsupported hardware
// (some Android, web, simulators), so every call swallows errors and never
// blocks the interaction it accompanies.
export const haptics = {
  light: () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch {}
  },
  medium: () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch {}
  },
  success: () => {
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {}
  },
}
