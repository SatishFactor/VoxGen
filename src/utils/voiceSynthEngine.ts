/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VoiceProfile } from "../types";

// Static vowel formants dataset (Acentre Formant Synthesis)
const VOWEL_FORMANTS: Record<string, number[][]> = {
  a: [[730, 1090, 2440], [1, 0.5, 0.2]], // [Frequencies (Hz)], [Gains]
  e: [[530, 1840, 2480], [1, 0.4, 0.3]],
  i: [[270, 2290, 3010], [1, 0.3, 0.2]],
  o: [[570, 840, 2410], [1, 0.5, 0.1]],
  u: [[300, 870, 2240], [1, 0.3, 0.1]],
  m: [[250, 250, 250], [1, 0.1, 0.05]],
  default: [[500, 1500, 2500], [1, 0.5, 0.2]]
};

/**
 * Text parsing helper to turn words into simple phoneme streams
 */
function textToPhonemeSequence(text: string): { phoneme: string; duration: number }[] {
  const clean = text.toLowerCase().replace(/[^a-z\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  const result: { phoneme: string; duration: number }[] = [];

  for (const word of words) {
    // Split the word by vowel clusters (treating y as a vowel)
    const syllables = word.match(/[aeiouy]+/g);
    
    if (!syllables || syllables.length === 0) {
      // No vowels: treat as a simple consonant hum
      result.push({ phoneme: "m", duration: 0.22 });
    } else {
      for (let i = 0; i < syllables.length; i++) {
        const cluster = syllables[i];
        let dominantChar = cluster[0];
        
        // Map 'y' to vowel sounding 'i'
        if (dominantChar === "y") {
          dominantChar = "i";
        }
        
        const phoneme = VOWEL_FORMANTS[dominantChar] ? dominantChar : "default";
        const isLastSyl = i === syllables.length - 1;
        
        // Syllable durations: single syllable words sustain longer; multiple syllables are tighter
        const baseDuration = syllables.length === 1 ? 0.32 : (isLastSyl ? 0.26 : 0.21);
        
        // Push a tiny initial warm nasal hum for starting consonants
        if (i === 0 && word.length > cluster.length) {
          result.push({ phoneme: "m", duration: 0.05 });
        }
        
        result.push({
          phoneme,
          duration: baseDuration
        });
      }
    }
    // Smooth pause between words to simulate breathing and cadence
    result.push({ phoneme: "pause", duration: 0.16 });
  }
  return result;
}

/**
 * Synthesizes speech procedurally utilizing Web Audio biquad formant filters,
 * noise generators for breathiness, vibrato LFOs, and flutter components.
 */
export async function synthesizeProceduralVoice(
  text: string, 
  profile: VoiceProfile,
  onProgress?: (progress: number) => void
): Promise<AudioBuffer> {
  const sampleRate = 44100;
  
  // Calculate total sequence duration
  const sequence = textToPhonemeSequence(text);
  const totalDuration = Math.min(
    15, // Cap synthesis duration for performance
    sequence.reduce((acc, p) => acc + p.duration, 0) / profile.rate
  );
  
  // Create offline Web Audio Context to render audio buffer faster than real-time
  const ctx = new OfflineAudioContext(1, Math.max(sampleRate * 0.5, sampleRate * totalDuration), sampleRate);
  
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(0.0, 0); // Start at 0 for clean fade-in

  let currentTime = 0;
  
  // Custom base parameters
  let baseFreq = 120; // Default Male
  if (profile.gender === "female") baseFreq = 220;
  if (profile.gender === "neutral") baseFreq = 165;
  
  baseFreq = baseFreq * profile.pitch; // Adjust fundamental frequency

  // Formant filters to simulate vocal tract
  const filter1 = ctx.createBiquadFilter();
  filter1.type = "bandpass";
  const filter2 = ctx.createBiquadFilter();
  filter2.type = "bandpass";
  const filter3 = ctx.createBiquadFilter();
  filter3.type = "bandpass";

  // Individual band gains to accurately shape vowel formants
  const filterGain1 = ctx.createGain();
  const filterGain2 = ctx.createGain();
  const filterGain3 = ctx.createGain();

  filter1.connect(filterGain1);
  filter2.connect(filterGain2);
  filter3.connect(filterGain3);

  // Connect filters in parallel to sum their resonant formants
  const sumNode = ctx.createGain();

  filterGain1.connect(sumNode);
  filterGain2.connect(sumNode);
  filterGain3.connect(sumNode);

  // High-frequency sharpness accentuator processing the summed formant outputs
  const trebleBoost = ctx.createBiquadFilter();
  trebleBoost.type = "highshelf";
  trebleBoost.frequency.setValueAtTime(3200, 0);
  trebleBoost.gain.setValueAtTime(profile.sharpness * 10 - 5, 0);
  sumNode.connect(trebleBoost);
  trebleBoost.connect(masterGain);

  // Double-oscillator glottal source for cozy voice quality
  const glottalOsc = ctx.createOscillator();
  glottalOsc.type = "sine"; // Fundamental sine
  glottalOsc.frequency.setValueAtTime(baseFreq, 0);

  const glottalHarmonic = ctx.createOscillator();
  glottalHarmonic.type = "triangle"; // Harmonics source
  glottalHarmonic.frequency.setValueAtTime(baseFreq, 0);

  // Create a glottal low-pass filter to mimic natural vocal cord roll-off (-12dB/octave)
  const glottalFilter = ctx.createBiquadFilter();
  glottalFilter.type = "lowpass";
  const glottalCutoff = profile.gender === "female" ? 1700 : 1150;
  glottalFilter.frequency.setValueAtTime(glottalCutoff + (profile.sharpness * 700), 0);
  glottalFilter.Q.setValueAtTime(0.7, 0);

  const glottalGain1 = ctx.createGain();
  const glottalGain2 = ctx.createGain();

  // Balance base tone and harmonic content based on warmth
  const harmonicVolume = Math.max(0.08, 0.22 - (profile.warmth * 0.12)); 
  glottalGain1.gain.setValueAtTime(1.0 - harmonicVolume, 0);
  glottalGain2.gain.setValueAtTime(harmonicVolume, 0);

  glottalOsc.connect(glottalGain1);
  glottalHarmonic.connect(glottalGain2);

  glottalGain1.connect(glottalFilter);
  glottalGain2.connect(glottalFilter);

  // Vibrato LFO configuration (modulates pitch)
  if (profile.vibrato > 0.05) {
    const vibratoLfo = ctx.createOscillator();
    vibratoLfo.frequency.setValueAtTime(5.8 + profile.flutter * 3, 0); // 5.8Hz average hum vibrato
    const vibratoGain = ctx.createGain();
    vibratoGain.gain.setValueAtTime(profile.vibrato * 12 * profile.pitch, 0); // scale pitch variation with base pitch
    
    vibratoLfo.connect(vibratoGain);
    vibratoGain.connect(glottalOsc.frequency);
    vibratoGain.connect(glottalHarmonic.frequency);
    vibratoLfo.start(0);
  }

  // Breathiness / Whisper noise generation
  const noiseSource = createNoiseBufferSource(ctx);
  const breathGain = ctx.createGain();
  // Breathiness slider injects lowpass filtered white noise
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.setValueAtTime(1200, 0);
  
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(breathGain);
  
  const voiceBlendGain = ctx.createGain();
  glottalFilter.connect(voiceBlendGain);

  // Route vocal components to biquad filters
  voiceBlendGain.connect(filter1);
  voiceBlendGain.connect(filter2);
  voiceBlendGain.connect(filter3);

  breathGain.connect(filter1);
  breathGain.connect(filter2);
  breathGain.connect(filter3);

  // F0 fundamental pitch hum bypass path so speakers have genuine deep base weight (subtle support)
  const f0BypassFilter = ctx.createBiquadFilter();
  f0BypassFilter.type = "lowpass";
  f0BypassFilter.frequency.setValueAtTime(260, 0);
  f0BypassFilter.Q.setValueAtTime(0.7, 0);

  const f0BypassGain = ctx.createGain();
  const baseBypassVol = 0.04 + profile.warmth * 0.05;
  f0BypassGain.gain.setValueAtTime(baseBypassVol, 0);

  voiceBlendGain.connect(f0BypassFilter);
  f0BypassFilter.connect(f0BypassGain);
  f0BypassGain.connect(sumNode);

  // Mix factor (Breathiness vs Vocalization strength)
  const breathMix = 0.04 + profile.breathiness * 0.7; // 0.04 (solid) to 0.74 (whispery)
  voiceBlendGain.gain.setValueAtTime(1.0 - breathMix, 0);
  breathGain.gain.setValueAtTime(breathMix * 1.6, 0);

  glottalOsc.start(0);
  glottalHarmonic.start(0);
  noiseSource.start(0);

  // Set initial formants
  filter1.frequency.setValueAtTime(500, 0);
  filter2.frequency.setValueAtTime(1500, 0);
  filter3.frequency.setValueAtTime(2500, 0);
  
  // Set optimal formant bandwidths (Q) to avoid glass-whistling / ringing feedback (warmth softens formants)
  const baseQ1 = Math.max(1.4, 3.2 - profile.warmth * 1.5);
  const baseQ2 = Math.max(1.8, 3.8 - profile.warmth * 1.8);
  const baseQ3 = Math.max(2.2, 4.2 - profile.warmth * 2.0);
  filter1.Q.setValueAtTime(baseQ1, 0);
  filter2.Q.setValueAtTime(baseQ2, 0);
  filter3.Q.setValueAtTime(baseQ3, 0);

  filterGain1.gain.setValueAtTime(1.0, 0);
  filterGain2.gain.setValueAtTime(0.5, 0);
  filterGain3.gain.setValueAtTime(0.2, 0);

  // Keep state for scheduled parameters to avoid querying non-scheduled variables
  let lastFreq1 = 500;
  let lastFreq2 = 1500;
  let lastFreq3 = 2500;

  let lastGain1 = 1.0;
  let lastGain2 = 0.5;
  let lastGain3 = 0.2;

  let lastBaseFreq = baseFreq;
  let lastGain = 0.0;

  // Synthesize sequence syllable intervals
  for (let idx = 0; idx < sequence.length; idx++) {
    const part = sequence[idx];
    const duration = part.duration / profile.rate;
    const progress = (idx / sequence.length) * 100;
    if (onProgress) onProgress(progress);

    if (part.phoneme === "pause") {
      // Smoothly fade out the master gain for word spacing
      masterGain.gain.setValueAtTime(lastGain, currentTime);
      masterGain.gain.linearRampToValueAtTime(0.01, currentTime + 0.05);
      lastGain = 0.01;
    } else {
      const formants = VOWEL_FORMANTS[part.phoneme] || VOWEL_FORMANTS.default;
      const freqs = formants[0];
      const gains = formants[1];

      // Seamless syllable co-articulation (no drop to 0, zero clicking)
      const targetGain = part.phoneme === "m" ? 0.45 : 0.72;
      
      masterGain.gain.setValueAtTime(lastGain, currentTime);
      masterGain.gain.linearRampToValueAtTime(targetGain, currentTime + 0.015);
      masterGain.gain.setValueAtTime(targetGain, currentTime + duration - 0.01);
      lastGain = targetGain;

      // Mutate vocal formants smoothly
      filter1.frequency.setValueAtTime(lastFreq1, currentTime);
      filter2.frequency.setValueAtTime(lastFreq2, currentTime);
      filter3.frequency.setValueAtTime(lastFreq3, currentTime);

      filterGain1.gain.setValueAtTime(lastGain1, currentTime);
      filterGain2.gain.setValueAtTime(lastGain2, currentTime);
      filterGain3.gain.setValueAtTime(lastGain3, currentTime);

      // Pitch fluctuation components (implements flutter/age jitter)
      const jitterFactor = profile.flutter * 12 * (Math.random() - 0.5);
      
      // Prosody Model:
      // 1. General sentence declination (gently slopes downwards over the course of the phrase)
      const phraseProgress = idx / sequence.length;
      const declination = -0.15 * Math.sin(phraseProgress * Math.PI * 0.5) * baseFreq;
      
      // 2. Intonation contour per syllable (soft rise in the first half, dip at the end)
      const startPitch = baseFreq + declination + jitterFactor;
      const peakPitch = startPitch + (18 * profile.pitch * (profile.gender === "female" ? 1.3 : 1.0));
      const endPitch = startPitch - (6 * profile.pitch);
      
      glottalOsc.frequency.setValueAtTime(lastBaseFreq, currentTime);
      glottalHarmonic.frequency.setValueAtTime(lastBaseFreq, currentTime);
      
      // Ramp up to formant peak midway through the syllable
      glottalOsc.frequency.linearRampToValueAtTime(peakPitch, currentTime + duration * 0.4);
      glottalHarmonic.frequency.linearRampToValueAtTime(peakPitch, currentTime + duration * 0.4);
      
      // Dip down towards the end of the syllable
      glottalOsc.frequency.linearRampToValueAtTime(endPitch, currentTime + duration);
      glottalHarmonic.frequency.linearRampToValueAtTime(endPitch, currentTime + duration);

      // Ramp formant frequencies and resonance gains concurrently
      const transitionTime = 0.09 / profile.rate;
      filter1.frequency.linearRampToValueAtTime(freqs[0], currentTime + transitionTime);
      filter2.frequency.linearRampToValueAtTime(freqs[1], currentTime + transitionTime);
      filter3.frequency.linearRampToValueAtTime(freqs[2], currentTime + transitionTime);

      filterGain1.gain.linearRampToValueAtTime(gains[0], currentTime + transitionTime);
      filterGain2.gain.linearRampToValueAtTime(gains[1], currentTime + transitionTime);
      filterGain3.gain.linearRampToValueAtTime(gains[2], currentTime + transitionTime);

      lastFreq1 = freqs[0];
      lastFreq2 = freqs[1];
      lastFreq3 = freqs[2];

      lastGain1 = gains[0];
      lastGain2 = gains[1];
      lastGain3 = gains[2];

      lastBaseFreq = endPitch;
    }
    
    currentTime += duration;
  }

  // Fade out master gain in the final window
  masterGain.gain.setValueAtTime(lastGain, currentTime);
  masterGain.gain.linearRampToValueAtTime(0.0, currentTime + 0.04);

  // Safety stop of oscillators
  glottalOsc.stop(currentTime + 0.08);
  glottalHarmonic.stop(currentTime + 0.08);
  noiseSource.stop(currentTime + 0.08);

  // Render the Web Audio output buffer
  const renderedBuffer = await ctx.startRendering();
  if (onProgress) onProgress(100);
  return renderedBuffer;
}

/**
 * Generates an active audio buffer containing pure white noise for breathiness textures
 */
function createNoiseBufferSource(ctx: BaseAudioContext): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 12; // 12 seconds buffer
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

/**
 * Returns available system text-to-speech voices supported by the browser
 */
export function getStandardSystemVoices(): SpeechSynthesisVoice[] {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    const list = window.speechSynthesis.getVoices();
    // Prioritize high fidelity accents
    return list.filter(v => v.lang.startsWith("en") || v.lang.startsWith("es") || v.lang.startsWith("fr") || v.lang.startsWith("de") || v.lang.startsWith("ja") || v.lang.startsWith("zh"));
  }
  return [];
}
