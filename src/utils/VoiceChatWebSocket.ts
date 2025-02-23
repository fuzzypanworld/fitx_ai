
import { toast as toastFn } from "@/components/ui/use-toast";

type ToastFunction = typeof toastFn;

export class VoiceChatWebSocket {
  private ws: WebSocket | null = null;
  private audioElement: HTMLAudioElement;
  private speakingRef: { current: boolean };

  constructor(
    private onTranscript: (text: string) => void,
    private toast: ToastFunction,
    audioRef: React.RefObject<HTMLAudioElement>,
    speakingRef: React.MutableRefObject<boolean>
  ) {
    if (!audioRef.current) throw new Error('Audio element not initialized');
    this.audioElement = audioRef.current;
    this.speakingRef = speakingRef;
  }

  async connect() {
    this.ws = new WebSocket(`wss://olcnfmrixglengxpiexf.supabase.co/functions/v1/voice-chat?tts=google`);
    
    this.ws.onmessage = this.handleMessage;
    this.ws.onerror = this.handleError;
    this.ws.onclose = this.handleClose;

    return new Promise<void>((resolve, reject) => {
      if (!this.ws) return reject(new Error('WebSocket not initialized'));
      this.ws.onopen = () => resolve();
    });
  }

  private handleMessage = async (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'transcript') {
        this.onTranscript(data.text);
      } else if (data.type === 'response') {
        this.speakingRef.current = true;
        this.audioElement.onended = () => {
          this.speakingRef.current = false;
        };
        this.toast({
          title: "Assistant",
          description: data.text,
        });
      } else if (data.type === 'audio' && data.audio) {
        this.audioElement.src = `data:audio/mp3;base64,${data.audio}`;
        await this.audioElement.play();
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  private handleError = (error: Event) => {
    console.error('WebSocket error:', error);
    this.toast({
      title: "Connection Error",
      description: "Voice chat encountered an error. Please try again.",
      variant: "destructive",
    });
  };

  private handleClose = (event: CloseEvent) => {
    console.log("WebSocket connection closed:", event.code, event.reason);
  };

  sendAudio(audioData: string) {
    if (this.ws?.readyState === WebSocket.OPEN && !this.speakingRef.current) {
      this.ws.send(JSON.stringify({
        type: 'audio',
        audio: audioData
      }));
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
