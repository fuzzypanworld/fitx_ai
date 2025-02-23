
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

// Common exercise recommendations based on calories
function getExerciseRecommendations(calories: number) {
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

    console.log('Making API Ninjas request for:', query)
    const nutritionResponse = await fetch(
      `https://api.api-ninjas.com/v1/nutrition?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!nutritionResponse.ok) {
      const errorText = await nutritionResponse.text()
      console.error(`API Ninjas error (${nutritionResponse.status}):`, errorText)
      throw new Error(`API request failed: ${nutritionResponse.status} ${errorText}`)
    }

    const nutritionData = await nutritionResponse.json()
    console.log('API Ninjas response:', nutritionData)

    if (!nutritionData || !nutritionData.length) {
      return new Response(
        JSON.stringify({ error: 'No nutrition data found for this food' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Calculate total nutrition values
    const totalNutrition = nutritionData.reduce((acc: any, item: any) => ({
      calories: acc.calories + item.calories,
      protein_g: acc.protein_g + item.protein_g,
      carbohydrates_total_g: acc.carbohydrates_total_g + item.carbohydrates_total_g,
      fat_total_g: acc.fat_total_g + item.fat_total_g
    }), {
      calories: 0,
      protein_g: 0,
      carbohydrates_total_g: 0,
      fat_total_g: 0
    })

    // Basic health assessment
    const isHealthy = 
      totalNutrition.calories <= 800 && // Not too caloric
      totalNutrition.protein_g >= 15 && // Good protein content
      totalNutrition.fat_total_g < 30;  // Moderate fat content

    const analysis = {
      foods: [query],
      calories: Math.round(totalNutrition.calories),
      protein: Math.round(totalNutrition.protein_g),
      carbs: Math.round(totalNutrition.carbohydrates_total_g),
      fat: Math.round(totalNutrition.fat_total_g),
      isHealthy,
      explanation: `This meal contains ${Math.round(totalNutrition.calories)} calories with ${Math.round(totalNutrition.protein_g)}g of protein, ${Math.round(totalNutrition.carbohydrates_total_g)}g of carbs, and ${Math.round(totalNutrition.fat_total_g)}g of fat.`,
      healthyAlternative: isHealthy ? undefined : "Consider a leaner option with more protein and less fat, such as grilled chicken with vegetables.",
      exerciseRecommendations: getExerciseRecommendations(totalNutrition.calories)
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
