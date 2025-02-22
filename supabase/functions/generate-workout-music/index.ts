
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { intensity } = await req.json()

    // Mock response - you can integrate with a real music API later
    const playlist = {
      playlist_url: "https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP",
      name: `${intensity} Workout Mix`,
      tracks: [
        "Eye of the Tiger",
        "Stronger",
        "Till I Collapse"
      ]
    }

    return new Response(
      JSON.stringify(playlist),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      },
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
