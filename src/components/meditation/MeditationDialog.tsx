
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { BreathingCircle } from "./BreathingCircle";
import { MeditationAudio } from "./MeditationAudio";

interface MeditationDialogProps {
  open: boolean;
  onClose: () => void;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const MeditationDialog = ({ open, onClose }: MeditationDialogProps) => {
  const [currentLap, setCurrentLap] = useState(0);
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const meditationAudioRef = useRef<MeditationAudio | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const cycleRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  useEffect(() => {
    if (open && !audioRef.current) {
      audioRef.current = new Audio();
      meditationAudioRef.current = new MeditationAudio(
        audioRef.current,
        (message) => toast({ title: "Error", description: message, variant: "destructive" })
      );
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        meditationAudioRef.current = null;
      }
      if (cycleRef.current) {
        clearTimeout(cycleRef.current);
      }
    };
  }, [open, toast]);

  const startBreathingCycle = async () => {
    try {
      if (!meditationAudioRef.current || !isStarted) return;
      let currentCycle = currentLap;

      const doCycle = async () => {
        // Inhale phase
        setPhase("inhale");
        await meditationAudioRef.current?.playText("Breathe in deeply");
        await wait(4000);

        if (!isStarted) return;

        // Hold phase
        setPhase("hold");
        await meditationAudioRef.current?.playText("Hold your breath");
        await wait(4000);

        if (!isStarted) return;

        // Exhale phase
        setPhase("exhale");
        await meditationAudioRef.current?.playText("Release and breathe out slowly");
        await wait(4000);

        if (!isStarted) return;

        currentCycle++;
        setCurrentLap(currentCycle);

        if (currentCycle < 3 && isStarted) {
          cycleRef.current = setTimeout(doCycle, 1000);
        } else if (isStarted) {
          await meditationAudioRef.current?.playText(
            "Well done. Your meditation session is complete. Take a moment to feel the peace within."
          );
          setIsStarted(false);
          setPhase("inhale");
          setCurrentLap(0);
        }
      };

      await doCycle();
    } catch (error) {
      console.error("Error in breathing cycle:", error);
      toast({
        title: "Error",
        description: "There was an issue with the meditation guidance. Please try again.",
        variant: "destructive",
      });
      setIsStarted(false);
    }
  };

  const startMeditation = async () => {
    setIsLoading(true);
    try {
      if (!meditationAudioRef.current) return;
      
      const introText = "Welcome to your meditation session. Let's begin with deep breathing exercises. I'll guide you through each breath.";
      await meditationAudioRef.current.playText(introText);
      
      setIsStarted(true);
      startBreathingCycle();
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

  const handleClose = () => {
    if (isStarted) {
      const confirmed = window.confirm("Are you sure you want to end your meditation session?");
      if (!confirmed) return;
      setIsStarted(false);
      if (cycleRef.current) {
        clearTimeout(cycleRef.current);
      }
    }
    setCurrentLap(0);
    setPhase("inhale");
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

          <BreathingCircle phase={phase} />

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
