
import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Mic, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface VoiceChatProps {
  onClose: () => void;
}

const VoiceChat = ({ onClose }: VoiceChatProps) => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio();

    // Initialize speech recognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onstart = () => {
        console.log('Started listening');
        setIsRecording(true);
      };

      recognitionRef.current.onend = () => {
        console.log('Stopped listening');
        setIsRecording(false);
      };

      recognitionRef.current.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('Heard:', transcript);
        await processText(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: "Error",
          description: "Speech recognition failed. Please try again.",
          variant: "destructive",
        });
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [toast]);

  const startRecording = () => {
    if (recognitionRef.current && !isRecording && !isProcessing) {
      recognitionRef.current.start();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const processText = async (text: string) => {
    try {
      setIsProcessing(true);
      
      // First, get AI response
      const { data: voiceData, error: voiceError } = await supabase.functions.invoke('voice-chat', {
        body: { text, userName: user?.name }
      });

      if (voiceError) throw voiceError;

      // Then convert response to speech
      const { data: speechData, error: speechError } = await supabase.functions.invoke('text-to-speech', {
        body: { text: voiceData.responseText }
      });

      if (speechError) throw speechError;

      if (!speechData?.audioContent) {
        throw new Error('No audio content received');
      }

      // Play the audio response
      if (audioRef.current) {
        audioRef.current.src = `data:audio/mp3;base64,${speechData.audioContent}`;
        audioRef.current.onerror = (e) => {
          console.error('Audio error:', e);
          throw new Error('Failed to play audio');
        };
        
        try {
          await audioRef.current.play();
          console.log('Audio started playing');
        } catch (playError) {
          console.error('Error playing audio:', playError);
          throw playError;
        }
      }

      toast({
        title: "You said:",
        description: text,
      });
    } catch (error) {
      console.error('Error processing voice chat:', error);
      toast({
        title: "Error",
        description: "Failed to process your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

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
            isRecording ? 'scale-110' : ''
          }`}
          style={{
            transform: isRecording ? `scale(${1 + Math.sin(Date.now() / 500) * 0.1})` : 'scale(1)',
          }}
        />
      </div>

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
          <span>Listening...</span>
        ) : (
          <span>Click the mic to start</span>
        )}
      </div>
    </div>
  );
};

export default VoiceChat;
