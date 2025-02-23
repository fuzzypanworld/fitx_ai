
export class MeditationAudio {
  private audio: HTMLAudioElement;
  private onError: (message: string) => void;

  constructor(audio: HTMLAudioElement, onError: (message: string) => void) {
    this.audio = audio;
    this.onError = onError;

    // Set up audio configuration
    this.audio.preload = 'auto';
    this.audio.volume = 1.0;
  }

  async playText(text: string): Promise<void> {
    try {
      console.log('Generating speech for:', text);
      
      const response = await fetch('http://localhost:54321/functions/v1/elevenlabs-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate speech');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Stop any current playback
      this.audio.pause();
      this.audio.currentTime = 0;

      const audioContent = data.audioContent;
      const audioUrl = `data:audio/mp3;base64,${audioContent}`;
      
      this.audio.src = audioUrl;

      // Wait for audio to be loaded
      await new Promise((resolve, reject) => {
        this.audio.oncanplaythrough = resolve;
        this.audio.onerror = reject;
      });

      // Play the audio
      await this.audio.play();

      // Wait for audio to finish playing
      return new Promise((resolve) => {
        this.audio.onended = () => {
          console.log('Audio finished playing:', text);
          resolve();
        };
      });
    } catch (error) {
      console.error('Error playing text:', error);
      this.onError('Failed to play audio guidance. Please try again.');
      throw error;
    }
  }
}
