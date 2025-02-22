
import React, { useRef, useState, useEffect } from 'react';
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
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();
  const silenceTimeoutRef = useRef<NodeJS.Timeout>();
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const { toast } = useToast();

  const detectSilence = (dataArray: Uint8Array) => {
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const average = sum / dataArray.length;
    const isSpeakingNow = average > 20; // Adjust threshold as needed
    setIsSpeaking(isSpeakingNow);

    if (isSpeakingNow && silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }

    if (!isSpeakingNow && !silenceTimeoutRef.current && isRecording) {
      silenceTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 1500); // Stop after 1.5 seconds of silence
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Start analyzing audio
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const checkAudio = () => {
        if (isRecording && analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          detectSilence(dataArray);
          requestAnimationFrame(checkAudio);
        }
      };
      
      checkAudio();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start(100); // Collect data every 100ms
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
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      setTimeLeft(0);
      
      // Clean up audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
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

      // Play the response audio
      const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
      
      audio.onplay = () => setIsAISpeaking(true);
      audio.onended = () => setIsAISpeaking(false);
      
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

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
          className={`absolute inset-2 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 transition-transform duration-150`}
          style={{
            animation: isSpeaking || isAISpeaking 
              ? 'bounce 0.5s ease-in-out infinite alternate'
              : isRecording 
                ? 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                : 'none',
            transform: isSpeaking || isAISpeaking ? `scale(${1 + Math.random() * 0.2})` : 'scale(1)',
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

      <div className="mt-4 text-sm text-muted-foreground">
        {isProcessing ? (
          <span className="animate-pulse">Processing your message...</span>
        ) : isRecording ? (
          <span>Listening{isSpeaking ? '...' : ''}</span>
        ) : isAISpeaking ? (
          <span>AI is speaking...</span>
        ) : (
          <span>Click the mic to start</span>
        )}
      </div>
    </div>
  );
};

export default VoiceChat;
