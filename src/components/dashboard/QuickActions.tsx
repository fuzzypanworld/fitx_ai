
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Music, Activity, Brain, Heart, Trophy } from "lucide-react";

interface QuickActionsProps {
  onVoiceChat: () => void;
  onGenerateMusic: () => void;
  onTrackProgress: () => void;
  onMeditate: () => void;
  onHeartRate: () => void;
  onViewAchievements: () => void;
}

export const QuickActions = ({
  onVoiceChat,
  onGenerateMusic,
  onTrackProgress,
  onMeditate,
  onHeartRate,
  onViewAchievements,
}: QuickActionsProps) => {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button variant="outline" className="w-full justify-start" onClick={onVoiceChat}>
          <Calendar className="w-4 h-4 mr-2" />
          Voice Assistant
        </Button>
        <Button variant="outline" className="w-full justify-start" onClick={onGenerateMusic}>
          <Music className="w-4 h-4 mr-2" />
          Workout Music
        </Button>
        <Button variant="outline" className="w-full justify-start" onClick={onTrackProgress}>
          <Activity className="w-4 h-4 mr-2" />
          Track Progress
        </Button>
        <Button variant="outline" className="w-full justify-start" onClick={onMeditate}>
          <Brain className="w-4 h-4 mr-2" />
          Meditation
        </Button>
        <Button variant="outline" className="w-full justify-start" onClick={onHeartRate}>
          <Heart className="w-4 h-4 mr-2" />
          Heart Rate
        </Button>
        <Button variant="outline" className="w-full justify-start" onClick={onViewAchievements}>
          <Trophy className="w-4 h-4 mr-2" />
          Achievements
        </Button>
      </CardContent>
    </Card>
  );
};
