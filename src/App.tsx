/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Sliders, 
  Sparkles, 
  Mic, 
  FileText, 
  Library, 
  Settings, 
  Radio, 
  Activity, 
  HardDrive,
  Cpu
} from "lucide-react";
import { VoiceProfile, SavedAudio, SavedSettingPresets } from "./types";

// Import modular panels
import StudioSynthesis from "./components/StudioSynthesis";
import VoiceDesignerAI from "./components/VoiceDesignerAI";
import VoiceCloningLab from "./components/VoiceCloningLab";
import AudioLibrary from "./components/AudioLibrary";
import WorkspaceSettings from "./components/WorkspaceSettings";

// Baseline preset professional speech profiles (mapped to physical sliders and standards)
const PRESET_VOICES: VoiceProfile[] = [
  // --- PROFESSIONAL ---
  {
    id: "preset_arthur",
    name: "Arthur Pendelton",
    lang: "en-US",
    accent: "US Narrative Accent",
    gender: "male",
    type: "standard",
    pitch: 0.95,
    rate: 0.92,
    warmth: 0.85,
    breathiness: 0.08,
    vibrato: 0.05,
    flutter: 0.05,
    sharpness: 0.45,
    description: "Deep, soothing storyteller with warm low-mid resonance. Ideal for documentary style readouts."
  },
  {
    id: "preset_victoria",
    name: "Victoria Carlisle",
    lang: "en-US",
    accent: "US Professional Trainer Acc.",
    gender: "female",
    type: "standard",
    pitch: 1.15,
    rate: 0.96,
    warmth: 0.70,
    breathiness: 0.12,
    vibrato: 0.08,
    flutter: 0.02,
    sharpness: 0.65,
    description: "Inspiring executive corporate strategist. Extremely professional, comforting, and clear vocal cadence."
  },
  {
    id: "preset_evelyn",
    name: "Evelyn Vance",
    lang: "en-US",
    accent: "US Broadcast News Accent",
    gender: "female",
    type: "standard",
    pitch: 1.10,
    rate: 1.05,
    warmth: 0.60,
    breathiness: 0.10,
    vibrato: 0.06,
    flutter: 0.01,
    sharpness: 0.80,
    description: "Crisp evening newsroom broadcast anchor. Articulate, precise sibilants, and zero frequency drift."
  },
  {
    id: "preset_marcus",
    name: "Marcus Stone",
    lang: "en-US",
    accent: "US Academic Professor Acc.",
    gender: "male",
    type: "standard",
    pitch: 0.88,
    rate: 0.90,
    warmth: 0.75,
    breathiness: 0.15,
    vibrato: 0.12,
    flutter: 0.08,
    sharpness: 0.50,
    description: "Resonant, mature, and thoughtful educator. Emphasizes heavy baritone harmonics and intellectual micro-pauses."
  },
  {
    id: "preset_sarah",
    name: "Sarah Jenkins",
    lang: "en-US",
    accent: "US Warm Meditation Coach",
    gender: "female",
    type: "standard",
    pitch: 1.05,
    rate: 0.86,
    warmth: 0.95,
    breathiness: 0.40,
    vibrato: 0.15,
    flutter: 0.05,
    sharpness: 0.35,
    description: "Highly empathetic and warm wellness guide. Slow, breathing-centric rhythm that radiates comfort."
  },
  {
    id: "preset_david",
    name: "David Stirling",
    lang: "en-GB",
    accent: "British Strategic Advisor",
    gender: "male",
    type: "standard",
    pitch: 0.96,
    rate: 1.02,
    warmth: 0.65,
    breathiness: 0.10,
    vibrato: 0.08,
    flutter: 0.04,
    sharpness: 0.72,
    description: "Crisp, authoritative financial and executive consultant. Deliverance is rapid, precise, and highly structured."
  },

  // --- ENTERTAINMENT ---
  {
    id: "preset_kidspark",
    name: "Kid Spark",
    lang: "en-US",
    accent: "Australian Energetic Accent",
    gender: "neutral",
    type: "standard",
    pitch: 1.35,
    rate: 1.18,
    warmth: 0.45,
    breathiness: 0.18,
    vibrato: 0.28,
    flutter: 0.12,
    sharpness: 0.75,
    description: "High-paced adventure guide. Playful, high vibrato, and hyper-enthusiastic delivery for interactive play."
  },
  {
    id: "preset_cassandra",
    name: "Cassandra Wild",
    lang: "en-US",
    accent: "US Cinematic Trailer Accent",
    gender: "female",
    type: "standard",
    pitch: 0.90,
    rate: 0.85,
    warmth: 0.80,
    breathiness: 0.35,
    vibrato: 0.18,
    flutter: 0.10,
    sharpness: 0.70,
    description: "Velvety, breathy blockbuster narrator. Incredibly dramatic, slow, and saturated with cinematic gravity."
  },
  {
    id: "preset_barnaby",
    name: "Barnaby Finch",
    lang: "en-GB",
    accent: "British whimsical Character",
    gender: "male",
    type: "standard",
    pitch: 1.20,
    rate: 1.10,
    warmth: 0.65,
    breathiness: 0.14,
    vibrato: 0.22,
    flutter: 0.18,
    sharpness: 0.60,
    description: "Charming, animated fairy-tale voice actor. High frequency oscillations keep listener attention locked."
  },
  {
    id: "preset_gemma",
    name: "Gemma Joy",
    lang: "en-US",
    accent: "US Bright Cartoon Accent",
    gender: "female",
    type: "standard",
    pitch: 1.38,
    rate: 1.15,
    warmth: 0.50,
    breathiness: 0.16,
    vibrato: 0.20,
    flutter: 0.05,
    sharpness: 0.85,
    description: "Bright, cheery, and sparkling animator. Extremely energetic, high-pitch presence without any harshness."
  },
  {
    id: "preset_elena",
    name: "Elena Rostova",
    lang: "en-US",
    accent: "US Magical Storyteller",
    gender: "female",
    type: "standard",
    pitch: 1.12,
    rate: 0.88,
    warmth: 0.82,
    breathiness: 0.28,
    vibrato: 0.18,
    flutter: 0.04,
    sharpness: 0.55,
    description: "Atmospheric, warm cinematic bedtime storyteller. Deeply comforting, whispering fairy-tale tone."
  },
  {
    id: "preset_dante",
    name: "Dante Thorne",
    lang: "en-US",
    accent: "US Late-Night Radio Host",
    gender: "male",
    type: "standard",
    pitch: 0.80,
    rate: 0.85,
    warmth: 0.90,
    breathiness: 0.18,
    vibrato: 0.10,
    flutter: 0.08,
    sharpness: 0.40,
    description: "Smoothest, deep baritone radio DJ and voiceover specialist. Features cozy bass warmth and wide resonant cadence."
  },

  // --- SYNTHETIC ---
  {
    id: "preset_zephyr",
    name: "Zephyr-7 Robo-Butler",
    lang: "en-US",
    accent: "Synth Cyber Accent",
    gender: "neutral",
    type: "standard",
    pitch: 0.75,
    rate: 0.95,
    warmth: 0.25,
    breathiness: 0.38,
    vibrato: 0.02,
    flutter: 0.42,
    sharpness: 0.92,
    description: "Subtly glitched retro-futuristic AI butler. Flat resonance filters, cyber frequencies, and jitter indices."
  },
  {
    id: "preset_halo99",
    name: "HALO-99 Intercom",
    lang: "en-US",
    accent: "Vocal Static Synth Accent",
    gender: "male",
    type: "standard",
    pitch: 0.82,
    rate: 1.05,
    warmth: 0.15,
    breathiness: 0.55,
    vibrato: 0.00,
    flutter: 0.25,
    sharpness: 0.88,
    description: "High-friction communications link. Simulates direct aerospace cockpit radios and metallic vocoder bands."
  },
  {
    id: "preset_nova",
    name: "Nova Core",
    lang: "en-US",
    accent: "ASMR Virtual Assistant",
    gender: "female",
    type: "standard",
    pitch: 1.25,
    rate: 0.88,
    warmth: 0.35,
    breathiness: 0.78,
    vibrato: 0.10,
    flutter: 0.05,
    sharpness: 0.55,
    description: "Whispering AI hologram. Pure ASMR static noise floor fused into a delicate, ultra-soft electronic whisper."
  },

  // --- REGIONAL ACCENTS ---
  {
    id: "preset_clarissa",
    name: "Clarissa Croft",
    lang: "en-GB",
    accent: "British Newsroom Accent",
    gender: "female",
    type: "standard",
    pitch: 1.15,
    rate: 1.02,
    warmth: 0.55,
    breathiness: 0.15,
    vibrato: 0.10,
    flutter: 0.00,
    sharpness: 0.85,
    description: "Sleek, pristine broadcast reporter quality. Highly crisp sibilants representing classical British RP English."
  },
  {
    id: "preset_alistair",
    name: "Alistair McEvoy",
    lang: "en-GB",
    accent: "Scottish Highlands Baritone",
    gender: "male",
    type: "standard",
    pitch: 0.85,
    rate: 0.88,
    warmth: 0.82,
    breathiness: 0.12,
    vibrato: 0.15,
    flutter: 0.14,
    sharpness: 0.40,
    description: "Cozy, heavy peat-smoked Scottish drawl. Deep, rugged warmth with gentle, slow pace and high comfort."
  },
  {
    id: "preset_nisha",
    name: "Nisha Patel",
    lang: "en-IN",
    accent: "Indian English Melodic Accent",
    gender: "female",
    type: "standard",
    pitch: 1.22,
    rate: 1.08,
    warmth: 0.62,
    breathiness: 0.08,
    vibrato: 0.10,
    flutter: 0.02,
    sharpness: 0.72,
    description: "Articulate Mumbai professional. Melodic pitch inflection and crisp, fast rhythmic pacing."
  },
  {
    id: "preset_connor",
    name: "Connor Higgins",
    lang: "en-IE",
    accent: "Friendly Irish Bard Accent",
    gender: "male",
    type: "standard",
    pitch: 1.08,
    rate: 1.02,
    warmth: 0.68,
    breathiness: 0.10,
    vibrato: 0.12,
    flutter: 0.06,
    sharpness: 0.58,
    description: "Pleasant Dubliner-toned narrator. Expressive, rolling musical pitch flow and highly lifelike articulation."
  },
  {
    id: "preset_liam",
    name: "Liam Vance",
    lang: "en-AU",
    accent: "Broad Australian Outback Acc.",
    gender: "male",
    type: "standard",
    pitch: 0.92,
    rate: 0.95,
    warmth: 0.78,
    breathiness: 0.08,
    vibrato: 0.06,
    flutter: 0.08,
    sharpness: 0.60,
    description: "Weathered Outback explorer. Deep, friendly male voice with high mid-range presence and wide, lazy vowels."
  },
  {
    id: "preset_kenji",
    name: "Kenji Sato",
    lang: "en-US",
    accent: "Japanese-Accented Professor",
    gender: "male",
    type: "standard",
    pitch: 0.95,
    rate: 0.90,
    warmth: 0.70,
    breathiness: 0.12,
    vibrato: 0.05,
    flutter: 0.02,
    sharpness: 0.45,
    description: "Highly respectful, academic presentation expert. Impeccable timing, deliberate cadence, and natural poise."
  },
  {
    id: "preset_sophie",
    name: "Sophie Dubois",
    lang: "en-US",
    accent: "French-Accented Stylist",
    gender: "female",
    type: "standard",
    pitch: 1.18,
    rate: 0.95,
    warmth: 0.75,
    breathiness: 0.35,
    vibrato: 0.14,
    flutter: 0.04,
    sharpness: 0.60,
    description: "Elegant, softly-spoken fashion storyteller. Melodic intonation paired with a breezy, whispering demeanor."
  }
];

const DEFAULT_SETTINGS: SavedSettingPresets = {
  theme: "dark-studio",
  highFidelityExport: true,
  autoNormalize: true,
  reduceNoise: false,
  sampleRate: 44100,
  masterGain: 0.9
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"studio" | "designer" | "cloner" | "library" | "settings">("studio");
  
  // Custom vocal models palette (starts with standard presets and synchronizes custom designed/cloned ones)
  const [voices, setVoices] = useState<VoiceProfile[]>(PRESET_VOICES);
  
  // Spoken voice outputs catalog
  const [savedAudios, setSavedAudios] = useState<SavedAudio[]>([]);
  
  // DSP Configurations state
  const [settings, setSettings] = useState<SavedSettingPresets>(DEFAULT_SETTINGS);

  // Load from local storage
  useEffect(() => {
    try {
      const storedVoices = localStorage.getItem("voice_forge_profiles");
      if (storedVoices) {
        const parsed = JSON.parse(storedVoices) as VoiceProfile[];
        // Filter out unique cloned or designed voices and merge with defaults
        const customItems = parsed.filter(v => v.type !== "standard");
        setVoices([...PRESET_VOICES, ...customItems]);
      }

      const storedLibrary = localStorage.getItem("voice_forge_library");
      if (storedLibrary) {
        setSavedAudios(JSON.parse(storedLibrary));
      }

      const storedSettings = localStorage.getItem("voice_forge_settings");
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (e) {
      console.error("Local storage sync initialization failure:", e);
    }
  }, []);

  // Save voices helper
  const handleAddCustomVoice = (newVoice: VoiceProfile) => {
    const updated = [...voices, newVoice];
    setVoices(updated);
    localStorage.setItem("voice_forge_profiles", JSON.stringify(updated.filter(v => v.type !== "standard")));
  };

  // Add synthesized audio helper
  const handleSaveAudio = (newCard: SavedAudio) => {
    const updated = [newCard, ...savedAudios];
    setSavedAudios(updated);
    localStorage.setItem("voice_forge_library", JSON.stringify(updated));
  };

  // Delete card helper
  const handleDeleteAudio = (id: string) => {
    const updated = savedAudios.filter(item => item.id !== id);
    setSavedAudios(updated);
    localStorage.setItem("voice_forge_library", JSON.stringify(updated));
  };

  // Update DSP configurations
  const handleUpdateSettings = (updated: Partial<SavedSettingPresets>) => {
    const finalSettings = { ...settings, ...updated };
    setSettings(finalSettings);
    localStorage.setItem("voice_forge_settings", JSON.stringify(finalSettings));
  };



  // Compute total audio minutes compiled
  const totalDurationSum = savedAudios.reduce((sum, item) => sum + item.duration, 0);
  const totalDiskBytes = savedAudios.reduce((sum, item) => sum + item.fileSize, 0);

  return (
    <div className="min-h-screen bg-[#08080a] text-gray-300 flex flex-col font-sans select-none">
      
      {/* Top Header */}
      <header className="border-b border-white/5 bg-[#0c0c10]/95 backdrop-blur px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <div className="w-1 h-4 bg-white rounded-full animate-pulse mx-0.5"></div>
            <div className="w-1 h-3 bg-white/70 rounded-full mx-0.5"></div>
            <div className="w-1 h-5 bg-white rounded-full mx-0.5"></div>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              VOX<span className="text-cyan-400 font-light">GEN</span> STUDIO
              <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded-full font-mono font-bold tracking-wider uppercase">
                PRO v2.4
              </span>
            </h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Acoustic Synthesizer, Cloner & Prompt-to-Voice Forge</p>
          </div>
        </div>

        {/* Studio hardware health flags (Humble Literal indicators with immersive glow) */}
        <div className="flex items-center gap-4 text-[10px] font-mono text-gray-400 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
          <div className="flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            <span>LATENCY: ~8ms</span>
          </div>
          <div className="hidden sm:inline text-white/5">|</div>
          <div className="flex items-center gap-1.5">
            <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
            <span>STORAGE: {(totalDiskBytes / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <div className="hidden sm:inline text-white/5">|</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
            <span className="text-gray-300 font-semibold">SYSTEM READY</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* NAV SIDEBAR / RAIL CABINET */}
        <nav className="lg:col-span-3 bg-[#0a0a0f] border border-white/5 p-3 rounded-xl flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible w-full shrink-0 sticky top-[82px] z-40">
          
          <button
            onClick={() => setActiveTab("studio")}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-semibold font-mono tracking-wide transition-all whitespace-nowrap w-full text-left cursor-pointer border border-transparent ${
              activeTab === "studio"
                ? "bg-cyan-500 text-black font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : "text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/5"
            }`}
          >
            <Sliders className="h-4 w-4 shrink-0" />
            <span>Studio Sandbox</span>
          </button>

          <button
            onClick={() => setActiveTab("designer")}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-semibold font-mono tracking-wide transition-all whitespace-nowrap w-full text-left cursor-pointer border border-transparent ${
              activeTab === "designer"
                ? "bg-cyan-500 text-black font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : "text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/5"
            }`}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>AI Voice Designer</span>
          </button>

          <button
            onClick={() => setActiveTab("cloner")}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-semibold font-mono tracking-wide transition-all whitespace-nowrap w-full text-left cursor-pointer border border-transparent ${
              activeTab === "cloner"
                ? "bg-cyan-500 text-black font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : "text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/5"
            }`}
          >
            <Mic className="h-4 w-4 shrink-0" />
            <span>Voice Cloning Lab</span>
          </button>

          <button
            onClick={() => setActiveTab("library")}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-semibold font-mono tracking-wide transition-all whitespace-nowrap w-full text-left cursor-pointer border border-transparent ${
              activeTab === "library"
                ? "bg-cyan-500 text-black font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : "text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/5"
            }`}
          >
            <Library className="h-4 w-4 shrink-0" />
            <span>Vocal Library ({savedAudios.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-semibold font-mono tracking-wide transition-all whitespace-nowrap w-full text-left cursor-pointer border border-transparent ${
              activeTab === "settings"
                ? "bg-cyan-500 text-black font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : "text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/5"
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span>Studio Settings</span>
          </button>

        </nav>

        {/* ACTIVE MAIN VIEWS WORKSPACE */}
        <main className="lg:col-span-9 w-full min-h-[500px]">
          
          {activeTab === "studio" && (
            <StudioSynthesis
              voices={voices}
              onSaveAudio={handleSaveAudio}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
            />
          )}

          {activeTab === "designer" && (
            <VoiceDesignerAI
              onAddCustomVoice={handleAddCustomVoice}
            />
          )}

          {activeTab === "cloner" && (
            <VoiceCloningLab
              onAddCustomVoice={handleAddCustomVoice}
            />
          )}

          {activeTab === "library" && (
            <AudioLibrary
              savedAudios={savedAudios}
              onDeleteAudio={handleDeleteAudio}
            />
          )}

          {activeTab === "settings" && (
            <WorkspaceSettings
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
            />
          )}

        </main>
      </div>

      {/* Footer statistics (Humble layout boundary) */}
      <footer className="border-t border-white/5 bg-[#0a0a0f]/50 py-5 mt-12 text-center text-[11px] text-gray-500 font-mono flex flex-col sm:flex-row items-center justify-between px-6 max-w-7xl w-full mx-auto gap-2">
        <span>© 2026 VOXGEN STUDIO Corp • Offline Hybrid DSP Array</span>
        <span>Registered Audio Outputs: {savedAudios.length} items ({Math.round(totalDurationSum)} seconds compiled)</span>
      </footer>

    </div>
  );
}
