
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
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const { toast } = useToast();

  const speakGreeting = () => {
    if (synthRef.current && !hasGreeted) {
      const name = user?.name || 'there';
      const greeting = `Hello ${name}! I'm FitX AI. How can I help you today?`;
      const utterance = new SpeechSynthesisUtterance(greeting);
      utterance.onstart = () => setIsAISpeaking(true);
      utterance.onend = () => {
        setIsAISpeaking(false);
        setHasGreeted(true);
      };
      synthRef.current.speak(utterance);
    }
  };

  useEffect(() => {
    try {
      // Initialize speech recognition
      if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = false; // Changed to false for single interactions
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onstart = () => {
          console.log('Speech recognition started');
          setIsRecording(true);
          setIsSpeaking(false);
          if (!hasGreeted) {
            speakGreeting();
          }
        };

        recognitionRef.current.onend = () => {
          console.log('Speech recognition ended');
          setIsSpeaking(false);
          // Only restart if we're still supposed to be recording and not processing
          if (isRecording && !isProcessing && !isAISpeaking && recognitionRef.current) {
            console.log('Restarting speech recognition');
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.error('Error restarting recognition:', error);
              setIsRecording(false);
            }
          }
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

        recognitionRef.current.onresult = async (event: SpeechRecognitionEvent) => {
          console.log('Speech recognition result received');
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join(' ');

          console.log('Transcript:', transcript);
          if (transcript.trim()) {
            recognitionRef.current?.stop(); // Stop recording while processing
            setIsProcessing(true);
            await processText(transcript);
          }
        };

        // Initialize speech synthesis
        synthRef.current = window.speechSynthesis;
      } else {
        toast({
          title: "Error",
          description: "Speech recognition is not supported in your browser",
          variant: "destructive",
        });
      }

      return () => {
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }
        if (synthRef.current) {
          synthRef.current.cancel();
        }
      };
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
      toast({
        title: "Error",
        description: "Failed to initialize speech recognition",
        variant: "destructive",
      });
    }
  }, [toast, isRecording, isProcessing, isAISpeaking, hasGreeted, user]);

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      try {
        recognitionRef.current.start();
        console.log('Starting speech recognition');
      } catch (error) {
        console.error('Error starting recognition:', error);
        setIsRecording(false);
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      console.log('Stopping speech recognition');
    }
  };

  const processText = async (text: string) => {
    try {
      console.log('Processing text:', text);
      
      const { data, error } = await supabase.functions.invoke('voice-chat', {
        body: { 
          text,
          userName: user?.name
        }
      });

      if (error) throw error;

      console.log('AI response:', data.responseText);

      // Use Web Speech Synthesis for the response
      const utterance = new SpeechSynthesisUtterance(data.responseText);
      utterance.onstart = () => {
        console.log('AI started speaking');
        setIsAISpeaking(true);
      };
      utterance.onend = () => {
        console.log('AI finished speaking');
        setIsAISpeaking(false);
        setIsProcessing(false);
        // Resume recognition after AI finishes speaking
        if (isRecording && recognitionRef.current) {
          console.log('Resuming speech recognition after AI response');
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.error('Error resuming recognition:', error);
            setIsRecording(false);
          }
        }
      };
      
      if (synthRef.current) {
        synthRef.current.speak(utterance);
      }

      toast({
        title: "You said:",
        description: text,
      });

    } catch (error) {
      console.error('Error processing text:', error);
      toast({
        title: "Error",
        description: "Failed to process your message",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
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
            disabled={isProcessing || isAISpeaking}
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
