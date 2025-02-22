
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

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

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Create a detailed workout plan with the following parameters:
      - Goal: ${goal}
      - Experience Level: ${level}
      - Age: ${age}
      - Workout Frequency: ${frequency} times per week
      - Additional Preferences: ${preferences}

      Please provide:
      1. A title for the workout plan
      2. A detailed description
      3. A list of exercises with sets, reps, and rest times
      Format the response as a JSON object with title, description, and exercises array.
      Each exercise should have: name, sets, reps, and restTime (in seconds).`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Parse the Gemini response to extract the JSON
    const workoutPlan = JSON.parse(
      text.substring(
        text.indexOf('{'),
        text.lastIndexOf('}') + 1
      )
    );

    return new Response(
      JSON.stringify(workoutPlan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      },
    );
  }
});
