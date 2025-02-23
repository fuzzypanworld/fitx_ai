
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.2.1"

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

      const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      try {
        const chat = model.startChat({
          history: [
            {
              role: "user",
              parts: "You are a knowledgeable fitness and nutrition AI assistant. Keep your responses helpful, encouraging, and concise."
            },
            {
              role: "model",
              parts: "I understand. I'll act as a fitness and nutrition assistant, providing helpful, encouraging, and concise responses."
            }
          ]
        });

        const result = await chat.sendMessage(text);
        const response = await result.response;
        const responseText = response.text();

        return new Response(
          JSON.stringify({ responseText }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        console.error('Gemini API error:', error);
        throw new Error('Failed to get response from Gemini');
      }
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
