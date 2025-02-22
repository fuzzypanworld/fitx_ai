
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
    
    // 1. Convert audio to text using Google Speech-to-Text
    const speechToTextResponse = await fetch('https://speech.googleapis.com/v1/speech:recognize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GOOGLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 48000,
          languageCode: 'en-US',
          model: 'default',
        },
        audio: {
          content: audioContent,
        },
      }),
    });

    if (!speechToTextResponse.ok) {
      throw new Error('Failed to transcribe audio with Google Speech-to-Text');
    }

    const { results } = await speechToTextResponse.json();
    const transcribedText = results[0]?.alternatives[0]?.transcript || '';
    console.log('Transcribed text:', transcribedText);

    // 2. Get response from Gemini
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `You are a knowledgeable fitness and nutrition AI assistant. The user said: "${transcribedText}"
    Provide a helpful, encouraging response about fitness, workouts, or nutrition. Keep your response conversational and concise.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    console.log('Gemini response:', responseText);

    // 3. Convert response to speech using Google Text-to-Speech
    const textToSpeechResponse = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GOOGLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: responseText },
        voice: { languageCode: 'en-US', name: 'en-US-Neural2-D' },
        audioConfig: { audioEncoding: 'MP3' },
      }),
    });

    if (!textToSpeechResponse.ok) {
      throw new Error('Failed to convert text to speech');
    }

    const { audioContent: base64Audio } = await textToSpeechResponse.json();

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
