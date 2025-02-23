
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { WebSocketClient, StandardWebSocketClient } from "https://deno.land/x/websocket@v0.1.4/mod.ts"
import { concat } from "https://deno.land/std@0.170.0/bytes/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VOICE_ID = 'UgBBYS2sOqTuMpoF3BR0'
const MODEL_ID = 'eleven_multilingual_v2'

serve(async (req) => {
  const upgradeHeader = req.headers.get("Upgrade")
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return new Response("Expected Upgrade: websocket", { status: 426 })
  }

  const { response, socket } = Deno.upgradeWebSocket(req)

  socket.onopen = () => {
    console.log("WebSocket connection established")
  }

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data)
      
      if (data.type === 'audio') {
        // Process audio using Whisper API
        const audioData = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))
        
        // Create form data for Whisper API
        const formData = new FormData()
        formData.append('file', new Blob([audioData]), 'audio.webm')
        formData.append('model', 'whisper-1')

        const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          },
          body: formData,
        })

        if (!transcriptionResponse.ok) {
          throw new Error('Failed to transcribe audio')
        }

        const { text } = await transcriptionResponse.json()
        
        // Send transcription back to client
        socket.send(JSON.stringify({ type: 'transcript', text }))

        // Generate chat response using OpenAI
        const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              { 
                role: 'system', 
                content: 'You are a helpful AI fitness assistant. Keep responses brief and focused on health, fitness, and wellbeing.' 
              },
              { role: 'user', content: text }
            ],
          }),
        })

        if (!chatResponse.ok) {
          throw new Error('Failed to generate response')
        }

        const chatResult = await chatResponse.json()
        const responseText = chatResult.choices[0].message.content

        // Generate speech from response text using ElevenLabs
        const ttsResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
          {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY') || '',
            },
            body: JSON.stringify({
              text: responseText,
              model_id: MODEL_ID,
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
              },
            }),
          }
        )

        if (!ttsResponse.ok) {
          throw new Error('Failed to generate speech')
        }

        // Send both text and audio response back to client
        socket.send(JSON.stringify({ 
          type: 'response',
          text: responseText,
        }))

        const audioBuffer = await ttsResponse.arrayBuffer()
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))
        
        socket.send(JSON.stringify({
          type: 'audio',
          audio: base64Audio
        }))
      }
    } catch (error) {
      console.error('Error:', error)
      socket.send(JSON.stringify({ 
        type: 'error', 
        message: error.message 
      }))
    }
  }

  socket.onerror = (e) => console.error("WebSocket error:", e)
  socket.onclose = () => console.log("WebSocket connection closed")

  return response
})
