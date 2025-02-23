
import { speakWithCalmVoice } from "@/utils/voiceSynthesis";

export class MeditationAudio {
  constructor(
    private audioElement: HTMLAudioElement,
    private onError: (message: string) => void
  ) {}

  async playText(text: string): Promise<void> {
    try {
      // Cancel any ongoing speech before starting new one
      window.speechSynthesis.cancel();
      await speakWithCalmVoice(text);
    } catch (error) {
      console.error('Error playing audio:', error);
      this.onError('Failed to play audio. Please try again.');
      throw error;
    }
  }

  stop() {
    window.speechSynthesis.cancel();
  }
}
