
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { goal, level, age, frequency, preferences } = await req.json()
    
    console.log('Generating workout with params:', { goal, level, age, frequency, preferences })

    // Generate workout content using Gemini
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': Deno.env.get('GEMINI_API_KEY') || '',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Create a workout plan with these parameters:
            - Goal: ${goal}
            - Fitness Level: ${level}
            - Age: ${age}
            - Weekly Frequency: ${frequency} times per week
            - Additional Preferences: ${preferences}
            
            Format the response as a JSON object with this structure:
            {
              "title": "Workout Title",
              "description": "Brief description of the workout plan",
              "exercises": [
                {
                  "name": "Exercise Name",
                  "sets": number,
                  "reps": number,
                  "restTime": number (in seconds)
                }
              ]
            }`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate workout')
    }

    const result = await response.json()
    const workoutText = result.candidates[0].content.parts[0].text

    // Extract the JSON part from the response
    const jsonMatch = workoutText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse workout data')
    }

    const workoutData = JSON.parse(jsonMatch[0])

    return new Response(
      JSON.stringify(workoutData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error generating workout:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
