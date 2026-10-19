/**
 * Speech synthesis utility for playing spoken audio guidance in Hindi.
 */
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

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9; // slightly slower for rural clarity
  utterance.pitch = 1.0;

  // Try to find a Hindi voice
  const voices = window.speechSynthesis.getVoices();
  const hindiVoice = voices.find(
    (v) => v.lang.startsWith('hi') || v.lang.includes('Hindi') || v.name.includes('Hindi')
  );
  if (hindiVoice) {
    utterance.voice = hindiVoice;
    utterance.lang = 'hi-IN';
  } else {
    utterance.lang = 'hi-IN';
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
