
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MeditationDialogProps {
  open: boolean;
  onClose: () => void;
}

export const MeditationDialog = ({ open, onClose }: MeditationDialogProps) => {
  const [currentLap, setCurrentLap] = useState(0);
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    if (open && !audioRef.current) {
      audioRef.current = new Audio();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [open]);

  const startMeditation = async () => {
    setIsStarted(true);
    setCurrentLap(0);
    
    try {
      // Initialize text-to-speech using Eleven Labs
      const introText = "Welcome to your meditation session. This will help you calm your mind. Let's begin with deep breathing exercises.";
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { 
          text: introText,
          voice: "Charlie", // Using a calming male voice
        }
      });

      if (error) throw error;

      if (audioRef.current && data.audioContent) {
        audioRef.current.src = `data:audio/mp3;base64,${data.audioContent}`;
        await audioRef.current.play();
        
        // Start breathing cycle after intro
        startBreathingCycle();
      }
    } catch (error) {
      console.error('Error starting meditation:', error);
    }
  };

  const startBreathingCycle = () => {
    let currentLap = 0;
    const totalLaps = 11;
    
    const breathingCycle = async () => {
      // Inhale phase
      setPhase("inhale");
      await playAudio("Breathe in deeply");
      await wait(4000);
      
      // Hold phase
      setPhase("hold");
      await playAudio("Hold");
      await wait(4000);
      
      // Exhale phase
      setPhase("exhale");
      await playAudio("Breathe out slowly");
      await wait(4000);
      
      currentLap++;
      setCurrentLap(currentLap);
      
      if (currentLap < totalLaps) {
        breathingCycle();
      } else {
        await playAudio("Great job. Your meditation session is complete.");
        setIsStarted(false);
        setPhase("inhale");
      }
    };
    
    breathingCycle();
  };

  const playAudio = async (text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { 
          text,
          voice: "Charlie",
        }
      });

      if (error) throw error;

      if (audioRef.current && data.audioContent) {
        audioRef.current.src = `data:audio/mp3;base64,${data.audioContent}`;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  return (
    <Dialog open={open} onOpenChange={() => {
      if (isStarted) {
        const confirmed = window.confirm("Are you sure you want to end your meditation session?");
        if (!confirmed) return;
      }
      onClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <div className="relative h-[400px] flex flex-col items-center justify-center">
          <Button
            variant="ghost"
            className="absolute right-4 top-4"
            onClick={onClose}
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
                className="bg-blue-500 hover:bg-blue-600"
              >
                Start Meditation
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-semibold">
                  {phase === "inhale" && "Breathe In"}
                  {phase === "hold" && "Hold"}
                  {phase === "exhale" && "Breathe Out"}
                </div>
                <div className="text-sm text-muted-foreground">
                  Lap {currentLap + 1} of 11
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
