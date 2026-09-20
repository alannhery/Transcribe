export interface SubtitleSegment {
  start_time: string;
  end_time: string;
  kazakh_text: string;
  english_text: string;
}

export interface AudioAnalysisResult {
  transcription: string;
  translation: string;
  notes: string;
  segments?: SubtitleSegment[];
}

export interface SampleAudio {
  id: string;
  title: string;
  description: string;
  duration: string;
  audioUrl?: string;
  kazakhSampleText: string;
  englishTranslation: string;
  notes: string;
  segments: SubtitleSegment[];
}
