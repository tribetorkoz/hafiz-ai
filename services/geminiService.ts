import { GoogleGenAI, Type } from "@google/genai";
import { AISummary, RecitationResult } from '../types';

// Initialize Gemini using process.env.API_KEY as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateVerseInsight = async (surahName: string, ayahs: string[]): Promise<AISummary> => {
  if (!process.env.API_KEY) {
    return {
      tafseer: "يرجى إضافة مفتاح API (API_KEY) لتفعيل المساعد الذكي.",
      keywords: [],
      connection: ""
    };
  }

  const prompt = `
    أنت معلم قرآن خبير ومتميز.
    السورة: ${surahName}
    الآيات: ${ayahs.join(' ')}

    قم بتقديم ما يلي بتنسيق JSON:
    1. "tafseer": تفسير مبسط جداً وعميق يربط المعنى بالقلب ليسهل الحفظ (لا يتجاوز 40 كلمة).
    2. "keywords": قائمة بـ 3-5 كلمات مفتاحية صعبة أو محورية في الآيات لتثبيتها.
    3. "connection": جملة واحدة تربط هذه الآيات بما قبلها أو سياقها العام لمساعدة الذاكرة الترابطية.
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

export const generateQuiz = async (ayahText: string): Promise<{ question: string; options: string[]; answer: number }> => {
    if (!process.env.API_KEY) {
        return {
            question: "الرجاء تفعيل API_KEY",
            options: ["", "", "", ""],
            answer: 0
        };
    }

    const prompt = `
      النص القرآني: ${ayahText}
      
      قم بإنشاء سؤال "أكمل الآية" أو سؤال حول كلمة معينة في الآية لاختبار الحفظ.
      يجب أن يكون السؤال دقيقاً وصعباً قليلاً للمتقن.
      
      الرد JSON فقط:
      {
        "question": "نص السؤال",
        "options": ["خيار1", "خيار2", "خيار3", "خيار4"],
        "answer": index_of_correct_answer (0-3)
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
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    answer: { type: Type.INTEGER }
                  },
                  required: ["question", "options", "answer"]
                }
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
        }
    }
}

export const validateRecitation = async (ayahText: string, audioBase64: string): Promise<RecitationResult> => {
    if (!process.env.API_KEY) {
        return {
            isCorrect: false,
            score: 0,
            feedback: "يرجى تفعيل API_KEY",
            mistakes: []
        };
    }

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
                        Target Ayah Text: "${ayahText}"
                        
                        Task: Listen to the audio and compare it strictly to the Target Ayah Text.
                        Ignore minor Tajweed rules (like Ghunnah/Qalqalah levels) unless they change the meaning.
                        Focus heavily on: Missing words, Added words, Wrong vowels (Harakat) that change meaning, or completely wrong words.

                        Return a JSON object:
                        {
                          "isCorrect": boolean (true if the recitation is generally correct, false if major mistakes),
                          "score": number (0-100),
                          "feedback": string (Arabic text. Specific correction. E.g., "أحسنت" or "انتبه، نسيت كلمة 'العالمين'"),
                          "mistakes": string[] (Array of specific words from the Target Text that were missed or read wrong. IMPORTANT: Return the word exactly as written in the Target Text so I can highlight it.)
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

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        return JSON.parse(text) as RecitationResult;

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