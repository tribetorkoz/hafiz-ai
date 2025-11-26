import { Surah, QuranEditionResponse, Reciter } from '../types';

const BASE_URL = 'https://api.alquran.cloud/v1';

export const getAllSurahs = async (): Promise<Surah[]> => {
  try {
    const response = await fetch(`${BASE_URL}/surah`);
    const data = await response.json();
    if (data.code === 200) {
      return data.data;
    }
    throw new Error('Failed to fetch surahs');
  } catch (error) {
    console.error('Error fetching surahs:', error);
    return [];
  }
};

export const getSurahDetails = async (surahNumber: number): Promise<QuranEditionResponse['data'] | null> => {
  try {
    // Fetching Uthmani script
    const response = await fetch(`${BASE_URL}/surah/${surahNumber}/editions/quran-uthmani`);
    const data = await response.json();
    if (data.code === 200 && data.data && data.data.length > 0) {
      return data.data[0];
    }
    throw new Error('Failed to fetch surah details');
  } catch (error) {
    console.error('Error fetching surah details:', error);
    return null;
  }
};

export const RECITERS: Reciter[] = [
  { id: 'ar.alafasy', name: 'Alafasy', arabicName: 'مشاري العفاسي' },
  { id: 'ar.muhammadayyoub', name: 'Muhammad Ayyub', arabicName: 'محمد أيوب' },
];

export const getAyahAudioUrl = (reciterId: string, ayahGlobalNumber: number): string => {
  return `https://cdn.islamic.network/quran/audio/128/${reciterId}/${ayahGlobalNumber}.mp3`;
};