
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { Dumbbell, Salad, Music, Trophy, ArrowRight } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [isSignIn, setIsSignIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isSignIn) {
        await signIn(formData.email, formData.password);
      } else {
        if (!formData.name) {
          toast({
            title: "Error",
            description: "Please enter your name.",
            variant: "destructive",
          });
          return;
        }
        await signUp(formData.email, formData.password, formData.name);
      }
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Dumbbell className="w-6 h-6" />,
      title: "AI Workouts",
      description: "Personalized training plans adapted to your goals",
    },
    {
      icon: <Salad className="w-6 h-6" />,
      title: "Smart Nutrition",
      description: "AI-powered meal recommendations",
    },
    {
      icon: <Music className="w-6 h-6" />,
      title: "AI Music",
      description: "Dynamic workout music that adapts to your intensity",
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: "Progress Tracking",
      description: "Monitor your fitness journey with detailed analytics",
    },
  ];

  return (
    <div className="min-h-screen w-full px-4 py-8 md:py-16">
      <main className="max-w-6xl mx-auto space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Your AI-Powered
            <br />
            <span className="text-primary">Fitness Coach</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Experience the future of fitness with personalized AI workouts, nutrition guidance,
            and adaptive music to power your journey.
          </p>
          <Button
            size="lg"
            className="animate-in"
            onClick={() => document.getElementById("auth-section")?.scrollIntoView({ behavior: "smooth" })}
          >
            Get Started <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </section>

        {/* Features Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="glass">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Auth Section */}
        <section id="auth-section" className="max-w-md mx-auto">
          <Card className="glass">
            <CardHeader>
              <CardTitle>{isSignIn ? "Welcome Back" : "Create Account"}</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {!isSignIn && (
                  <Input
                    placeholder="Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                )}
                <Input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {isSignIn ? "Sign In" : "Sign Up"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setIsSignIn(!isSignIn)}
                >
                  {isSignIn ? "Need an account? Sign Up" : "Already have an account? Sign In"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </section>
      </main>
    </div>
  );
}
