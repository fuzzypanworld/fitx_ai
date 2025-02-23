
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
      
      Respond with a JSON object in this exact format (no explanation, only the JSON):
      {
        "title": "Title of the workout plan",
        "description": "Brief description of the workout plan",
        "exercises": [
          {
            "name": "Exercise name",
            "sets": number,
            "reps": number,
            "restTime": number
          }
        ]
      }`;

    console.log('Sending request to Gemini API...');
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
    console.log('Gemini API response:', data);

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API');
    }

    let workoutPlan;
    try {
      const cleanedText = data.candidates[0].content.parts[0].text.trim();
      workoutPlan = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      throw new Error('Failed to parse workout plan from Gemini response');
    }

    // Validate the workout plan structure
    if (!workoutPlan.title || !workoutPlan.description || !Array.isArray(workoutPlan.exercises)) {
      throw new Error('Invalid workout plan structure');
    }

    // Ensure each exercise has the required properties
    workoutPlan.exercises = workoutPlan.exercises.map(exercise => ({
      name: exercise.name || 'Unnamed Exercise',
      sets: parseInt(exercise.sets) || 3,
      reps: parseInt(exercise.reps) || 10,
      restTime: parseInt(exercise.restTime) || 60
    }));

    console.log('Generated workout plan:', workoutPlan);

    return new Response(JSON.stringify(workoutPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-workout function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate workout plan'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
