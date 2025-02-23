import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

// Food mappings for common items that API might not recognize
const foodMappings: { [key: string]: string } = {
  // Indian breads and foods (with common misspellings and variations)
  'chapati': 'flatbread',
  'chapatti': 'flatbread',
  'roti': 'flatbread',
  'rote': 'flatbread',
  'rotis': 'flatbread',
  'naan': 'flatbread',
  'paratha': 'flatbread',
  'parantha': 'flatbread',
  'dal': 'lentils',
  'daal': 'lentils',
  'dahl': 'lentils',
  'curry': 'curry',
  'sabzi': 'vegetable curry',
  'sabji': 'vegetable curry',
  // Asian foods
  'noodles': 'chow mein noodles',
  'ramen': 'noodles',
  'udon': 'noodles',
  'pad thai': 'noodles',
  // Common variations
  'burger': 'hamburger',
  'pizza slice': 'pizza',
  'french fries': 'fries',
  'torres': 'flatbread', // Handle the misrecognition
  'tortilla': 'flatbread'
}

// Keywords that might indicate Indian breads
const indianBreadKeywords = [
  'round', 'flat', 'bread', 'tortilla', 'torres', 'plate', 'brown', 'circular'
]

// Explicitly defined unhealthy foods
const unhealthyFoods = new Set([
  'burger', 'hamburger', 'cheeseburger',
  'pizza', 'fries', 'french fries',
  'fried chicken', 'hot dog', 'ice cream',
  'cake', 'donut', 'candy', 'chips',
  'soda', 'cookie', 'pie'
])

// Updated default nutrition values for common foods that might not be in the API
const defaultNutritionValues = {
  // Indian breads (values per piece)
  flatbread: {
    calories: 120,
    protein_g: 3,
    carbohydrates_total_g: 20,
    fat_total_g: 3
  },
  'indian flatbread': {
    calories: 120,
    protein_g: 3,
    carbohydrates_total_g: 20,
    fat_total_g: 3
  },
  'chapati': {
    calories: 120,
    protein_g: 3,
    carbohydrates_total_g: 20,
    fat_total_g: 3
  },
  'roti': {
    calories: 120,
    protein_g: 3,
    carbohydrates_total_g: 20,
    fat_total_g: 3
  },
  'naan': {
    calories: 260,
    protein_g: 9,
    carbohydrates_total_g: 48,
    fat_total_g: 3.3
  },
  // Curries (values per serving)
  'curry': {
    calories: 250,
    protein_g: 15,
    carbohydrates_total_g: 15,
    fat_total_g: 15
  },
  'vegetable curry': {
    calories: 180,
    protein_g: 6,
    carbohydrates_total_g: 20,
    fat_total_g: 10
  },
  // Asian noodles (values per cup cooked)
  'noodles': {
    calories: 220,
    protein_g: 7,
    carbohydrates_total_g: 43,
    fat_total_g: 2
  },
  'chow mein noodles': {
    calories: 220,
    protein_g: 7,
    carbohydrates_total_g: 43,
    fat_total_g: 2
  }
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

    // Smart food type detection logic
    let detectedFoods = description
      .split(/,|\band\b/)
      .map(food => food.trim())
      .filter(food => food.length > 0)

    // Calculate total nutrition by combining all detected foods
    let totalNutrition = {
      calories: 0,
      protein_g: 0,
      carbohydrates_total_g: 0,
      fat_total_g: 0
    }

    for (const food of detectedFoods) {
      let nutritionForFood = null

      // Check if it's a bread item
      if (indianBreadKeywords.some(keyword => food.includes(keyword))) {
        nutritionForFood = defaultNutritionValues['indian flatbread']
      } else {
        // Check food mappings
        for (const [key, value] of Object.entries(foodMappings)) {
          if (food.includes(key)) {
            nutritionForFood = defaultNutritionValues[value as keyof typeof defaultNutritionValues]
            break
          }
        }
      }

      // If no mapping found, try API
      if (!nutritionForFood) {
        try {
          const apiKey = Deno.env.get('API_NINJAS_KEY')
          if (!apiKey) {
            throw new Error('Missing API Ninjas configuration')
          }

          const nutritionResponse = await fetch(
            `https://api.api-ninjas.com/v1/nutrition?query=${encodeURIComponent(food)}`, 
            {
              headers: {
                'X-Api-Key': apiKey,
                'Content-Type': 'application/json'
              }
            }
          )

          if (nutritionResponse.ok) {
            const data = await nutritionResponse.json()
            if (data && data[0]) {
              nutritionForFood = data[0]
            }
          }
        } catch (error) {
          console.error('Error fetching nutrition data for', food, error)
        }
      }

      // Add nutrition values to total
      if (nutritionForFood) {
        totalNutrition.calories += nutritionForFood.calories
        totalNutrition.protein_g += nutritionForFood.protein_g
        totalNutrition.carbohydrates_total_g += nutritionForFood.carbohydrates_total_g
        totalNutrition.fat_total_g += nutritionForFood.fat_total_g
      }
    }

    // Clean up the foods array and map any recognized terms
    const foods = detectedFoods.map(food => {
      if (indianBreadKeywords.some(keyword => food.includes(keyword))) {
        return 'Indian flatbread'
      }
      for (const [key, value] of Object.entries(foodMappings)) {
        if (food.includes(key)) {
          return value
        }
      }
      return food
    })

    // Updated health assessment logic
    const isExplicitlyUnhealthy = foods.some(food => 
      Array.from(unhealthyFoods).some(unhealthy => food.includes(unhealthy))
    )

    const hasHealthyKeywords = /salad|vegetable|fruit|lean|fish|grilled|steamed|boiled/.test(description)
    
    // Updated nutrition scoring to consider reasonable calorie range
    const nutritionScore = (
      (totalNutrition.calories >= 200 && totalNutrition.calories <= 800 ? 1 : 0) + // Healthy calorie range
      (totalNutrition.protein_g > 15 ? 1 : 0) + // Good protein
      (totalNutrition.fat_total_g < 30 ? 1 : 0) + // Moderate fat
      ((totalNutrition.carbohydrates_total_g / totalNutrition.protein_g) < 5 ? 1 : 0) // Good carb-to-protein ratio
    )

    const isHealthy = !isExplicitlyUnhealthy && hasHealthyKeywords && nutritionScore >= 2

    let healthyAlternative: string | undefined
    if (totalNutrition.calories < 200) {
      healthyAlternative = "This meal appears to be too low in calories. Consider adding more protein-rich foods like eggs, lean meat, or legumes to make it more nutritious and filling."
    } else if (!isHealthy) {
      healthyAlternative = "Consider healthier alternatives like grilled chicken with vegetables, a grain bowl with lean protein, or a fresh salad with grilled fish."
    }

    const analysis = {
      foods: foods.map(food => food === 'indian flatbread' ? 'Chapati/Roti' : food),
      calories: Math.round(totalNutrition.calories),
      protein: Math.round(totalNutrition.protein_g),
      carbs: Math.round(totalNutrition.carbohydrates_total_g),
      fat: Math.round(totalNutrition.fat_total_g),
      isHealthy: isHealthy,
      explanation: `This meal contains ${Math.round(totalNutrition.calories)} calories with ${Math.round(totalNutrition.protein_g)}g of protein, ${Math.round(totalNutrition.carbohydrates_total_g)}g of carbs, and ${Math.round(totalNutrition.fat_total_g)}g of fat.`,
      healthyAlternative
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
