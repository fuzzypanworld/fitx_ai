
export class MeditationAudio {
  private audio: HTMLAudioElement;
  private onError: (message: string) => void;

  constructor(audio: HTMLAudioElement, onError: (message: string) => void) {
    this.audio = audio;
    this.onError = onError;
  }

  async playText(text: string): Promise<void> {
    try {
      const response = await fetch('http://localhost:54321/functions/v1/elevenlabs-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const audioContent = data.audioContent;
      const audioUrl = `data:audio/mp3;base64,${audioContent}`;
      
      this.audio.src = audioUrl;
      await this.audio.play();

      return new Promise((resolve) => {
        this.audio.onended = () => resolve();
      });
    } catch (error) {
      console.error('Error playing text:', error);
      this.onError('Failed to play audio guidance. Please try again.');
      throw error;
    }
  }
}
