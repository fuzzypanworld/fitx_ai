
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.2.1"
import { WebSocketClient, WebSocketServer } from "https://deno.land/x/websocket@v0.1.4/mod.ts"

const wss = new WebSocketServer(8080);
const activeConnections = new Map();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Connect to Deepgram
async function connectToDeepgram(sessionId: string) {
  try {
    const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY');
    if (!deepgramApiKey) throw new Error('Deepgram API key not configured');

    const ws = new WebSocket('wss://api.deepgram.com/v1/listen', {
      headers: {
        Authorization: `Token ${deepgramApiKey}`,
      },
    });

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'Results') {
        const transcript = data.channel.alternatives[0].transcript;
        if (transcript.trim()) {
          const clientWs = activeConnections.get(sessionId);
          if (clientWs) {
            // Send transcription to client
            clientWs.send(JSON.stringify({
              type: 'transcript',
              text: transcript
            }));

            // Get Gemini response
            const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });

            try {
              const result = await model.generateContent(transcript);
              const response = await result.response;
              const responseText = response.text();

              // Send AI response back to client
              clientWs.send(JSON.stringify({
                type: 'response',
                text: responseText
              }));
            } catch (error) {
              console.error('Gemini API error:', error);
              clientWs.send(JSON.stringify({
                type: 'error',
                message: 'Failed to get AI response'
              }));
            }
          }
        }
      }
    };

    return ws;
  } catch (error) {
    console.error('Error connecting to Deepgram:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Upgrade the HTTP request to a WebSocket connection
  if (req.headers.get("upgrade") === "websocket") {
    try {
      const { socket, response } = Deno.upgradeWebSocket(req);
      const sessionId = crypto.randomUUID();
      
      // Store the WebSocket connection
      activeConnections.set(sessionId, socket);
      
      // Connect to Deepgram
      const deepgramWs = await connectToDeepgram(sessionId);

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'audio') {
          // Forward audio data to Deepgram
          deepgramWs.send(JSON.stringify({
            type: 'audio',
            data: data.audio
          }));
        }
      };

      socket.onclose = () => {
        activeConnections.delete(sessionId);
        deepgramWs.close();
      };

      return response;
    } catch (err) {
      console.error(err);
      return new Response('Failed to upgrade to WebSocket', { status: 400 });
    }
  }

  return new Response('Expected WebSocket connection', { 
    status: 400,
    headers: corsHeaders
  });
});
