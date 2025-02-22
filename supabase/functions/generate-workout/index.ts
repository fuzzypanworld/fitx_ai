
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const { goal, level, frequency } = await req.json();

    const prompt = `Create a personalized workout plan with the following parameters:
      - Goal: ${goal}
      - Experience Level: ${level}
      - Workout Frequency: ${frequency} times per week
      
      Format the response as a JSON object with:
      - title: string
      - description: string
      - exercises: array of objects containing:
        - name: string
        - sets: number
        - reps: number
        - rest: string (rest period)
        - notes: string (optional form tips)`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the generated text as JSON
    let workout;
    try {
      workout = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', text);
      throw new Error('Invalid workout format generated');
    }

    return new Response(JSON.stringify(workout), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating workout:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate workout' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
