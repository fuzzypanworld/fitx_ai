
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

// Default nutrition values for common foods that might not be in the API
const defaultNutritionValues = {
  // Indian breads (values per piece)
  flatbread: {
    calories: 80,
    protein_g: 2.5,
    carbohydrates_total_g: 15,
    fat_total_g: 0.8
  },
  'indian flatbread': {
    calories: 80,
    protein_g: 2.5,
    carbohydrates_total_g: 15,
    fat_total_g: 0.8
  },
  'chapati': {
    calories: 80,
    protein_g: 2.5,
    carbohydrates_total_g: 15,
    fat_total_g: 0.8
  },
  'roti': {
    calories: 80,
    protein_g: 2.5,
    carbohydrates_total_g: 15,
    fat_total_g: 0.8
  },
  'naan': {
    calories: 180,
    protein_g: 5,
    carbohydrates_total_g: 34,
    fat_total_g: 2.7
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
    let mainFood = description
      .split(/,|\band\b/)[0]
      .trim()
      .replace(/^(a|an|the)\s+/, '')

    // Check if the description matches Indian bread patterns
    const hasIndianBreadIndicators = indianBreadKeywords.some(keyword => 
      description.includes(keyword)
    )

    if (hasIndianBreadIndicators) {
      console.log('Detected possible Indian bread from keywords')
      mainFood = 'indian flatbread'
    } else {
      // Check normal food mappings
      for (const [key, value] of Object.entries(foodMappings)) {
        if (description.includes(key)) {
          mainFood = value
          break
        }
      }
    }

    console.log('Mapped food query:', mainFood)

    // First check our default values
    let nutrition = defaultNutritionValues[mainFood as keyof typeof defaultNutritionValues]

    // If not in our defaults, try the API
    if (!nutrition) {
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
      console.log('API Nutrition data:', nutritionData)
      
      nutrition = nutritionData[0] || defaultNutritionValues['flatbread'] // Fallback to flatbread values
    }

    // Clean up the foods array and map any recognized terms
    const foods = description
      .split(/,|\band\b/)
      .map(food => {
        const cleaned = food.trim()
        // Check if this is an Indian bread by keywords
        if (indianBreadKeywords.some(keyword => cleaned.includes(keyword))) {
          return 'Indian flatbread'
        }
        // Return mapped food name if available
        for (const [key, value] of Object.entries(foodMappings)) {
          if (cleaned.includes(key)) {
            return value
          }
        }
        return cleaned
      })
      .filter(food => food.length > 0)

    // Updated health assessment logic
    const isExplicitlyUnhealthy = foods.some(food => 
      Array.from(unhealthyFoods).some(unhealthy => food.includes(unhealthy))
    )

    const hasHealthyKeywords = /salad|vegetable|fruit|lean|fish|grilled|steamed|boiled/.test(description)
    
    // Updated nutrition scoring to consider low calories as unhealthy
    const nutritionScore = (
      (nutrition.calories >= 200 && nutrition.calories <= 800 ? 1 : 0) + // Healthy calorie range
      (nutrition.protein_g > 15 ? 1 : 0) + // Good protein
      (nutrition.fat_total_g < 15 ? 1 : 0) + // Moderate fat
      ((nutrition.carbohydrates_total_g / nutrition.protein_g) < 5 ? 1 : 0) // Good carb-to-protein ratio
    )

    const isHealthy = !isExplicitlyUnhealthy && hasHealthyKeywords && nutritionScore >= 2

    let healthyAlternative: string | undefined
    if (nutrition.calories < 200) {
      healthyAlternative = "This meal appears to be too low in calories. Consider adding more protein-rich foods like eggs, lean meat, or legumes to make it more nutritious and filling."
    } else if (!isHealthy) {
      healthyAlternative = "Consider healthier alternatives like grilled chicken with vegetables, a grain bowl with lean protein, or a fresh salad with grilled fish."
    }

    const analysis = {
      foods: foods.map(food => food === 'indian flatbread' ? 'Chapati/Roti' : food),
      calories: Math.round(nutrition.calories),
      protein: Math.round(nutrition.protein_g),
      carbs: Math.round(nutrition.carbohydrates_total_g),
      fat: Math.round(nutrition.fat_total_g),
      isHealthy: isHealthy,
      explanation: `This meal contains ${Math.round(nutrition.calories)} calories with ${Math.round(nutrition.protein_g)}g of protein, ${Math.round(nutrition.carbohydrates_total_g)}g of carbs, and ${Math.round(nutrition.fat_total_g)}g of fat.`,
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
