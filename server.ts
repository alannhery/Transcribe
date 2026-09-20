import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

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

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", hasApiKey: Boolean(process.env.GEMINI_API_KEY) });
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

  // Transcription & Traduction audio via Gemini
  app.post("/api/transcribe", async (req, res) => {
    try {
      const { audioBase64, mimeType, model = "gemini-2.5-flash", customApiKey } = req.body;

      if (!audioBase64) {
        res.status(400).json({ error: "Données audio manquantes (audioBase64 requis)." });
        return;
      }

      const activeKey = customApiKey || process.env.GEMINI_API_KEY;
      if (!activeKey) {
        res.status(400).json({
          error: "Clé API Gemini non configurée. Veuillez configurer GEMINI_API_KEY ou fournir une clé.",
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

      // Nettoyage éventuel du préfixe data:audio/...;base64,
      const cleanBase64 = audioBase64.replace(/^data:audio\/[a-zA-Z0-9.-]+;base64,/, "");

      const instructionsAndPrompt = `You are a native Kazakh senior linguist, professional speech-to-text expert, and certified Kazakh-to-English translator.

CRITICAL LINGUISTIC RULES FOR KAZAKH:
1. Transcription MUST strictly be in official Kazakh Cyrillic script (Қазақ кириллицасы).
2. Faithfully represent the 9 specific Kazakh letters: Әә, Ғғ, Ққ, Ңң, Өө, Ұұ, Үү, Һһ, Іі.
3. Never replace Kazakh letters with generic Russian counterparts (e.g. do NOT replace 'қ' with 'к', 'ғ' with 'г', 'ұ'/'ү' with 'у', 'і' with 'и').
4. Follow Kazakh vowel harmony (жуан және жіңішке дауыстылар).
5. Translate faithfully into fluent, idiomatic, natural English.
6. In 'notes', record linguistic observations: Russian code-switching/loanwords, dialectal features, audio quality.
7. Break down the speech into timed segments for subtitles (.SRT formatted timestamps 'HH:MM:SS,mmm').

TASK:
Analyze the attached Kazakh audio. Transcribe the spoken Kazakh speech exactly in original Kazakh Cyrillic script and translate it faithfully into English. Provide phonetic/linguistic notes and timestamped subtitle segments.`;

      const primaryModel = model || "gemini-2.5-flash";

      const generateOptions = {
        temperature: 0.2,
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

      const contents = [
        {
          inlineData: {
            mimeType: mimeType || "audio/mp3",
            data: cleanBase64,
          },
        },
        {
          text: instructionsAndPrompt,
        },
      ];

      let response;
      let lastErr: any = null;
      const modelToUse = "gemini-2.5-flash";

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: modelToUse,
            contents,
            config: generateOptions,
          });
          if (response?.text) {
            break;
          }
        } catch (callErr: any) {
          lastErr = callErr;
          console.warn(`Tentative ${attempt}/3 (${callErr?.message || callErr})`);
          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
          }
        }
      }

      if (!response) {
        throw lastErr || new Error("Échec de la génération avec l'API Gemini.");
      }

      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText);

      res.json({
        success: true,
        data: parsed,
      });
    } catch (err: any) {
      console.error("Transcription error:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Erreur lors du traitement avec l'API Gemini.",
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
