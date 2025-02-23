
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { X } from 'lucide-react';
import { AudioRecorder } from '@/utils/AudioRecorder';
import { VoiceChatWebSocket } from '@/utils/VoiceChatWebSocket';
import { VoiceVisualizer } from './VoiceVisualizer';

interface VoiceChatProps {
  onClose: () => void;
}

const VoiceChat = ({ onClose }: VoiceChatProps) => {
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [lastTranscript, setLastTranscript] = useState('');
  const wsRef = useRef<VoiceChatWebSocket | null>(null);
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
      if (!audioRef.current) throw new Error('Audio element not initialized');
      
      wsRef.current = new VoiceChatWebSocket(
        setLastTranscript,
        toast,
        audioRef,
        speakingRef
      );
      
      await wsRef.current.connect();
      
      recorderRef.current = new AudioRecorder(
        (audioData) => wsRef.current?.sendAudio(audioData),
        setAmplitude
      );
      
      await recorderRef.current.start();
      setIsActive(true);
    } catch (error) {
      console.error('Error starting voice chat:', error);
      toast({
        title: "Error",
        description: "Could not start voice chat. Please try again.",
        variant: "destructive",
      });
      stopRecording();
    }
  }, [stopRecording, toast]);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

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

      <VoiceVisualizer
        amplitude={amplitude}
        isActive={isActive}
        onToggle={isActive ? stopRecording : startRecording}
      />

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
