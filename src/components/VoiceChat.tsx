import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Mic, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VoiceChatProps {
  onClose: () => void;
}

const VoiceChat = ({ onClose }: VoiceChatProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      setTimeLeft(360);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setTimeLeft(0);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      
      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          }
        };
        reader.readAsDataURL(audioBlob);
      });

      const { data, error } = await supabase.functions.invoke('voice-chat', {
        body: { audioContent: base64Audio }
      });

      if (error) throw error;

      const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
      await audio.play();

      toast({
        title: "You said:",
        description: data.transcribedText,
      });

    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: "Error",
        description: "Failed to process audio",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-50 flex flex-col items-center justify-center">
      <button 
        onClick={() => {
          if (isRecording) stopRecording();
          onClose();
        }}
        className="absolute top-4 right-4 p-2 hover:bg-accent rounded-full"
      >
        <X className="h-6 w-6" />
      </button>

      <div className="relative w-32 h-32 mb-8">
        <div className="absolute inset-0 rounded-full bg-blue-500/20" />
        <div 
          className="absolute inset-2 rounded-full bg-gradient-to-b from-blue-400 to-blue-600"
          style={{
            animation: isRecording ? 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
          }}
        />
      </div>

      {timeLeft > 0 && (
        <div className="mb-4 text-sm text-muted-foreground">
          {formatTime(timeLeft)} left
        </div>
      )}

      <div className="flex gap-4">
        {isRecording ? (
          <Button
            size="lg"
            variant="outline"
            onClick={stopRecording}
            className="rounded-full w-14 h-14 p-0"
          >
            <X className="h-6 w-6" />
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={startRecording}
            disabled={isProcessing}
            className="rounded-full w-14 h-14 p-0 bg-blue-500 hover:bg-blue-600"
          >
            <Mic className="h-6 w-6" />
          </Button>
        )}
      </div>

      {isProcessing && (
        <div className="mt-4 text-sm text-muted-foreground animate-pulse">
          Processing your message...
        </div>
      )}
    </div>
  );
};

export default VoiceChat;
