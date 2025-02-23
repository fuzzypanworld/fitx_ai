
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Dumbbell, Heart, SmilePlus } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Your All-in-One Health & Fitness Companion
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Track workouts, analyze food, and maintain a healthy lifestyle with our comprehensive platform. Get personalized recommendations and real-time nutrition insights.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link to="/auth">
                <Button size="lg">
                  Get Started
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="outline" size="lg">
                  View Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7">Features</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need for your fitness journey
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 rounded-full bg-primary/10 p-3">
                  <Dumbbell className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Workout Tracking</h3>
                <p className="mt-4 text-muted-foreground">Generate personalized workout plans and track your progress</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 rounded-full bg-primary/10 p-3">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Food Analysis</h3>
                <p className="mt-4 text-muted-foreground">Analyze your meals with AI and get detailed nutritional insights</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 rounded-full bg-primary/10 p-3">
                  <SmilePlus className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Meditation & Wellness</h3>
                <p className="mt-4 text-muted-foreground">Access guided meditation sessions and wellness features</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
