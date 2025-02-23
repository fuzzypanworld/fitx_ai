
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Plus } from "lucide-react";
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
  calories_burned: number;
  duration: number;
  timestamp: string;
}

const ACTIVITY_CALORIES = {
  'walking': 4, // calories per minute
  'running': 11.5,
  'cycling': 8.5,
  'swimming': 9,
  'yoga': 3,
  'weightlifting': 6,
  'hiit': 12,
  'dancing': 7,
} as const;

export function CalorieTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const [newFood, setNewFood] = useState({ name: '', servingSize: '', quantity: '1' });
  const [newActivity, setNewActivity] = useState({ 
    name: 'walking', 
    duration: '' 
  });
  const [dailyCaloriesIn, setDailyCaloriesIn] = useState(0);
  const [dailyCaloriesBurned, setDailyCaloriesBurned] = useState(0);
  const [previousDayBalance, setPreviousDayBalance] = useState(0);

  // Load entries including previous day's balance
  useEffect(() => {
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(new Date().setDate(new Date().getDate() - 1))
        .toISOString().split('T')[0];
      
      loadEntries(today, yesterday);
    }
  }, [user]);

  const loadEntries = async (today: string, yesterday: string) => {
    try {
      // Load today's food entries
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

      // Load today's activity entries
      const { data: activityData } = await supabase
        .from('activity_entries')
        .select('*')
        .eq('user_id', user?.id)
        .gte('timestamp', today)
        .lt('timestamp', today + 'T23:59:59');

      if (activityData) {
        setActivityEntries(activityData);
        const totalCaloriesBurned = activityData.reduce((sum, entry) => sum + entry.calories_burned, 0);
        setDailyCaloriesBurned(totalCaloriesBurned);
      }

      // Calculate yesterday's balance
      const { data: yesterdayFood } = await supabase
        .from('food_entries')
        .select('calories')
        .eq('user_id', user?.id)
        .gte('timestamp', yesterday)
        .lt('timestamp', yesterday + 'T23:59:59');

      const { data: yesterdayActivity } = await supabase
        .from('activity_entries')
        .select('calories_burned')
        .eq('user_id', user?.id)
        .gte('timestamp', yesterday)
        .lt('timestamp', yesterday + 'T23:59:59');

      const yesterdayCaloriesIn = yesterdayFood?.reduce((sum, entry) => sum + entry.calories, 0) || 0;
      const yesterdayCaloriesBurned = yesterdayActivity?.reduce((sum, entry) => sum + entry.calories_burned, 0) || 0;
      setPreviousDayBalance(yesterdayCaloriesIn - yesterdayCaloriesBurned);

    } catch (error) {
      console.error('Error loading entries:', error);
      toast({
        title: "Error",
        description: "Failed to load your entries",
        variant: "destructive",
      });
    }
  };

  const calculateActivityCalories = (activity: string, duration: number) => {
    const caloriesPerMinute = ACTIVITY_CALORIES[activity as keyof typeof ACTIVITY_CALORIES] || 5;
    return Math.round(caloriesPerMinute * duration);
  };

  const addFoodEntry = async () => {
    if (!newFood.name || !newFood.servingSize) {
      toast({
        title: "Missing Information",
        description: "Please enter both food name and serving size",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch calorie information from API
      const response = await fetch(`https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(newFood.name + ' ' + newFood.servingSize)}`, {
        headers: {
          'X-Api-Key': 'YOUR_API_NINJAS_KEY'
        }
      });
      
      const data = await response.json();
      const calories = Math.round(data.items[0]?.calories || 0 * parseFloat(newFood.quantity));

      const { data: entry, error } = await supabase
        .from('food_entries')
        .insert({
          user_id: user?.id,
          name: newFood.name,
          calories: calories,
          timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setFoodEntries([...foodEntries, entry]);
      setDailyCaloriesIn(dailyCaloriesIn + calories);
      setNewFood({ name: '', servingSize: '', quantity: '1' });

      toast({
        title: "Food Added",
        description: `Added ${newFood.name} (${calories} calories)`,
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
    if (!newActivity.name || !newActivity.duration) {
      toast({
        title: "Missing Information",
        description: "Please fill in all activity details",
        variant: "destructive",
      });
      return;
    }

    try {
      const caloriesBurned = calculateActivityCalories(
        newActivity.name,
        parseInt(newActivity.duration)
      );

      const { data, error } = await supabase
        .from('activity_entries')
        .insert({
          user_id: user?.id,
          name: newActivity.name,
          duration: parseInt(newActivity.duration),
          calories_burned: caloriesBurned,
          timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setActivityEntries([...activityEntries, data]);
      setDailyCaloriesBurned(dailyCaloriesBurned + caloriesBurned);
      setNewActivity({ name: 'walking', duration: '' });

      toast({
        title: "Activity Added",
        description: `Added ${newActivity.name} (${caloriesBurned} calories burned)`,
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

  const netCalories = dailyCaloriesIn - dailyCaloriesBurned;
  const totalBalance = netCalories + previousDayBalance;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Calorie Tracker</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Food Intake Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Add Food</h3>
            <div className="space-y-2">
              <Label htmlFor="foodName">Food Name</Label>
              <Input
                id="foodName"
                value={newFood.name}
                onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                placeholder="e.g., pizza, apple, chicken breast"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="servingSize">Serving Size</Label>
              <Input
                id="servingSize"
                value={newFood.servingSize}
                onChange={(e) => setNewFood({ ...newFood, servingSize: e.target.value })}
                placeholder="e.g., 100g, 1 cup, 1 slice"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0.25"
                step="0.25"
                value={newFood.quantity}
                onChange={(e) => setNewFood({ ...newFood, quantity: e.target.value })}
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
            <h3 className="text-lg font-semibold">Add Activity</h3>
            <div className="space-y-2">
              <Label htmlFor="activityType">Activity Type</Label>
              <select
                id="activityType"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={newActivity.name}
                onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
              >
                {Object.keys(ACTIVITY_CALORIES).map((activity) => (
                  <option key={activity} value={activity}>
                    {activity.charAt(0).toUpperCase() + activity.slice(1)}
                  </option>
                ))}
              </select>
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
            <Button onClick={addActivityEntry} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Add Activity
            </Button>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Today's Activities</h4>
              <div className="space-y-2">
                {activityEntries.map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center p-2 bg-secondary/10 rounded">
                    <span>{entry.name} ({entry.duration} min)</span>
                    <span>{entry.calories_burned} cal</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="mt-6 p-4 bg-secondary/10 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Calorie Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Previous Day</p>
              <p className="text-xl font-bold text-blue-600">{previousDayBalance}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Today's Intake</p>
              <p className="text-xl font-bold text-green-600">{dailyCaloriesIn}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Burned Today</p>
              <p className="text-xl font-bold text-red-600">{dailyCaloriesBurned}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className={`text-xl font-bold ${totalBalance > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                {totalBalance}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
