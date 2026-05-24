/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VoiceProfile {
  id: string;
  name: string;
  lang: string;
  accent: string;
  gender: "male" | "female" | "neutral";
  type: "standard" | "designed" | "cloned";
  pitch: number; // multiplier e.g. 0.5 to 2.0
  rate: number;  // speed multiplier e.g. 0.5 to 2.0
  warmth: number; // low-mid frequencies boost [0..1]
  breathiness: number; // whisper/noise blend [0..1]
  vibrato: number; // pitch oscillation envelope [0..1]
  flutter: number; // jitter index for age/vibrancy [0..1]
  sharpness: number; // crisp clarity boost [0..1]
  description: string;
  baseVoiceName?: string; // Standard system voice key if playing via speech synthesis
  clonedAudioUrl?: string; // Captured mic recording reference if cloned
  prompt?: string; // Custom design prompt if generated
  timestamp?: string;
}

export interface SavedAudio {
  id: string;
  title: string;
  text: string;
  ssmlText?: string;
  isSsml: boolean;
  voiceId: string;
  voiceName: string;
  duration: number; // duration in seconds
  fileSize: number; // in bytes
  format: "WAV" | "MP3" | "OGG" | "AAC";
  audioUrl: string; // Playable static URL reference
  timestamp: string;
}

export interface GeneratedScript {
  title: string;
  segments: Array<{
    cue: string;
    text: string;
  }>;
  fullScriptText: string;
}

export interface SavedSettingPresets {
  theme: "dark-studio";
  highFidelityExport: boolean;
  autoNormalize: boolean;
  reduceNoise: boolean;
  sampleRate: 44100 | 48000 | 24000;
  masterGain: number; // volume multiplier
}
