
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";

interface VoiceVisualizerProps {
  amplitude: number;
  isActive: boolean;
  onToggle: () => void;
}

export const VoiceVisualizer = ({ amplitude, isActive, onToggle }: VoiceVisualizerProps) => {
  const scale = 1 + (amplitude * 0.5);

  return (
    <div className="relative w-32 h-32">
      <div className="absolute inset-0 rounded-full bg-blue-500/20" />
      <div 
        className="absolute inset-2 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 transition-transform duration-100"
        style={{ transform: `scale(${scale})` }}
      />
      <Button
        onClick={onToggle}
        variant="ghost"
        size="icon"
        className="absolute inset-0 w-full h-full rounded-full hover:bg-transparent"
      >
        <Mic className={`h-8 w-8 transition-colors ${isActive ? 'text-red-500' : 'text-blue-500'}`} />
      </Button>
    </div>
  );
};
