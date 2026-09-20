import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AudioUploader } from './components/AudioUploader';
import { ResultsViewer } from './components/ResultsViewer';
import { PythonModal } from './components/PythonModal';
import { AudioAnalysisResult, SampleAudio, EngineMode } from './types';
import { SAMPLE_AUDIO_ITEMS } from './data/samples';
import { AlertCircle, FileCode, Terminal, Sparkles, BookOpen, Check, RefreshCw, Cpu, ShieldCheck } from 'lucide-react';

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAudioUrl, setSelectedAudioUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [activeSample, setActiveSample] = useState<SampleAudio | null>(null);

  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [engineMode, setEngineMode] = useState<EngineMode>('local-whisper');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AudioAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resilienceNotice, setResilienceNotice] = useState<string | null>(null);

  const [isPythonModalOpen, setIsPythonModalOpen] = useState<boolean>(false);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.hasApiKey) setHasApiKey(true);
      })
      .catch((err) => console.error('Health check error:', err));
  }, []);

  const handleAudioSelected = (
    file: File | null,
    audioUrl: string | null,
    sample?: SampleAudio
  ) => {
    setErrorMessage(null);
    if (sample) {
      setActiveSample(sample);
      setSelectedFile(null);
      setSelectedAudioUrl(null);
      setSelectedFileName(`${sample.title.split('(')[0].trim()}.mp3`);
      // Pré-remplit directement pour aperçu immédiat
      setAnalysisResult({
        transcription: sample.kazakhSampleText,
        translation: sample.englishTranslation,
        notes: sample.notes,
        segments: sample.segments,
      });
    } else if (file) {
      setActiveSample(null);
      setSelectedFile(file);
      setSelectedAudioUrl(audioUrl);
      setSelectedFileName(file.name);
      setAnalysisResult(null);
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile && !activeSample) {
      setErrorMessage('Veuillez téléverser un fichier audio ou sélectionner un extrait kazakh.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      if (selectedFile) {
        // Convertir le fichier en Base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
        });
        reader.readAsDataURL(selectedFile);
        const audioBase64 = await base64Promise;

        const endpoint = engineMode === 'local-whisper' ? '/api/local-transcribe' : '/api/transcribe';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64,
            mimeType: selectedFile.type || 'audio/mp3',
            model: selectedModel,
            engine: engineMode,
          }),
        });

        const data = await response.json();

        if (!data.success) {
          setErrorMessage(data.error || 'Erreur lors de la transcription audio.');
          return;
        }

        const enrichedResult: AudioAnalysisResult = {
          ...data.data,
          engine: data.engine || engineMode,
        };

        setAnalysisResult(enrichedResult);
        setErrorMessage(null);
        if (data.isResilienceMode && data.resilienceNotice) {
          setResilienceNotice(data.resilienceNotice);
        } else {
          setResilienceNotice(null);
        }
      } else if (activeSample) {
        // Simulation avec le sample
        await new Promise((resolve) => setTimeout(resolve, 600));
        setAnalysisResult({
          transcription: activeSample.kazakhSampleText,
          translation: activeSample.englishTranslation,
          notes: activeSample.notes,
          segments: activeSample.segments,
          engine: engineMode,
        });
        setErrorMessage(null);
        setResilienceNotice(null);
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Une erreur est survenue lors de l\'analyse audio.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <Navbar
        onOpenPythonModal={() => setIsPythonModalOpen(true)}
        hasApiKey={hasApiKey}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* En-tête avec présentation et bouton direct pour les fichiers Python */}
        <div className="bg-gradient-to-r from-sky-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold border border-sky-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Google Gemini API • google-genai • Cyrillique Kazakh</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Transcription exacte en Kazakh & Traduction fidèle en Anglais
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Moteur spécialisé respectant scrupuleusement les 9 lettres spécifiques de l'alphabet cyrillique kazakh :
              <span className="font-mono text-sky-300 font-bold ml-1.5">ә, ғ, қ, ң, ө, ұ, ү, һ, і</span>.
              Génère une traduction anglaise fluide, des notes d'alternance linguistique (russe/kazakh) et des sous-titres <code className="text-sky-300 bg-sky-950/50 px-1.5 py-0.5 rounded">.SRT</code>.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                id="hero-open-python-modal-btn"
                onClick={() => setIsPythonModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs sm:text-sm rounded-lg shadow-sm transition-all"
              >
                <FileCode className="w-4 h-4" />
                Voir les fichiers Python (app.py & requirements.txt)
              </button>
            </div>
          </div>
        </div>

        {/* Message d'erreur s'il y en a */}
        {errorMessage && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Information d'analyse</p>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                id="retry-analysis-btn"
                onClick={() => handleStartAnalysis()}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                <span>Réessayer</span>
              </button>
              <button
                id="load-sample-fallback-btn"
                onClick={() => {
                  const firstSample = SAMPLE_AUDIO_ITEMS[0];
                  setActiveSample(firstSample);
                  setSelectedFile(null);
                  setErrorMessage(null);
                  setAnalysisResult({
                    transcription: firstSample.kazakhSampleText,
                    translation: firstSample.englishTranslation,
                    notes: firstSample.notes,
                    segments: firstSample.segments,
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-medium transition-colors"
              >
                <span>Voir un exemple kazakh</span>
              </button>
              <button
                id="dismiss-error-btn"
                onClick={() => setErrorMessage(null)}
                className="p-1 text-amber-600 hover:text-amber-800 rounded-md transition-colors"
                title="Fermer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Composant de téléversement et contrôle audio */}
        <AudioUploader
          onAudioSelected={handleAudioSelected}
          selectedAudioUrl={selectedAudioUrl}
          selectedFileName={selectedFileName}
          isAnalyzing={isAnalyzing}
          onStartAnalysis={handleStartAnalysis}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          engineMode={engineMode}
          onEngineModeChange={setEngineMode}
        />

        {/* Bannière d'information de résilience si le quota API gratuit est saturé */}
        {resilienceNotice && (
          <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-sky-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse shrink-0" />
              <p className="font-medium leading-relaxed">{resilienceNotice}</p>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={() => handleStartAnalysis()}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-xs font-semibold transition-colors"
                title="Tenter une nouvelle requête vers Google Gemini"
              >
                <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                <span>Réanalyser via Gemini</span>
              </button>
              <button
                onClick={() => setResilienceNotice(null)}
                className="text-sky-700 hover:text-sky-950 px-1.5 py-1 rounded text-xs font-medium"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Résultats côte à côte */}
        {analysisResult && (
          <ResultsViewer
            result={analysisResult}
            filename={selectedFileName || 'kazakh_audio.mp3'}
          />
        )}

        {/* Guide linguistique kazakh */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-sky-600" />
            Spécificités linguistiques kazakhes prises en charge
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <h4 className="font-semibold text-slate-800 mb-1">Alphabet cyrillique kazakh</h4>
              <p>
                Strict respect des 9 graphèmes spécifiques : <strong>Әә, Ғғ, Ққ, Ңң, Өө, Ұұ, Үү, Һһ, Іі</strong>. Aucune substitution par des caractères russes génériques.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <h4 className="font-semibold text-slate-800 mb-1">Harmonie vocalique (Үндестік)</h4>
              <p>
                Conservation rigoureuse des voyelles dures (жуан) et douces (жіңішке) pour une transcription fidèle de la prononciation locale.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <h4 className="font-semibold text-slate-800 mb-1">Alternance de code (Code-Switching)</h4>
              <p>
                Identification et documentation dans les notes des emprunts au russe et de l'adaptation aux suffixes casuels kazakhs.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Kazakh Audio Transcriber & Translator • Google Gemini API (google-genai)</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPythonModalOpen(true)}
              className="text-sky-600 hover:text-sky-800 font-medium"
            >
              Code Python app.py
            </button>
            <span>•</span>
            <span>gemini-2.5-flash</span>
          </div>
        </div>
      </footer>

      {/* Modal affichant les fichiers Python */}
      <PythonModal
        isOpen={isPythonModalOpen}
        onClose={() => setIsPythonModalOpen(false)}
      />
    </div>
  );
}
