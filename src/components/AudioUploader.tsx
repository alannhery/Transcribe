import React, { useState, useRef } from 'react';
import { Upload, Mic, Square, FileAudio, Play, Pause, Sparkles, Volume2, Music } from 'lucide-react';
import { SAMPLE_AUDIO_ITEMS } from '../data/samples';
import { SampleAudio } from '../types';

interface AudioUploaderProps {
  onAudioSelected: (file: File | null, audioUrl: string | null, sample?: SampleAudio) => void;
  selectedAudioUrl: string | null;
  selectedFileName: string | null;
  isAnalyzing: boolean;
  onStartAnalysis: () => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onAudioSelected,
  selectedAudioUrl,
  selectedFileName,
  isAnalyzing,
  onStartAnalysis,
  selectedModel,
  onModelChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onAudioSelected(file, url);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/ogg', 'audio/flac', 'audio/mp3'].some(t => file.type.includes('audio') || file.name.match(/\.(mp3|wav|m4a|ogg|flac)$/i))) {
      const url = URL.createObjectURL(file);
      onAudioSelected(file, url);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `kazakh_recording_${Date.now()}.webm`, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        onAudioSelected(audioFile, url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Erreur accès microphone:', err);
      alert('Impossible d\'accéder au microphone. Veuillez vérifier les permissions de votre navigateur.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const selectSample = (sample: SampleAudio) => {
    // Crée un blob audio synthétique avec oscillateur ou simple fichier audio
    onAudioSelected(null, null, sample);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-sky-600" />
            1. Téléverser ou enregistrer un audio en kazakh
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Formats acceptés : MP3, WAV, M4A, OGG, FLAC (analyse phonétique cyrillique kazakhe)
          </p>
        </div>

        {/* Choix du modèle */}
        <div className="flex items-center gap-2">
          <label htmlFor="model-select" className="text-xs font-medium text-slate-600">
            Modèle Gemini :
          </label>
          <select
            id="model-select"
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
          >
            <option value="gemini-2.5-flash">gemini-2.5-flash (Recommandé)</option>
            <option value="gemini-3.5-flash">gemini-3.5-flash</option>
          </select>
        </div>
      </div>

      {/* Zone de Drag & Drop */}
      <div
        id="audio-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-sky-500 bg-sky-50/50'
            : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="audio-file-input"
          accept=".mp3,.wav,.m4a,.ogg,.flac,audio/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-3">
          <Upload className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-slate-800">
          Glissez-déposez votre fichier audio kazakh ici, ou <span className="text-sky-600 underline">parcourir</span>
        </p>
        <p className="text-xs text-slate-400 mt-1">
          MP3, WAV, M4A, OGG, FLAC jusqu'à 50 Mo
        </p>
      </div>

      {/* Enregistrement Micro & Échantillons rapides */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {!isRecording ? (
            <button
              id="start-mic-btn"
              type="button"
              onClick={startRecording}
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
            >
              <Mic className="w-4 h-4 text-rose-500" />
              Enregistrer avec le micro
            </button>
          ) : (
            <button
              id="stop-mic-btn"
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center gap-2 px-3 py-2 bg-rose-600 text-white text-xs font-medium rounded-lg animate-pulse transition-colors"
            >
              <Square className="w-4 h-4" />
              Arrêter l'enregistrement ({recordSeconds}s)
            </button>
          )}
        </div>

        {/* Échantillons kazakhs intégrés */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Échantillons prêts à tester :</span>
          {SAMPLE_AUDIO_ITEMS.map((sample) => (
            <button
              key={sample.id}
              id={`sample-${sample.id}-btn`}
              type="button"
              onClick={() => selectSample(sample)}
              className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-md font-medium transition-colors"
            >
              {sample.title.split('(')[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Lecteur et sélection active */}
      {(selectedAudioUrl || selectedFileName) && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-600 text-white flex items-center justify-center">
              <FileAudio className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">
                {selectedFileName || 'Fichier audio prêt pour l\'analyse'}
              </p>
              <p className="text-[11px] text-slate-500">Prêt pour envoi sécurisé vers Google AI Studio</p>
            </div>
          </div>

          {selectedAudioUrl && (
            <audio controls src={selectedAudioUrl} className="h-9 max-w-xs" />
          )}

          <button
            id="launch-analysis-btn"
            type="button"
            disabled={isAnalyzing}
            onClick={onStartAnalysis}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all ${
              isAnalyzing
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-700 text-white active:scale-98'
            }`}
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                Analyse & Traduction en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Lancer la transcription & traduction
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
