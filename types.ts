export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean | any;
}

export interface QuranEditionResponse {
  code: number;
  status: string;
  data: {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    revelationType: string;
    numberOfAyahs: number;
    ayahs: Ayah[];
  };
}

export enum MemorizationLevel {
  FULL_TEXT = 0,     // Show everything
  DIMMED_WORDS = 1,  // Dim some words (visual cue)
  FIRST_LETTER = 2,  // Show only first letter of each word
  HIDDEN = 3,        // Completely hidden
}

export interface AISummary {
  tafseer: string;
  keywords: string[];
  connection: string;
}

export interface RecitationResult {
  isCorrect: boolean;
  score: number; // 0 to 100
  feedback: string;
  mistakes: string[]; // List of words missed or wrong
}

export interface Reciter {
  id: string;
  name: string;
  arabicName: string;
}