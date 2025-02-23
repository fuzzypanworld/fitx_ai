
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
    const { text } = await req.json()
    
    if (!text) {
      throw new Error('Text is required')
    }

    console.log('Generating speech for text:', text)

    // Using the specified voice ID for Laura
    const VOICE_ID = 'FGY2WhTYpPnrIDTdsKH5'
    const MODEL_ID = 'eleven_monolingual_v1'

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY') || '',
        },
        body: JSON.stringify({
          text,
          model_id: MODEL_ID,
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.75,
          },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ElevenLabs API error:', errorText)
      throw new Error(`Failed to generate speech: ${errorText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

    console.log('Successfully generated audio')

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        } 
      }
    )

  } catch (error) {
    console.error('Error in elevenlabs-tts:', error)
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
