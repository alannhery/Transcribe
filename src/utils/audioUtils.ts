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

export function generateSampleWavBlob(durationSeconds = 3): Blob {
  const sampleRate = 16000;
  const numSamples = sampleRate * durationSeconds;
  const dataByteLength = numSamples * 2;
  const totalByteLength = 44 + dataByteLength;

  const buffer = new ArrayBuffer(totalByteLength);
  const view = new DataView(buffer);

  // RIFF chunk
  view.setUint32(0, 0x52494646, false); // 'RIFF'
  view.setUint32(4, 36 + dataByteLength, true);
  view.setUint32(8, 0x57415645, false); // 'WAVE'

  // 'fmt ' chunk
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  // 'data' chunk
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, dataByteLength, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const f0 = 150 + 10 * Math.sin(2 * Math.PI * 1.5 * t);
    const wave =
      0.6 * Math.sin(2 * Math.PI * f0 * t) +
      0.3 * Math.sin(2 * Math.PI * f0 * 2 * t) +
      0.15 * Math.sin(2 * Math.PI * f0 * 3 * t);
    const cadence = Math.sin(2 * Math.PI * 2.2 * t);
    const env = Math.max(0, cadence);
    const sampleVal = Math.max(-32768, Math.min(32767, Math.round(wave * env * 10000)));
    view.setInt16(44 + i * 2, sampleVal, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export function generateSampleWavBlobUrl(durationSeconds = 3): string {
  const blob = generateSampleWavBlob(durationSeconds);
  return URL.createObjectURL(blob);
}
