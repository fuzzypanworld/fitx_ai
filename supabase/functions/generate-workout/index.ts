
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { goal, level } = await req.json()

    // Create workout based on goal and level
    const workout = {
      title: `${level} ${goal} Workout`,
      description: `A personalized workout designed for ${level} users focusing on ${goal}.`,
      exercises: [
        {
          name: "Push-ups",
          sets: level === 'beginner' ? 3 : level === 'intermediate' ? 4 : 5,
          reps: level === 'beginner' ? 10 : level === 'intermediate' ? 15 : 20,
          restTime: 60
        },
        {
          name: "Squats",
          sets: level === 'beginner' ? 3 : level === 'intermediate' ? 4 : 5,
          reps: level === 'beginner' ? 12 : level === 'intermediate' ? 15 : 20,
          restTime: 60
        },
        {
          name: "Plank",
          sets: level === 'beginner' ? 2 : level === 'intermediate' ? 3 : 4,
          reps: 1,
          restTime: 60,
          duration: level === 'beginner' ? 30 : level === 'intermediate' ? 45 : 60
        }
      ]
    }

    return new Response(
      JSON.stringify(workout),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      },
    )
  }
})
