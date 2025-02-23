
export const speakWithCalmVoice = (text: string) => {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Set voice properties for a calming effect
  utterance.volume = 0.8; // Slightly softer volume
  utterance.rate = 0.9; // Slightly slower rate
  utterance.pitch = 0.9; // Slightly lower pitch

  // Try to use a female voice if available
  const voices = synth.getVoices();
  const femaleVoice = voices.find(voice => 
    voice.name.includes('Female') || 
    voice.name.includes('Samantha') || 
    voice.name.includes('Karen') ||
    voice.name.includes('Victoria')
  );
  
  if (femaleVoice) {
    utterance.voice = femaleVoice;
  }

  return new Promise<void>((resolve, reject) => {
    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);
    synth.speak(utterance);
  });
};
