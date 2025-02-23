
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

    // Fetch the image first to ensure it exists and is accessible
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image')
    }
    const imageBlob = await imageResponse.blob()

    const hf = new HfInference(Deno.env.get('HUGGING_FACE_ACCESS_TOKEN'))
    console.log('Starting image analysis...')

    // Use the blob directly instead of the URL
    const result = await hf.imageToText({
      model: 'Salesforce/blip-image-captioning-base',
      inputs: imageBlob,
    })

    console.log('Raw analysis result:', result)

    const description = result.generated_text.toLowerCase()
    console.log('Processed description:', description)

    // Analyze the content
    const isHealthy = /salad|vegetable|fruit|healthy|lean|fish|grilled/.test(description)
    const unhealthyMatch = /pizza|burger|fries|fried|processed|candy|cake|dessert/.test(description)

    const foods = description
      .split(/,|\band\b/)
      .map(food => food.trim())
      .filter(food => food.length > 0)

    const analysis = {
      foods,
      calories: isHealthy ? 300 : 600,
      protein: isHealthy ? 15 : 20,
      carbs: isHealthy ? 30 : 50,
      fat: isHealthy ? 10 : 25,
      isHealthy,
      explanation: isHealthy 
        ? "This looks like a healthy, nutritious meal! Great choice for maintaining a balanced diet."
        : "While this food might be tasty, there are healthier alternatives available.",
      healthyAlternative: unhealthyMatch 
        ? "Consider trying a fresh salad with grilled chicken or fish for a more nutritious option."
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
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
