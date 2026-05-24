/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Sliders, Volume2, HelpCircle, ShieldCheck, Check, Info } from "lucide-react";
import { SavedSettingPresets } from "../types";

interface WorkspaceSettingsProps {
  settings: SavedSettingPresets;
  onUpdateSettings: (settings: Partial<SavedSettingPresets>) => void;
}

export default function WorkspaceSettings({ settings, onUpdateSettings }: WorkspaceSettingsProps) {
  const [saveSuccess, setSaveSuccess] = useState(false);

  const triggerSaveNotification = () => {
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  return (
    <div className="bg-[#0c0c12] border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl" id="workspace-settings-root">
      
      {/* Title */}
      <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
        <Sliders className="h-5 w-5 text-cyan-400" />
        <h2 className="text-white font-semibold text-sm font-sans">Hardware & Digital Signal processing (DSP) Calibration</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* LEFT CABINET: ADJUSTMENT SELECTORS */}
        <div className="space-y-5">
          
          {/* Master volume gain block */}
          <div className="space-y-2.5 bg-[#0a0a0f] p-5 rounded-2xl border border-white/5 shadow-inner">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-gray-400 font-medium flex items-center gap-1.5">
                <Volume2 className="h-4.5 w-4.5 text-cyan-400" />
                Master Gain Volume
              </span>
              <span className="text-cyan-400 font-bold">{Math.round(settings.masterGain * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.5"
              step="0.05"
              value={settings.masterGain}
              onChange={(e) => {
                onUpdateSettings({ masterGain: parseFloat(e.target.value) });
                triggerSaveNotification();
              }}
              className="w-full h-1.5 bg-[#08080a] rounded appearance-none cursor-pointer accent-cyan-500"
            />
            <p className="text-[10px] text-gray-500 font-medium font-sans mt-0.5">
              Controls total Decibel amplification output before final speaker clipping levels.
            </p>
          </div>

          {/* Sample rate configuration */}
          <div className="space-y-4">
            <div className="flex flex-col space-y-1.5 font-mono">
              <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">EXPORT SAMPLE RATE CALIBRATION</label>
              <select
                value={settings.sampleRate}
                onChange={(e) => {
                  onUpdateSettings({ sampleRate: parseInt(e.target.value) as 24000 | 44100 | 48000 });
                  triggerSaveNotification();
                }}
                className="bg-[#0a0a0f] text-white text-xs rounded-xl border border-white/10 p-3 outline-none focus:border-cyan-500/50 font-mono cursor-pointer"
              >
                <option value={24000}>24000 Hz (Medium Quality - Voice Optimal)</option>
                <option value={44100}>44100 Hz (CD Standard Quality - High Fidelity)</option>
                <option value={48000}>48000 Hz (Studio Production Broadcast Standard)</option>
              </select>
            </div>

            {/* Dynamic Signal Normalization Toggle */}
            <div className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl border border-white/5 shadow-inner">
              <div className="space-y-0.5 max-w-[240px]">
                <span className="text-white text-xs font-semibold block">Automatic Peak Loudness Limiter</span>
                <p className="text-[10px] text-gray-500">
                  Normalizes vocal volume margins and applies soft-knee compression thresholds in offline contexts.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoNormalize}
                onChange={(e) => {
                  onUpdateSettings({ autoNormalize: e.target.checked });
                  triggerSaveNotification();
                }}
                className="h-4.5 w-4.5 bg-[#08080a] border border-white/10 rounded checked:bg-cyan-500 focus:ring-0 cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Noise Minimization Toggle */}
            <div className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl border border-white/5 shadow-inner">
              <div className="space-y-0.5 max-w-[240px]">
                <span className="text-white text-xs font-semibold block">Active Ambient Squelch Gate</span>
                <p className="text-[10px] text-gray-500">
                  Suppresses minor frequency hums and captures crisp silences in recording feeds.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.reduceNoise}
                onChange={(e) => {
                  onUpdateSettings({ reduceNoise: e.target.checked });
                  triggerSaveNotification();
                }}
                className="h-4.5 w-4.5 bg-[#08080a] border border-white/10 rounded checked:bg-cyan-500 focus:ring-0 cursor-pointer accent-cyan-500"
              />
            </div>
          </div>

          {/* Success card bar */}
          {saveSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5" />
              <span>Workspace DSP settings saved and synced successfully.</span>
            </div>
          )}
        </div>

        {/* RIGHT CABINET: HELPER DOCUMENTATION / SSML QUICKSTART */}
        <div className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-1.5 border-b border-white/5 pb-2.5">
            <Info className="h-4 w-4 text-cyan-400" />
            <span className="text-white text-xs font-mono font-semibold uppercase tracking-wider">SSML Tags Cheat Sheet</span>
          </div>
          
          <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
            Speech Synthesis Markup Language (SSML) allows you to tweak individual syllable aspects using tag structures. Switch "SSML" mode to ON in the editor to use these elements:
          </p>

          <div className="space-y-3 font-mono text-[10px]">
            <div className="p-3 border border-white/5 rounded-xl bg-white/5 shadow-sm">
              <span className="text-cyan-400 font-bold block">&lt;break time="1.5s"/&gt;</span>
              <p className="text-gray-500 mt-0.5">Places a custom silent interval of exactly 1.5 seconds.</p>
            </div>

            <div className="p-3 border border-white/5 rounded-xl bg-white/5 shadow-sm">
              <span className="text-cyan-400 font-bold block">&lt;emphasis level="strong"&gt;Text&lt;/emphasis&gt;</span>
              <p className="text-gray-500 mt-0.5">Directs speech synthesis engines to increase loudness stress on the phrase.</p>
            </div>

            <div className="p-3 border border-white/5 rounded-xl bg-white/5 shadow-sm">
              <span className="text-cyan-400 font-bold block">&lt;prosody pitch="high" rate="0.8"&gt;Text&lt;/prosody&gt;</span>
              <p className="text-gray-500 mt-0.5">Modulates pitch intervals or speaks speed ratios for emotional emphasize delivery.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
