# Kazakh Audio Transcriber & Translator (Streamlit + Google Gemini)

Application web de transcription audio en kazakh (alphabet cyrillique avec respect strict des caractères : `ә, ғ, қ, ң, ө, ұ, ү, һ, і`) et traduction fidèle en anglais avec le SDK officiel `google-genai` et le modèle `gemini-2.5-flash`.

---

## 📋 Prérequis

- **Python 3.10+**
- Une clé API Google Gemini valide ([Google AI Studio](https://aistudio.google.com/))

---

## 🚀 Commandes Bash pour lancer l'application en local

### 1. Cloner ou naviguer dans le dossier du projet
```bash
cd kazakh-audio-transcriber
```

### 2. Créer et activer un environnement virtuel
```bash
# Sur Linux / macOS
python3 -m venv venv
source venv/bin/activate

# Sur Windows (Command Prompt / PowerShell)
# python -m venv venv
# venv\Scripts\activate
```

### 3. Installer les dépendances
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Configurer la clé API Gemini

Vous pouvez soit définir la variable d'environnement dans votre terminal, soit saisir directement la clé dans l'interface graphique (barre latérale).

```bash
# Sur Linux / macOS
export GEMINI_API_KEY="votre_cle_api_ici"

# Sur Windows (cmd)
# set GEMINI_API_KEY=votre_cle_api_ici

# Sur Windows (PowerShell)
# $env:GEMINI_API_KEY="votre_cle_api_ici"
```

*(Optionnel)* Vous pouvez également créer un fichier `.env` à la racine contenant :
```env
GEMINI_API_KEY=votre_cle_api_ici
```

### 5. Lancer l'application Streamlit
```bash
streamlit run app.py
```

L'application s'ouvre automatiquement dans votre navigateur à l'adresse [http://localhost:8501](http://localhost:8501).

---

## ✨ Fonctionnalités implémentées

- **Téléversement audio** : Formats MP3, WAV, M4A, OGG, FLAC avec lecteur intégré.
- **Sécurité & conformité API Files** : Utilisation de `client.files.upload` pour l'envoi sécurisé et suppression systématique via `client.files.delete` dans un bloc `finally`.
- **Contrainte de schéma structuré JSON** (`response_mime_type="application/json"` et schéma Pydantic).
- **Affichage côte à côte** :
  - **Colonne 1** : Transcription en kazakh cyrillique avec compteur et validation des 9 lettres spécifiques (`ә`, `ғ`, `қ`, `ң`, `ө`, `ұ`, `ү`, `һ`, `і`).
  - **Colonne 2** : Traduction fidèle en anglais.
- **Notes linguistiques** : Analyse phonétique, détection de code-switching (mots d'emprunt russes) et qualité audio.
- **Exports directs** :
  - Format brut `.txt`
  - Sous-titres horodatés `.srt`
- **Gestion robuste des erreurs** : Erreurs d'API Gemini (quota, clé invalide), validation de schéma, formats inconnus.
