
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import VoiceChat from "@/components/VoiceChat";
import { Header } from "@/components/dashboard/Header";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { MeditationDialog } from "@/components/meditation/MeditationDialog";
import { FoodAnalyzer } from "@/components/food-analyzer/FoodAnalyzer";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [showMeditation, setShowMeditation] = useState(false);

  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to access the dashboard",
        variant: "destructive",
      });
    }
  }, [user, toast]);

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

  const handleTrackProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const completedWorkouts = data.length;
      toast({
        title: "Progress Update",
        description: `You have completed ${completedWorkouts} workouts so far!`,
      });
    } catch (error) {
      console.error('Error fetching progress:', error);
      toast({
        title: "Error",
        description: "Failed to fetch progress. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMeditate = () => {
    setShowMeditation(true);
  };

  return (
    <>
      {showVoiceChat && <VoiceChat onClose={() => setShowVoiceChat(false)} />}
      <MeditationDialog 
        open={showMeditation} 
        onClose={() => setShowMeditation(false)} 
      />
      
      <div className="min-h-screen w-full p-4 md:p-8">
        <Header userName={user?.name} onSignOut={signOut} />

        <main className="max-w-7xl mx-auto space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">Food Analysis</h2>
            <FoodAnalyzer />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <QuickActions
              onVoiceChat={() => setShowVoiceChat(true)}
              onGenerateMusic={generateMusic}
              onMeditate={handleMeditate}
            />
          </div>
        </main>
      </div>
    </>
  );
}
