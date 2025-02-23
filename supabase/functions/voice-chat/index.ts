import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VOICE_ID = 'IKne3meq5aSn9XLyUdCD'
const MODEL_ID = 'eleven_multilingual_v2'

serve(async (req) => {
  const upgradeHeader = req.headers.get("Upgrade")
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return new Response(
      JSON.stringify({ error: "Expected Upgrade: websocket" }),
      { 
        status: 426, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    const { response, socket } = Deno.upgradeWebSocket(req)

    socket.onopen = () => {
      console.log("WebSocket connection established")
    }

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'audio') {
          console.log('Processing audio input...')
          const audioData = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))
          
          // Transcribe audio using Whisper API
          console.log('Transcribing audio...')
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
          console.log('Transcribed text:', text)
          
          socket.send(JSON.stringify({ type: 'transcript', text }))

          // Generate response using Gemini
          console.log('Generating response with Gemini...')
          const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': Deno.env.get('GEMINI_API_KEY') || '',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `You are a helpful AI fitness assistant. Keep responses brief and focused on health, fitness, and wellbeing. User message: ${text}`
                }]
              }],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
              }
            })
          })

          if (!geminiResponse.ok) {
            throw new Error('Failed to generate response')
          }

          const geminiResult = await geminiResponse.json()
          const responseText = geminiResult.candidates[0].content.parts[0].text
          console.log('Generated response:', responseText)

          // Convert response to speech using ElevenLabs
          console.log('Converting response to speech...')
          const ttsResponse = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
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
          console.log('Audio response sent successfully')
        }
      } catch (error) {
        console.error('Error processing message:', error)
        socket.send(JSON.stringify({ 
          type: 'error', 
          message: error.message,
          details: error.stack
        }))
      }
    }

    socket.onerror = (e) => {
      console.error("WebSocket error:", e)
    }
    
    socket.onclose = () => {
      console.log("WebSocket connection closed")
    }

    return response

  } catch (error) {
    console.error('Error setting up WebSocket:', error)
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
