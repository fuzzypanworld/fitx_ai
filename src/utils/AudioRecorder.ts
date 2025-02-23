
export class AudioRecorder {
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrame: number | null = null;
  
  constructor(
    private onAudioData: (audioData: string) => void,
    private onAmplitude: (amplitude: number) => void
  ) {}

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyzer = this.audioContext.createAnalyser();
      this.analyzer.fftSize = 256;
      source.connect(this.analyzer);
      
      this.dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
      this.startVisualization();
      
      this.mediaRecorder = new MediaRecorder(this.stream);
      const chunks: Blob[] = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result?.toString().split(',')[1];
          if (base64Audio) {
            this.onAudioData(base64Audio);
          }
        };
      };
      
      this.mediaRecorder.start(1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  private startVisualization = () => {
    const updateVisualization = () => {
      if (this.analyzer && this.dataArray) {
        this.analyzer.getByteFrequencyData(this.dataArray);
        const amplitude = Math.max(...Array.from(this.dataArray)) / 255;
        this.onAmplitude(amplitude);
      }
      this.animationFrame = requestAnimationFrame(updateVisualization);
    };
    this.animationFrame = requestAnimationFrame(updateVisualization);
  };

  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyzer = null;
    this.dataArray = null;
    this.mediaRecorder = null;
  }

  isRecording() {
    return this.mediaRecorder?.state === 'recording';
  }
}
