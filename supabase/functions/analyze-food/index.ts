
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

function getExerciseRecommendations(calories: number) {
  if (!calories || isNaN(calories)) return [];
  
  return [
    {
      name: "Running",
      duration: Math.round(calories / 10),
      intensity: "moderate"
    },
    {
      name: "Swimming",
      duration: Math.round(calories / 8),
      intensity: "moderate"
    },
    {
      name: "Cycling",
      duration: Math.round(calories / 7),
      intensity: "moderate"
    },
    {
      name: "Walking",
      duration: Math.round(calories / 4),
      intensity: "light"
    }
  ];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()
    console.log('Received food query:', query)
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Food query is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const apiKey = Deno.env.get('API_NINJAS_KEY')
    if (!apiKey) {
      console.error('Missing API Ninjas key')
      return new Response(
        JSON.stringify({ error: 'Missing API configuration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Break down complex queries into individual words
    const searchTerms = query.split(' ').filter(term => term.length > 0);
    let allNutritionData: any[] = [];

    // Fetch nutrition data for each term separately
    for (const term of searchTerms) {
      const nutritionResponse = await fetch(
        `https://api.api-ninjas.com/v1/nutrition?query=${encodeURIComponent(term)}`,
        {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!nutritionResponse.ok) {
        console.error(`API error for term "${term}":`, nutritionResponse.status);
        continue;
      }

      const data = await nutritionResponse.json();
      if (data && data.length > 0) {
        allNutritionData = [...allNutritionData, ...data];
      }
    }

    console.log('Combined nutrition data:', allNutritionData);

    if (!allNutritionData.length) {
      return new Response(
        JSON.stringify({ error: 'No nutrition data found for this food' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Sum up the nutrition values from all items
    const totals = allNutritionData.reduce((acc, item) => ({
      calories: acc.calories + (parseFloat(item.calories) || 0),
      protein: acc.protein + (parseFloat(item.protein_g) || 0),
      carbs: acc.carbs + (parseFloat(item.carbohydrates_total_g) || 0),
      fat: acc.fat + (parseFloat(item.fat_total_g) || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    // Round all values
    const calories = Math.round(totals.calories);
    const protein = Math.round(totals.protein);
    const carbs = Math.round(totals.carbs);
    const fat = Math.round(totals.fat);

    // Basic health assessment
    const isHealthy = 
      calories <= 800 && // Not too caloric
      protein >= 15 && // Good protein content
      fat < 30;  // Moderate fat content

    const analysis = {
      foods: allNutritionData.map(item => item.name || query),
      calories,
      protein,
      carbs,
      fat,
      isHealthy,
      explanation: `This meal contains ${calories} calories with ${protein}g of protein, ${carbs}g of carbs, and ${fat}g of fat.`,
      healthyAlternative: isHealthy ? undefined : "Consider a leaner option with more protein and less fat, such as grilled chicken with vegetables.",
      exerciseRecommendations: getExerciseRecommendations(calories)
    }

    console.log('Final analysis:', analysis)
    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in analyze-food function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to analyze food',
        details: error.message,
        stack: error.stack,
        name: error.name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
