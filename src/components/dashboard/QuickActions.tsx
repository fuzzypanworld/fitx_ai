
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Music, Brain, Camera } from "lucide-react";
import { useState } from "react";

interface QuickActionsProps {
  onVoiceChat: () => void;
  onGenerateMusic: () => void;
  onMeditate: () => void;
}

export const QuickActions = ({
  onVoiceChat,
  onGenerateMusic,
  onMeditate,
}: QuickActionsProps) => {
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);

  const playlists = [
    "https://open.spotify.com/playlist/37i9dQZF1DX70RN3TfWWJh",
    "https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP",
    "https://open.spotify.com/playlist/37i9dQZF1DX0HRj9P7NxeE",
    "https://open.spotify.com/playlist/37i9dQZF1DX32NxfOZJNtp",
    "https://open.spotify.com/playlist/37i9dQZF1DWSJHnPb1f0X3"
  ];

  const handleMusicClick = () => {
    window.open(playlists[currentPlaylistIndex], '_blank');
    setCurrentPlaylistIndex((prev) => (prev + 1) % playlists.length);
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button variant="outline" className="w-full justify-start" onClick={onVoiceChat}>
          <Calendar className="w-4 h-4 mr-2" />
          Voice Assistant
        </Button>
        <Button variant="outline" className="w-full justify-start" onClick={handleMusicClick}>
          <Music className="w-4 h-4 mr-2" />
          Workout Music
        </Button>
        <Button variant="outline" className="w-full justify-start" onClick={onMeditate}>
          <Brain className="w-4 h-4 mr-2" />
          Meditation
        </Button>
        <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '#food-analyzer'}>
          <Camera className="w-4 h-4 mr-2" />
          Food Analyzer
        </Button>
      </CardContent>
    </Card>
  );
};
