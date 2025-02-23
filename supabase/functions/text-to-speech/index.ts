
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { TextToSpeechClient } from 'https://esm.sh/@google-cloud/text-to-speech@5.0.1'

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
    const { text, tts = 'google' } = await req.json()

    if (!text) {
      throw new Error('Text is required')
    }

    if (tts === 'google') {
      // Initialize Google Cloud client
      const client = new TextToSpeechClient()

      // Construct the request
      const request = {
        input: { text },
        voice: {
          languageCode: 'en-US',
          name: 'en-US-Standard-I',
          ssmlGender: 'FEMALE'
        },
        audioConfig: { audioEncoding: 'MP3' }
      }

      console.log('Sending request to Google TTS:', request)

      // Perform the text-to-speech request
      const [response] = await client.synthesizeSpeech(request)
      
      if (!response.audioContent) {
        throw new Error('No audio content received from Google TTS')
      }

      // Convert audio content to base64
      const audioContent = btoa(
        String.fromCharCode(...new Uint8Array(response.audioContent))
      )

      return new Response(
        JSON.stringify({ audioContent }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      throw new Error('Unsupported TTS provider')
    }
  } catch (error) {
    console.error('Error in text-to-speech:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
