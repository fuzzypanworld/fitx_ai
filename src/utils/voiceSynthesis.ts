
export const speakWithCalmVoice = (text: string) => {
  return new Promise<void>((resolve, reject) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice properties for a calming effect
    utterance.volume = 1.0; // Full volume to ensure audibility
    utterance.rate = 0.9; // Slightly slower rate
    utterance.pitch = 1.0; // Natural pitch

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

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);

    // Ensure voices are loaded
    if (voices.length === 0) {
      synth.addEventListener('voiceschanged', () => {
        const updatedVoices = synth.getVoices();
        const voice = updatedVoices.find(v => 
          v.name.includes('Female') || 
          v.name.includes('Samantha') || 
          v.name.includes('Karen') ||
          v.name.includes('Victoria')
        );
        if (voice) utterance.voice = voice;
        synth.speak(utterance);
      }, { once: true });
    } else {
      synth.speak(utterance);
    }
  });
};
