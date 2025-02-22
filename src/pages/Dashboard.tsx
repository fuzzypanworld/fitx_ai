
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import VoiceChat from "@/components/VoiceChat";
import { Header } from "@/components/dashboard/Header";
import { WorkoutCard } from "@/components/dashboard/WorkoutCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

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

interface PreferencesFormData {
  age: string;
  goal: string;
  level: string;
  frequency: string;
  preferences: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [formData, setFormData] = useState<PreferencesFormData>({
    age: "",
    goal: "weight-loss",
    level: "beginner",
    frequency: "3",
    preferences: "",
  });

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
    setShowPreferences(true);
  };

  const handlePreferencesSubmit = async () => {
    try {
      setIsGenerating(true);
      setShowPreferences(false);

      const { data, error } = await supabase.functions
        .invoke('generate-workout', {
          body: {
            goal: formData.goal,
            level: formData.level,
            age: parseInt(formData.age),
            frequency: parseInt(formData.frequency),
            preferences: formData.preferences,
          },
        });

      if (error) throw error;

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
        description: "Your new personalized workout plan is ready.",
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

  const handleTrackProgress = () => {
    toast({
      title: "Coming Soon",
      description: "Progress tracking feature will be available soon!",
    });
  };

  const handleMeditate = () => {
    toast({
      title: "Coming Soon",
      description: "Meditation feature will be available soon!",
    });
  };

  const handleHeartRate = () => {
    toast({
      title: "Coming Soon",
      description: "Heart rate monitoring will be available soon!",
    });
  };

  const handleViewAchievements = () => {
    toast({
      title: "Coming Soon",
      description: "Achievements feature will be available soon!",
    });
  };

  return (
    <>
      {showVoiceChat && <VoiceChat onClose={() => setShowVoiceChat(false)} />}
      
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Workout Preferences</DialogTitle>
            <DialogDescription>
              Tell us about your fitness goals and preferences to generate a personalized workout plan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Fitness Goal</Label>
              <RadioGroup
                value={formData.goal}
                onValueChange={(value) => setFormData({ ...formData, goal: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weight-loss" id="weight-loss" />
                  <Label htmlFor="weight-loss">Weight Loss</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="muscle-gain" id="muscle-gain" />
                  <Label htmlFor="muscle-gain">Muscle Gain</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="endurance" id="endurance" />
                  <Label htmlFor="endurance">Endurance</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid gap-2">
              <Label>Experience Level</Label>
              <RadioGroup
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="beginner" id="beginner" />
                  <Label htmlFor="beginner">Beginner</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="intermediate" id="intermediate" />
                  <Label htmlFor="intermediate">Intermediate</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="advanced" id="advanced" />
                  <Label htmlFor="advanced">Advanced</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid gap-2">
              <Label>Weekly Workout Frequency</Label>
              <RadioGroup
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="freq-2" />
                  <Label htmlFor="freq-2">2 times per week</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3" id="freq-3" />
                  <Label htmlFor="freq-3">3 times per week</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="4" id="freq-4" />
                  <Label htmlFor="freq-4">4+ times per week</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="preferences">Additional Preferences</Label>
              <Textarea
                id="preferences"
                placeholder="Any specific exercises you prefer or want to avoid?"
                value={formData.preferences}
                onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreferences(false)}>
              Cancel
            </Button>
            <Button onClick={handlePreferencesSubmit} disabled={!formData.age}>
              Generate Workout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen w-full p-4 md:p-8">
        <Header userName={user?.name} onSignOut={signOut} />

        <main className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <WorkoutCard
              workout={workout}
              isGenerating={isGenerating}
              onGenerate={generateWorkout}
            />
            <QuickActions
              onVoiceChat={() => setShowVoiceChat(true)}
              onGenerateMusic={generateMusic}
              onTrackProgress={handleTrackProgress}
              onMeditate={handleMeditate}
              onHeartRate={handleHeartRate}
              onViewAchievements={handleViewAchievements}
            />
          </div>
        </main>
      </div>
    </>
  );
}
