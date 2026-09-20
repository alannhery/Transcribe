import React, { useState } from 'react';
import { Download, Copy, Check, Info, FileText, Film, Layers, CheckCircle2 } from 'lucide-react';
import { AudioAnalysisResult } from '../types';
import {
  countKazakhLetters,
  generateSrtContent,
  generateTxtContent,
  downloadTextFile,
  KAZAKH_SPECIFIC_LETTERS,
} from '../utils/audioUtils';

interface ResultsViewerProps {
  result: AudioAnalysisResult;
  filename: string;
}

export const ResultsViewer: React.FC<ResultsViewerProps> = ({ result, filename }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showSegments, setShowSegments] = useState<boolean>(true);

  const charCounts = countKazakhLetters(result.transcription);
  const totalKazakhLetters = Object.values(charCounts).reduce((a, b) => a + b, 0);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleDownloadTxt = () => {
    const baseName = filename.replace(/\.[^/.]+$/, '') || 'kazakh_transcription';
    const content = generateTxtContent(result, filename);
    downloadTextFile(`${baseName}_transcript_en.txt`, content, 'text/plain');
  };

  const handleDownloadSrt = () => {
    const baseName = filename.replace(/\.[^/.]+$/, '') || 'kazakh_transcription';
    const content = generateSrtContent(result.segments, result.transcription);
    downloadTextFile(`${baseName}_subtitles.srt`, content, 'application/x-subrip');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            2. Résultats de l'analyse & Traduction
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Généré avec contrainte stricte de cyrillique kazakh et traduction fluide en anglais
          </p>
        </div>

        {/* Boutons d'export */}
        <div className="flex items-center gap-2">
          <button
            id="export-txt-btn"
            onClick={handleDownloadTxt}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition-colors border border-slate-200"
          >
            <FileText className="w-3.5 h-3.5 text-sky-600" />
            Télécharger .TXT
          </button>
          <button
            id="export-srt-btn"
            onClick={handleDownloadSrt}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium rounded-lg transition-colors shadow-xs"
          >
            <Film className="w-3.5 h-3.5" />
            Télécharger .SRT
          </button>
        </div>
      </div>

      {/* Colonnes côte à côte */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Colonne 1 : Transcription en Kazakh */}
        <div className="flex flex-col bg-sky-50/40 border border-sky-100 rounded-xl p-5 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🇰🇿</span>
              <h3 className="text-sm font-semibold text-slate-900">
                Transcription en kazakh (cyrillique)
              </h3>
            </div>
            <button
              id="copy-kazakh-btn"
              onClick={() => handleCopy(result.transcription, 'kazakh')}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-white transition-colors"
              title="Copier la transcription"
            >
              {copiedSection === 'kazakh' ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex-1 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-sans bg-white p-4 rounded-lg border border-sky-100/80 shadow-2xs">
            {result.transcription}
          </div>

          {/* Validation des 9 lettres spécifiques kazakhes */}
          <div className="mt-4 pt-3 border-t border-sky-100">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
              <span className="font-medium">Caractères spécifiques kazakhs détectés :</span>
              <span className="font-bold text-sky-700">{totalKazakhLetters} occurrence(s)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {KAZAKH_SPECIFIC_LETTERS.map((letter) => {
                const count = charCounts[letter] || 0;
                return (
                  <span
                    key={letter}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono transition-colors ${
                      count > 0
                        ? 'bg-sky-200/70 text-sky-900 font-semibold'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <span>{letter}</span>
                    <span className="text-[10px] opacity-75">{count}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Colonne 2 : Traduction en Anglais */}
        <div className="flex flex-col bg-emerald-50/40 border border-emerald-100 rounded-xl p-5 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🇬🇧</span>
              <h3 className="text-sm font-semibold text-slate-900">
                Traduction fidèle en anglais
              </h3>
            </div>
            <button
              id="copy-english-btn"
              onClick={() => handleCopy(result.translation, 'english')}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-white transition-colors"
              title="Copier la traduction"
            >
              {copiedSection === 'english' ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex-1 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-sans bg-white p-4 rounded-lg border border-emerald-100/80 shadow-2xs">
            {result.translation}
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs text-slate-500">
            <span>Anglais fluide, naturel et idiomatique</span>
            <span className="text-emerald-700 font-medium">Prêt pour sous-titres ou publication</span>
          </div>
        </div>
      </div>

      {/* Notes linguistiques */}
      {result.notes && (
        <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs mb-1.5">
            <Info className="w-4 h-4 text-amber-700" />
            Notes linguistiques & analyse phonétique
          </div>
          <p className="text-xs text-amber-950/90 leading-relaxed whitespace-pre-wrap">
            {result.notes}
          </p>
        </div>
      )}

      {/* Segments temporels pour sous-titres .SRT */}
      {result.segments && result.segments.length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowSegments(!showSegments)}
            className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between text-left hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-semibold text-slate-800">
                Aperçu des segments sous-titres ({result.segments.length} segments horodatés)
              </span>
            </div>
            <span className="text-xs text-sky-600 font-medium">
              {showSegments ? 'Masquer' : 'Afficher'}
            </span>
          </button>

          {showSegments && (
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {result.segments.map((seg, idx) => (
                <div key={idx} className="p-3 text-xs flex flex-col sm:flex-row gap-3 hover:bg-slate-50/50">
                  <div className="font-mono text-slate-400 shrink-0 sm:w-36">
                    {seg.start_time} → {seg.end_time}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-slate-900">{seg.kazakh_text}</p>
                    <p className="text-slate-600 italic">{seg.english_text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
