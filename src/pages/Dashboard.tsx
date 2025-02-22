
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Dumbbell, Music, Settings } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import VoiceChat from "@/components/VoiceChat";

interface WorkoutData {
  title: string;
  description: string;
  exercises: {
    name: string;
    sets: number;
    reps: number;
    restTime: number;
  }[];
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [showVoiceChat, setShowVoiceChat] = useState(false);

  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to access the dashboard",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const generateWorkout = async () => {
    try {
      setIsGenerating(true);
      
      // First, prompt for preferences
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('workout_goal, experience_level')
        .eq('id', user?.id)
        .single();

      // Update preferences before generating
      const { data: profile } = await supabase
        .from('user_profiles')
        .upsert({
          id: user?.id,
          workout_goal: existingProfile?.workout_goal || 'weight-loss',
          experience_level: existingProfile?.experience_level || 'beginner',
        }, { onConflict: 'id' })
        .select()
        .single();

      if (!profile) {
        toast({
          title: "Error",
          description: "Could not update profile",
          variant: "destructive",
        });
        return;
      }

      // Generate workout using Supabase Edge Function
      const { data, error } = await supabase.functions
        .invoke('generate-workout', {
          body: {
            goal: profile.workout_goal,
            level: profile.experience_level
          },
        });

      if (error) throw error;

      // Save the generated workout
      const { error: saveError } = await supabase
        .from('workouts')
        .insert({
          user_id: user?.id,
          title: data.title,
          description: data.description,
          exercises: data.exercises
        });

      if (saveError) throw saveError;

      setWorkout(data);
      toast({
        title: "Workout Generated!",
        description: "Your new workout plan is ready.",
      });

    } catch (error: any) {
      console.error('Error generating workout:', error);
      toast({
        title: "Error",
        description: "Failed to generate workout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMusic = async () => {
    try {
      const { data, error } = await supabase.functions
        .invoke('generate-workout-music', {
          body: { intensity: "medium" }
        });

      if (error) throw error;

      toast({
        title: "Music Generated!",
        description: "Your workout playlist is ready.",
      });
      
      // Open the playlist in a new tab
      window.open(data.playlist_url, '_blank');
    } catch (error: any) {
      console.error('Error generating music:', error);
      toast({
        title: "Error",
        description: "Failed to generate music. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {showVoiceChat && <VoiceChat onClose={() => setShowVoiceChat(false)} />}
      
      <div className="min-h-screen w-full p-4 md:p-8">
        <header className="max-w-7xl mx-auto flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Welcome, {user?.name || "Friend"}!</h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Today's Workout */}
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
                      onClick={generateWorkout}
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

            {/* Quick Actions */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start" onClick={() => setShowVoiceChat(true)}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Start Voice Chat
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={generateMusic}
                >
                  <Music className="w-4 h-4 mr-2" />
                  Generate Music
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}
