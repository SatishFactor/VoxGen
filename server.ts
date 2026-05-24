import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini SDK with telemetry User-Agent as required by Gemini rules
let ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing or empty. Please navigate to Settings in Google AI Studio to set your Gemini API key.");
    }
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

// Endpoint 1: Voice Design via prompt parsing
app.post("/api/voice-design", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Voice prompt is required." });
    }

    const aiInstance = getAI();
    const response = await aiInstance.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are an expert acoustic and sound-design engineer. Generate a voice characteristics DNA profile based on the user's descriptive prompt: "${prompt}". Match the description to quantitative voice properties.`,
      config: {
        systemInstruction: "Strictly return JSON representing the acoustic DNA parameters of the designed voice as defined by the schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedName: { type: Type.STRING, description: "A creative name for this custom voice personality." },
            description: { type: Type.STRING, description: "Brief description of the voice qualities." },
            gender: { type: Type.STRING, description: "Suggested gender profile: 'male', 'female', or 'neutral'." },
            accent: { type: Type.STRING, description: "Suggested accent group (e.g. British, US Southern, Australian, French-accented English, etc.)" },
            pitch: { type: Type.NUMBER, description: "Fundamental frequency multiplier. Range: 0.5 (deep bass) to 2.0 (high treble). Default is 1.0." },
            rate: { type: Type.NUMBER, description: "Ideal speaking rate. Range: 0.7 (slow/deliberate) to 1.5 (fast/excited). Default is 1.0." },
            warmth: { type: Type.NUMBER, description: "Warmth factor (boosting low-mid frequencies). Range: 0 (thin/metallic) to 1.0 (deep/velvety)." },
            breathiness: { type: Type.NUMBER, description: "Air/whistle component. Range: 0.1 (solid/resonant) to 0.9 (whisper/airy)." },
            vibrato: { type: Type.NUMBER, description: "Depth of pitch modulation/oscillation. Range: 0 (steady) to 1.0 (vibrant/trembling)." },
            flutter: { type: Type.NUMBER, description: "Random pitch jitter index. Range: 0 (perfect control) to 1.0 (shaky/aged)." },
            sharpness: { type: Type.NUMBER, description: "High-frequency presence. Range: 0 (soft/muffled) to 1.0 (crisp/bright/sibilant)." },
            vibe: { type: Type.STRING, description: "General atmosphere or emotional undercurrent (e.g. authoritative, cozy, spooky)." },
            sampleScript: { type: Type.STRING, description: "A custom 1-2 sentence dialogue snippet that perfectly showcases this voice's character." }
          },
          required: [
            "suggestedName", "description", "gender", "accent", "pitch", "rate", 
            "warmth", "breathiness", "vibrato", "flutter", "sharpness", "vibe", "sampleScript"
          ]
        }
      }
    });

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Voice design error:", error);
    res.status(500).json({ error: error.message || "Failed to design voice." });
  }
});

// Endpoint 2: Decorating prompt text with SSML tags based on style and emotional presets
app.post("/api/ssml-validate", async (req: Request, res: Response) => {
  try {
    const { text, emotion, style } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text input is required." });
    }

    const emotionStr = emotion || "casual";
    const styleStr = style || "narrator";

    const aiInstance = getAI();
    const response = await aiInstance.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Apply high-fidelity professional SSML tags (Speech Synthesis Markup Language) to the following text to render it in an "${emotionStr}" emotion and "${styleStr}" voice-over style.\n\nText:\n"${text}"`,
      config: {
        systemInstruction: "Generate valid SSML tags such as <speak>, <prosody>, <emphasis>, <break time='...'/> to capture the vocal delivery. Ensure all XML tags are balanced and closed. Your output MUST be a JSON object containing the tag-decorated SSML and an explanation of the tagging choices.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ssml: { type: Type.STRING, description: "The full valid SSML document string wrapped in <speak>...</speak>." },
            explanation: { type: Type.STRING, description: "Brief acoustic reason for placing specific breaks, speed parameters, emphasis tags or volume adjustments." }
          },
          required: ["ssml", "explanation"]
        }
      }
    });

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("SSML decorator error:", error);
    res.status(500).json({ error: error.message || "Failed to generate SSML tags." });
  }
});

// Endpoint 3: Fully structured script generator
app.post("/api/script-generate", async (req: Request, res: Response) => {
  try {
    const { topic, preset, format } = req.body;
    if (!topic || typeof topic !== "string") {
      return res.status(400).json({ error: "Script topic is required." });
    }

    const presetStr = preset || "neutral";
    const formatStr = format || "short script";

    const aiInstance = getAI();
    const response = await aiInstance.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Draft a professional voice-over script about "${topic}" in a "${presetStr}" tone. The format requested is: "${formatStr}".`,
      config: {
        systemInstruction: "Generate a captivating voice-over draft including audio cues or direction guidelines in parentheses, plus clean segments for speech synthesis. Return JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Title of the script" },
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  cue: { type: Type.STRING, description: "Acoustic delivery cue, e.g. (with deep warmth), (deliberate pause)" },
                  text: { type: Type.STRING, description: "The spoken narrative segment line." }
                },
                required: ["cue", "text"]
              }
            },
            fullScriptText: { type: Type.STRING, description: "The unified script string." }
          },
          required: ["title", "segments", "fullScriptText"]
        }
      }
    });

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Script generator error:", error);
    res.status(500).json({ error: error.message || "Failed to generate script draft." });
  }
});

// Endpoint 4: Premium Human Text-To-Speech using gemini-3.1-flash-tts-preview
app.post("/api/tts", async (req: Request, res: Response) => {
  try {
    const { text, voiceName, gender, accent, pitch, rate, warmth, vibe } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required for speech synthesis." });
    }

    const aiInstance = getAI();
    
    // Choose prebuilt voice based on gender or voice name:
    // Available choices: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    let selectedVoice = "Kore"; // Default female/neutral voice
    if (voiceName) {
      const vName = voiceName.toLowerCase();
      if (vName.includes("charon") || vName.includes("male") || vName.includes("deep") || vName.includes("morgan")) {
        selectedVoice = "Charon";
      } else if (vName.includes("puck") || vName.includes("cheerful") || vName.includes("high") || vName.includes("lily")) {
        selectedVoice = "Puck";
      } else if (vName.includes("fenrir") || vName.includes("husky") || vName.includes("old") || vName.includes("jack")) {
        selectedVoice = "Fenrir";
      } else if (vName.includes("zephyr") || vName.includes("airy") || vName.includes("breath") || vName.includes("sophia")) {
        selectedVoice = "Zephyr";
      } else if (vName.includes("kore") || vName.includes("female") || vName.includes("clear") || vName.includes("emma") || vName.includes("clara")) {
        selectedVoice = "Kore";
      } else {
        selectedVoice = gender === "male" ? "Charon" : "Kore";
      }
    } else {
      selectedVoice = gender === "male" ? "Charon" : "Kore";
    }

    // Embed descriptions so Gemini can adjust the pitch, rate, and delivery styles organically
    let instruction = "Say";
    
    // rate styling
    if (rate && rate < 0.85) {
      instruction += " slowly, deliberately, with natural pauses,";
    } else if (rate && rate > 1.2) {
      instruction += " quickly, excitedly, with urgent delivery,";
    } else {
      instruction += " at a natural conversational human pace,";
    }

    // pitch styling
    if (pitch && pitch < 0.85) {
      instruction += " with a deep, authoritative low pitch,";
    } else if (pitch && pitch > 1.2) {
      instruction += " with a pleasant and energized high pitch,";
    }

    // warmth/fidelity styling
    if (warmth && warmth > 0.7) {
      instruction += " with rich, resonant chest warmth and intimate microphone focus,";
    }

    // vibe styling
    if (vibe) {
      instruction += ` in a highly expressive ${vibe} tone`;
    } else {
      instruction += " in a warm, engaging, and professional voice-over tone";
    }

    if (accent) {
      instruction += ` with a subtle, realistic ${accent} accent`;
    }

    instruction += `: "${text.replace(/"/g, "'")}"`;

    console.log(`[TTS] Request: "${instruction}" using voice "${selectedVoice}"`);

    const response = await aiInstance.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: instruction }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    const base64Audio = inlineData?.data;
    const mimeType = inlineData?.mimeType || "audio/wav";
    if (!base64Audio) {
      throw new Error("Gemini Text-to-Speech did not generate any audio tracks. Verify that your prompt is valid.");
    }

    let finalAudioBase64 = base64Audio;
    let finalMimeType = mimeType;

    const pcmBuffer = Buffer.from(base64Audio, "base64");
    const hasRiffHeader = pcmBuffer.length > 4 && pcmBuffer.toString("ascii", 0, 4) === "RIFF";

    // If the mimeType indicates raw pcm, or we see there's no RIFF header, wrap it in a proper WAV container
    if (mimeType.toLowerCase().includes("pcm") || !hasRiffHeader) {
      let sampleRate = 24000; // standard Gemini default
      const rateMatch = mimeType.match(/rate=(\d+)/);
      if (rateMatch) {
         sampleRate = parseInt(rateMatch[1], 10);
      } else if (mimeType.includes("16000")) {
         sampleRate = 16000;
      } else if (mimeType.includes("24000")) {
         sampleRate = 24000;
      }
      
      const numChannels = 1;
      const bitsPerSample = 16;
      const wavHeader = Buffer.alloc(44);
      
      wavHeader.write("RIFF", 0);
      wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
      wavHeader.write("WAVE", 8);
      wavHeader.write("fmt ", 12);
      wavHeader.writeUInt32LE(16, 16);
      wavHeader.writeUInt16LE(1, 20);
      wavHeader.writeUInt16LE(numChannels, 22);
      wavHeader.writeUInt32LE(sampleRate, 24);
      wavHeader.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
      wavHeader.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
      wavHeader.writeUInt16LE(bitsPerSample, 34);
      wavHeader.write("data", 36);
      wavHeader.writeUInt32LE(pcmBuffer.length, 40);

      const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
      finalAudioBase64 = wavBuffer.toString("base64");
      finalMimeType = "audio/wav";
      
      console.log(`[TTS] Converted raw audio payload to a fully-compliant WAV format (${sampleRate}Hz mono) because no RIFF header was present.`);
    } else {
      console.log(`[TTS] Audio payload already has a RIFF/WAVE header. Serving with mimeType: ${mimeType}`);
    }

    res.json({ audio: finalAudioBase64, mimeType: finalMimeType });
  } catch (error: any) {
    const errString = String(error?.message || error || "");
    const isQuotaError = errString.includes("429") || 
                         errString.includes("quota") || 
                         errString.includes("limit") || 
                         errString.includes("RESOURCE_EXHAUSTED");
                         
    if (isQuotaError) {
      console.warn("[TTS Quota Alert] Quota or limit exceeded on Gemini TTS API. Sending graceful fallback suggestion to client.");
      return res.status(429).json({
        error: "quota_exceeded",
        message: "Gemini API daily free-tier quota (10 speech tracks/day) has been reached. Please switch to Free TTS Service (Local) to continue voice customization instantly!"
      });
    }

    console.error("Gemini TTS synthesis service failed:", error);
    res.status(500).json({ error: error.message || "Failed to synthesize premium human-quality audio." });
  }
});

// Initialize full-stack routing and setup Vite middleware interface
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite hot assembly...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode with static asset serving...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Voice Forge Studio is online and active at: http://localhost:${PORT}`);
  });
}

startServer();
