import { GoogleGenAI, Type } from "@google/genai";
import { AISummary, RecitationResult } from '../types';

// استخدم المفتاح مباشرة
const ai = new GoogleGenAI({ apiKey: 'REDACTED_BY_FILTER_REPO' });

// =======================================
// توليد تفسير الآيات
// =======================================
export const generateVerseInsight = async (surahName: string, ayahs: string[]): Promise<AISummary> => {
  const prompt = `
    أنت معلم قرآن خبير ومتميز.
    السورة: ${surahName}
    الآيات: ${ayahs.join(' ')}

    قم بتقديم ما يلي بتنسيق JSON:
    {
      "tafseer": "تفسير مبسط جداً وعميق يربط المعنى بالقلب ليسهل الحفظ (لا يتجاوز 40 كلمة).",
      "keywords": ["كلمة1","كلمة2","كلمة3"],
      "connection": "جملة تربط الآيات بسياقها"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tafseer: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            connection: { type: Type.STRING }
          },
          required: ["tafseer", "keywords", "connection"]
        }
      }
    });

    console.log("Raw AI Response:", response.text);

    if (!response.text) throw new Error("No response from AI");
    return JSON.parse(response.text) as AISummary;

  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      tafseer: "تعذر الاتصال بالمساعد الذكي حالياً.",
      keywords: ["خطأ في الاتصال"],
      connection: "حاول مرة أخرى لاحقاً."
    };
  }
};

// =======================================
// توليد أسئلة حفظية
// =======================================
export const generateQuiz = async (ayahText: string): Promise<{ question: string; options: string[]; answer: number }> => {
  const prompt = `
    النص القرآني: ${ayahText}

    قم بإنشاء سؤال "أكمل الآية" أو سؤال حول كلمة معينة في الآية لاختبار الحفظ.
    الرد JSON فقط:
    {
      "question": "نص السؤال",
      "options": ["خيار1", "خيار2", "خيار3", "خيار4"],
      "answer": 0
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    console.log("Raw Quiz Response:", response.text);

    if (!response.text) throw new Error("No text");
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Quiz Error:", e);
    return {
      question: "حدث خطأ أثناء توليد السؤال",
      options: ["-", "-", "-", "-"],
      answer: 0
    };
  }
};

// =======================================
// التحقق من التسميع
// =======================================
export const validateRecitation = async (ayahText: string, audioBase64: string): Promise<RecitationResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "audio/wav", data: audioBase64 } },
          {
            text: `
            Act as a Quran Recitation Teacher.
            Target Ayah Text: "${ayahText}"

            Focus on: Missing words, Added words, Wrong vowels (Harakat) that change meaning.

            Return JSON:
            {
              "isCorrect": true,
              "score": 100,
              "feedback": "أحسنت",
              "mistakes": []
            }
            `
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            score: { type: Type.INTEGER },
            feedback: { type: Type.STRING },
            mistakes: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["isCorrect", "score", "feedback", "mistakes"]
        }
      }
    });

    console.log("Raw Recitation Response:", response.text);

    if (!response.text) throw new Error("No response from AI");
    return JSON.parse(response.text) as RecitationResult;

  } catch (error) {
    console.error("Recitation Error:", error);
    return {
      isCorrect: false,
      score: 0,
      feedback: "حدث خطأ في تحليل الصوت، حاول مرة أخرى بصوت أوضح.",
      mistakes: []
    };
  }
};
