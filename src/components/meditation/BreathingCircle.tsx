
import { cn } from "@/lib/utils";

interface BreathingCircleProps {
  phase: "inhale" | "hold" | "exhale";
}

export const BreathingCircle = ({ phase }: BreathingCircleProps) => {
  return (
    <div className="relative w-48 h-48">
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
  );
};
