import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Download, Terminal, FileCode, CheckCircle2 } from 'lucide-react';
import { downloadTextFile } from '../utils/audioUtils';

interface PythonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PythonModal: React.FC<PythonModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'app' | 'requirements' | 'bash'>('app');
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [appPyCode, setAppPyCode] = useState<string>('');
  const [requirementsCode, setRequirementsCode] = useState<string>('');

  useEffect(() => {
    fetch('/api/python-files')
      .then((res) => res.json())
      .then((data) => {
        if (data.appPy) setAppPyCode(data.appPy);
        if (data.requirements) setRequirementsCode(data.requirements);
      })
      .catch((err) => console.error('Erreur chargement code Python:', err));
  }, []);

  if (!isOpen) return null;

  const bashCommands = `# 1. Cloner ou créer le dossier du projet
mkdir kazakh-audio-transcriber && cd kazakh-audio-transcriber

# 2. Créer et activer un environnement virtuel Python
python3 -m venv venv
source venv/bin/activate  # Sur Windows: venv\\Scripts\\activate

# 3. Installer les dépendances officielles
pip install --upgrade pip
pip install -r requirements.txt

# 4. Exporter la clé API Gemini
export GEMINI_API_KEY="votre_cle_api_ici"  # Sur Windows: set GEMINI_API_KEY=votre_cle

# 5. Lancer l'application Streamlit
streamlit run app.py`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(id);
    setTimeout(() => setCopiedTab(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Code Source Python (Streamlit + google-genai)
              </h2>
              <p className="text-xs text-slate-500">
                Fichiers prêts pour la production demandés dans votre spécification
              </p>
            </div>
          </div>
          <button
            id="close-python-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-6 gap-2 pt-2">
          <button
            id="tab-app-py-btn"
            onClick={() => setActiveTab('app')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'app'
                ? 'bg-white text-sky-700 border-sky-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <FileCode className="w-4 h-4" />
            app.py
          </button>
          <button
            id="tab-requirements-btn"
            onClick={() => setActiveTab('requirements')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'requirements'
                ? 'bg-white text-sky-700 border-sky-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <FileCode className="w-4 h-4" />
            requirements.txt
          </button>
          <button
            id="tab-bash-btn"
            onClick={() => setActiveTab('bash')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'bash'
                ? 'bg-white text-sky-700 border-sky-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Terminal className="w-4 h-4" />
            Commandes Bash
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-slate-950 font-mono text-xs text-slate-200 relative">
          {activeTab === 'app' && (
            <div>
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800 text-slate-400">
                <span>app.py (Streamlit UI, API Files, suppression auto, Pydantic schema)</span>
                <div className="flex items-center gap-2">
                  <button
                    id="copy-app-py-btn"
                    onClick={() => handleCopy(appPyCode, 'app')}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors"
                  >
                    {copiedTab === 'app' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copier
                      </>
                    )}
                  </button>
                  <button
                    id="download-app-py-btn"
                    onClick={() => downloadTextFile('app.py', appPyCode, 'text/x-python')}
                    className="flex items-center gap-1.5 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors font-sans font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger app.py
                  </button>
                </div>
              </div>
              <pre className="whitespace-pre overflow-x-auto leading-relaxed text-slate-300">
                {appPyCode || '# Chargement du fichier app.py...'}
              </pre>
            </div>
          )}

          {activeTab === 'requirements' && (
            <div>
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800 text-slate-400">
                <span>requirements.txt (Dépendances Python officielles)</span>
                <div className="flex items-center gap-2">
                  <button
                    id="copy-requirements-btn"
                    onClick={() => handleCopy(requirementsCode, 'req')}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors"
                  >
                    {copiedTab === 'req' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copier
                      </>
                    )}
                  </button>
                  <button
                    id="download-requirements-btn"
                    onClick={() => downloadTextFile('requirements.txt', requirementsCode, 'text/plain')}
                    className="flex items-center gap-1.5 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors font-sans font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger requirements.txt
                  </button>
                </div>
              </div>
              <pre className="whitespace-pre overflow-x-auto leading-relaxed text-emerald-300 text-sm">
                {requirementsCode || 'streamlit>=1.35.0\ngoogle-genai>=1.0.0\npydantic>=2.0.0\npython-dotenv>=1.0.0'}
              </pre>
            </div>
          )}

          {activeTab === 'bash' && (
            <div>
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800 text-slate-400">
                <span>Commandes terminal pour lancement local</span>
                <button
                  id="copy-bash-btn"
                  onClick={() => handleCopy(bashCommands, 'bash')}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors"
                >
                  {copiedTab === 'bash' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copié !
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copier les commandes
                    </>
                  )}
                </button>
              </div>
              <pre className="whitespace-pre overflow-x-auto leading-relaxed text-amber-300 text-sm">
                {bashCommands}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Fichiers prêts pour exécution locale ou déploiement sur Streamlit Cloud</span>
          </div>
          <button
            id="modal-ok-btn"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-md transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
