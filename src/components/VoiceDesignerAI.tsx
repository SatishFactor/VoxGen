/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Sparkles, Play, RefreshCw, Plus, CheckCircle, HelpCircle, ArrowRight } from "lucide-react";
import { VoiceProfile } from "../types";
import { synthesizeProceduralVoice } from "../utils/voiceSynthEngine";
import { bufferToWav } from "../utils/audioEncoder";

interface VoiceDesignerAIProps {
  onAddCustomVoice: (voice: VoiceProfile) => void;
}

export default function VoiceDesignerAI({ onAddCustomVoice }: VoiceDesignerAIProps) {
  const [designerPrompt, setDesignerPrompt] = useState(
    "A mature, warm, slightly raspy sea captain with a deep storytelling pace and a comforting British accent."
  );
  const [isForging, setIsForging] = useState(false);
  const [designedProfile, setDesignedProfile] = useState<Partial<VoiceProfile> | null>(null);
  const [showcaseScriptText, setShowcaseScriptText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Audition status
  const [isAuditioning, setIsAuditioning] = useState(false);
  const [auditionAudioUrl, setAuditionAudioUrl] = useState("");
  const [addedVoiceName, setAddedVoiceName] = useState("");

  const samplePrompts = [
    "A futuristic, hyper-precise female starship computer assistant with a flat digital resonance.",
    "A comforting, elderly fairy godmother speaking whispers with great warmth and wisdom.",
    "An excited, young tech-guru speaking at high speeds with a modern West Coast accent."
  ];

  const auditionAudioRef = React.useRef<HTMLAudioElement | null>(null);

  const handleForgeVoice = async () => {
    if (auditionAudioRef.current) {
      auditionAudioRef.current.pause();
      auditionAudioRef.current = null;
    }
    setIsAuditioning(false);
    setIsForging(true);
    setDesignedProfile(null);
    setAddedVoiceName("");
    setErrorMsg(null);
    if (auditionAudioUrl) {
      URL.revokeObjectURL(auditionAudioUrl);
      setAuditionAudioUrl("");
    }

    try {
      const response = await fetch("/api/voice-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: designerPrompt })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Acoustic calibration or server design failed.");
      }

      if (data.suggestedName) {
        const dynamicId = "design_" + Date.now();
        const profile: VoiceProfile = {
          id: dynamicId,
          name: data.suggestedName,
          lang: "en-US",
          accent: data.accent || "Custom",
          gender: data.gender || "neutral",
          type: "designed",
          pitch: data.pitch ?? 1.0,
          rate: data.rate ?? 1.0,
          warmth: data.warmth ?? 0.5,
          breathiness: data.breathiness ?? 0.2,
          vibrato: data.vibrato ?? 0.1,
          flutter: data.flutter ?? 0.1,
          sharpness: data.sharpness ?? 0.5,
          description: data.description || "Synthesized profile via voice designer prompt.",
          prompt: designerPrompt
        };

        setDesignedProfile(profile);
        setShowcaseScriptText(data.sampleScript || "The audio synthesis channel is successfully configured, prepare for transmission.");
      }
    } catch (e: any) {
      console.error("AI Forging failure:", e);
      setErrorMsg(e?.message || "Synthesizer failed to draft characteristics.");
    } finally {
      setIsForging(false);
    }
  };

  const handleAudition = async () => {
    if (!designedProfile) return;

    if (auditionAudioRef.current) {
      auditionAudioRef.current.pause();
      auditionAudioRef.current = null;
    }

    if (isAuditioning) {
      setIsAuditioning(false);
      return;
    }

    setIsAuditioning(true);
    if (auditionAudioUrl) {
      URL.revokeObjectURL(auditionAudioUrl);
      setAuditionAudioUrl("");
    }

    try {
      const buffer = await synthesizeProceduralVoice(
        showcaseScriptText, 
        designedProfile as VoiceProfile
      );
      
      const wavBlob = bufferToWav(buffer);
      const url = URL.createObjectURL(wavBlob);
      setAuditionAudioUrl(url);

      const previewAudio = new Audio(url);
      auditionAudioRef.current = previewAudio;
      
      previewAudio.play().then(() => {
        previewAudio.onended = () => {
          setIsAuditioning(false);
          auditionAudioRef.current = null;
        };
      }).catch(err => {
        console.error("Audition playback failed:", err);
        setIsAuditioning(false);
        auditionAudioRef.current = null;
      });
    } catch (e) {
      console.error("Acoustic audition simulation failed:", e);
      setIsAuditioning(false);
      auditionAudioRef.current = null;
    }
  };

  const handleAddVoiceToStudio = () => {
    if (!designedProfile) return;
    onAddCustomVoice(designedProfile as VoiceProfile);
    setAddedVoiceName(designedProfile.name || "Custom AI Voice");
    setDesignedProfile(null);
  };

  return (
    <div className="bg-[#0c0c12] border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl" id="voice-designer-ai-root">
      
      {/* Intro info bar */}
      <div className="flex items-center gap-3 bg-[#0a0a0f] border border-white/5 p-4 rounded-xl">
        <Sparkles className="h-6 w-6 text-cyan-400 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-white font-sans">Prompt-to-Voice AI Design</h3>
          <p className="text-xs text-gray-400 leading-relaxed font-normal mt-0.5">
            Describe the physical demeanor, accent, delivery tone, or age of a speaker. Gemini will analyze the text to output a precise Vocal DNA spectrum patch.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* LEFT PANEL: PROMPT FORGING BOX */}
        <div className="flex flex-col space-y-4">
          <div className="space-y-1.5 font-mono">
            <label className="text-gray-400 text-xs font-semibold">DESCRIBE THREAT TONE / VOICE PERSONALITY</label>
            <textarea
              value={designerPrompt}
              onChange={(e) => setDesignerPrompt(e.target.value)}
              placeholder="e.g. A young energetic woman from Sydney speaking rapidly with high-pitch clarity..."
              className="w-full bg-[#0a0a0f] text-gray-200 p-4 rounded-xl border border-white/5 min-h-[140px] text-sm leading-relaxed focus:outline-none focus:border-cyan-500/50 font-mono"
            />
          </div>

          {/* Preset Pills */}
          <div className="space-y-2">
            <span className="text-gray-500 text-[10px] font-mono block font-semibold uppercase tracking-wider">Quick inspiration prompts:</span>
            <div className="flex flex-col gap-2">
              {samplePrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setDesignerPrompt(p)}
                  className="text-[11px] text-left px-3 py-2.5 rounded-xl border border-white/5 bg-[#0a0a0f] hover:border-white/15 hover:bg-white/5 text-gray-350 tracking-wide transition-all truncate cursor-pointer font-medium"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleForgeVoice}
            disabled={isForging || !designerPrompt.trim()}
            className="bg-cyan-500 hover:bg-cyan-450 active:scale-[0.98] text-black font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition font-mono disabled:opacity-50 shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer"
          >
            {isForging ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Analyzing acoustics & forging spectrum...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Forge Acoustical Voice DNA
              </>
            )}
          </button>
        </div>

        {/* RIGHT PANEL: COMPILED PREVIEW OR SUCCESS CARD */}
        <div className="border border-white/5 bg-[#0a0a0f] rounded-2xl p-6 flex flex-col justify-center min-h-[300px] shadow-inner">
          {isForging ? (
            <div className="flex flex-col items-center justify-center space-y-3.5 py-12">
              <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-white">Deconstructing Speech Prompt...</p>
                <p className="text-xs text-gray-500">Gemini is mapping vocal adjectives to physics parameters...</p>
              </div>
            </div>
          ) : designedProfile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">AI GENERATION COMPILED</span>
                  <h4 className="text-white font-semibold text-base font-sans mt-0.5">{designedProfile.name}</h4>
                </div>
                <span className="text-xs bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-2.5 py-0.5 rounded-full font-mono font-medium">
                  {designedProfile.accent}
                </span>
              </div>

              {/* Description & Metadata cards */}
              <div className="space-y-3">
                <p className="text-xs text-gray-300 leading-relaxed font-sans">{designedProfile.description}</p>
                
                {/* Acoustic slider values summary */}
                <div className="grid grid-cols-2 gap-2 bg-white/5 p-3 rounded-xl border border-white/10 text-[11px] font-mono">
                  <div className="flex justify-between text-gray-400">
                    <span>Fundamental Pitch:</span>
                    <span className="text-cyan-400 font-bold">{designedProfile.pitch?.toFixed(2)}x</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Low Resonance (Warm):</span>
                    <span className="text-cyan-400 font-bold">{Math.round((designedProfile.warmth ?? 0) * 100)}%</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Speech Pace:</span>
                    <span className="text-cyan-400 font-bold">{designedProfile.rate?.toFixed(2)}x</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Whisper Breath:</span>
                    <span className="text-cyan-400 font-bold">{Math.round((designedProfile.breathiness ?? 0) * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* Audition Sandbox */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <span className="text-[10px] font-mono text-gray-450 uppercase font-semibold">Test Showcase Script</span>
                <textarea
                  value={showcaseScriptText}
                  onChange={(e) => setShowcaseScriptText(e.target.value)}
                  className="w-full bg-[#08080a] text-gray-200 text-xs p-3 rounded-lg border border-white/5 focus:outline-none focus:border-cyan-500/50 font-sans leading-relaxed"
                />
                <button
                  onClick={handleAudition}
                  disabled={isAuditioning || !showcaseScriptText}
                  className="w-full bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/35 border-dashed text-cyan-400 font-medium py-2 rounded-lg flex items-center justify-center gap-2 text-xs transition cursor-pointer"
                >
                  {isAuditioning ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Auditioning customized voice...
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Play Voice Audition Demo
                    </>
                  )}
                </button>
              </div>

              {/* Save trigger */}
              <button
                onClick={handleAddVoiceToStudio}
                className="w-full bg-cyan-500 hover:bg-cyan-450 text-black font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs transition font-mono shadow-[0_0_12px_rgba(6,182,212,0.4)] cursor-pointer"
              >
                <Plus className="h-4.5 w-4.5" />
                Add to Voice Forge Palette
              </button>
            </div>
          ) : addedVoiceName ? (
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
              <div className="h-12 w-12 rounded-full bg-green-500/10 border border-green-500/55 flex items-center justify-center shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                <CheckCircle className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-white font-semibold text-base font-sans">Voice Added to Studio!</h4>
                <p className="text-xs text-gray-400 leading-relaxed max-w-[280px] mx-auto">
                  <strong>{addedVoiceName}</strong> is now registered as a permanent sound profile inside your Studio voice list dropdown.
                </p>
              </div>
              <button
                onClick={() => setAddedVoiceName("")}
                className="text-xs text-gray-400 hover:text-cyan-400 font-mono flex items-center gap-1 transition cursor-pointer"
              >
                Design another profile <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : errorMsg ? (
            <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="h-12 w-12 rounded-full bg-red-550/10 border border-red-500/25 flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.15)]">
                <span className="text-red-450 text-lg font-bold font-mono">!</span>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-red-450 font-mono uppercase tracking-wider">Calibration Interrupted</p>
                <p className="text-[11px] text-gray-450 max-w-[280px] mx-auto leading-relaxed">
                  {errorMsg}
                </p>
              </div>
              <button
                onClick={() => setErrorMsg(null)}
                className="text-[11px] bg-white/5 border border-white/10 hover:bg-white/10 text-gray-350 font-mono py-1.5 px-3.5 rounded-lg transition cursor-pointer"
              >
                Reset Canvas
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
              <HelpCircle className="h-10 w-10 text-gray-600" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-400 font-mono uppercase tracking-wider">Vocal Manifest Empty</p>
                <p className="text-xs text-gray-500 max-w-[260px] mx-auto">
                  Write a written description on the left column, then tap "Forge Voice DNA" to see the custom AI acoustic patch compile.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
