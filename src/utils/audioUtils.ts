import { AudioAnalysisResult, SubtitleSegment } from '../types';

export const KAZAKH_SPECIFIC_LETTERS = ['ә', 'ғ', 'қ', 'ң', 'ө', 'ұ', 'ү', 'һ', 'і'] as const;

export function countKazakhLetters(text: string): Record<string, number> {
  const lower = text.toLowerCase();
  const counts: Record<string, number> = {};
  for (const letter of KAZAKH_SPECIFIC_LETTERS) {
    counts[letter] = (lower.match(new RegExp(letter, 'g')) || []).length;
  }
  return counts;
}

export function formatSrtTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.round((seconds - Math.floor(seconds)) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

export function generateSrtContent(segments?: SubtitleSegment[], fullFallback = ''): string {
  if (segments && segments.length > 0) {
    return segments
      .map((seg, idx) => {
        return `${idx + 1}\n${seg.start_time} --> ${seg.end_time}\n${seg.kazakh_text}\n${seg.english_text}\n`;
      })
      .join('\n');
  }

  const sentences = fullFallback.split('.').map((s) => s.trim()).filter(Boolean);
  if (sentences.length === 0) return '';

  const durationPerSentence = 4;
  return sentences
    .map((sentence, idx) => {
      const start = idx * durationPerSentence;
      const end = start + durationPerSentence;
      return `${idx + 1}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${sentence}\n`;
    })
    .join('\n');
}

export function generateTxtContent(result: AudioAnalysisResult, filename: string): string {
  const sep = '='.repeat(60);
  return `${sep}
RAPPORT DE TRANSCRIPTION ET TRADUCTION AUDIO (KAZAKH -> ANGLAIS)
Fichier source : ${filename}
Moteur : Google Gemini API (google-genai / gemini-2.5-flash)
Date de génération : ${new Date().toISOString()}
${sep}

[1] TRANSCRIPTION ORIGINALE EN KAZAKH (CYRILLIQUE)
------------------------------------------------------------
${result.transcription}

[2] TRADUCTION FIDÈLE EN ANGLAIS
------------------------------------------------------------
${result.translation}

[3] NOTES LINGUISTIQUES & ANALYSE PHONÉTIQUE
------------------------------------------------------------
${result.notes || 'Aucune note particulière signalée.'}

${sep}
Fin du rapport.
`;
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
