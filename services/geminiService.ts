import { GoogleGenAI, Type } from "@google/genai";
import { AISummary, RecitationResult } from '../types';

// ضع مفتاحك هنا مباشرة
const ai = new GoogleGenAI({ apiKey: "REDACTED_BY_FILTER_REPO" });

export const generateVerseInsight = async (surahName: string, ayahs: string[]): Promise<AISummary> => {

  const prompt = `
    أنت معلم قرآن خبير ومتميز.
    السورة: ${surahName}
    الآيات: ${ayahs.join(' ')}

    قم بتقديم ما يلي بتنسيق JSON:
    1. "tafseer": تفسير مبسط جداً وعميق (<=40 كلمة).
    2. "keywords": قائمة من 3-5 كلمات.
    3. "connection": جملة تربط الآيات بسياقها العام.
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

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as AISummary;

  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      tafseer: "تعذر الاتصال بالمساعد الذكي حالياً.",
      keywords: ["خطأ في الاتصال"],
      connection: "حاول مرة أخرى لاحقاً."
    };
  }
};

export const generateQuiz = async (ayahText: string) => {

    const prompt = `
      النص القرآني: ${ayahText}
      
      أنشئ سؤالًا لاختبار الحفظ بصيغة JSON:
      {
        "question": "",
        "options": ["", "", "", ""],
        "answer": 0
      }
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        
        const text = response.text;
        if (!text) throw new Error("No text");
        return JSON.parse(text);

    } catch (e) {
        console.error(e);
        return {
             question: "حدث خطأ أثناء توليد السؤال",
             options: ["-", "-", "-", "-"],
             answer: 0
        };
    }
};

export const validateRecitation = async (ayahText: string, audioBase64: string): Promise<RecitationResult> => {

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: "audio/wav", 
                            data: audioBase64
                        }
                    },
                    {
                        text: `
                        Act as a Quran Recitation Teacher.
                        Target Ayah: "${ayahText}"

                        Return JSON:
                        {
                          "isCorrect": boolean,
                          "score": number,
                          "feedback": string,
                          "mistakes": string[]
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
                    }
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        return JSON.parse(text);

    } catch (error) {
        console.error("Recitation Error:", error);
        return {
            isCorrect: false,
            score: 0,
            feedback: "حدث خطأ في تحليل الصوت.",
            mistakes: []
        };
    }
};
