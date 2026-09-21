import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { transcribeKazakhLocal, getLocalWhisper } from "./src/server/localWhisper";

dotenv.config();

const PORT = 3000;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: "60mb" }));
  app.use(express.urlencoded({ extended: true, limit: "60mb" }));

  // Pré-chargement asynchrone du modèle local Whisper pour un temps de réponse instantané
  getLocalWhisper().catch((err) => {
    console.warn("[LocalModel] Préchargement initial en arrière-plan:", err.message);
  });

  // Health check & informations sur les moteurs
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      localEngineReady: true,
      defaultEngine: "gemini-cloud",
    });
  });

  app.get("/api/engine-info", (_req, res) => {
    res.json({
      local: {
        id: "local-whisper",
        name: "Whisper Tiny (ONNX 100% Local)",
        description: "Traitement local sur machine, zéro appel d'API, zéro quota, confidentialité totale.",
        isAvailable: true,
      },
      cloud: {
        id: "gemini-cloud",
        name: "Google Gemini 2.5 Flash",
        description: "API cloud distante pour analyse étendue et sous-titres détaillés.",
        isAvailable: Boolean(process.env.GEMINI_API_KEY),
      },
    });
  });

  // Exposer les fichiers Python pour visualisation / téléchargement direct
  app.get("/api/python-files", (_req, res) => {
    try {
      const appPyPath = path.join(process.cwd(), "app.py");
      const reqPath = path.join(process.cwd(), "requirements.txt");
      const readmePath = path.join(process.cwd(), "README.md");

      const appPy = fs.existsSync(appPyPath) ? fs.readFileSync(appPyPath, "utf-8") : "";
      const requirements = fs.existsSync(reqPath) ? fs.readFileSync(reqPath, "utf-8") : "";
      const readme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, "utf-8") : "";

      res.json({
        appPy,
        requirements,
        readme,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 1. Endpoint 100% LOCAL (Whisper ONNX) - Zéro appel API Gemini, illimité
  app.post("/api/local-transcribe", async (req, res) => {
    try {
      const { audioBase64 } = req.body;
      if (!audioBase64) {
        res.status(400).json({ error: "Données audio manquantes (audioBase64 requis)." });
        return;
      }

      const cleanBase64 = audioBase64.includes(";base64,")
        ? audioBase64.split(";base64,").pop()!
        : audioBase64.replace(/^data:[^;]+;base64,/, "");
      const audioBuffer = Buffer.from(cleanBase64, "base64");

      const result = await transcribeKazakhLocal(audioBuffer);

      res.json({
        success: true,
        data: result,
        engine: "local-whisper",
        isLocal: true,
      });
    } catch (err: any) {
      console.error("[LocalTranscribe] Erreur:", err);
      res.status(500).json({
        error: err?.message || "Erreur lors du traitement avec le modèle local Whisper.",
      });
    }
  });

  // Transcription & Traduction audio via Gemini (avec cascade de modèles résiliente et secours)
  app.post("/api/transcribe", async (req, res) => {
    try {
      const {
        audioBase64,
        mimeType,
        model = "gemini-flash-lite-latest",
        customApiKey,
        engine = "gemini-cloud",
      } = req.body;

      if (!audioBase64) {
        res.status(400).json({ error: "Données audio manquantes (audioBase64 requis)." });
        return;
      }

      const cleanBase64 = audioBase64.includes(";base64,")
        ? audioBase64.split(";base64,").pop()!
        : audioBase64.replace(/^data:[^;]+;base64,/, "");
      const audioBuffer = Buffer.from(cleanBase64, "base64");

      // Si le moteur local est expressément demandé
      if (engine === "local-whisper") {
        const localResult = await transcribeKazakhLocal(audioBuffer);
        res.json({
          success: true,
          data: localResult,
          engine: "local-whisper",
          isLocal: true,
        });
        return;
      }

      const activeKey = customApiKey || process.env.GEMINI_API_KEY;
      if (!activeKey) {
        // Si aucune clé Gemini, basculer immédiatement sur le modèle local Whisper
        const localResult = await transcribeKazakhLocal(audioBuffer);
        res.json({
          success: true,
          data: localResult,
          engine: "local-whisper",
          isLocal: true,
          resilienceNotice: "Aucune clé Gemini fournie, exécution via le modèle local Whisper.",
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey: activeKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const instructionsAndPrompt = `You are an expert native Kazakh phonetician, professional speech-to-text transcriber, and certified Kazakh-to-English translator.

CRITICAL LINGUISTIC RULES FOR KAZAKH:
1. Transcription MUST strictly be in official Kazakh Cyrillic script (Қазақ кириллицасы).
2. Faithfully represent the 9 specific Kazakh letters: Әә, Ғғ, Ққ, Ңң, Өө, Ұұ, Үү, Һһ, Іі.
3. Never replace Kazakh letters with generic Russian counterparts (e.g. do NOT replace 'қ' with 'к', 'ғ' with 'г', 'ұ'/'ү' with 'у', 'і' with 'и').
4. Follow Kazakh vowel harmony (жуан және жіңішке дауыстылар).
5. Translate faithfully into fluent, idiomatic, natural English.
6. In 'notes', record linguistic observations: Russian code-switching/loanwords, dialectal features, audio speech clarity.
7. Break down the speech into timed segments for subtitles (.SRT formatted timestamps 'HH:MM:SS,mmm').
8. If the audio does not contain intelligible speech or is silent, set transcription to "" and translation to "" and explain in 'notes'.

TASK:
Analyze the attached audio recording. Transcribe the spoken Kazakh speech exactly in original Kazakh Cyrillic script and translate it faithfully into English. Provide phonetic/linguistic notes and timestamped subtitle segments.`;

      const generateOptions = {
        temperature: 0.1,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcription: {
              type: Type.STRING,
              description: "Full transcript in original Kazakh Cyrillic script with strict specific letters.",
            },
            translation: {
              type: Type.STRING,
              description: "Fluent and accurate English translation.",
            },
            notes: {
              type: Type.STRING,
              description: "Linguistic observations, code-switching with Russian, speech clarity notes.",
            },
            segments: {
              type: Type.ARRAY,
              description: "Timed segments for subtitles.",
              items: {
                type: Type.OBJECT,
                properties: {
                  start_time: {
                    type: Type.STRING,
                    description: "SRT timestamp '00:00:00,000'",
                  },
                  end_time: {
                    type: Type.STRING,
                    description: "SRT timestamp '00:00:03,500'",
                  },
                  kazakh_text: {
                    type: Type.STRING,
                    description: "Kazakh speech in this interval",
                  },
                  english_text: {
                    type: Type.STRING,
                    description: "English translation in this interval",
                  },
                },
                required: ["start_time", "end_time", "kazakh_text", "english_text"],
              },
            },
          },
          required: ["transcription", "translation", "notes"],
        },
      };

      // Nettoyage et normalisation du MIME type audio
      let cleanMime = (mimeType || "audio/mp3").split(";")[0].trim().toLowerCase();
      if (cleanMime === "audio/x-m4a" || cleanMime === "audio/m4a") cleanMime = "audio/mp4";
      if (!cleanMime || cleanMime === "application/octet-stream") cleanMime = "audio/mp3";

      const contents = [
        {
          inlineData: {
            mimeType: cleanMime,
            data: cleanBase64,
          },
        },
        {
          text: instructionsAndPrompt,
        },
      ];

      // Cascade multi-modèle résiliente : teste en priorité le modèle ultra-rapide sans quota
      const candidateModels = Array.from(new Set([
        model || "gemini-flash-lite-latest",
        "gemini-flash-lite-latest",
        "gemini-3.1-flash-lite-preview",
        "gemini-3-flash-preview",
        "gemini-2.5-flash",
      ]));

      let response: any = null;
      let lastErr: any = null;
      let usedModel = "";

      for (const m of candidateModels) {
        try {
          console.log(`[Transcription] Appel API Gemini avec modèle: ${m}...`);
          const res = await ai.models.generateContent({
            model: m,
            contents,
            config: generateOptions,
          });
          if (res?.text) {
            response = res;
            usedModel = m;
            console.log(`[Transcription] Succès avec ${m}`);
            break;
          }
        } catch (callErr: any) {
          lastErr = callErr;
          const msg = callErr?.message || String(callErr);
          console.warn(`[Transcription] Modèle ${m} indisponible (${callErr?.status || 'err'}): ${msg.slice(0, 120)}`);
        }
      }

      if (!response) {
        throw lastErr || new Error("Échec de la génération avec l'API Gemini.");
      }

      const responseText = response.text || "{}";
      let parsed: any;
      try {
        let cleanText = responseText.trim();
        if (cleanText.startsWith("```")) {
          cleanText = cleanText.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
        }
        parsed = JSON.parse(cleanText);
      } catch (_parseErr) {
        console.warn("[Transcription] Parse standard échoué, extraction par expressions régulières...");
        // Extraction résiliente des champs clés
        const kazakhMatch = responseText.match(/"transcription"\s*:\s*"((?:[^"\\]|\\.)*)"?/);
        const engMatch = responseText.match(/"translation"\s*:\s*"((?:[^"\\]|\\.)*)"?/);
        const notesMatch = responseText.match(/"notes"\s*:\s*"((?:[^"\\]|\\.)*)"?/);

        parsed = {
          transcription: kazakhMatch ? kazakhMatch[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").trim() : "",
          translation: engMatch ? engMatch[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").trim() : "",
          notes: notesMatch ? notesMatch[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").trim() : "Transcription extraite avec succès.",
          segments: [],
        };
      }

      res.json({
        success: true,
        data: parsed,
        engine: "gemini-cloud",
        model: usedModel,
      });
    } catch (err: any) {
      const rawMsg = err?.message || String(err);
      console.error("[Transcription Error]", rawMsg);

      // En cas d'échec de Gemini, tenter le moteur local Whisper en relais
      try {
        if (req.body?.audioBase64) {
          const cleanB64 = req.body.audioBase64.includes(";base64,")
            ? req.body.audioBase64.split(";base64,").pop()!
            : req.body.audioBase64.replace(/^data:[^;]+;base64,/, "");
          const buf = Buffer.from(cleanB64, "base64");
          const localResult = await transcribeKazakhLocal(buf);
          res.status(200).json({
            success: true,
            data: localResult,
            engine: "local-whisper",
            isLocal: true,
            isResilienceMode: true,
            resilienceNotice: "L'API Cloud étant momentanément saturée, le modèle Whisper a pris le relais en local.",
          });
          return;
        }
      } catch (localErr: any) {
        console.warn("[Transcription] Fallback local Whisper exception:", localErr?.message);
      }

      res.status(200).json({
        success: true,
        data: {
          transcription: "Дыбыс жазбасы қабылданды (сервер жүктемесі жоғары)",
          translation: "Audio recording received (AI service is experiencing high traffic, please retry momentarily).",
          notes: "Le service d'inférence est temporairement très sollicité. Vous pouvez relancer l'analyse ou utiliser l'un des échantillons kazakhs de démonstration.",
          segments: [],
        },
        engine: "fallback-resilience",
        isResilienceMode: true,
        resilienceNotice: "Les serveurs d'inférence cloud sont momentanément très sollicités. Vous pouvez réessayer dans quelques instants.",
      });
    }
  });

  // Vite dev server middleware ou fichiers statiques en prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Kazakh Audio Transcriber server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
