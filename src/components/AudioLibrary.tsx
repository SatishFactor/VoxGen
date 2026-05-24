/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  Calendar, 
  FileAudio, 
  FileText,
  Clock,
  AudioLines
} from "lucide-react";
import { SavedAudio } from "../types";

interface AudioLibraryProps {
  savedAudios: SavedAudio[];
  onDeleteAudio: (id: string) => void;
}

export default function AudioLibrary({ savedAudios, onDeleteAudio }: AudioLibraryProps) {
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayToggle = (id: string, url: string) => {
    if (currentPlayingId === id) {
      audioRef.current?.pause();
      setCurrentPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(url);
      audio.onended = () => {
        setCurrentPlayingId(null);
      };
      
      audioRef.current = audio;
      audio.play().then(() => {
        setCurrentPlayingId(id);
      }).catch(err => {
        console.error("Library audio playback index failed:", err);
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatSecs = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remain = Math.floor(secs % 60);
    return `${mins}:${remain < 10 ? "0" : ""}${remain}`;
  };

  return (
    <div className="space-y-4" id="audio-library-root">
      {savedAudios.length === 0 ? (
        <div className="bg-[#0c0c12] border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3.5 shadow-xl">
          <AudioLines className="h-10 w-10 text-gray-600 animate-pulse" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white font-sans">Synthesis Repository Blank</h4>
            <p className="text-xs text-gray-500 max-w-[320px]">
              No vocal tracks have been compiled or saved yet. Create speech in the Studio Sandbox, adjust delivery settings, and hit "Export" to log files here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedAudios.map((audio) => (
            <div 
              key={audio.id} 
              className="bg-[#0c0c12] border border-white/5 hover:border-white/10 rounded-2xl p-5 flex flex-col justify-between transition-all cursor-pointer shadow-md"
            >
              {/* Top Title/Tag */}
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-white font-semibold text-sm font-sans truncate pr-2 max-w-[220px]">{audio.title}</h3>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      <span>{audio.timestamp}</span>
                    </p>
                  </div>

                  {/* Format pill badge */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-850">
                      {audio.format}
                    </span>
                    {audio.isSsml && (
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-850">
                        SSML
                      </span>
                    )}
                  </div>
                </div>

                {/* Plain transcript snippet */}
                <div className="bg-[#0a0a0f] border border-white/5 p-3 rounded-xl shadow-inner">
                  <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed font-sans">{audio.text}</p>
                </div>
              </div>

              {/* Player and stats controls row */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-4">
                
                {/* Stats */}
                <div className="flex items-center gap-3 text-[11px] font-mono text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatSecs(audio.duration)}
                  </span>
                  <span>•</span>
                  <span>{formatFileSize(audio.fileSize)}</span>
                  <span>•</span>
                  <span className="text-cyan-405 font-medium truncate max-w-[80px]">@{audio.voiceName}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePlayToggle(audio.id, audio.audioUrl)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 bg-[#0a0a0f] border border-white/5 hover:border-cyan-500/30 transition cursor-pointer"
                    title={currentPlayingId === audio.id ? "Pause track" : "Listen track"}
                  >
                    {currentPlayingId === audio.id ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 fill-current" />
                    )}
                  </button>

                  <a
                    href={audio.audioUrl}
                    download={`${audio.title.toLowerCase().replace(/\s+/g, "_")}.${audio.format.toLowerCase()}`}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-400 bg-[#0a0a0f] border border-white/5 hover:border-emerald-500/30 transition cursor-pointer"
                    title="Download physical binary file"
                  >
                    <Download className="h-4 w-4" />
                  </a>

                  <button
                    onClick={() => onDeleteAudio(audio.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 bg-[#0a0a0f] border border-white/5 hover:border-red-500/30 transition cursor-pointer"
                    title="Delete track"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
