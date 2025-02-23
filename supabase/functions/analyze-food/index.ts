
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

    // Ensure query is a single food item
    const cleanQuery = query.trim().split(',')[0].trim();
    
    if (!cleanQuery) {
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

    // Make sure to pass a single food item query
    const response = await fetch(
      `https://api.api-ninjas.com/v1/nutrition?query=${encodeURIComponent(cleanQuery)}`,
      {
        headers: {
          'X-Api-Key': apiKey
        }
      }
    )

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    console.log('API response:', data)

    if (!data || !Array.isArray(data) || data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No nutrition data found for this food' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Get the first result's nutrition data
    const firstItem = data[0]
    
    // Ensure we're getting numeric values
    const calories = Math.round(parseFloat(firstItem.calories) || 0)
    const protein = Math.round(parseFloat(firstItem.protein_g) || 0)
    const carbs = Math.round(parseFloat(firstItem.carbohydrates_total_g) || 0)
    const fat = Math.round(parseFloat(firstItem.fat_total_g) || 0)

    // Health assessment
    const isHealthy = 
      calories <= 800 && // Not too caloric
      protein >= 15 && // Good protein content
      fat < 30  // Moderate fat content

    const analysis = {
      foods: [firstItem.name || cleanQuery],
      calories,
      protein,
      carbs,
      fat,
      isHealthy,
      explanation: `This meal contains ${calories} calories with ${protein}g of protein, ${carbs}g of carbs, and ${fat}g of fat.`,
      healthyAlternative: isHealthy ? undefined : "Consider a leaner option with more protein and less fat, such as grilled chicken with vegetables.",
      exerciseRecommendations: getExerciseRecommendations(calories)
    }

    console.log('Analysis:', analysis)
    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to analyze food' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
