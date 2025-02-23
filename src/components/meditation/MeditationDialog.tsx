
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface MeditationDialogProps {
  open: boolean;
  onClose: () => void;
}

export const MeditationDialog = ({ open, onClose }: MeditationDialogProps) => {
  const [currentLap, setCurrentLap] = useState(0);
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && !audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => {
        console.log("Audio playback completed");
      };
      audioRef.current.onerror = (e) => {
        console.error('Audio error:', e);
        toast({
          title: "Error",
          description: "Failed to play audio. Please try again.",
          variant: "destructive",
        });
      };
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [open, toast]);

  const startMeditation = async () => {
    setIsLoading(true);
    try {
      console.log("Starting meditation session...");
      const introText = "Welcome to your meditation session. Let's begin with deep breathing exercises. I'll guide you through each breath.";
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text: introText, tts: 'google' }
      });

      console.log("Text-to-speech response:", { data, error });

      if (error) {
        console.error('Text-to-speech error:', error);
        throw error;
      }

      if (!data?.audioContent) {
        throw new Error('No audio content received');
      }

      if (audioRef.current) {
        audioRef.current.src = `data:audio/mpeg;base64,${data.audioContent}`;
        await audioRef.current.play();
        console.log("Audio started playing");
        setIsStarted(true);
        startBreathingCycle();
      }
    } catch (error) {
      console.error('Error starting meditation:', error);
      toast({
        title: "Error",
        description: "Failed to start meditation. Please try again.",
        variant: "destructive",
      });
      setIsStarted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = async (text: string): Promise<void> => {
    try {
      if (!audioRef.current) return;

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, tts: 'google' }
      });

      if (error) throw error;
      if (!data?.audioContent) throw new Error('No audio content received');

      return new Promise((resolve, reject) => {
        if (!audioRef.current) {
          reject(new Error('Audio element not initialized'));
          return;
        }

        audioRef.current.onended = () => resolve();
        audioRef.current.onerror = (e) => reject(e);
        audioRef.current.src = `data:audio/mpeg;base64,${data.audioContent}`;
        audioRef.current.play().catch(reject);
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  };

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const startBreathingCycle = async () => {
    let currentLap = 0;
    const totalLaps = 3; // Reduced for testing

    const breathingCycle = async () => {
      try {
        if (!isStarted) return;

        // Inhale phase
        setPhase("inhale");
        await playAudio("Breathe in deeply");
        await wait(4000);
        
        if (!isStarted) return;
        
        // Hold phase
        setPhase("hold");
        await playAudio("Hold your breath");
        await wait(4000);
        
        if (!isStarted) return;
        
        // Exhale phase
        setPhase("exhale");
        await playAudio("Release and breathe out slowly");
        await wait(4000);
        
        if (!isStarted) return;
        
        currentLap++;
        setCurrentLap(currentLap);
        
        if (currentLap < totalLaps && isStarted) {
          await breathingCycle();
        } else if (isStarted) {
          await playAudio("Well done. Your meditation session is complete. Take a moment to feel the peace within.");
          setIsStarted(false);
          setPhase("inhale");
        }
      } catch (error) {
        console.error('Error in breathing cycle:', error);
        toast({
          title: "Error",
          description: "There was an issue with the meditation guidance. Please try again.",
          variant: "destructive",
        });
        setIsStarted(false);
      }
    };
    
    await breathingCycle();
  };

  const handleClose = () => {
    if (isStarted) {
      const confirmed = window.confirm("Are you sure you want to end your meditation session?");
      if (!confirmed) return;
      setIsStarted(false);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Meditation Session</DialogTitle>
        </DialogHeader>
        <div className="relative h-[400px] flex flex-col items-center justify-center">
          <Button
            variant="ghost"
            className="absolute right-4 top-4"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="relative w-48 h-48 mb-8">
            <div className={cn(
              "absolute inset-0 rounded-full transition-all duration-1000",
              phase === "inhale" && "scale-110 bg-blue-400/20",
              phase === "hold" && "scale-100 bg-green-400/20",
              phase === "exhale" && "scale-90 bg-blue-400/20"
            )}>
              <div className={cn(
                "absolute inset-4 rounded-full bg-gradient-to-b transition-all duration-1000",
                phase === "inhale" && "from-blue-400 to-blue-600 scale-110",
                phase === "hold" && "from-green-400 to-green-600 scale-100",
                phase === "exhale" && "from-blue-400 to-blue-600 scale-90"
              )} />
            </div>
          </div>

          <div className="text-center mb-4">
            {!isStarted ? (
              <Button 
                onClick={startMeditation}
                disabled={isLoading}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isLoading ? "Starting..." : "Start Meditation"}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-semibold">
                  {phase === "inhale" && "Breathe In"}
                  {phase === "hold" && "Hold"}
                  {phase === "exhale" && "Breathe Out"}
                </div>
                <div className="text-sm text-muted-foreground">
                  Lap {currentLap + 1} of 3
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
