
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { goal, level, age, frequency, preferences } = await req.json();

    const prompt = `Generate a workout plan with the following criteria:
      - Goal: ${goal}
      - Experience Level: ${level}
      - Age: ${age}
      - Workout Frequency: ${frequency} times per week
      - Additional Preferences: ${preferences}
      
      Format the response as a JSON object with:
      - title (string): A catchy title for the workout plan
      - description (string): A brief description of the workout plan
      - exercises (array): An array of exercises, each with:
        - name (string): Name of the exercise
        - sets (number): Number of sets
        - reps (number): Number of reps
        - restTime (number): Rest time in seconds
      
      Keep it focused and achievable.`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': Deno.env.get('GEMINI_API_KEY') || '',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    const data = await response.json();
    const workoutPlan = JSON.parse(data.candidates[0].content.parts[0].text);

    return new Response(JSON.stringify(workoutPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating workout:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
