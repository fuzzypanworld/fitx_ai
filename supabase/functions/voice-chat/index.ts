
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audioContent } = await req.json();
    
    // Create form data for Whisper API
    const formData = new FormData();
    const audioBlob = await fetch(`data:audio/webm;base64,${audioContent}`).then(r => r.blob());
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');

    // 1. Convert audio to text using Whisper
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData
    });

    if (!whisperResponse.ok) {
      throw new Error('Failed to transcribe audio');
    }

    const { text: transcribedText } = await whisperResponse.json();
    console.log('Transcribed text:', transcribedText);

    // 2. Get response from Gemini with fitness context
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `You are a knowledgeable fitness and nutrition AI assistant. The user said: "${transcribedText}"
    Provide a helpful, encouraging response about fitness, workouts, or nutrition. Keep your response conversational and concise.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    console.log('Gemini response:', responseText);

    // 3. Convert response to speech using ElevenLabs
    const voiceId = 'pNInz6obpgDQGcFmaJgB'; // Using a consistent voice
    const elevenlabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': Deno.env.get('ELEVENLABS_API_KEY') || '',
        },
        body: JSON.stringify({
          text: responseText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!elevenlabsResponse.ok) {
      throw new Error('Failed to convert text to speech');
    }

    const audioBuffer = await elevenlabsResponse.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    return new Response(
      JSON.stringify({
        transcribedText,
        responseText,
        audioContent: base64Audio,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
