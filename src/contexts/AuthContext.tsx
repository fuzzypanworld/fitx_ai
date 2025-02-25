
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  isPremium: boolean;
  workoutGoal?: 'weight-loss' | 'muscle-gain' | 'endurance';
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  workoutFrequency?: number;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      try {
        // First, check for an existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log("Found existing session for user:", session.user.id);
          await updateUserProfile(session.user);
        } else {
          console.log("No existing session found");
          setUser(null);
        }

        // Then, set up the auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log("Auth state changed:", event, session?.user?.id);
          
          if (session?.user) {
            await updateUserProfile(session.user);
          } else {
            setUser(null);
            // Only navigate to /auth if we're not already there and we're not on the landing page
            const currentPath = window.location.pathname;
            if (currentPath !== '/auth' && currentPath !== '/') {
              navigate('/auth');
            }
          }
        });

        setLoading(false);
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Error initializing auth:", error);
        setLoading(false);
      }
    };

    initAuth();
  }, [navigate]);

  const updateUserProfile = async (authUser: User) => {
    try {
      console.log("Updating user profile for:", authUser.id);
      
      // Get the user's profile from the profiles table
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const userProfile: UserProfile = {
        id: authUser.id,
        email: authUser.email!,
        name: profile?.full_name || authUser.user_metadata?.full_name,
        isPremium: profile?.is_premium || false,
        workoutGoal: profile?.workout_goal || undefined,
        experienceLevel: profile?.experience_level || undefined,
        workoutFrequency: profile?.workout_frequency || undefined,
      };

      setUser(userProfile);
      console.log("User profile updated:", userProfile);
      
      // Don't redirect if we're already on a valid authenticated route
      if (window.location.pathname === '/auth' || window.location.pathname === '/') {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      // Show error toast to user
      toast({
        title: "Error",
        description: "Failed to load user profile. Please try signing in again.",
        variant: "destructive",
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await updateUserProfile(data.user);
        toast({
          title: "Welcome back!",
          description: "Successfully signed in.",
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign in. Please try again.",
        variant: "destructive",
      });
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        await updateUserProfile(data.user);
        toast({
          title: "Welcome to FitX AI!",
          description: "Your account has been created successfully.",
        });
        navigate("/onboarding");
      }
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      navigate("/auth");
      toast({
        title: "Signed out",
        description: "You've been successfully signed out.",
      });
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
