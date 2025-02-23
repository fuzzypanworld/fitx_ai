
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

// Food mappings for common items that API might not recognize
const foodMappings: { [key: string]: string } = {
  // Indian foods
  'chapati': 'flatbread',
  'roti': 'flatbread',
  'naan': 'flatbread',
  'dal': 'lentils',
  'daal': 'lentils',
  'paratha': 'flatbread',
  // Asian foods
  'noodles': 'chow mein noodles',
  'ramen': 'noodles',
  'udon': 'noodles',
  'pad thai': 'noodles',
  // Common variations
  'burger': 'hamburger',
  'pizza slice': 'pizza',
  'french fries': 'fries'
}

// Explicitly defined unhealthy foods
const unhealthyFoods = new Set([
  'burger', 'hamburger', 'cheeseburger',
  'pizza', 'fries', 'french fries',
  'fried chicken', 'hot dog', 'ice cream',
  'cake', 'donut', 'candy', 'chips',
  'soda', 'cookie', 'pie'
])

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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
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

    // Extract and map the main food item for API query
    let mainFood = description
      .split(/,|\band\b/)[0]
      .trim()
      .replace(/^(a|an|the)\s+/, '')

    // Check if we need to map this food to a recognized term
    for (const [key, value] of Object.entries(foodMappings)) {
      if (description.includes(key)) {
        mainFood = value
        break
      }
    }

    console.log('Mapped food query:', mainFood)

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

    // Default values based on common serving sizes
    const defaultNutrition = {
      chapati: { calories: 120, protein_g: 3, carbohydrates_total_g: 20, fat_total_g: 3 },
      noodles: { calories: 220, protein_g: 7, carbohydrates_total_g: 43, fat_total_g: 2 },
      flatbread: { calories: 130, protein_g: 3, carbohydrates_total_g: 23, fat_total_g: 3 }
    }

    // Use API data or fallback to defaults
    const nutrition = nutritionData[0] || defaultNutrition[mainFood as keyof typeof defaultNutrition] || {
      calories: 200,
      protein_g: 5,
      carbohydrates_total_g: 25,
      fat_total_g: 8
    }

    const foods = description
      .split(/,|\band\b/)
      .map(food => food.trim())
      .filter(food => food.length > 0)

    // More comprehensive health assessment
    const isExplicitlyUnhealthy = foods.some(food => 
      Array.from(unhealthyFoods).some(unhealthy => food.includes(unhealthy))
    )

    const hasHealthyKeywords = /salad|vegetable|fruit|lean|fish|grilled|steamed|boiled/.test(description)
    
    const nutritionScore = (
      (nutrition.protein_g > 15 ? 1 : 0) + // Good protein
      (nutrition.calories < 400 ? 1 : 0) + // Reasonable calories
      (nutrition.fat_total_g < 15 ? 1 : 0) + // Moderate fat
      ((nutrition.carbohydrates_total_g / nutrition.protein_g) < 5 ? 1 : 0) // Good carb-to-protein ratio
    )

    const isHealthy = !isExplicitlyUnhealthy && (hasHealthyKeywords || nutritionScore >= 2)

    const analysis = {
      foods,
      calories: Math.round(nutrition.calories),
      protein: Math.round(nutrition.protein_g),
      carbs: Math.round(nutrition.carbohydrates_total_g),
      fat: Math.round(nutrition.fat_total_g),
      isHealthy,
      explanation: isHealthy 
        ? `This meal contains ${Math.round(nutrition.protein_g)}g of protein and a balanced mix of nutrients. ${hasHealthyKeywords ? "It includes healthy preparation methods or ingredients." : ""}`
        : `This meal is relatively high in ${nutrition.calories > 400 ? 'calories' : nutrition.fat_total_g > 15 ? 'fat' : 'carbohydrates'}. ${isExplicitlyUnhealthy ? "It falls into the category of foods that are best consumed in moderation." : ""}`,
      healthyAlternative: isExplicitlyUnhealthy 
        ? "Consider healthier alternatives like grilled chicken with vegetables, a grain bowl with lean protein, or a fresh salad with grilled fish."
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
