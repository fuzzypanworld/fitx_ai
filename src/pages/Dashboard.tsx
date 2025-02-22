
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Dumbbell, Music, Settings } from "lucide-react";
import WorkoutTracker from "@/components/WorkoutTracker";
import { useToast } from "@/components/ui/use-toast";
import { useEffect } from "react";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to access the dashboard",
        variant: "destructive",
      });
      // Redirect will be handled by AuthContext
    }
  }, [user, toast]);

  return (
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
        <WorkoutTracker />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Today's Workout */}
          <Card className="glass col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5" />
                Today's Workout
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Your personalized workout will appear here soon...</p>
              <Button className="mt-4">Generate Workout</Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Workout
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Music className="w-4 h-4 mr-2" />
                Generate Music
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
