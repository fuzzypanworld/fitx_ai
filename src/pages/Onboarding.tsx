
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    goal: "",
    experience: "",
    frequency: "",
  });

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      setLoading(true);
      try {
        // Save user preferences
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            workout_goal: formData.goal,
            experience_level: formData.experience,
            workout_frequency: parseInt(formData.frequency),
          })
          .eq('id', user?.id);

        if (updateError) throw updateError;

        // Generate first workout
        const { data: workout, error: generationError } = await supabase.functions
          .invoke('generate-workout', {
            body: {
              goal: formData.goal,
              level: formData.experience,
              frequency: formData.frequency,
            },
          });

        if (generationError) throw generationError;

        // Save the generated workout
        const { error: saveError } = await supabase
          .from('workouts')
          .insert({
            user_id: user?.id,
            title: workout.title,
            description: workout.description,
            exercises: workout.exercises,
          });

        if (saveError) throw saveError;

        toast({
          title: "Profile Created!",
          description: "Your personalized fitness journey begins now.",
        });
        navigate("/dashboard");
      } catch (error: any) {
        console.error('Error during onboarding:', error);
        toast({
          title: "Error",
          description: "Failed to complete setup. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const frequencyToNumber = (freq: string) => {
    switch (freq) {
      case "2-3": return 3;
      case "4-5": return 5;
      case "6+": return 6;
      default: return 3;
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
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">What's your fitness experience level?</h2>
              <RadioGroup
                value={formData.experience}
                onValueChange={(value) => setFormData({ ...formData, experience: value })}
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
