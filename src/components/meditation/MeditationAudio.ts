
import { supabase } from "@/integrations/supabase/client";

export class MeditationAudio {
  constructor(
    private audioElement: HTMLAudioElement,
    private onError: (message: string) => void
  ) {}

  async playText(text: string): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, tts: 'google' }
      });

      if (error) throw error;
      if (!data?.audioContent) throw new Error('No audio content received');

      return new Promise((resolve, reject) => {
        this.audioElement.onended = () => resolve();
        this.audioElement.onerror = (e) => reject(e);
        this.audioElement.src = `data:audio/mpeg;base64,${data.audioContent}`;
        this.audioElement.play().catch(reject);
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      this.onError('Failed to play audio. Please try again.');
      throw error;
    }
  }

  stop() {
    this.audioElement.pause();
    this.audioElement.currentTime = 0;
  }
}
