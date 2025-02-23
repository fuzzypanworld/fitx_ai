
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Mic, X } from 'lucide-react';

interface VoiceChatProps {
  onClose: () => void;
}

class AudioRecorder {
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
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
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

const VoiceChat = ({ onClose }: VoiceChatProps) => {
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [lastTranscript, setLastTranscript] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speakingRef = useRef(false);

  useEffect(() => {
    audioRef.current = new Audio();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsActive(false);
    setAmplitude(0);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      wsRef.current = new WebSocket(`wss://olcnfmrixglengxpiexf.supabase.co/functions/v1/voice-chat?tts=google`);
      
      wsRef.current.onopen = async () => {
        console.log("WebSocket connection established");
        
        try {
          recorderRef.current = new AudioRecorder(
            (audioData) => {
              if (wsRef.current?.readyState === WebSocket.OPEN && !speakingRef.current) {
                wsRef.current.send(JSON.stringify({
                  type: 'audio',
                  audio: audioData
                }));
              }
            },
            setAmplitude
          );
          
          await recorderRef.current.start();
          setIsActive(true);
        } catch (micError) {
          console.error('Microphone access error:', micError);
          toast({
            title: "Microphone Error",
            description: "Please ensure microphone access is granted and try again.",
            variant: "destructive",
          });
          stopRecording();
        }
      };

      wsRef.current.onclose = (event) => {
        console.log("WebSocket connection closed:", event.code, event.reason);
        stopRecording();
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Connection Error",
          description: "Voice chat encountered an error. Please try again.",
          variant: "destructive",
        });
        stopRecording();
      };

      wsRef.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'transcript') {
            setLastTranscript(data.text);
          } else if (data.type === 'response') {
            speakingRef.current = true;
            toast({
              title: "Assistant",
              description: data.text,
            });
          } else if (data.type === 'audio' && audioRef.current && data.audio) {
            audioRef.current.src = `data:audio/mp3;base64,${data.audio}`;
            await audioRef.current.play();
            audioRef.current.onended = () => {
              speakingRef.current = false;
            };
          }
        } catch (parseError) {
          console.error('Error parsing WebSocket message:', parseError);
        }
      };
    } catch (error) {
      console.error('Error starting voice chat:', error);
      toast({
        title: "Error",
        description: "Could not start voice chat. Please try again.",
        variant: "destructive",
      });
    }
  }, [stopRecording, toast]);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  const scale = 1 + (amplitude * 0.5);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-50 flex flex-col items-center justify-center">
      <Button 
        onClick={onClose}
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 p-2 hover:bg-accent rounded-full"
      >
        <X className="h-6 w-6" />
      </Button>

      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 rounded-full bg-blue-500/20" />
        <div 
          className="absolute inset-2 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 transition-transform duration-100"
          style={{ transform: `scale(${scale})` }}
        />
        <Button
          onClick={isActive ? stopRecording : startRecording}
          variant="ghost"
          size="icon"
          className="absolute inset-0 w-full h-full rounded-full hover:bg-transparent"
        >
          <Mic className={`h-8 w-8 transition-colors ${isActive ? 'text-red-500' : 'text-blue-500'}`} />
        </Button>
      </div>

      <div className="mt-4 text-sm text-muted-foreground">
        {isActive ? (
          <span>{lastTranscript || "Listening..."}</span>
        ) : (
          <span>Click the microphone to start</span>
        )}
      </div>
    </div>
  );
};

export default VoiceChat;
