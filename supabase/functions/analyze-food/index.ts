
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageUrl } = await req.json()
    console.log('Received image URL:', imageUrl)
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // First get the image description using Hugging Face
    const hfToken = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN')
    if (!hfToken) {
      return new Response(
        JSON.stringify({ error: 'Missing Hugging Face API configuration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const hf = new HfInference(hfToken)
    console.log('Starting image analysis...')

    const result = await hf.imageToText({
      model: 'Salesforce/blip-image-captioning-base',
      inputs: imageUrl,
      wait_for_model: true
    })

    if (!result || !result.generated_text) {
      throw new Error('Invalid response from image analysis')
    }

    const description = result.generated_text.toLowerCase()
    console.log('Food description:', description)

    // Extract the main food item for API query
    const mainFood = description
      .split(/,|\band\b/)[0]
      .trim()
      .replace(/^(a|an|the)\s+/, '')

    console.log('Querying nutrition for:', mainFood)

    // Get nutritional info from API Ninjas
    const apiKey = Deno.env.get('API_NINJAS_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing API Ninjas configuration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const nutritionResponse = await fetch(
      `https://api.api-ninjas.com/v1/nutrition?query=${encodeURIComponent(mainFood)}`, 
      {
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!nutritionResponse.ok) {
      throw new Error('Failed to fetch nutrition data')
    }

    const nutritionData = await nutritionResponse.json()
    console.log('Nutrition data:', nutritionData)

    // In case no nutrition data is found, provide default values
    const nutrition = nutritionData[0] || {
      calories: 0,
      protein_g: 0,
      carbohydrates_total_g: 0,
      fat_total_g: 0
    }

    const foods = description
      .split(/,|\band\b/)
      .map(food => food.trim())
      .filter(food => food.length > 0)

    // Determine if food is healthy based on nutritional values
    const isHealthy = (
      nutrition.protein_g > 10 || // Good protein content
      (nutrition.calories < 400 && nutrition.fat_total_g < 15) || // Low calorie and fat
      /salad|vegetable|fruit|lean|fish|grilled/.test(description) // Healthy keywords
    )

    const unhealthyMatch = /pizza|burger|fries|fried|processed|candy|cake|dessert/.test(description)

    const analysis = {
      foods,
      calories: Math.round(nutrition.calories),
      protein: Math.round(nutrition.protein_g),
      carbs: Math.round(nutrition.carbohydrates_total_g),
      fat: Math.round(nutrition.fat_total_g),
      isHealthy,
      explanation: isHealthy 
        ? "This looks like a healthy, nutritious meal! The nutritional values show a good balance of nutrients."
        : "While this food might be tasty, the nutritional analysis suggests there might be healthier alternatives available.",
      healthyAlternative: unhealthyMatch 
        ? "Consider trying a fresh salad with grilled chicken or fish for a more nutritious option with better protein content and fewer calories."
        : undefined
    }

    console.log('Final analysis:', analysis)
    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error analyzing image:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to analyze image',
        details: error.message,
        stack: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
