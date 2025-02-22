
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Loader2 } from "lucide-react";

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  restTime: number;
}

interface WorkoutData {
  title: string;
  description: string;
  exercises: Exercise[];
}

interface WorkoutCardProps {
  workout: WorkoutData | null;
  isGenerating: boolean;
  onGenerate: () => void;
}

export const WorkoutCard = ({ workout, isGenerating, onGenerate }: WorkoutCardProps) => {
  return (
    <Card className="glass col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5" />
          {workout ? workout.title : "Today's Workout"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {workout ? (
          <div className="space-y-4">
            <p className="text-muted-foreground">{workout.description}</p>
            <div className="space-y-2">
              {workout.exercises.map((exercise, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-secondary/10 rounded">
                  <span>{exercise.name}</span>
                  <span>{exercise.sets} × {exercise.reps}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground">Your personalized workout will appear here...</p>
            <Button 
              className="mt-4" 
              onClick={onGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Workout'
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
