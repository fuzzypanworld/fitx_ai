
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Mic, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VoiceChatProps {
  onClose: () => void;
}

const VoiceChat = ({ onClose }: VoiceChatProps) => {
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [amplitude, setAmplitude] = useState(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
    }
    synthRef.current = window.speechSynthesis;

    return () => {
      stopRecording();
    };
  }, []);

  const updateAmplitude = () => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const amplitude = Math.max(...Array.from(dataArray)) / 255;
      setAmplitude(amplitude);
      animationFrameRef.current = requestAnimationFrame(updateAmplitude);
    }
  };

  const getAIResponse = async (message: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: { message },
      });

      if (error) throw error;
      return data.response;
    } catch (error) {
      console.error('Error getting AI response:', error);
      return "I'm sorry, I couldn't process that request. Please try again.";
    }
  };

  const startRecording = useCallback(async () => {
    try {
      if (!recognitionRef.current) {
        throw new Error('Speech recognition not supported in this browser');
      }

      // Set up audio visualization
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      mediaSourceRef.current = audioContextRef.current.createMediaStreamSource(streamRef.current);
      mediaSourceRef.current.connect(analyserRef.current);
      animationFrameRef.current = requestAnimationFrame(updateAmplitude);

      // Start speech recognition
      recognitionRef.current.onresult = async (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        setLastTranscript(transcript);
        
        if (event.results[event.results.length - 1].isFinal) {
          // Get AI response
          const response = await getAIResponse(transcript);
          
          // Speak the response with calm voice settings
          if (synthRef.current) {
            const utterance = new SpeechSynthesisUtterance(response);
            
            // Set voice properties for a calming effect
            utterance.volume = 0.8; // Slightly softer volume
            utterance.rate = 0.9; // Slightly slower rate
            utterance.pitch = 0.9; // Slightly lower pitch

            // Try to use a female voice if available (usually sounds calmer)
            const voices = synthRef.current.getVoices();
            const femaleVoice = voices.find(voice => 
              voice.name.includes('Female') || 
              voice.name.includes('Samantha') || 
              voice.name.includes('Karen') ||
              voice.name.includes('Victoria')
            );
            
            if (femaleVoice) {
              utterance.voice = femaleVoice;
            }

            synthRef.current.speak(utterance);
          }

          toast({
            title: "Assistant",
            description: response,
          });
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: "Error",
          description: "Speech recognition error. Please try again.",
          variant: "destructive",
        });
        stopRecording();
      };

      recognitionRef.current.start();
      setIsActive(true);
    } catch (error) {
      console.error('Error starting voice chat:', error);
      toast({
        title: "Error",
        description: "Could not start voice chat. Please ensure microphone access is granted.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.cancel();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setIsActive(false);
    setAmplitude(0);
  }, []);

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
