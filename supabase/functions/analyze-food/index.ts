
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
    console.log('Analyzing image with Hugging Face...', imageUrl)

    // Use a pre-trained model for image analysis
    const result = await hf.imageToText({
      model: 'Salesforce/blip-image-captioning-base',
      inputs: imageUrl,
    })

    console.log('Raw analysis result:', result)

    // Extract the text from the result (the API returns { generated_text: string })
    const text = (typeof result === 'object' && result.generated_text) 
      ? result.generated_text.toLowerCase()
      : String(result).toLowerCase()

    console.log('Processed text:', text)

    // Process the result into our expected format
    const isHealthy = text.match(/salad|vegetable|fruit|healthy|lean/) !== null
    const unhealthyMatch = text.match(/pizza|burger|fries|fried|processed/)

    const analysis = {
      foods: [text.split(' and ').map(food => food.trim())].flat(), // Split on 'and' to get individual foods
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
