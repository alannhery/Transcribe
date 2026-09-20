import React from 'react';
import { FileCode, Languages, Sparkles } from 'lucide-react';

interface NavbarProps {
  onOpenPythonModal: () => void;
  hasApiKey: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenPythonModal, hasApiKey }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                Kazakh Audio Transcriber & Translator
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-100 text-sky-800">
                Gemini 2.5 Flash
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Alphabet cyrillique kazakh (ә, ғ, қ, ң, ө, ұ, ү, һ, і) → Anglais fluide
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            <span
              className={`w-2 h-2 rounded-full ${
                hasApiKey ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span>{hasApiKey ? 'API Gemini Connectée' : 'Clé API Détectée'}</span>
          </div>

          <button
            id="open-python-modal-navbar-btn"
            onClick={onOpenPythonModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
          >
            <FileCode className="w-4 h-4 text-sky-400" />
            <span>Fichiers Python Streamlit</span>
          </button>
        </div>
      </div>
    </header>
  );
};
