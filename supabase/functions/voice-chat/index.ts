
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import OpenAI from 'https://esm.sh/openai@4.20.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audio, text, type, userName } = await req.json()

    if (type === 'transcribe') {
      if (!audio) {
        throw new Error('Audio data is required for transcription')
      }

      const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY')
      if (!deepgramApiKey) {
        throw new Error('Deepgram API key not configured')
      }

      // Convert base64 to binary
      const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));

      // Send to Deepgram API
      const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${deepgramApiKey}`,
          'Content-Type': 'audio/wav',
        },
        body: binaryAudio
      });

      if (!response.ok) {
        throw new Error(`Deepgram API error: ${await response.text()}`)
      }

      const result = await response.json()
      const transcribedText = result.results?.channels[0]?.alternatives[0]?.transcript || ''

      return new Response(
        JSON.stringify({ text: transcribedText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (type === 'chat') {
      if (!text) {
        throw new Error('Text is required for chat')
      }

      const openai = new OpenAI({
        apiKey: Deno.env.get('OPENAI_API_KEY'),
      })

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a knowledgeable fitness and nutrition AI assistant. Keep your responses helpful, encouraging, and concise."
          },
          {
            role: "user",
            content: text
          }
        ],
      })

      const responseText = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.'

      return new Response(
        JSON.stringify({ responseText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      throw new Error('Invalid operation type')
    }
  } catch (error) {
    console.error('Error in voice chat function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
