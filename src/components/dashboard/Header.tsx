
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

interface HeaderProps {
  userName: string | null;
  onSignOut: () => void;
}

export const Header = ({ userName, onSignOut }: HeaderProps) => {
  return (
    <header className="max-w-7xl mx-auto flex justify-between items-center mb-8">
      <div className="flex items-center gap-4">
        <img 
          src="public/lovable-uploads/c21a4c24-1f88-4ee0-953e-3a4b05f263bd.png" 
          alt="FitX AI" 
          className="h-10" 
        />
        <h1 className="text-2xl font-bold">Welcome, {userName || "Friend"}!</h1>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
        <Button variant="outline" onClick={onSignOut}>
          Sign Out
        </Button>
      </div>
    </header>
  );
};
