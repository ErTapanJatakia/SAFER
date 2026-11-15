import type { AccessibilitySettings } from '../types/theme.ts';

export type SpokenAnnouncementPreferences = Pick<AccessibilitySettings, 'spokenAnnouncements' | 'speechRate' | 'speechVolume'>;

export interface SpeechRuntime {
  speechSynthesis: Pick<SpeechSynthesis, 'cancel' | 'speak'>;
  SpeechSynthesisUtterance: new (text: string) => SpeechSynthesisUtterance;
}

const SPEECH_RATES: Record<SpokenAnnouncementPreferences['speechRate'], number> = { slow: 0.85, normal: 1, fast: 1.15 };
const SPEECH_VOLUMES: Record<SpokenAnnouncementPreferences['speechVolume'], number> = { low: 0.4, medium: 0.7, high: 1 };

/** Uses only the browser/OS speech engine; SAFER does not provide a hosted audio service. */
export function speakAccessibilityAnnouncement(
  message: string,
  preferences: SpokenAnnouncementPreferences,
  runtime: SpeechRuntime | undefined = typeof window !== 'undefined' && 'speechSynthesis' in window
    && typeof SpeechSynthesisUtterance !== 'undefined' ? window as unknown as SpeechRuntime : undefined,
): boolean {
  if (!preferences.spokenAnnouncements || !message.trim() || !runtime) return false;
  try {
    runtime.speechSynthesis.cancel();
    const utterance = new runtime.SpeechSynthesisUtterance(message);
    utterance.rate = SPEECH_RATES[preferences.speechRate];
    utterance.volume = SPEECH_VOLUMES[preferences.speechVolume];
    runtime.speechSynthesis.speak(utterance);
    return true;
  } catch {
    // Speech is optional; never interfere with the accessible live-region fallback.
    return false;
  }
}
