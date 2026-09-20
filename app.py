"""
Application Streamlit de Transcription & Traduction Audio Kazakh avec Google Gemini.
Auteur : Développeur Senior Spécialiste Google Gemini
SDK : google-genai (officiel)
Modèle : gemini-2.5-flash
"""

from __future__ import annotations

import io
import json
import logging
import os
import tempfile
from typing import Any, Dict, List, Optional

import streamlit as st
from pydantic import BaseModel, Field

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(message)s"
)
logger = logging.getLogger(__name__)

# Import du SDK officiel google-genai
try:
    from google import genai
    from google.genai import types
    from google.genai.errors import APIError
except ImportError:
    st.error(
        "❌ Le package `google-genai` n'est pas installé. "
        "Veuillez exécuter : `pip install google-genai`"
    )
    st.stop()


# ==============================================================================
# SCHÉMA DE DONNÉES TYPÉ (Pydantic)
# ==============================================================================
class SubtitleSegment(BaseModel):
    """Segment temporel pour la génération de sous-titres .SRT."""
    start_time: str = Field(
        description="Horodatage de début au format SRT 'HH:MM:SS,mmm', ex: '00:00:01,250'"
    )
    end_time: str = Field(
        description="Horodatage de fin au format SRT 'HH:MM:SS,mmm', ex: '00:00:04,800'"
    )
    kazakh_text: str = Field(
        description="Transcription exacte en alphabet cyrillique kazakh pour ce segment"
    )
    english_text: str = Field(
        description="Traduction fidèle en anglais pour ce segment"
    )


class AudioAnalysisResponse(BaseModel):
    """Schéma de réponse structurée pour l'analyse audio."""
    transcription: str = Field(
        description=(
            "Transcription intégrale et exacte en alphabet cyrillique kazakh original. "
            "Respecter scrupuleusement les 9 lettres spécifiques de l'alphabet kazakh : "
            "Ә, Ғ, Қ, Ң, Ө, Ұ, Ү, Һ, І (et leurs minuscules ә, ғ, қ, ң, ө, ұ, ү, һ, і)."
        )
    )
    translation: str = Field(
        description="Traduction fidèle, fluide et naturelle en anglais du texte kazakh."
    )
    notes: str = Field(
        description=(
            "Notes linguistiques détaillées : alternance de code (code-switching avec le russe), "
            "termes dialectaux, clarté phonétique ou remarques sur l'enregistrement."
        )
    )
    segments: Optional[List[SubtitleSegment]] = Field(
        default=None,
        description="Liste des segments temporels avec transcription et traduction pour sous-titres .SRT"
    )


# ==============================================================================
# CONSTANTES & UTILITAIRES
# ==============================================================================
KAZAKH_SPECIFIC_LETTERS = ["ә", "ғ", "қ", "ң", "ө", "ұ", "ү", "һ", "і"]
SUPPORTED_MIME_TYPES: Dict[str, str] = {
    "mp3": "audio/mp3",
    "wav": "audio/wav",
    "m4a": "audio/m4a",
    "ogg": "audio/ogg",
    "flac": "audio/flac",
}


def count_kazakh_letters(text: str) -> Dict[str, int]:
    """Compte l'occurrence des 9 lettres cyrilliques kazakhes spécifiques."""
    lower_text = text.lower()
    return {char: lower_text.count(char) for char in KAZAKH_SPECIFIC_LETTERS}


def format_srt_time(seconds: float) -> str:
    """Convertit des secondes en horodatage SRT standard (HH:MM:SS,mmm)."""
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"


def build_srt_content(segments: Optional[List[SubtitleSegment]], full_text_fallback: str) -> str:
    """Génère le contenu complet d'un fichier .SRT bilingue ou segmenté."""
    if segments and len(segments) > 0:
        srt_lines = []
        for idx, seg in enumerate(segments, start=1):
            srt_lines.append(f"{idx}")
            srt_lines.append(f"{seg.start_time} --> {seg.end_time}")
            srt_lines.append(seg.kazakh_text)
            srt_lines.append(seg.english_text)
            srt_lines.append("")
        return "\n".join(srt_lines)

    # Fallback si pas de découpage fin : découpage par phrases
    sentences = [s.strip() for s in full_text_fallback.split(".") if s.strip()]
    if not sentences:
        sentences = [full_text_fallback]

    srt_lines = []
    duration_per_sentence = 4.0
    for idx, sentence in enumerate(sentences, start=1):
        start = (idx - 1) * duration_per_sentence
        end = start + duration_per_sentence
        srt_lines.append(f"{idx}")
        srt_lines.append(f"{format_srt_time(start)} --> {format_srt_time(end)}")
        srt_lines.append(sentence)
        srt_lines.append("")

    return "\n".join(srt_lines)


def build_txt_export(result: AudioAnalysisResponse, filename: str) -> str:
    """Crée un fichier texte d'export propre et complet."""
    sep = "=" * 60
    return f"""{sep}
RAPPORT DE TRANSCRIPTION ET TRADUCTION AUDIO (KAZAKH -> ANGLAIS)
Fichier source : {filename}
Généré par Google Gemini API (google-genai)
{sep}

[1] TRANSCRIPTION ORIGINALE EN KAZAKH (CYRILLIQUE)
------------------------------------------------------------
{result.transcription}

[2] TRADUCTION FIDÈLE EN ANGLAIS
------------------------------------------------------------
{result.translation}

[3] NOTES LINGUISTIQUES & ANALYSE PHONÉTIQUE
------------------------------------------------------------
{result.notes}

{sep}
Fin du document.
"""


# ==============================================================================
# GESTION DU CLIENT GEMINI & APPELS API
# ==============================================================================
def get_gemini_client(api_key: Optional[str] = None) -> genai.Client:
    """Initialise et retourne une instance du client officiel google-genai."""
    resolved_key = api_key or os.environ.get("GEMINI_API_KEY")
    if not resolved_key:
        raise ValueError(
            "Clé API Gemini introuvable. Veuillez renseigner la variable d'environnement "
            "`GEMINI_API_KEY` ou la saisir dans la barre latérale."
        )
    return genai.Client(api_key=resolved_key)


def transcribe_and_translate_kazakh_audio(
    client: genai.Client,
    uploaded_file: Any,
    model_name: str = "gemini-2.5-flash"
) -> AudioAnalysisResponse:
    """
    Téléverse le fichier audio via l'API Files de Gemini, applique un prompt
    système strict pour la langue kazakhe avec contrainte de schéma JSON,
    puis supprime le fichier distant de manière sécurisée.
    """
    tmp_path: Optional[str] = None
    gemini_file = None

    try:
        # 1. Sauvegarde locale temporaire du fichier téléversé
        file_ext = uploaded_file.name.split(".")[-1].lower()
        mime_type = SUPPORTED_MIME_TYPES.get(file_ext, "audio/mpeg")

        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}") as tmp_file:
            tmp_file.write(uploaded_file.getbuffer())
            tmp_path = tmp_file.name

        logger.info(f"Fichier temporaire créé : {tmp_path} ({mime_type})")

        # 2. Téléversement via l'API Files de Gemini (client.files.upload)
        logger.info(f"Téléversement vers l'API Files Gemini en cours...")
        gemini_file = client.files.upload(
            file=tmp_path,
            mime_type=mime_type
        )
        logger.info(f"Fichier téléversé avec succès sur Gemini : {gemini_file.name}")

        # 3. Élaboration de la consigne linguistique ultra-précise pour le Kazakh
        instructions_and_prompt = (
            "You are a native Kazakh senior linguist, professional speech-to-text expert, "
            "and certified Kazakh-to-English translator.\n\n"
            "CRITICAL LINGUISTIC RULES FOR KAZAKH:\n"
            "1. Transcription MUST be in the official Kazakh Cyrillic script (Қазақ кириллицасы).\n"
            "2. Strictly preserve the 9 specific Kazakh letters: Әә, Ғғ, Ққ, Ңң, Өө, Ұұ, Үү, Һһ, Іі.\n"
            "3. NEVER substitute Kazakh letters with generic Russian Cyrillic counterparts "
            "(e.g., do NOT replace 'қ' with 'к', 'ғ' with 'г', 'ұ' or 'ү' with 'у', 'і' with 'и').\n"
            "4. Correctly represent vowel harmony (жуан және жіңішке дауыстылар).\n"
            "5. Translate faithfully and idiomatically into natural, modern English.\n"
            "6. In the 'notes' field, document any code-switching (e.g. Russian loanwords), "
            "slang, dialect features, speech tempo, or unclear audio sections.\n"
            "7. Segment the audio into timestamps if possible for subtitle synchronization.\n\n"
            "TASK:\n"
            "Analyze this audio recording carefully.\n"
            "1. Transcribe the spoken Kazakh speech exactly in original Kazakh Cyrillic.\n"
            "2. Translate the entire text into fluent and accurate English.\n"
            "3. Provide linguistic notes on pronunciation, code-switching, or recording artifacts.\n"
            "4. Break down into timed segments suitable for .SRT subtitles."
        )

        # 4. Inférence avec sortie structurée JSON (Pydantic / response_schema)
        logger.info(f"Génération du contenu avec le modèle {model_name}...")
        response = client.models.generate_content(
            model=model_name,
            contents=[gemini_file, instructions_and_prompt],
            config=types.GenerateContentConfig(
                temperature=0.2,  # Température basse pour une transcription fidèle
                response_mime_type="application/json",
                response_schema=AudioAnalysisResponse,
            )
        )

        # 5. Parsing et validation de la réponse JSON
        raw_json_text = response.text
        if not raw_json_text:
            raise ValueError("Le modèle Gemini a retourné une réponse vide.")

        parsed_data = json.loads(raw_json_text)
        analysis_result = AudioAnalysisResponse(**parsed_data)
        logger.info("Analyse et validation Pydantic réussies avec succès.")
        return analysis_result

    finally:
        # 6. Suppression propre du fichier distant sur Google AI Studio
        if gemini_file is not None:
            try:
                logger.info(f"Suppression du fichier distant sur Gemini : {gemini_file.name}")
                client.files.delete(name=gemini_file.name)
                logger.info("Fichier distant supprimé avec succès.")
            except Exception as exc:
                logger.warning(f"Impossible de supprimer le fichier distant {gemini_file.name}: {exc}")

        # 7. Suppression du fichier local temporaire
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
                logger.info(f"Fichier local temporaire {tmp_path} supprimé.")
            except OSError as exc:
                logger.warning(f"Erreur suppression fichier temporaire {tmp_path}: {exc}")


# ==============================================================================
# APPLICATION STREAMLIT (INTERFACE UTILISATEUR)
# ==============================================================================
def main() -> None:
    st.set_page_config(
        page_title="Kazakh Audio Transcriber & Translator",
        page_icon="🎙️",
        layout="wide",
        initial_sidebar_state="expanded"
    )

    # Style CSS discret et soigné
    st.markdown(
        """
        <style>
        .kazakh-box {
            background-color: #f8fafc;
            border-left: 4px solid #0284c7;
            padding: 1rem;
            border-radius: 0.5rem;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 1.05rem;
            line-height: 1.6;
        }
        .english-box {
            background-color: #f8fafc;
            border-left: 4px solid #10b981;
            padding: 1rem;
            border-radius: 0.5rem;
            font-size: 1.05rem;
            line-height: 1.6;
        }
        .stat-badge {
            display: inline-block;
            background: #e0f2fe;
            color: #0369a1;
            padding: 0.2rem 0.6rem;
            border-radius: 9999px;
            font-size: 0.85rem;
            font-weight: 600;
            margin: 0.2rem;
        }
        </style>
        """,
        unsafe_allow_html=True
    )

    # --------------------------------------------------------------------------
    # BARRE LATÉRALE : CONFIGURATION
    # --------------------------------------------------------------------------
    with st.sidebar:
        st.header("⚙️ Configuration")
        st.caption("Paramètres de l'API Google Gemini")

        env_api_key = os.environ.get("GEMINI_API_KEY", "")
        has_env_key = bool(env_api_key)

        api_key_input = st.text_input(
            "Clé API Google Gemini",
            value=env_api_key if has_env_key else "",
            type="password",
            help="Si vide, la variable d'environnement GEMINI_API_KEY sera utilisée.",
            placeholder="AIzaSy..."
        )

        if has_env_key and not api_key_input:
            st.success("✅ Clé détectée via variable d'environnement `GEMINI_API_KEY`")
        elif api_key_input:
            st.success("✅ Clé API configurée manuellement")
        else:
            st.warning("⚠️ Clé d'API requise pour lancer l'analyse.")

        st.divider()

        model_choice = st.selectbox(
            "Modèle Gemini",
            options=["gemini-2.5-flash", "gemini-1.5-flash"],
            index=0,
            help="gemini-2.5-flash est recommandé pour la rapidité et la haute précision audio."
        )

        st.markdown("### Caractères kazakhs vérifiés")
        st.write("`ә`, `ғ`, `қ`, `ң`, `ө`, `ұ`, `ү`, `һ`, `і`")

        st.divider()
        st.caption("Application propulsée par le SDK officiel `google-genai`.")

    # --------------------------------------------------------------------------
    # CONTENU PRINCIPAL
    # --------------------------------------------------------------------------
    st.title("🎙️ Kazakh Audio Transcriber & Translator")
    st.markdown(
        "Importez un fichier audio en **kazakh**, obtenez sa **transcription exacte** "
        "(alphabet cyrillique kazakh avec respect strict des caractères spécifiques) "
        "et sa **traduction fidèle en anglais** grâce à l'API Google Gemini."
    )

    # Zone de téléversement
    uploaded_audio = st.file_uploader(
        "Sélectionnez ou glissez un fichier audio kazakh",
        type=["mp3", "wav", "m4a", "ogg", "flac"],
        help="Formats pris en charge : MP3, WAV, M4A, OGG, FLAC (taille max recommandée : 20 Mo)"
    )

    if uploaded_audio is not None:
        col_audio, col_meta = st.columns([2, 1])
        with col_audio:
            st.audio(uploaded_audio)
        with col_meta:
            file_size_kb = len(uploaded_audio.getbuffer()) / 1024
            st.metric("Fichier", uploaded_audio.name)
            st.caption(f"Taille : {file_size_kb:.1f} Ko | Format : {uploaded_audio.type}")

        # Bouton d'action
        start_btn = st.button(
            "🚀 Lancer la transcription & traduction",
            type="primary",
            use_container_width=True
        )

        if start_btn:
            # Vérification de la clé API
            active_key = api_key_input.strip() or os.environ.get("GEMINI_API_KEY", "")
            if not active_key:
                st.error("❌ Erreur : Aucune clé API Gemini n'a été fournie.")
                st.stop()

            # Exécution de l'analyse avec barre de statut
            status_container = st.status("Traitement audio en cours avec Google Gemini...", expanded=True)

            try:
                # 1. Initialisation client
                status_container.write("1/4. Connexion au client Google Gemini...")
                client = get_gemini_client(api_key=active_key)

                # 2. Téléversement Files API
                status_container.write("2/4. Téléversement sécurisé via l'API Files Gemini...")

                # 3. Inférence & Transcription
                status_container.write(f"3/4. Inférence phonétique & traduction avec {model_choice}...")
                analysis_result = transcribe_and_translate_kazakh_audio(
                    client=client,
                    uploaded_file=uploaded_audio,
                    model_name=model_choice
                )

                # 4. Finalisation
                status_container.write("4/4. Analyse terminée et fichier distant nettoyé.")
                status_container.update(label="✅ Transcription & Traduction terminées !", state="complete", expanded=False)

                # Sauvegarde dans st.session_state pour éviter de perdre les résultats lors d'un re-render
                st.session_state["analysis_result"] = analysis_result
                st.session_state["analyzed_filename"] = uploaded_audio.name

            except APIError as api_err:
                status_container.update(label="❌ Erreur API Gemini", state="error")
                st.error(f"Une erreur est survenue lors de l'appel à l'API Gemini : {api_err}")
                st.stop()
            except ValueError as val_err:
                status_container.update(label="❌ Erreur de validation", state="error")
                st.error(str(val_err))
                st.stop()
            except Exception as exc:
                status_container.update(label="❌ Erreur inattendue", state="error")
                st.error(f"Erreur imprévue : {exc}")
                logger.exception("Erreur lors de l'exécution de l'analyse audio")
                st.stop()

    # --------------------------------------------------------------------------
    # AFFICHAGE DES RÉSULTATS (Session State)
    # --------------------------------------------------------------------------
    if "analysis_result" in st.session_state:
        res: AudioAnalysisResponse = st.session_state["analysis_result"]
        fname: str = st.session_state.get("analyzed_filename", "audio")

        st.divider()
        st.subheader("📊 Résultats de l'analyse")

        # Affichage côte à côte (deux colonnes)
        col1, col2 = st.columns(2)

        with col1:
            st.markdown("### 🇰🇿 Transcription en kazakh (cyrillique)")
            st.markdown(f'<div class="kazakh-box">{res.transcription}</div>', unsafe_allow_html=True)

            # Statistiques des lettres spécifiques kazakhes
            char_counts = count_kazakh_letters(res.transcription)
            total_kazakh_chars = sum(char_counts.values())
            st.caption(f"Lettres spécifiques kazakhes détectées : **{total_kazakh_chars}**")

            badge_html = "".join([
                f'<span class="stat-badge">{letter}: {count}</span>'
                for letter, count in char_counts.items() if count > 0
            ])
            if badge_html:
                st.markdown(badge_html, unsafe_allow_html=True)

        with col2:
            st.markdown("### 🇬🇧 Traduction fidèle en anglais")
            st.markdown(f'<div class="english-box">{res.translation}</div>', unsafe_allow_html=True)

        # Section notes linguistiques
        if res.notes:
            st.markdown("---")
            with st.expander("📝 Notes linguistiques et analyse phonétique", expanded=True):
                st.info(res.notes)

        # ----------------------------------------------------------------------
        # BOUTONS D'EXPORT (.TXT et .SRT)
        # ----------------------------------------------------------------------
        st.markdown("---")
        st.subheader("💾 Télécharger les résultats")

        col_exp1, col_exp2 = st.columns(2)

        # Export .TXT
        txt_content = build_txt_export(res, fname)
        base_name = os.path.splitext(fname)[0]
        with col_exp1:
            st.download_button(
                label="📄 Télécharger le texte brut (.txt)",
                data=txt_content,
                file_name=f"{base_name}_transcription_en.txt",
                mime="text/plain",
                use_container_width=True
            )

        # Export .SRT
        srt_content = build_srt_content(res.segments, res.transcription)
        with col_exp2:
            st.download_button(
                label="🎬 Télécharger les sous-titres (.srt)",
                data=srt_content,
                file_name=f"{base_name}_subtitles.srt",
                mime="application/x-subrip",
                use_container_width=True
            )


if __name__ == "__main__":
    main()
