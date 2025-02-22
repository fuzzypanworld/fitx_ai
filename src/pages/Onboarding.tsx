
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type WorkoutGoal = Database["public"]["Enums"]["workout_goal"];
type ExperienceLevel = Database["public"]["Enums"]["experience_level"];

interface FormData {
  goal: WorkoutGoal | "";
  experience: ExperienceLevel | "";
  frequency: string;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    goal: "",
    experience: "",
    frequency: "",
  });

  useEffect(() => {
    if (!user?.id) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      setLoading(true);
      try {
        console.log('Starting onboarding process...'); // Debug log

        // First check if profile exists
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user?.id)
          .single();

        console.log('Existing profile:', existingProfile); // Debug log

        // If profile doesn't exist, create it
        if (!existingProfile) {
          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert({
              id: user?.id,
              workout_goal: formData.goal as WorkoutGoal,
              experience_level: formData.experience as ExperienceLevel,
              workout_frequency: parseInt(formData.frequency),
            });

          if (insertError) {
            console.error('Insert error:', insertError); // Debug log
            throw insertError;
          }
        } else {
          // Update existing profile
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              workout_goal: formData.goal as WorkoutGoal,
              experience_level: formData.experience as ExperienceLevel,
              workout_frequency: parseInt(formData.frequency),
            })
            .eq('id', user?.id);

          if (updateError) {
            console.error('Update error:', updateError); // Debug log
            throw updateError;
          }
        }

        console.log('Profile updated, generating workout...'); // Debug log

        // Generate first workout
        const { data: workout, error: generationError } = await supabase.functions
          .invoke('generate-workout', {
            body: {
              goal: formData.goal,
              level: formData.experience,
              frequency: formData.frequency,
            },
          });

        if (generationError) {
          console.error('Generation error:', generationError); // Debug log
          throw generationError;
        }

        console.log('Workout generated:', workout); // Debug log

        // Save the generated workout
        const { error: saveError } = await supabase
          .from('workouts')
          .insert({
            user_id: user?.id,
            title: workout.title,
            description: workout.description,
            exercises: workout.exercises,
          });

        if (saveError) {
          console.error('Save error:', saveError); // Debug log
          throw saveError;
        }

        toast({
          title: "Profile Created!",
          description: "Your personalized fitness journey begins now.",
        });
        navigate("/dashboard");
      } catch (error: any) {
        console.error('Error during onboarding:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to complete setup. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <Card className="w-full max-w-lg glass animate-in">
        <CardHeader>
          <CardTitle>Let's Personalize Your Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">What's your main fitness goal?</h2>
              <RadioGroup
                value={formData.goal}
                onValueChange={(value: WorkoutGoal) => setFormData({ ...formData, goal: value })}
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
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">What's your fitness experience level?</h2>
              <RadioGroup
                value={formData.experience}
                onValueChange={(value: ExperienceLevel) => setFormData({ ...formData, experience: value })}
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
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">How often do you want to work out?</h2>
              <RadioGroup
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2-3" id="2-3" />
                  <Label htmlFor="2-3">2-3 times per week</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="4-5" id="4-5" />
                  <Label htmlFor="4-5">4-5 times per week</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="6+" id="6+" />
                  <Label htmlFor="6+">6+ times per week</Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleNext}
            disabled={
              loading ||
              (step === 1 && !formData.goal) ||
              (step === 2 && !formData.experience) ||
              (step === 3 && !formData.frequency)
            }
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Your Plan...
              </>
            ) : (
              step === 3 ? "Complete Setup" : "Next"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
