
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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
    
    if (!imageUrl) {
      throw new Error('Image URL is required')
    }

    // Initialize OpenAI API
    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Analyze image with OpenAI Vision
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a helpful and friendly nutritionist. Analyze the food in images and provide:
              1. List of identified food items
              2. Estimated calories per serving
              3. Macronutrient breakdown (protein, carbs, fat)
              4. Health rating (healthy or unhealthy)
              5. If unhealthy, suggest a healthier alternative that's equally tasty
              
              Respond in a friendly, encouraging tone. Format the response as JSON with these keys:
              {
                foods: string[],
                calories: number,
                protein: number,
                carbs: number,
                fat: number,
                isHealthy: boolean,
                healthyAlternative?: string,
                explanation: string
              }`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What food items do you see in this image? Provide nutritional analysis.' },
              { type: 'image_url', image_url: imageUrl }
            ]
          }
        ]
      })
    })

    const data = await response.json()
    const analysis = JSON.parse(data.choices[0].message.content)

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
