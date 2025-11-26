import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Surah, QuranEditionResponse, MemorizationLevel, AISummary, RecitationResult, Reciter } from './types';
import { getAllSurahs, getSurahDetails, RECITERS, getAyahAudioUrl } from './services/quranService';
import { generateVerseInsight, generateQuiz, validateRecitation } from './services/geminiService';
import AyahCard from './components/AyahCard';
import ControlPanel from './components/ControlPanel';
import { Search, Book, X, Trophy, BrainCircuit, Menu, RotateCcw, CheckCircle, AlertTriangle, ChevronLeft, Mic, UserCircle } from 'lucide-react';

const App: React.FC = () => {
  // Data State
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [filteredSurahs, setFilteredSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [surahData, setSurahData] = useState<QuranEditionResponse['data'] | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI State
  const [loading, setLoading] = useState<boolean>(false);
  const [activeAyahIndex, setActiveAyahIndex] = useState<number>(0);
  const [level, setLevel] = useState<MemorizationLevel>(MemorizationLevel.FULL_TEXT);
  const [showSurahDrawer, setShowSurahDrawer] = useState<boolean>(false);
  const [activeReciter, setActiveReciter] = useState<Reciter>(RECITERS[0]);
  
  // AI & Results State
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiInsight, setAiInsight] = useState<AISummary | null>(null);
  const [showInsightModal, setShowInsightModal] = useState<boolean>(false);
  const [quizData, setQuizData] = useState<{question: string, options: string[], answer: number} | null>(null);
  const [showQuizModal, setShowQuizModal] = useState<boolean>(false);
  const [quizResult, setQuizResult] = useState<string | null>(null);
  
  // Recitation Result State
  const [recitationResults, setRecitationResults] = useState<Record<number, RecitationResult>>({});

  // Audio/Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0); // 0 to 100
  const [showRecitationModal, setShowRecitationModal] = useState<boolean>(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const activeAyahRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Memorization Progress Calculation
  const memorizationProgress = useMemo(() => {
    if (!surahData) return 0;
    const total = surahData.ayahs.length;
    if (total === 0) return 0;
    
    const correctCount = surahData.ayahs.reduce((acc, ayah) => {
        return acc + (recitationResults[ayah.number]?.isCorrect ? 1 : 0);
    }, 0);
    
    return Math.round((correctCount / total) * 100);
  }, [surahData, recitationResults]);

  // Initial Fetch
  useEffect(() => {
    const fetchSurahs = async () => {
      const list = await getAllSurahs();
      setSurahs(list);
      setFilteredSurahs(list);
    };
    fetchSurahs();
  }, []);

  // Filter logic
  useEffect(() => {
    if (searchTerm === '') {
        setFilteredSurahs(surahs);
    } else {
        setFilteredSurahs(surahs.filter(s => s.name.includes(searchTerm) || s.englishName.toLowerCase().includes(searchTerm.toLowerCase())));
    }
  }, [searchTerm, surahs]);

  // Scroll active ayah into view
  useEffect(() => {
      if (activeAyahRef.current) {
          activeAyahRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  }, [activeAyahIndex]);

  // Cleanup audio
  useEffect(() => {
      return () => {
          stopAudio();
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
  }, [selectedSurah, activeReciter]);

  const stopAudio = () => {
      if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
          audioPlayerRef.current = null;
      }
      setIsPlayingAudio(false);
      setAudioProgress(0);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  };

  const updateProgress = () => {
      if (audioPlayerRef.current) {
          const { currentTime, duration } = audioPlayerRef.current;
          if (duration) {
              setAudioProgress((currentTime / duration) * 100);
          }
          animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
  };

  const toggleAudio = () => {
    if (!surahData || activeAyahIndex >= surahData.ayahs.length) return;

    if (isPlayingAudio) {
        stopAudio();
    } else {
        const ayahNumber = surahData.ayahs[activeAyahIndex].number;
        const audioUrl = getAyahAudioUrl(activeReciter.id, ayahNumber);
        
        stopAudio(); // Ensure clean state

        audioPlayerRef.current = new Audio(audioUrl);
        const player = audioPlayerRef.current;
        player.preload = 'auto';
        
        player.onended = () => {
            setIsPlayingAudio(false);
            setAudioProgress(100);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            // Optional: Auto-play next could go here
        };

        player.onerror = (e) => {
            console.error("Audio error", e);
            setIsPlayingAudio(false);
            alert("حدث خطأ في تحميل التلاوة.");
        };

        player.play().then(() => {
            setIsPlayingAudio(true);
            updateProgress();
        }).catch(console.error);
    }
  };


  // Fetch Surah Details
  const handleSurahSelect = async (surah: Surah) => {
    setSelectedSurah(surah);
    setShowSurahDrawer(false);
    setLoading(true);
    setAiInsight(null);
    setRecitationResults({});
    stopAudio();
    
    const data = await getSurahDetails(surah.number);
    setSurahData(data);
    setActiveAyahIndex(0);
    setLoading(false);
    setSearchTerm('');
  };

  // AI Functions
  const handleGetInsight = async () => {
    if (!surahData) return;
    const start = Math.max(0, activeAyahIndex - 1);
    const end = Math.min(surahData.ayahs.length, activeAyahIndex + 2);
    const contextAyahs = surahData.ayahs.slice(start, end).map(a => a.text);

    setAiLoading(true);
    const insight = await generateVerseInsight(surahData.name, contextAyahs);
    setAiInsight(insight);
    setAiLoading(false);
    setShowInsightModal(true);
  };

  const handleGetQuiz = async () => {
     if(!surahData) return;
     setAiLoading(true);
     const currentAyah = surahData.ayahs[activeAyahIndex].text;
     const quiz = await generateQuiz(currentAyah);
     setQuizData(quiz);
     setQuizResult(null);
     setAiLoading(false);
     setShowQuizModal(true);
  }

  const handleQuizAnswer = (index: number) => {
      if(!quizData) return;
      if (index === quizData.answer) {
          setQuizResult('correct');
          setTimeout(() => {
              setShowQuizModal(false);
              setQuizResult(null);
          }, 1500);
      } else {
          setQuizResult('wrong');
      }
  }

  // Recitation
  const startRecording = async () => {
    try {
      if (isPlayingAudio) stopAudio();

      setLevel(MemorizationLevel.HIDDEN);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); 
        stream.getTracks().forEach(track => track.stop());
        await processRecitation(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("يرجى السماح باستخدام الميكروفون.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => isRecording ? stopRecording() : startRecording();

  const processRecitation = async (audioBlob: Blob) => {
    if (!surahData) return;
    
    setAiLoading(true);
    try {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            const currentAyahObj = surahData.ayahs[activeAyahIndex];
            const result = await validateRecitation(currentAyahObj.text, base64Audio);
            
            setRecitationResults(prev => ({ ...prev, [currentAyahObj.number]: result }));
            setLevel(MemorizationLevel.FULL_TEXT);
            setShowRecitationModal(true);
            setAiLoading(false);
        };
    } catch (error) {
        console.error(error);
        setAiLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col relative overflow-hidden bg-background text-slate-100 font-sans selection:bg-emerald-500/30">
      
      {/* Header */}
      <header className="fixed top-0 w-full p-6 z-40 flex justify-between items-center transition-all duration-300">
        <button 
            onClick={() => setShowSurahDrawer(true)}
            className="group flex items-center gap-3 px-4 py-2.5 rounded-full bg-slate-900/50 border border-white/5 hover:bg-slate-800 backdrop-blur-md transition-all active:scale-95"
        >
            <Menu size={20} className="text-emerald-400 group-hover:text-emerald-300" />
            <span className="font-bold text-sm text-slate-200 group-hover:text-white">{selectedSurah ? selectedSurah.name : 'السور'}</span>
        </button>
        
        <div className="flex flex-col items-end">
           <h1 className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-200 to-emerald-400">حفيظ</h1>
        </div>
      </header>

      {/* Memorization Progress Bar (Floating Pill) */}
      {surahData && (
        <div className="fixed top-24 left-0 right-0 z-30 flex justify-center pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur-md border border-emerald-500/20 pl-4 pr-5 py-2 rounded-full shadow-2xl flex items-center gap-4 pointer-events-auto transform transition-all duration-700 animate-in slide-in-from-top-4 hover:border-emerald-500/40">
                <div className="flex flex-col items-end">
                   <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">تقدم الحفظ</div>
                   <div className="h-1.5 w-32 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.6)] transition-all duration-1000 ease-out relative"
                          style={{ width: `${memorizationProgress}%` }}
                      >
                         <div className="absolute right-0 top-0 bottom-0 w-full bg-white/20 animate-pulse"></div>
                      </div>
                   </div>
                </div>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                    {memorizationProgress}%
                </div>
            </div>
        </div>
      )}

      {/* Surah Drawer */}
      <div className={`fixed inset-0 z-[60] transform transition-transform duration-500 ease-out ${showSurahDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-500" onClick={() => setShowSurahDrawer(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-slate-900 shadow-2xl flex flex-col border-l border-white/5">
             
             <div className="p-6 border-b border-white/5 bg-slate-900 z-10 space-y-4">
                 <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">المصحف الشريف</h2>
                    <button onClick={() => setShowSurahDrawer(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                 </div>
                 
                 {/* Reciter Selection */}
                 <div>
                    <h3 className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-wider flex items-center gap-2"><UserCircle size={14}/> القارئ</h3>
                    <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl">
                         {RECITERS.map(r => (
                             <button
                                 key={r.id}
                                 onClick={() => setActiveReciter(r)}
                                 className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all ${activeReciter.id === r.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                             >
                                 {r.arabicName}
                             </button>
                         ))}
                    </div>
                 </div>

                 <div className="relative group pt-2">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 mt-1 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={20} />
                    <input 
                        type="text" 
                        placeholder="ابحث باسم السورة..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-4 pr-12 pl-4 text-base focus:ring-2 focus:ring-emerald-500/50 focus:bg-slate-800 transition-all text-white placeholder-slate-600"
                    />
                 </div>
             </div>

             <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
                {filteredSurahs.map(surah => (
                   <button 
                    key={surah.number} 
                    onClick={() => handleSurahSelect(surah)}
                    className={`flex justify-between items-center w-full p-4 mb-2 rounded-2xl transition-all group border border-transparent hover:scale-[0.99]
                        ${selectedSurah?.number === surah.number 
                            ? 'bg-gradient-to-r from-emerald-900/40 to-slate-800 border-emerald-500/20' 
                            : 'hover:bg-white/5'}
                    `}
                   >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all relative overflow-hidden ${selectedSurah?.number === surah.number ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/50' : 'bg-slate-800 text-slate-500'}`}>
                            {surah.number}
                        </div>
                        <div className="text-right">
                             <div className={`font-bold text-lg ${selectedSurah?.number === surah.number ? 'text-emerald-400' : 'text-slate-200'}`}>{surah.name}</div>
                             <div className="text-xs text-slate-500 flex gap-2">
                                <span>{surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}</span>
                                <span>•</span>
                                <span>{surah.numberOfAyahs} آية</span>
                             </div>
                        </div>
                      </div>
                      <ChevronLeft size={16} className={`text-slate-600 transition-transform ${selectedSurah?.number === surah.number ? '-translate-x-1 text-emerald-500' : 'group-hover:-translate-x-1'}`} />
                   </button>
                ))}
             </div>
          </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full h-full overflow-y-auto scrollbar-hide relative flex flex-col items-center" dir="rtl">
        
        {!selectedSurah ? (
           <div className="flex-1 flex flex-col items-center justify-center text-center p-6 animate-in zoom-in-95 duration-700">
              <div className="relative mb-8 group cursor-pointer" onClick={() => setShowSurahDrawer(true)}>
                  <div className="absolute inset-0 bg-emerald-500 blur-[60px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
                  <div className="relative w-40 h-40 bg-gradient-to-tr from-slate-800 to-slate-900 rounded-[2.5rem] flex items-center justify-center border border-white/10 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                      <Book className="w-16 h-16 text-emerald-400" strokeWidth={1.5} />
                  </div>
              </div>
              <h2 className="text-4xl font-bold mb-3 text-white tracking-tight">ابدأ الحفظ</h2>
              <p className="text-slate-400 text-lg mb-8 max-w-xs leading-relaxed">اختر سورة واستمتع بتجربة حفظ تفاعلية ذكية.</p>
              <button 
                onClick={() => setShowSurahDrawer(true)}
                className="px-8 py-4 bg-white text-slate-950 rounded-2xl font-bold shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.4)] transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-2"
              >
                  <span>تصفح السور</span>
                  <ChevronLeft size={18} />
              </button>
           </div>
        ) : (
          <div className="w-full max-w-4xl mx-auto pt-32 pb-48 px-4">
             {/* Bismillah Removed as per user request */}

             {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                </div>
             ) : (
                <div className="flex flex-col items-center space-y-12">
                    {surahData?.ayahs.map((ayah, idx) => (
                    <div key={ayah.number} ref={idx === activeAyahIndex ? activeAyahRef : null} className="w-full transition-all duration-700">
                        <AyahCard 
                            ayah={ayah}
                            level={idx === activeAyahIndex ? level : MemorizationLevel.FULL_TEXT}
                            isActive={idx === activeAyahIndex}
                            onClick={() => setActiveAyahIndex(idx)}
                            onAnalyze={idx === activeAyahIndex ? handleGetInsight : undefined}
                            isRecording={idx === activeAyahIndex && isRecording}
                            isPlaying={idx === activeAyahIndex && isPlayingAudio}
                            progress={idx === activeAyahIndex ? audioProgress : 0}
                            recitationResult={recitationResults[ayah.number]}
                        />
                    </div>
                    ))}
                </div>
             )}
          </div>
        )}
      </main>

      {/* Overlays */}
      {aiLoading && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
            <div className="flex flex-col items-center gap-6">
                 <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                        <BrainCircuit size={32} className="text-emerald-500" />
                    </div>
                 </div>
                 <p className="text-emerald-400 font-bold tracking-widest text-lg">جاري المعالجة...</p>
            </div>
        </div>
      )}

      {surahData && (
        <ControlPanel 
          currentLevel={level} 
          setLevel={setLevel} 
          onAskAI={handleGetInsight}
          onQuiz={handleGetQuiz}
          onRecord={toggleRecording}
          onPlay={toggleAudio}
          isRecording={isRecording}
          isPlaying={isPlayingAudio}
          loadingAI={aiLoading}
        />
      )}

      {/* Modals - Insight */}
      {showInsightModal && aiInsight && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6">
           <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl transition-opacity" onClick={() => setShowInsightModal(false)} />
           <div className="relative bg-slate-900 w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500 border border-white/5 max-h-[85vh] flex flex-col">
              <div className="p-8 overflow-y-auto custom-scrollbar space-y-8" dir="rtl">
                 <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3"><BrainCircuit className="text-indigo-400"/> التدبر</h3>
                    <button onClick={() => setShowInsightModal(false)} className="bg-white/5 p-2 rounded-full hover:bg-white/10 transition-colors"><X size={20}/></button>
                 </div>

                 <div className="space-y-6">
                    <div className="bg-indigo-950/30 p-6 rounded-3xl border border-indigo-500/20 shadow-inner">
                        <p className="text-lg text-indigo-100 leading-relaxed font-light">{aiInsight.tafseer}</p>
                    </div>
                    
                    <div className="grid gap-4">
                        <div className="p-5 rounded-3xl bg-slate-800/50 border border-white/5">
                            <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">الرابط الذهني</h4>
                            <p className="text-slate-300 italic text-lg">"{aiInsight.connection}"</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                       {aiInsight.keywords.map((kw, i) => (
                          <span key={i} className="px-4 py-2 bg-slate-800 text-indigo-300 rounded-xl text-sm border border-indigo-500/10 font-medium">{kw}</span>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Recitation Modal */}
      {showRecitationModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
             <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setShowRecitationModal(false)} />
             <div className="relative bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 border border-white/10 animate-in zoom-in-95 duration-300 text-center">
                
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ${recitationResults[surahData!.ayahs[activeAyahIndex].number]?.isCorrect ? 'bg-emerald-500/20 ring-emerald-500/10' : 'bg-red-500/20 ring-red-500/10'}`}>
                    {recitationResults[surahData!.ayahs[activeAyahIndex].number]?.isCorrect ? <CheckCircle size={48} className="text-emerald-400" /> : <Mic size={48} className="text-red-400" />}
                </div>
                
                <h3 className="text-3xl font-bold text-white mb-2">
                    {recitationResults[surahData!.ayahs[activeAyahIndex].number]?.isCorrect ? 'أحسنت!' : 'انتبه'}
                </h3>
                
                <p className="text-slate-400 text-base mb-8 leading-relaxed">
                   {recitationResults[surahData!.ayahs[activeAyahIndex].number]?.feedback}
                </p>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => {
                            setShowRecitationModal(false);
                            startRecording();
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-900/40 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={20} />
                        إعادة التسميع
                    </button>
                    <button 
                        onClick={() => setShowRecitationModal(false)}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 rounded-2xl font-bold transition-all"
                    >
                        مراجعة النص
                    </button>
                </div>
             </div>
          </div>
      )}

      {/* Quiz Modal */}
      {showQuizModal && quizData && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
             <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setShowQuizModal(false)} />
             <div className="relative bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-white/10 animate-in zoom-in-95 duration-200" dir="rtl">
                <div className="text-center mb-8">
                    <div className="inline-block p-4 rounded-2xl bg-amber-500/10 mb-4">
                        <Trophy size={32} className="text-amber-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">اختبر حفظك</h3>
                </div>

                <div className="mb-8 text-center">
                    <p className="text-xl text-emerald-100 font-quran leading-loose">{quizData.question}</p>
                </div>
                
                <div className="space-y-3">
                    {quizData.options.map((opt, idx) => (
                        <button 
                            key={idx}
                            onClick={() => handleQuizAnswer(idx)}
                            disabled={quizResult !== null}
                            className={`w-full p-5 rounded-2xl font-bold text-right transition-all duration-300 border relative overflow-hidden text-lg
                                ${quizResult === null 
                                    ? 'bg-slate-800 border-white/5 text-slate-300 hover:bg-slate-700' 
                                    : ''}
                                ${quizResult === 'correct' && idx === quizData.answer 
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                                    : ''}
                                ${quizResult === 'wrong' && idx === quizData.answer 
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                                    : ''}
                                ${quizResult === 'wrong' && idx !== quizData.answer 
                                    ? 'bg-red-500/10 border-red-500/50 text-red-400 opacity-40' 
                                    : ''}
                            `}
                        >
                            {opt}
                            {quizResult === 'correct' && idx === quizData.answer && <CheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />}
                        </button>
                    ))}
                </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default App;