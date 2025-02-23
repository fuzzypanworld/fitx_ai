
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  timestamp: string;
}

interface ActivityEntry {
  id: string;
  name: string;
  caloriesBurned: number;
  duration: number;
  timestamp: string;
}

export function CalorieTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const [newFood, setNewFood] = useState({ name: '', calories: '' });
  const [newActivity, setNewActivity] = useState({ name: '', duration: '', caloriesBurned: '' });
  const [dailyCaloriesIn, setDailyCaloriesIn] = useState(0);
  const [dailyCaloriesBurned, setDailyCaloriesBurned] = useState(0);

  // Load today's entries
  useEffect(() => {
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      loadTodaysEntries(today);
    }
  }, [user]);

  const loadTodaysEntries = async (today: string) => {
    try {
      // Load food entries
      const { data: foodData } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', user?.id)
        .gte('timestamp', today)
        .lt('timestamp', today + 'T23:59:59');

      if (foodData) {
        setFoodEntries(foodData);
        const totalCaloriesIn = foodData.reduce((sum, entry) => sum + entry.calories, 0);
        setDailyCaloriesIn(totalCaloriesIn);
      }

      // Load activity entries
      const { data: activityData } = await supabase
        .from('activity_entries')
        .select('*')
        .eq('user_id', user?.id)
        .gte('timestamp', today)
        .lt('timestamp', today + 'T23:59:59');

      if (activityData) {
        setActivityEntries(activityData);
        const totalCaloriesBurned = activityData.reduce((sum, entry) => sum + entry.caloriesBurned, 0);
        setDailyCaloriesBurned(totalCaloriesBurned);
      }
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  };

  const addFoodEntry = async () => {
    if (!newFood.name || !newFood.calories) {
      toast({
        title: "Missing Information",
        description: "Please enter both food name and calories",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('food_entries')
        .insert({
          user_id: user?.id,
          name: newFood.name,
          calories: parseInt(newFood.calories),
          timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setFoodEntries([...foodEntries, data]);
      setDailyCaloriesIn(dailyCaloriesIn + parseInt(newFood.calories));
      setNewFood({ name: '', calories: '' });

      toast({
        title: "Food Added",
        description: `Added ${newFood.name} (${newFood.calories} calories)`,
      });
    } catch (error) {
      console.error('Error adding food entry:', error);
      toast({
        title: "Error",
        description: "Failed to add food entry",
        variant: "destructive",
      });
    }
  };

  const addActivityEntry = async () => {
    if (!newActivity.name || !newActivity.duration || !newActivity.caloriesBurned) {
      toast({
        title: "Missing Information",
        description: "Please fill in all activity details",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('activity_entries')
        .insert({
          user_id: user?.id,
          name: newActivity.name,
          duration: parseInt(newActivity.duration),
          caloriesBurned: parseInt(newActivity.caloriesBurned),
          timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setActivityEntries([...activityEntries, data]);
      setDailyCaloriesBurned(dailyCaloriesBurned + parseInt(newActivity.caloriesBurned));
      setNewActivity({ name: '', duration: '', caloriesBurned: '' });

      toast({
        title: "Activity Added",
        description: `Added ${newActivity.name} (${newActivity.caloriesBurned} calories burned)`,
      });
    } catch (error) {
      console.error('Error adding activity entry:', error);
      toast({
        title: "Error",
        description: "Failed to add activity entry",
        variant: "destructive",
      });
    }
  };

  const remainingCalories = dailyCaloriesIn - dailyCaloriesBurned;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Calorie Tracker</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Food Intake Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Food Intake</h3>
            <div className="space-y-2">
              <Label htmlFor="foodName">Food Name</Label>
              <Input
                id="foodName"
                value={newFood.name}
                onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                placeholder="Enter food name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="foodCalories">Calories</Label>
              <Input
                id="foodCalories"
                type="number"
                value={newFood.calories}
                onChange={(e) => setNewFood({ ...newFood, calories: e.target.value })}
                placeholder="Enter calories"
              />
            </div>
            <Button onClick={addFoodEntry} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Add Food
            </Button>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Today's Food</h4>
              <div className="space-y-2">
                {foodEntries.map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center p-2 bg-secondary/10 rounded">
                    <span>{entry.name}</span>
                    <span>{entry.calories} cal</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activities Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Activities</h3>
            <div className="space-y-2">
              <Label htmlFor="activityName">Activity Name</Label>
              <Input
                id="activityName"
                value={newActivity.name}
                onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                placeholder="Enter activity name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={newActivity.duration}
                onChange={(e) => setNewActivity({ ...newActivity, duration: e.target.value })}
                placeholder="Enter duration"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="caloriesBurned">Calories Burned</Label>
              <Input
                id="caloriesBurned"
                type="number"
                value={newActivity.caloriesBurned}
                onChange={(e) => setNewActivity({ ...newActivity, caloriesBurned: e.target.value })}
                placeholder="Enter calories burned"
              />
            </div>
            <Button onClick={addActivityEntry} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Add Activity
            </Button>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Today's Activities</h4>
              <div className="space-y-2">
                {activityEntries.map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center p-2 bg-secondary/10 rounded">
                    <span>{entry.name} ({entry.duration} min)</span>
                    <span>{entry.caloriesBurned} cal</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="mt-6 p-4 bg-secondary/10 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Daily Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Calories In</p>
              <p className="text-2xl font-bold text-green-600">{dailyCaloriesIn}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Calories Burned</p>
              <p className="text-2xl font-bold text-red-600">{dailyCaloriesBurned}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net Calories</p>
              <p className={`text-2xl font-bold ${remainingCalories > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                {remainingCalories}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
