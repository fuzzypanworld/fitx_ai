
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Mic, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface VoiceChatProps {
  onClose: () => void;
}

class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

const VoiceChat = ({ onClose }: VoiceChatProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioQueueRef = useRef<Uint8Array[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);

  const stopRecording = useCallback(() => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsActive(false);
  }, []);

  const encodeAudioData = (float32Array: Float32Array): string => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(binary);
  };

  const handleAudioData = useCallback((audioData: Float32Array) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const encoded = encodeAudioData(audioData);
      wsRef.current.send(JSON.stringify({
        type: 'audio',
        audio: encoded
      }));
    }
  }, []);

  const playAudioChunk = async (audioData: Uint8Array) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    try {
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.buffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        isPlayingRef.current = false;
        playNextChunk();
      };
      
      source.start(0);
      isPlayingRef.current = true;
    } catch (error) {
      console.error('Error playing audio chunk:', error);
      isPlayingRef.current = false;
      playNextChunk();
    }
  };

  const playNextChunk = () => {
    if (audioQueueRef.current.length > 0 && !isPlayingRef.current) {
      const nextChunk = audioQueueRef.current.shift();
      if (nextChunk) {
        playAudioChunk(nextChunk);
      }
    }
  };

  const startRecording = useCallback(async () => {
    try {
      // Initialize WebSocket connection with correct URL format
      wsRef.current = new WebSocket(`wss://olcnfmrixglengxpiexf.supabase.co/functions/v1/voice-chat`);
      
      // Add connection timeout
      const connectionTimeout = setTimeout(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          toast({
            title: "Connection Timeout",
            description: "Could not establish connection. Please try again.",
            variant: "destructive",
          });
          stopRecording();
        }
      }, 5000);

      wsRef.current.onopen = async () => {
        clearTimeout(connectionTimeout);
        console.log("WebSocket connection established");
        
        try {
          audioRecorderRef.current = new AudioRecorder(handleAudioData);
          await audioRecorderRef.current.start();
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
        if (isActive) {
          toast({
            title: "Connection Lost",
            description: "Voice chat connection was lost. Reconnecting...",
            variant: "destructive",
          });
          // Attempt to reconnect
          setTimeout(startRecording, 1000);
        }
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

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'transcript') {
            setLastTranscript(data.text);
          } else if (data.type === 'response') {
            toast({
              title: "Assistant",
              description: data.text,
            });
          } else if (data.type === 'error') {
            console.error('Server error:', data.message);
            toast({
              title: "Error",
              description: data.message,
              variant: "destructive",
            });
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
  }, [handleAudioData, toast, stopRecording, isActive]);

  useEffect(() => {
    // Start recording automatically when component mounts
    startRecording();
    
    return () => {
      stopRecording();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [startRecording, stopRecording]);

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
          className={`absolute inset-2 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 transition-transform ${
            isActive ? 'scale-110' : ''
          }`}
          style={{
            transform: isActive ? `scale(${1 + Math.sin(Date.now() / 500) * 0.1})` : 'scale(1)',
          }}
        />
      </div>

      <div className="mt-4 text-sm text-muted-foreground">
        {isActive ? (
          <span>{lastTranscript || "Listening..."}</span>
        ) : (
          <span>Connecting...</span>
        )}
      </div>
    </div>
  );
};

export default VoiceChat;
