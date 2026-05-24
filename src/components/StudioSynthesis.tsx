/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Download, 
  Volume2, 
  Sliders, 
  Sparkles, 
  HelpCircle, 
  RefreshCw, 
  Save, 
  FileAudio,
  CheckCircle,
  Clock,
  ChevronDown
} from "lucide-react";
import { VoiceProfile, SavedAudio, SavedSettingPresets } from "../types";
import { synthesizeProceduralVoice } from "../utils/voiceSynthEngine";
import { bufferToWav, convertWavToFormat } from "../utils/audioEncoder";

type VoiceCategory = "Professional" | "Entertainment" | "Synthetic" | "Regional Accents";

export const getVoiceCategory = (voice: VoiceProfile): VoiceCategory => {
  if (voice.id === "preset_arthur" || voice.id === "preset_victoria" || voice.id === "preset_evelyn" || voice.id === "preset_marcus" || voice.id === "preset_raymond" || voice.id === "preset_sarah" || voice.id === "preset_david") return "Professional";
  if (voice.id === "preset_clarissa" || voice.id === "preset_alistair" || voice.id === "preset_nisha" || voice.id === "preset_connor" || voice.id === "preset_liam" || voice.id === "preset_kenji" || voice.id === "preset_sophie") return "Regional Accents";
  if (voice.id === "preset_zephyr" || voice.id === "preset_halo99" || voice.id === "preset_nova" || voice.id === "preset_vectra") return "Synthetic";
  if (voice.id === "preset_kidspark" || voice.id === "preset_cassandra" || voice.id === "preset_barnaby" || voice.id === "preset_gemma" || voice.id === "preset_elena" || voice.id === "preset_dante") return "Entertainment";

  const descLower = (voice.description || "").toLowerCase();
  const nameLower = (voice.name || "").toLowerCase();
  const accentLower = (voice.accent || "").toLowerCase();

  if (voice.type === "cloned") {
    return "Synthetic";
  }
  if (descLower.includes("deep") || descLower.includes("story") || descLower.includes("narrative") || descLower.includes("news") || descLower.includes("broadcast") || descLower.includes("pro") || descLower.includes("academic") || descLower.includes("corporate")) {
    return "Professional";
  }
  if (descLower.includes("fun") || descLower.includes("energetic") || descLower.includes("kid") || descLower.includes("game") || descLower.includes("play") || nameLower.includes("kid") || nameLower.includes("spark") || descLower.includes("cinematic") || descLower.includes("cartoon") || descLower.includes("theatrical")) {
    return "Entertainment";
  }
  if (descLower.includes("cyber") || descLower.includes("synth") || descLower.includes("robot") || descLower.includes("butler") || nameLower.includes("robo") || nameLower.includes("cyber") || nameLower.includes("synth") || descLower.includes("asmr") || descLower.includes("glitch")) {
    return "Synthetic";
  }
  if (accentLower.includes("accent") || accentLower.includes("regional") || !accentLower.includes("us")) {
    return "Regional Accents";
  }
  return "Professional";
};

interface StudioSynthesisProps {
  voices: VoiceProfile[];
  onSaveAudio: (audio: SavedAudio) => void;
  settings: SavedSettingPresets;
  onUpdateSettings: (settings: Partial<SavedSettingPresets>) => void;
  importedText?: string;
  onClearImportedText?: () => void;
}

export default function StudioSynthesis({ 
  voices, 
  onSaveAudio, 
  settings, 
  onUpdateSettings,
  importedText,
  onClearImportedText
}: StudioSynthesisProps) {
  const [text, setText] = useState(
    "Welcome to Voice Forge Studio! Enter prompt text here, toggle vocal ratios on the right sidebar, and synthesize your custom high-fidelity audio."
  );

  // Sync script loaded through AI scriptwriter module
  useEffect(() => {
    if (importedText) {
      setText(importedText);
      if (onClearImportedText) {
        onClearImportedText();
      }
    }
  }, [importedText, onClearImportedText]);
  const [isSsml, setIsSsml] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<"All" | VoiceCategory>("All");
  const [customCategory, setCustomCategory] = useState("");
  const [customEmotion, setCustomEmotion] = useState("");
  const [showDnaShaper, setShowDnaShaper] = useState(true);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [activePresetTone, setActivePresetTone] = useState<"casual" | "formal" | "excited">("casual");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [ssmlDecorationExplanation, setSsmlDecorationExplanation] = useState("");
  const [isDecoratingSsml, setIsDecoratingSsml] = useState(false);

  // Dynamic Synthesis Engine select: gemini (premium human voice) vs neural (browser speech/local)
  const [synthesisEngine, setSynthesisEngine] = useState<"gemini" | "neural">("gemini");
  const [isNeuralSpeaking, setIsNeuralSpeaking] = useState(false);
  const [quotaWarning, setQuotaWarning] = useState<string | null>(null);

  // References and custom timers for sentence segmenting / breathing pause simulation
  const promptSpeechTimeoutsRef = useRef<number[]>([]);

  const clearSpeechTimeouts = () => {
    promptSpeechTimeoutsRef.current.forEach(t => clearTimeout(t));
    promptSpeechTimeoutsRef.current = [];
  };

  const cancelAllSpeech = () => {
    clearSpeechTimeouts();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsNeuralSpeaking(false);
  };

  /**
   * Intelligently parses paragraph text into natural clause segments separated by punctuation marks,
   * enabling beautiful and realistic breath intervals.
   */
  const segmentText = (rawText: string) => {
    const parts = rawText.split(/([,.:;!?\n]+)/);
    const segments: { text: string; delayMs: number }[] = [];
    
    let currentText = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      
      if (/^[,.:;!?\n]+$/.test(part)) {
        const trimmedText = currentText.trim();
        if (trimmedText) {
          let delay = 220; // default breath interval for commas
          if (part.includes(".") || part.includes("!") || part.includes("?") || part.includes("\n")) {
            delay = 540; // longer breath for sentence endings
          } else if (part.includes(";")) {
            delay = 320;
          }
          segments.push({ text: trimmedText, delayMs: delay });
          currentText = "";
        }
      } else {
        currentText += part;
      }
    }
    const trimmedFinal = currentText.trim();
    if (trimmedFinal) {
      segments.push({ text: trimmedFinal, delayMs: 0 });
    }
    return segments;
  };

  /**
   * Sorts and selects the absolute highest fidelity local text-to-speech engine available
   * on the user's OS or browser (prioritizes Natural, Neural, Premium or Online voices).
   */
  const getMatchedSystemVoice = (activeVoice: VoiceProfile): SpeechSynthesisVoice | null => {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    
    const systemVoices = [...window.speechSynthesis.getVoices()].sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aScore = (aName.includes("natural") ? 10 : 0) + 
                    (aName.includes("neural") ? 10 : 0) + 
                    (aName.includes("premium") ? 5 : 0) + 
                    (aName.includes("online") ? 3 : 0);
      const bScore = (bName.includes("natural") ? 10 : 0) + 
                    (bName.includes("neural") ? 10 : 0) + 
                    (bName.includes("premium") ? 5 : 0) + 
                    (bName.includes("online") ? 3 : 0);
      return bScore - aScore;
    });

    if (systemVoices.length === 0) return null;

    // 1. Match first name directly
    let matched = systemVoices.find(v => {
      const nameLower = v.name.toLowerCase();
      const pNameLower = activeVoice.name.toLowerCase().split(" ")[0];
      return nameLower.includes(pNameLower);
    });

    // 2. Language and Gender match with enhanced high fidelity checks
    if (!matched) {
      matched = systemVoices.find(v => {
        const langMatch = v.lang.toLowerCase().includes(activeVoice.lang.toLowerCase().split("-")[0]);
        const isFemale = activeVoice.gender === "female";
        const nameLower = v.name.toLowerCase();
        const isGenderMatch = isFemale
          ? (nameLower.includes("female") || nameLower.includes("zira") || nameLower.includes("samantha") || nameLower.includes("hazel") || nameLower.includes("siri") || nameLower.includes("karen") || nameLower.includes("google") || nameLower.includes("jenni") || nameLower.includes("aria") || nameLower.includes("susan") || nameLower.includes("eva") || nameLower.includes("clara"))
          : (nameLower.includes("male") || nameLower.includes("david") || nameLower.includes("mark") || nameLower.includes("george") || nameLower.includes("daniel") || nameLower.includes("microsoft") || nameLower.includes("guy") || nameLower.includes("ryan") || nameLower.includes("stefan") || nameLower.includes("thomas"));
        return langMatch && isGenderMatch;
      });
    }

    // 3. Fallback to general regional locale
    if (!matched) {
      matched = systemVoices.find(v => v.lang.toLowerCase().includes(activeVoice.lang.toLowerCase().split("-")[0]));
    }

    return matched || systemVoices[0] || null;
  };

  /**
   * Speaks using our natural breathing cadence queue engine by splitting speech by punctuation clauses.
   */
  const speakWithNaturalProsody = (
    inputText: string,
    activeVoice: VoiceProfile,
    vocalPitch: number,
    vocalRate: number,
    onStart: () => void,
    onEnd: () => void,
    onError: (e: any) => void
  ) => {
    cancelAllSpeech();
    
    const rawSegments = segmentText(inputText);
    if (rawSegments.length === 0) {
      onEnd();
      return;
    }
    
    const matchedVoice = getMatchedSystemVoice(activeVoice);
    onStart();
    
    let segmentIndex = 0;
    
    const speakNextSegment = () => {
      if (segmentIndex >= rawSegments.length) {
        onEnd();
        return;
      }
      
      const segment = rawSegments[segmentIndex];
      const utterance = new SpeechSynthesisUtterance(segment.text);
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
      
      // Fine tune local pitch and rate to human speech bounds
      utterance.pitch = Math.max(0.65, Math.min(1.4, vocalPitch));
      utterance.rate = Math.max(0.75, Math.min(1.25, vocalRate));
      
      utterance.onend = () => {
        // Breathiness expands the pause giving realism to voice relaxation curves
        const breathRelaxation = (activeVoice.breathiness ?? 0.1) * 160;
        const targetDelay = segment.delayMs + breathRelaxation;
        
        if (targetDelay > 0 && segmentIndex < rawSegments.length - 1) {
          const timerId = window.setTimeout(() => {
            segmentIndex++;
            speakNextSegment();
          }, targetDelay);
          promptSpeechTimeoutsRef.current.push(timerId);
        } else {
          segmentIndex++;
          speakNextSegment();
        }
      };
      
      utterance.onerror = (e) => {
        if (e.error !== "interrupted") {
          onError(e);
        }
      };
      
      window.speechSynthesis.speak(utterance);
    };
    
    speakNextSegment();
  };
  
  // Voice audition preview state
  const [previewPlaybackVoiceId, setPreviewPlaybackVoiceId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewSessionRef = useRef<number>(0);

  // Stop active preview audition automatically whenever the selected voice changes
  useEffect(() => {
    previewSessionRef.current++;
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    cancelAllSpeech();
    setPreviewPlaybackVoiceId(null);
  }, [selectedVoiceId]);
  
  // Custom Overrides/Adjustments State (Vocal DNA Sliders)
  const [pitch, setPitch] = useState(1.0);
  const [rate, setRate] = useState(1.0);
  const [warmth, setWarmth] = useState(0.5);
  const [breathiness, setBreathiness] = useState(0.2);
  const [vibrato, setVibrato] = useState(0.1);
  const [flutter, setFlutter] = useState(0.1);
  const [sharpness, setSharpness] = useState(0.5);

  // Audio Preview state
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [exportFormat, setExportFormat] = useState<"WAV" | "MP3" | "OGG" | "AAC">("WAV");
  const [audioDuration, setAudioDuration] = useState(0);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [exportTitle, setExportTitle] = useState("Preview Voice");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Update sliders when base voice changes
  useEffect(() => {
    const selectedVoice = voices.find(v => v.id === selectedVoiceId);
    if (selectedVoice) {
      setPitch(selectedVoice.pitch);
      setRate(selectedVoice.rate);
      setWarmth(selectedVoice.warmth);
      setBreathiness(selectedVoice.breathiness);
      setVibrato(selectedVoice.vibrato);
      setFlutter(selectedVoice.flutter);
      setSharpness(selectedVoice.sharpness);
    }
  }, [selectedVoiceId, voices]);

  // Set initial selected voice
  useEffect(() => {
    if (voices.length > 0 && !selectedVoiceId) {
      setSelectedVoiceId(voices[0].id);
    }
  }, [voices, selectedVoiceId]);

  // Apply visual preset tone modifications
  const applyPresetTone = (tone: "casual" | "formal" | "excited") => {
    setActivePresetTone(tone);
    if (tone === "casual") {
      setPitch(1.0);
      setRate(1.05);
      setWarmth(0.65);
      setBreathiness(0.15);
      setVibrato(0.1);
      setFlutter(0.05);
    } else if (tone === "formal") {
      setPitch(0.85); // lower pitch for authoritative tone
      setRate(0.9);  // slower speaking rate
      setWarmth(0.8);  // high resonance warmth
      setBreathiness(0.05); // solid sound
      setVibrato(0.05);
      setFlutter(0.0);
    } else if (tone === "excited") {
      setPitch(1.35); // higher pitch
      setRate(1.25);  // faster speech
      setWarmth(0.4);  // high treble brightness
      setBreathiness(0.3);
      setVibrato(0.35); // higher vibrato oscillation
      setFlutter(0.2);
    }
  };

  // SSML quick helpers
  const insertSsmlTag = (tag: string) => {
    const input = document.getElementById("tts-input") as HTMLTextAreaElement;
    if (!input) return;
    const scrollPos = input.scrollTop;
    const strPos = input.selectionStart || 0;
    const endPos = input.selectionEnd || 0;
    
    let tagStart = "";
    let tagEnd = "";
    
    switch (tag) {
      case "whisper":
        tagStart = '<prosody volume="soft" pitch="low" rate="0.85">';
        tagEnd = '</prosody>';
        break;
      case "excited":
        tagStart = '<prosody pitch="high" rate="1.2" volume="loud">';
        tagEnd = '</prosody>';
        break;
      case "break":
        tagStart = '<break time="1.2s"/>';
        tagEnd = '';
        break;
      case "emphasis":
        tagStart = '<emphasis level="strong">';
        tagEnd = '</emphasis>';
        break;
      case "robotic":
        tagStart = '<prosody pitch="low" rate="0.95" range="flat">';
        tagEnd = '</prosody>';
        break;
    }
    
    const front = input.value.substring(0, strPos);
    const back = input.value.substring(endPos, input.value.length);
    const selected = input.value.substring(strPos, endPos);
    
    const newVal = front + tagStart + (selected || "emphasized text") + tagEnd + back;
    setText(newVal);
    
    setTimeout(() => {
      input.focus();
      const newCursorPos = strPos + tagStart.length + (selected ? selected.length : 15) + tagEnd.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
      input.scrollTop = scrollPos;
    }, 10);
  };

  // Automated SSML Tag Generator with Gemini
  const handleAISsmlDecorate = async () => {
    setIsDecoratingSsml(true);
    setSsmlDecorationExplanation("");
    try {
      const response = await fetch("/api/ssml-validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          emotion: customEmotion.trim() || activePresetTone,
          style: isSsml ? "script" : "narrator"
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Acoustic tag optimization failed.");
      }
      if (data.ssml) {
        setText(data.ssml);
        setIsSsml(true);
        if (data.explanation) {
          setSsmlDecorationExplanation(data.explanation);
        }
      }
    } catch (e: any) {
      console.error("SSML Auto tag failed:", e);
      setSsmlDecorationExplanation("Calibration Interrupted: " + (e?.message || "Failed to contact Gemini auto-tagging. Verify your API key in AI Studio."));
    } finally {
      setIsDecoratingSsml(false);
    }
  };

  // Immediate preview of selected voice profile
  const handlePreviewVoice = async () => {
    const session = ++previewSessionRef.current;

    // Discard any active full-track synthesised playback overlap
    if (audioElRef.current) {
      audioElRef.current.pause();
    }
    setIsPlaying(false);

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }

    // Terminate any ongoing Web Speech speech synthesis
    window.speechSynthesis.cancel();
    setIsNeuralSpeaking(false);

    if (previewPlaybackVoiceId === selectedVoiceId) {
      setPreviewPlaybackVoiceId(null);
      return;
    }

    try {
      const activeVoice = voices.find(v => v.id === selectedVoiceId) || voices[0];
      if (!activeVoice) return;

      setPreviewPlaybackVoiceId(selectedVoiceId);

      const toneWord = customEmotion.trim() || activePresetTone || "normal";
      const sampleText = `Hello! I am ${activeVoice.name}. You are auditioning a preview of my profile, read with a ${toneWord} tone.`;

      if (synthesisEngine === "gemini") {
        try {
          const response = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: sampleText,
              voiceName: activeVoice.name,
              gender: activeVoice.gender,
              accent: activeVoice.accent,
              pitch,
              rate,
              warmth,
              vibe: toneWord
            })
          });

          if (!response.ok) {
            let reqErr = "Failed to contact Gemini Natural Audio Engine.";
            try {
              const detail = await response.json();
              reqErr = detail.message || detail.error || reqErr;
            } catch (jsonErr) {
              try {
                reqErr = await response.text();
              } catch (txtErr) {}
            }
            throw new Error(reqErr);
          }

          const data = await response.json();
          
          if (session !== previewSessionRef.current) {
            return;
          }

          const binaryString = atob(data.audio);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const blob = new Blob([bytes], { type: data.mimeType || "audio/wav" });
          const audUrl = URL.createObjectURL(blob);

          const audio = new Audio(audUrl);
          previewAudioRef.current = audio;
          
          audio.play().then(() => {
            if (session !== previewSessionRef.current) {
              audio.pause();
              return;
            }
            audio.onended = () => {
              if (session === previewSessionRef.current) {
                setPreviewPlaybackVoiceId(null);
              }
            };
          }).catch(err => {
            console.error("Audition playback failed:", err);
            if (session === previewSessionRef.current) {
              setPreviewPlaybackVoiceId(null);
            }
          });
        } catch (err: any) {
          console.warn("Gemini premium audition audio failed, falling back to Browser Speech Engine:", err);
          const erMsg = String(err?.message || err || "");
          const isQuota = erMsg.includes("429") || erMsg.includes("quota") || erMsg.includes("limit") || erMsg.includes("RESOURCE_EXHAUSTED");
          if (isQuota) {
            setQuotaWarning("Gemini API daily free-tier limit reached (10 requests/day). The system has automatically activated its Free TTS Service (Local) fallback so you can continue auditioning without interruption!");
          } else {
            setQuotaWarning("Gemini endpoint error. fallback: using browser synthesis.");
          }

          // Trigger manual speech synthesis utterance fallback immediately
          speakWithNaturalProsody(
            sampleText,
            activeVoice,
            pitch,
            rate,
            () => {},
            () => {
              if (session === previewSessionRef.current) {
                setPreviewPlaybackVoiceId(null);
              }
            },
            () => {
              if (session === previewSessionRef.current) {
                setPreviewPlaybackVoiceId(null);
              }
            }
          );
        }
      } else if (synthesisEngine === "neural") {
        speakWithNaturalProsody(
          sampleText,
          activeVoice,
          pitch,
          rate,
          () => {},
          () => {
            if (session === previewSessionRef.current) {
              setPreviewPlaybackVoiceId(null);
            }
          },
          () => {
            if (session === previewSessionRef.current) {
              setPreviewPlaybackVoiceId(null);
            }
          }
        );
      } else {
        const voiceConfig: VoiceProfile = {
          ...activeVoice,
          pitch,
          rate,
          warmth,
          breathiness,
          vibrato,
          flutter,
          sharpness
        };

        const audioBuffer = await synthesizeProceduralVoice(sampleText, voiceConfig);
        
        // If a newer session has been triggered, ignore this render's result
        if (session !== previewSessionRef.current) {
          return;
        }

        const resultWav = bufferToWav(audioBuffer);
        const blobUrl = URL.createObjectURL(resultWav);

        const audio = new Audio(blobUrl);
        previewAudioRef.current = audio;
        
        audio.play().then(() => {
          if (session !== previewSessionRef.current) {
            audio.pause();
            return;
          }
          audio.onended = () => {
            if (session === previewSessionRef.current) {
              setPreviewPlaybackVoiceId(null);
            }
          };
        }).catch(err => {
          console.error("Audition playback failed:", err);
          if (session === previewSessionRef.current) {
            setPreviewPlaybackVoiceId(null);
          }
        });
      }
    } catch (err) {
      console.error("Failed to showcase vocal audition:", err);
      if (session === previewSessionRef.current) {
        setPreviewPlaybackVoiceId(null);
      }
    }
  };

  // Synthesize process using custom vocal engine
  const handleSynthesize = async () => {
    // Intercept and stop any ongoing preview auditions
    previewSessionRef.current++;
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setPreviewPlaybackVoiceId(null);
    window.speechSynthesis.cancel();
    setIsNeuralSpeaking(false);

    setIsSynthesizing(true);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl("");
    setIsPlaying(false);

    try {
      const activeVoice = voices.find(v => v.id === selectedVoiceId) || voices[0];
      
      // Strip SSML tags for speech synthesis unless we are parsing SSML
      const speakerText = isSsml 
        ? text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
        : text;

      if (synthesisEngine === "gemini") {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: speakerText,
            voiceName: activeVoice.name,
            gender: activeVoice.gender,
            accent: activeVoice.accent,
            pitch,
            rate,
            warmth,
            vibe: customEmotion.trim() || activePresetTone || "normal"
          })
        });

        if (!response.ok) {
          let reqErr = "Failed to contact Gemini Natural Audio Engine.";
          try {
            const detail = await response.json();
            reqErr = detail.message || detail.error || reqErr;
          } catch (jsonErr) {
            try {
              reqErr = await response.text();
            } catch (txtErr) {}
          }
          throw new Error(reqErr);
        }

        const data = await response.json();

        // Convert base64 audio string to playable blob
        const binaryString = atob(data.audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: data.mimeType || "audio/wav" });
        setAudioBlob(blob);

        const blobUrl = URL.createObjectURL(blob);
        setAudioUrl(blobUrl);

        // Get duration from loaded audio object to be precise
        const tempAudio = new Audio(blobUrl);
        tempAudio.addEventListener("loadedmetadata", () => {
          setAudioDuration(tempAudio.duration);
          setIsSynthesizing(false);
          // Auto-play the synthesized human track!
          setIsPlaying(true);
          setTimeout(() => {
            if (audioElRef.current) {
              audioElRef.current.play().then(() => setupVisualizer()).catch(err => console.error("Auto-play failed:", err));
            }
          }, 100);
        });
        tempAudio.addEventListener("error", () => {
          // Fallback approximate duration
          const wordCount = speakerText.split(/\s+/).filter(Boolean).length;
          setAudioDuration(Math.max(1.5, (wordCount * 0.4) / rate));
          setIsSynthesizing(false);
        });
      } else if (synthesisEngine === "neural") {
        speakWithNaturalProsody(
          speakerText,
          activeVoice,
          pitch,
          rate,
          () => {
            setIsNeuralSpeaking(true);
            setIsPlaying(true);
            setIsSynthesizing(false);
            setAudioUrl("neural-placeholder-stream");
            // Small delay to let canvas mount or adjust
            setTimeout(() => setupVisualizer(), 50);
          },
          () => {
            setIsNeuralSpeaking(false);
            setIsPlaying(false);
          },
          (e) => {
            console.error("Neural speech synthesis error:", e);
            setIsNeuralSpeaking(false);
            setIsPlaying(false);
          }
        );

        // Compute approximate durations based on word count
        const wordCount = speakerText.split(/\s+/).filter(Boolean).length;
        const approximateDuration = Math.max(1.5, (wordCount * 0.44) / rate);
        setAudioDuration(approximateDuration);

        // Generate a clean mock WAV header so the file cards can still be saved/managed
        const mockSilentCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const mockSilentBuffer = mockSilentCtx.createBuffer(1, 44100 * approximateDuration, 44100);
        const resultWav = bufferToWav(mockSilentBuffer);
        setAudioBlob(resultWav);
      } else {
        // Override profile attributes based on slider modifiers
        const voiceConfig: VoiceProfile = {
          ...activeVoice,
          pitch,
          rate,
          warmth,
          breathiness,
          vibrato,
          flutter,
          sharpness
        };

        // Run physical synthesis processing
        const audioBuffer = await synthesizeProceduralVoice(speakerText, voiceConfig);
        
        // Generate WAV Blob
        const resultWav = bufferToWav(audioBuffer);
        setAudioBlob(resultWav);
        setAudioDuration(audioBuffer.duration);

        const blobUrl = URL.createObjectURL(resultWav);
        setAudioUrl(blobUrl);
        setIsSynthesizing(false);
      }
    } catch (e: any) {
      setIsSynthesizing(false);
      
      const erMsg = String(e?.message || e || "");
      const isQuota = erMsg.includes("429") || erMsg.includes("quota") || erMsg.includes("limit") || erMsg.includes("RESOURCE_EXHAUSTED");
      
      if (isQuota) {
        console.warn("Synthesis simulation (Gemini API) hit quota limit. Transitioning to Free TTS Service (Local) fallback. Details:", erMsg);
      } else {
        console.error("Synthesis simulation failed:", e);
      }
      
      if (isQuota) {
        setQuotaWarning("Gemini API daily limit reached (10 speech tracks/day). The system has automatically activated its Free TTS Service (Local) fallback so you can continue auditioning without interruption!");
        setSynthesisEngine("neural");
        // Auto-retry immediately with Web Speech API
        setTimeout(() => {
          handleSynthesize();
        }, 150);
      } else {
        setQuotaWarning(`Synthesis error: ${e?.message || e}`);
      }
    }
  };

  // Handle Playback and Waveform Animation
  const togglePlay = () => {
    // Halt any active voice audition preview before playing full track
    previewSessionRef.current++;
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setPreviewPlaybackVoiceId(null);

    if (synthesisEngine === "neural") {
      if (isPlaying) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        setIsNeuralSpeaking(false);
      } else {
        handleSynthesize();
      }
      return;
    }

    const audio = audioElRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
        setupVisualizer();
      }).catch(err => console.error("Playback failed:", err));
    }
  };

  // Audio setup visualizer canvas
  const setupVisualizer = () => {
    const audio = audioElRef.current;
    if (!audio || !canvasRef.current) return;

    if (!audioContextRef.current) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      
      const source = audioCtx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    }

    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    if (!analyser || !canvasCtx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const width = canvas.width;
    const height = canvas.height;

    const renderFrame = () => {
      const isSpeakingNeural = synthesisEngine === "neural" && window.speechSynthesis.speaking;
      const isCurrentlyPlaying = (isPlaying && !audioElRef.current?.paused) || isSpeakingNeural;

      if (!isCurrentlyPlaying) {
        // Flat line representation
        canvasCtx.fillStyle = "rgba(15, 23, 42, 0.4)";
        canvasCtx.fillRect(0, 0, width, height);
        
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, height / 2);
        canvasCtx.lineTo(width, height / 2);
        canvasCtx.strokeStyle = "rgba(96, 165, 250, 0.5)";
        canvasCtx.lineWidth = 2;
        canvasCtx.stroke();
        return;
      }

      animationFrameRef.current = requestAnimationFrame(renderFrame);

      if (isSpeakingNeural) {
        // Render a highly reactive, flowing, simulated biological voice wave
        canvasCtx.fillStyle = "rgba(11, 16, 30, 0.85)";
        canvasCtx.fillRect(0, 0, width, height);

        const time = Date.now() * 0.006;
        const barWidth = (width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const sine = Math.sin(i * 0.16 + time) * Math.cos(i * 0.08 - time * 0.4);
          const noise = Math.random() * 0.12;
          const cadence = 0.5 + Math.sin(time * 0.25) * 0.4; // breathing voice cadence
          
          const barHeight = Math.max(10, (sine + 1.1) * 0.5 * (height - 24) * cadence + noise * 8);

          const red = Math.min(255, i * 2.8);
          const green = Math.min(255, 175 + i * 0.6);
          const blue = 250;

          canvasCtx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
          canvasCtx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
          canvasCtx.fillRect(x, 0, barWidth - 1, barHeight * 0.18);

          x += barWidth;
        }
      } else {
        analyser.getByteFrequencyData(dataArray);

        // Dark space backdrop matching theme
        canvasCtx.fillStyle = "rgba(11, 16, 30, 0.85)";
        canvasCtx.fillRect(0, 0, width, height);

        const barWidth = (width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] / 1.5;
          
          // Gorgeous purple/neon cyan palette reflecting sleek studio aesthetics
          const red = i * 2.2;
          const green = 180 + i * 0.5;
          const blue = 250;

          canvasCtx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
          canvasCtx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
          
          // Symmetrical display
          canvasCtx.fillRect(x, 0, barWidth - 1, barHeight * 0.2);

          x += barWidth;
        }
      }
    };

    renderFrame();
  };

  // Clean elements and animation frames
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  // Format Bytes metric helper
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Format Duration string
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Export process
  const handleExportAndSave = () => {
    if (!audioBlob) return;
    
    // Transcode Wav Blob if MP3 etc selected
    const finalBlob = convertWavToFormat(audioBlob, exportFormat);
    const dynamicSize = finalBlob.size;
    const fileUrl = URL.createObjectURL(finalBlob);

    const activeVoice = voices.find(v => v.id === selectedVoiceId) || voices[0];
    
    const savedCard: SavedAudio = {
      id: "audio_" + Date.now(),
      title: exportTitle || "Untitled Synthesis",
      text: text,
      isSsml: isSsml,
      voiceId: selectedVoiceId,
      voiceName: activeVoice.name,
      duration: audioDuration,
      fileSize: dynamicSize,
      format: exportFormat,
      audioUrl: fileUrl,
      timestamp: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    };

    onSaveAudio(savedCard);
    setShowExportSuccess(true);
    setTimeout(() => {
      setShowExportSuccess(false);
    }, 4500);
  };

  // Filter voices based on category selection tab + typed custom category term
  const filteredVoices = voices.filter(voice => {
    // Match active tab category list
    if (selectedCategory !== "All") {
      if (getVoiceCategory(voice) !== selectedCategory) return false;
    }
    
    // Match typed search/filter text string
    if (customCategory.trim() !== "") {
      const searchWord = customCategory.toLowerCase().trim();
      const cat = getVoiceCategory(voice).toLowerCase();
      const name = (voice.name || "").toLowerCase();
      const desc = (voice.description || "").toLowerCase();
      const acc = (voice.accent || "").toLowerCase();
      const gnd = (voice.gender || "").toLowerCase();
      
      const matchesSearch = 
        cat.includes(searchWord) || 
        name.includes(searchWord) || 
        desc.includes(searchWord) || 
        acc.includes(searchWord) || 
        gnd.includes(searchWord);
        
      if (!matchesSearch) return false;
    }
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="studio-synthesis-root">
      
      {/* LEFT: TEXT/SSML EDITOR PANEL */}
      <div className="lg:col-span-8 flex flex-col space-y-4">
        
        {/* Editor Settings & Voice Selection bar */}
        <div className="bg-[#0c0c12] border border-white/5 rounded-xl p-4 flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 flex-1">
            
            {/* Category Quick Selector Tabs */}
            <div className="flex flex-col space-y-1.5 shrink-0">
              <span className="text-gray-400 text-xs font-mono tracking-wider uppercase font-bold">Voice Category</span>
              <div className="bg-[#0a0a0f] p-1 rounded-lg border border-white/10 flex flex-wrap gap-1">
                {(["All", "Professional", "Entertainment", "Synthetic", "Regional Accents"] as const).map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setCustomCategory(""); // Clear typed filter when clicking a specific category preset
                        const catVoices = voices.filter(v => cat === "All" || getVoiceCategory(v) === cat);
                        if (catVoices.length > 0 && !catVoices.some(v => v.id === selectedVoiceId)) {
                          setSelectedVoiceId(catVoices[0].id);
                        }
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-md transition-all font-semibold font-mono tracking-wide cursor-pointer ${
                        isActive
                          ? "bg-cyan-500 text-black font-bold shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                          : "text-gray-400 hover:text-white hover:bg-white/[0.02]"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => {
                  setCustomCategory(e.target.value);
                  if (e.target.value) {
                    setSelectedCategory("All"); // Reset to All if typing custom text to avoid conflicts
                  }
                }}
                placeholder="Type custom category..."
                className="bg-[#0a0a0f] text-white text-xs rounded-lg border border-white/10 py-1.5 px-2.5 w-full focus:outline-none focus:border-cyan-500/50 font-mono mt-1"
              />
            </div>

            {/* Selector Field */}
            <div className="flex flex-col space-y-1.5 flex-1 min-w-[240px]">
              <span className="text-gray-400 text-xs font-mono tracking-wider uppercase font-bold">Select Voice Profile</span>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select 
                    value={selectedVoiceId} 
                    onChange={(e) => setSelectedVoiceId(e.target.value)}
                    className="w-full bg-[#0a0a0f] text-white text-sm rounded-lg border border-white/10 py-2 pl-3 pr-8 appearance-none focus:outline-none focus:border-cyan-500/50 font-medium cursor-pointer"
                  >
                    {selectedCategory === "All" && !customCategory.trim() ? (
                      (() => {
                        const categoriesList: VoiceCategory[] = ["Professional", "Entertainment", "Synthetic", "Regional Accents"];
                        return categoriesList.map(cat => {
                          const catVoices = voices.filter(v => getVoiceCategory(v) === cat);
                          if (catVoices.length === 0) return null;
                          return (
                            <optgroup key={cat} label={cat.toUpperCase()} className="bg-[#0c0c12] text-cyan-400 font-bold font-mono text-[10px] tracking-wider uppercase">
                              {catVoices.map(voice => (
                                <option key={voice.id} value={voice.id} className="text-white text-sm font-sans normal-case font-normal">
                                  {voice.name} ({voice.accent}) - {voice.gender.toUpperCase()}
                                </option>
                              ))}
                            </optgroup>
                          );
                        });
                      })()
                    ) : (
                      filteredVoices.map(voice => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name} ({voice.accent}) - {voice.gender.toUpperCase()} ({getVoiceCategory(voice)})
                        </option>
                      ))
                    )}
                    {filteredVoices.length === 0 && (
                      <option value="" disabled>No matching voices found</option>
                    )}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-3 h-4 w-4 text-gray-500 pointer-events-none" />
                </div>

                {/* Voice immediate Preview Button */}
                <button
                  type="button"
                  onClick={handlePreviewVoice}
                  disabled={!selectedVoiceId}
                  className={`px-3 py-1.5 rounded-lg border transition-all text-xs font-bold font-mono tracking-wider flex items-center gap-1.5 cursor-pointer h-[38px] shrink-0 ${
                    previewPlaybackVoiceId === selectedVoiceId
                      ? "bg-purple-950 text-purple-400 border-purple-800 shadow-[0_0_8px_rgba(168,85,247,0.4)] animate-pulse"
                      : "bg-[#0a0a0f] text-cyan-400 border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/5"
                  }`}
                  title="Audition selected vocal profile immediately"
                >
                  <Volume2 className={`h-4 w-4 ${previewPlaybackVoiceId === selectedVoiceId ? "animate-bounce" : ""}`} />
                  <span>{previewPlaybackVoiceId === selectedVoiceId ? "STOP" : "PREVIEW"}</span>
                </button>
              </div>
            </div>
            
          </div>

          {/* Quick preset tone & Custom Text Entry */}
          <div className="flex flex-col space-y-1.5 self-start xl:self-center shrink-0 w-full xl:w-auto">
            <span className="text-gray-400 text-xs font-mono tracking-wider uppercase font-bold">DELIVERY EMOTION</span>
            <div className="bg-[#0a0a0f] p-1 rounded-lg border border-white/10 flex gap-1">
              {(["casual", "formal", "excited"] as const).map((tone) => (
                <button
                  key={tone}
                  onClick={() => {
                    applyPresetTone(tone);
                    setCustomEmotion(""); // Reset typed custom emotion if they explicitly select presets
                  }}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all font-medium capitalize cursor-pointer ${
                    activePresetTone === tone
                      ? "bg-cyan-500 text-black font-bold shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customEmotion}
              onChange={(e) => {
                setCustomEmotion(e.target.value);
                if (e.target.value) {
                  setActivePresetTone("" as any); // Clear active preset highlights
                }
              }}
              placeholder="Type custom emotion..."
              className="bg-[#0a0a0f] text-white text-xs rounded-lg border border-white/10 py-1.5 px-2.5 w-full focus:outline-none focus:border-cyan-500/50 font-mono mt-1"
            />
          </div>
        </div>

        {/* Realtime voice metadata profile guide for speed selection */}
        {(() => {
          const currentVoice = voices.find(v => v.id === selectedVoiceId) || voices[0];
          if (!currentVoice) return null;
          return (
            <div className="bg-[#0a0a0f] border border-white/5 rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-400 shadow-inner">
              <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono text-[9px] uppercase font-bold tracking-wider">
                {getVoiceCategory(currentVoice)}
              </span>
              <span className="text-gray-600 hidden sm:inline">|</span>
              <span className="font-semibold text-gray-300 font-mono text-[11px]">{currentVoice.accent.toUpperCase()} • {currentVoice.gender.toUpperCase()}</span>
              <span className="text-gray-600 hidden sm:inline">|</span>
              <span className="text-gray-400 italic font-sans flex-1 min-w-[200px]">"{currentVoice.description}"</span>
            </div>
          );
        })()}

        {/* Text Area Card with Rich Features */}
        <div className="bg-[#0c0c12] border border-white/5 rounded-2xl p-6 flex flex-col space-y-4 relative shadow-inner">
          
          {/* Header toolbar */}
          <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm">Vocal Manuscript / SSML</span>
              <button 
                onClick={() => setIsSsml(!isSsml)}
                className={`text-xs px-2.5 py-0.5 rounded-full font-mono transition-all font-bold cursor-pointer ${
                  isSsml 
                    ? "bg-purple-950/40 text-purple-400 border border-purple-800/60 shadow-[0_0_6px_rgba(168,85,247,0.2)]" 
                    : "bg-white/5 text-gray-500 border border-white/5"
                }`}
              >
                SSML {isSsml ? "ON" : "OFF"}
              </button>
            </div>

            {/* Quick SSML generator button via Gemini */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleAISsmlDecorate}
                disabled={isDecoratingSsml}
                className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-bold cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                {isDecoratingSsml ? "Optimizing tags..." : "AI SSML Auto-Decorate"}
              </button>
            </div>
          </div>

          {/* Tag Quick Inserter Panel */}
          {isSsml && (
            <div className="bg-[#0a0a0f] border border-white/5 rounded-lg p-2.5 flex flex-wrap gap-2 items-center">
              <span className="text-gray-500 text-[10px] font-mono font-bold tracking-wider mr-1">INSERT TEXT TAG:</span>
              <button 
                onClick={() => insertSsmlTag("whisper")}
                className="text-gray-400 hover:text-white bg-white/5 border border-white/5 hover:border-cyan-500/50 px-2 py-1 rounded text-[10px] font-mono transition cursor-pointer"
              >
                &lt;whisper&gt;
              </button>
              <button 
                onClick={() => insertSsmlTag("excited")}
                className="text-gray-400 hover:text-white bg-white/5 border border-white/5 hover:border-cyan-500/50 px-2 py-1 rounded text-[10px] font-mono transition cursor-pointer"
              >
                &lt;excited&gt;
              </button>
              <button 
                onClick={() => insertSsmlTag("break")}
                className="text-gray-400 hover:text-white bg-white/5 border border-white/5 hover:border-cyan-500/50 px-2 py-1 rounded text-[10px] font-mono transition cursor-pointer"
              >
                &lt;break&gt;
              </button>
              <button 
                onClick={() => insertSsmlTag("emphasis")}
                className="text-gray-400 hover:text-white bg-white/5 border border-white/5 hover:border-cyan-500/50 px-2 py-1 rounded text-[10px] font-mono transition cursor-pointer"
              >
                &lt;emphasis&gt;
              </button>
              <button 
                onClick={() => insertSsmlTag("robotic")}
                className="text-gray-400 hover:text-white bg-white/5 border border-white/5 hover:border-cyan-500/50 px-2 py-1 rounded text-[10px] font-mono transition cursor-pointer"
              >
                &lt;robotic&gt;
              </button>
            </div>
          )}

          {/* Editable text textarea */}
          <div className="relative">
            <textarea
              id="tts-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={isSsml ? "<speak>Enter SSML markup speech here...</speak>" : "Enter plain narrative script here..."}
              className="w-full bg-[#0a0a0f] text-gray-200 p-4 rounded-xl border border-white/5 min-h-[220px] focus:outline-none focus:border-cyan-500/50 font-mono text-sm leading-relaxed shadow-inner"
            />
            {isSsml && (
              <span className="absolute bottom-3 right-3 text-[10px] text-purple-400 font-mono bg-[#0c0c12] px-1.5 py-0.5 rounded border border-purple-800/20">
                SSML Mode
              </span>
            )}
          </div>

          {/* Subtext display explaining AI SSML actions */}
          {ssmlDecorationExplanation && (
            <div className="bg-[#0a0a0f] border border-white/5 rounded-lg p-4 text-xs text-slate-300 mt-2 flex flex-col space-y-1">
              <span className="text-cyan-400 font-mono text-[10px] uppercase font-bold tracking-wider">AI Tagging Analytics</span>
              <p className="leading-relaxed">{ssmlDecorationExplanation}</p>
            </div>
          )}

          {/* Summary/Metric row */}
          <div className="flex justify-between items-center text-xs text-gray-500 pt-1 font-mono">
            <span>{text.length} Characters</span>
            <span>Approx. {Math.round(text.length / 15)} Words</span>
          </div>
        </div>

        {/* Dynamic Studio Synthesis triggers */}
        <div className="bg-[#0c0c12] border border-white/5 rounded-2xl p-6 flex flex-col space-y-4 shadow-lg">
          
          {quotaWarning && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.1)] relative">
              <div className="p-1 bg-amber-500/20 rounded-lg h-fit">
                <Volume2 className="h-4 w-4 text-amber-400" />
              </div>
              <div className="flex-1 pr-6">
                <span className="font-bold block text-amber-300 mb-1">Synthesis Service Advisory</span>
                <p>{quotaWarning}</p>
              </div>
              <button
                onClick={() => setQuotaWarning(null)}
                className="absolute top-3 right-3 text-amber-400/60 hover:text-amber-300 cursor-pointer text-[10px] font-mono hover:bg-amber-500/10 px-1.5 py-0.5 rounded transition-all"
              >
                DISMISS
              </button>
            </div>
          )}

          {/* Synthesis Engine selector */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-5 gap-4">
            <div>
              <span className="text-gray-400 text-[10px] font-mono tracking-wider uppercase font-bold block mb-2">Select Active Speech Engine</span>
              <div className="bg-[#0a0a0f] p-1 rounded-xl border border-white/10 flex flex-wrap gap-1 w-fit">
                <button
                  type="button"
                  onClick={() => {
                    setSynthesisEngine("gemini");
                    if (audioUrl) {
                      URL.revokeObjectURL(audioUrl);
                      setAudioUrl("");
                    }
                    setAudioBlob(null);
                    window.speechSynthesis.cancel();
                    setIsPlaying(false);
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold tracking-wider font-mono flex items-center gap-1.5 cursor-pointer transition-all ${
                    synthesisEngine === "gemini"
                      ? "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)] font-extrabold"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Gemini Human (Ultra-Natural)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSynthesisEngine("neural");
                    if (audioUrl) {
                      URL.revokeObjectURL(audioUrl);
                      setAudioUrl("");
                    }
                    setAudioBlob(null);
                    window.speechSynthesis.cancel();
                    setIsPlaying(false);
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold tracking-wider font-mono flex items-center gap-1.5 cursor-pointer transition-all ${
                    synthesisEngine === "neural"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.5)] font-extrabold"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  Free TTS Service (Local)
                </button>
              </div>
            </div>
            
            <p className="text-gray-400 text-xs max-w-[380px] leading-relaxed">
              {synthesisEngine === "gemini" 
                ? "💡 Gemini Natural uses state-of-the-art neural vocal models. Delivers warm, highly expressive human speech with realistic breathing, inflection, and cadence."
                : "💡 Free TTS Service uses ready-to-run Web Speech API. Immediate offline fallback, though phrasing can sometimes feel robotic."
              }
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            
            {/* Primary Generate voice button */}
            <button
              onClick={handleSynthesize}
              disabled={isSynthesizing || !text.trim()}
              className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-450 active:scale-[0.98] text-black font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2.5 transition cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSynthesizing ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Generating Vocal Track...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 fill-current" />
                  {synthesisEngine === "gemini" 
                    ? "Generate Premium Human Voice" 
                    : synthesisEngine === "neural" 
                    ? "Speak Text (Browser)" 
                    : "Generate Retro Waveform"
                  }
                </>
              )}
            </button>
            
            <p className="text-gray-400 text-xs leading-normal font-medium max-w-[480px]">
              {synthesisEngine === "gemini"
                ? "Synthesizes ultra-fidelity human vocal tracks using Gemini 3.1 TTS. High-fidelity audio downloads and setting cards will be created."
                : "Directly triggers browser speech lines. Quick design helper, which doesn't require network transfers."
              }
            </p>
          </div>

          {/* Dynamic Audio wave preview and visualizer panel */}
          {audioUrl && (
            <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-5 space-y-4 transition shadow-lg">
              {/* Dynamic Oscilloscope Canvas */}
              <canvas 
                ref={canvasRef} 
                width={500} 
                height={80} 
                className="w-full bg-[#08080a] border border-white/5 rounded-xl shadow-inner"
              />

              {/* Hidden native player */}
              {audioUrl !== "neural-placeholder-stream" && (
                <audio 
                  ref={audioElRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              )}

              {/* Player control interface */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0c0c12] p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="h-12 w-12 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:scale-[1.05] transition-all focus:outline-none cursor-pointer"
                  >
                    <Play className={`h-4.5 w-4.5 ${isPlaying ? "fill-cyan-400" : ""}`} />
                  </button>
                  <div>
                    <div className="text-white text-sm font-semibold">{exportTitle}</div>
                    <div className="text-gray-400 text-xs font-mono flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(audioDuration)}</span>
                      <span>•</span>
                      <span>{synthesisEngine === "neural" ? "Virtual System Stream" : "44.1 kHz PCM"}</span>
                    </div>
                  </div>
                </div>

                {/* Direct save format configs */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/5">
                    {(["WAV", "MP3", "OGG", "AAC"] as const).map(fmt => (
                      <button
                        key={fmt}
                        onClick={() => setExportFormat(fmt)}
                        className={`text-xs font-mono px-3 py-1.5 rounded transition-all font-bold cursor-pointer ${
                          exportFormat === fmt
                            ? "bg-white/10 text-white"
                            : "text-gray-500 hover:text-white"
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={exportTitle}
                      onChange={(e) => setExportTitle(e.target.value)}
                      placeholder="Title File..."
                      className="bg-[#0a0a0f] text-white text-xs rounded border border-white/10 px-2.5 py-1.5 w-[140px] focus:outline-none focus:border-cyan-500/50 font-medium"
                    />
                  </div>

                  <button
                    onClick={handleExportAndSave}
                    className="bg-white text-black font-bold px-5 py-2 rounded-lg text-xs hover:bg-cyan-400 transition-colors shadow-xl cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    EXPORT
                  </button>
                </div>
              </div>

              {showExportSuccess && (
                <div className="bg-emerald-950/20 border border-emerald-800/40 text-emerald-400 px-4 py-3 rounded-lg text-xs flex items-center gap-2.5 transition">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-semibold block">Track Compiled Successfully!</span>
                    Exotic format exported and loaded into your audio repository below as a `{exportFormat}` file ({formatBytes(audioBlob?.size || 0)}).
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: ACOUSTIC MODIFIERS (VOCAL DNA SLIDERS) */}
      <div className="lg:col-span-4 bg-[#0a0a0f] border border-white/5 rounded-2xl p-6 flex flex-col space-y-5 h-fit">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <Sliders className="h-4.5 w-4.5 text-cyan-400" />
            <h2 className="text-white font-semibold text-sm font-sans">Vocal DNA Shaper</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowDnaShaper(!showDnaShaper)}
            className="text-gray-500 hover:text-cyan-400 px-2.5 py-1 rounded hover:bg-white/5 text-[10px] font-bold font-mono tracking-wider transition-colors uppercase border border-transparent hover:border-white/10 cursor-pointer"
            title={showDnaShaper ? "Collapse Vocal DNA" : "Expand Vocal DNA"}
          >
            {showDnaShaper ? "Collapse ✕" : "Expand ＋"}
          </button>
        </div>

        {showDnaShaper ? (
          <>
            {/* SLIDER 1: Pitch (fundamental frequency) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-400">Pitch Frequency</span>
                <span className="text-cyan-400 font-semibold">{pitch.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.8"
                step="0.05"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>Bass (Deep)</span>
                <span>Alto (Standard)</span>
                <span>Treble (High)</span>
              </div>
            </div>

            {/* SLIDER 2: Rate (speed multiplier) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-400">Speech Rate</span>
                <span className="text-cyan-400 font-semibold">{rate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.6"
                step="0.05"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>Deliberate</span>
                <span>Normal</span>
                <span>Urgent</span>
              </div>
            </div>

            {/* SLIDER 3: Warmth (low frequency amplification) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-400">Resonant Warmth</span>
                <span className="text-cyan-400 font-semibold">{Math.round(warmth * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={warmth}
                onChange={(e) => setWarmth(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[10px] text-gray-500 leading-normal">
                Boosts throat resonances to generate velvety, deep radio tones.
              </p>
            </div>

            {/* SLIDER 4: Breathiness (noise profile) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-400">Airy Breathiness</span>
                <span className="text-cyan-400 font-semibold">{Math.round(breathiness * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.8"
                step="0.05"
                value={breathiness}
                onChange={(e) => setBreathiness(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[10px] text-gray-500 leading-normal">
                Blends noise elements to simulate whispering or soft intimate dialogue.
              </p>
            </div>

            {/* SLIDER 5: Sharpness (treble/crispness boost) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-400">Clarity Sharpness</span>
                <span className="text-cyan-400 font-semibold">{Math.round(sharpness * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={sharpness}
                onChange={(e) => setSharpness(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[10px] text-gray-500 leading-normal">
                Intensifies high sibilance frequencies for crisp modern voice-overs.
              </p>
            </div>

            {/* SLIDER 6: Vibrato (oscillations) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-400">Steady Vibrato</span>
                <span className="text-cyan-400 font-semibold">{Math.round(vibrato * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={vibrato}
                onChange={(e) => setVibrato(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[10px] text-gray-500 leading-normal">
                Modulates central frequency lines to mimic artistic vocal tremors.
              </p>
            </div>

            {/* SLIDER 7: Flutter Jitter (age simulation) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-400">Acoustic Flutter</span>
                <span className="text-cyan-400 font-semibold">{Math.round(flutter * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={flutter}
                onChange={(e) => setFlutter(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-[10px] text-gray-500 leading-normal">
                Injects micro-instability and throat raspiness for elder voice textures.
              </p>
            </div>

            {/* Quick Reset Options */}
            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
              <div className="text-[10px] text-gray-500 font-mono font-bold tracking-wider uppercase">
                SPECTRUM OVERRIDES
              </div>
              <button
                onClick={() => applyPresetTone("casual")}
                className="text-[11px] outline-none text-gray-400 hover:text-cyan-400 flex items-center gap-1 transition cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                Reset sliders
              </button>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-xs text-gray-500 font-mono flex flex-col items-center gap-3">
            <Sliders className="h-5 w-5 text-gray-600 animate-pulse" />
            <span>Sliders are active but hidden. Click "Expand ＋" to modify.</span>
          </div>
        )}
      </div>
    </div>
  );
}
