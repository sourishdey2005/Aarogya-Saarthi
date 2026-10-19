/**
 * Speech synthesis utility for playing spoken audio guidance.
 *
 * The spoken language follows the language selected by the user in the app
 * (हिन्दी / English). When English is active the Hindi source text is
 * translated before it is spoken.
 */
import { getCurrentLanguage, translateText } from '../i18n/LanguageContext';

export function playSpokenText(
  text: string,
  onStart?: () => void,
  onEnd?: () => void
): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onStart) onStart();
    const timer = setTimeout(() => {
      if (onEnd) onEnd();
    }, 3000);
    return () => clearTimeout(timer);
  }

  const language = getCurrentLanguage();
  const spokenText = language === 'en' ? translateText(text) : text;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(spokenText);
  utterance.rate = 0.9; // slightly slower for rural clarity
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const locale = language === 'en' ? 'en-IN' : 'hi-IN';
  const prefix = language === 'en' ? 'en' : 'hi';

  const matchingVoice = voices.find(
    (v) =>
      v.lang.toLowerCase().startsWith(prefix) ||
      v.lang.toLowerCase().includes(language === 'en' ? 'english' : 'hindi') ||
      v.name.toLowerCase().includes(language === 'en' ? 'english' : 'hindi')
  );

  if (matchingVoice) {
    utterance.voice = matchingVoice;
    utterance.lang = locale;
  } else {
    utterance.lang = locale;
  }

  utterance.onstart = () => {
    if (onStart) onStart();
  };

  utterance.onend = () => {
    if (onEnd) onEnd();
  };

  utterance.onerror = () => {
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);

  return () => {
    window.speechSynthesis.cancel();
    if (onEnd) onEnd();
  };
}

export function stopSpokenText() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
