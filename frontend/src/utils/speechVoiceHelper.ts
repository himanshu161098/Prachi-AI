/**
 * PRACHI AI — Sweet & Melodious Voice Engine ("Manmohak Girls Voice")
 * Optimized for natural, charming, and pleasant feminine cadence across Hindi, Hinglish, Urdu, and English.
 */

export interface VoicePlaybackOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err?: any) => void;
  lang?: string;
}

let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    cachedVoices = voices;
  }
  return cachedVoices;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    loadVoices();
  };
}

export function getSweetFemaleVoice(lang: string = 'hi-IN'): SpeechSynthesisVoice | null {
  const voices = loadVoices();
  if (!voices || voices.length === 0) return null;

  const langCode = (lang || 'hi-IN').toLowerCase();
  const langPrefix = langCode.split('-')[0]; // 'hi', 'en', 'ur', 'bho'

  // Explicit male blacklist to guarantee 100% female voice selection
  const maleKeywords = [
    'david', 'mark', 'george', 'ravi', 'hemant', 'guy', 'male', 'stefan', 'paul',
    'richard', 'sean', 'james', 'alex', 'fred', 'daniel', 'oliver', 'tarik'
  ];

  // Top-tier sweet, natural feminine voice priority
  const topFemaleHindiVoices = [
    'swara',       // Microsoft Swara Online (Natural) - premier sweet Hindi female voice
    'kalpana',     // Microsoft Kalpana Online (Natural) - soft, graceful Hindi
    'neerja',      // Microsoft Neerja Online (Natural)
    'google हिन्दी', // Google Hindi Female
    'lekha',       // Apple Lekha
    'heera',       // Microsoft Heera (India)
    'anamika'
  ];

  const topFemaleGlobalVoices = [
    'jenny',       // Microsoft Jenny Online (Natural) - warm, friendly, sweet
    'aria',        // Microsoft Aria Online (Natural) - crystal clear feminine
    'emma',        // Microsoft Emma Online (Natural)
    'ava',         // Microsoft Ava Online (Natural)
    'samantha',    // Apple Samantha
    'victoria',    // Apple Victoria
    'karen',       // Apple Karen
    'zira',        // Microsoft Zira
    'google us english'
  ];

  // Filter out any known male voices first
  const femaleCandidates = voices.filter(v => {
    const nameLower = v.name.toLowerCase();
    return !maleKeywords.some(m => nameLower.includes(m));
  });

  // Priority 1: Match Hindi / Bhojpuri / Urdu requested
  if (langPrefix === 'hi' || langPrefix === 'bho' || langPrefix === 'ur') {
    for (const kw of topFemaleHindiVoices) {
      const match = femaleCandidates.find(v =>
        v.name.toLowerCase().includes(kw) &&
        (v.lang.toLowerCase().startsWith('hi') || v.lang.toLowerCase().startsWith('in'))
      );
      if (match) return match;
    }

    const anyHindiFemale = femaleCandidates.find(v =>
      v.lang.toLowerCase().startsWith('hi') &&
      !maleKeywords.some(m => v.name.toLowerCase().includes(m))
    );
    if (anyHindiFemale) return anyHindiFemale;
  }

  // Priority 2: English or Global sweet female voice
  if (langPrefix === 'en') {
    for (const kw of topFemaleGlobalVoices) {
      const match = femaleCandidates.find(v =>
        v.name.toLowerCase().includes(kw) && v.lang.toLowerCase().startsWith('en')
      );
      if (match) return match;
    }
  }

  // Priority 3: Any high quality Natural/Online female voice
  const naturalFemale = femaleCandidates.find(v =>
    (v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('online')) &&
    [...topFemaleHindiVoices, ...topFemaleGlobalVoices].some(kw => v.name.toLowerCase().includes(kw))
  );
  if (naturalFemale) return naturalFemale;

  // Priority 4: Any candidate matching top keywords
  const anyTopFemale = femaleCandidates.find(v =>
    [...topFemaleHindiVoices, ...topFemaleGlobalVoices].some(kw => v.name.toLowerCase().includes(kw))
  );
  if (anyTopFemale) return anyTopFemale;

  // Priority 5: Fallback to matching language candidate or first female candidate
  const langMatch = femaleCandidates.find(v => v.lang.toLowerCase().startsWith(langPrefix));
  if (langMatch) return langMatch;

  return femaleCandidates[0] || voices[0] || null;
}

export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    // Remove markdown code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // Remove inline code
    .replace(/`[^`]*`/g, ' ')
    // Remove images and markdown links but keep text
    .replace(/!\[.*?\]\(.*?\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove markdown headers, bold, italics, bullets, blockquotes
    .replace(/[*#_~>]/g, '')
    // Remove currency signs or format them naturally
    .replace(/\$/g, ' dollar ')
    .replace(/₹/g, ' rupaye ')
    // Remove technical IDs or URLs
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/\b(msg|conv|art|call)-[a-z0-9-]+\b/gi, ' ')
    // Clean excessive punctuation and whitespaces
    .replace(/[•\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Main speech synthesis trigger with sweet, melodious girl's voice parameters
 */
export function playSweetFemaleVoice(
  text: string,
  options: VoicePlaybackOptions = {}
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported in this browser.');
    options.onError?.('SpeechSynthesis not supported');
    return;
  }

  window.speechSynthesis.cancel();

  const cleanText = cleanTextForSpeech(text);
  if (!cleanText) {
    options.onEnd?.();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);

  // Sweet, charming, melodious acoustics tuning:
  // - Pitch: 1.12 (Soft, clear, youthful feminine melody without robotic artifacts)
  // - Rate: 0.94 (Calm, graceful cadence - sounds gentle, soothing, and pleasant)
  utterance.pitch = 1.12;
  utterance.rate = 0.94;
  utterance.volume = 1.0;

  const targetLang = options.lang || 'hi-IN';
  const voice = getSweetFemaleVoice(targetLang);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || targetLang;
  }

  if (options.onStart) utterance.onstart = options.onStart;
  if (options.onEnd) utterance.onend = options.onEnd;
  if (options.onError) utterance.onerror = options.onError;

  window.speechSynthesis.speak(utterance);
}

export function stopSweetVoice(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
