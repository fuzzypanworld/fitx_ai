
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
    console.log('Starting food analysis...')
    const { imageUrl } = await req.json()
    
    if (!imageUrl) {
      throw new Error('Image URL is required')
    }

    const hf = new HfInference(Deno.env.get('HUGGING_FACE_ACCESS_TOKEN'))
    console.log('Analyzing image with Hugging Face...')

    // Use a pre-trained model for image analysis
    const result = await hf.imageToText({
      model: 'Salesforce/blip-image-captioning-base',
      inputs: imageUrl,
    })

    // Process the result into our expected format
    // Simple rules for demonstration:
    // - If it contains words like "salad", "vegetable", "fruit" -> healthy
    // - If it contains words like "pizza", "burger", "fries" -> less healthy
    const text = result.toLowerCase()
    const isHealthy = text.match(/salad|vegetable|fruit|healthy|lean/) !== null
    const unhealthyMatch = text.match(/pizza|burger|fries|fried|processed/)

    const analysis = {
      foods: [result],
      calories: isHealthy ? 300 : 600, // Estimated values
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

    console.log('Analysis complete:', analysis)
    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
