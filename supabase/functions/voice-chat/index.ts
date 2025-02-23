
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import OpenAI from 'https://esm.sh/openai@4.20.1'
import { WebSocket, WebSocketServer } from 'https://deno.land/x/websocket@v0.1.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create a WebSocket server
const wss = new WebSocketServer(8080)
const sockets = new Map<string, WebSocket>()

console.log("Voice chat WebSocket server starting...")

// Functions to handle incoming messages
async function handleSpeechToText(audioBase64: string): Promise<string> {
  const response = await fetch('https://speech.googleapis.com/v1/speech:recognize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('GOOGLE_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        model: 'default'
      },
      audio: {
        content: audioBase64
      }
    })
  });

  if (!response.ok) {
    console.error('Speech-to-text error:', await response.text());
    throw new Error('Speech-to-text failed');
  }

  const data = await response.json();
  return data.results?.[0]?.alternatives?.[0]?.transcript || '';
}

async function handleTextToSpeech(text: string): Promise<string> {
  const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('GOOGLE_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: { text },
      voice: { 
        languageCode: 'en-US',
        name: 'en-US-Neural2-F',
        ssmlGender: 'FEMALE'
      },
      audioConfig: {
        audioEncoding: 'MP3'
      }
    })
  });

  if (!response.ok) {
    console.error('Text-to-speech error:', await response.text());
    throw new Error('Text-to-speech failed');
  }

  const data = await response.json();
  return data.audioContent || '';
}

// Handle WebSocket connections
wss.on('connection', (ws: WebSocket) => {
  const id = crypto.randomUUID()
  sockets.set(id, ws)
  console.log('New WebSocket connection:', id)

  ws.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message)
      console.log('Received message type:', data.type)

      if (data.type === 'audio') {
        // Convert speech to text
        const transcript = await handleSpeechToText(data.audio)
        ws.send(JSON.stringify({ type: 'transcript', text: transcript }))

        // Get response from OpenAI
        const openai = new OpenAI({
          apiKey: Deno.env.get('OPENAI_API_KEY')
        })

        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful AI assistant that provides concise responses."
            },
            {
              role: "user",
              content: transcript
            }
          ]
        })

        const responseText = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that."
        ws.send(JSON.stringify({ type: 'response', text: responseText }))

        // Convert response to speech
        const audioContent = await handleTextToSpeech(responseText)
        ws.send(JSON.stringify({ type: 'audio', audio: audioContent }))
      }
    } catch (error) {
      console.error('Error processing message:', error)
      ws.send(JSON.stringify({ type: 'error', message: error.message }))
    }
  })

  ws.on('close', () => {
    console.log('WebSocket connection closed:', id)
    sockets.delete(id)
  })
})

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const tts = url.searchParams.get('tts') || 'google'

    if (req.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected websocket', { status: 400 })
    }

    const { socket, response } = Deno.upgradeWebSocket(req)
    const id = crypto.randomUUID()
    sockets.set(id, socket as unknown as WebSocket)

    return response
  } catch (error) {
    console.error('Server error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
