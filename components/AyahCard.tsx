import React, { useMemo } from 'react';
import { Ayah, MemorizationLevel, RecitationResult } from '../types';
import { Brain, CheckCircle2, XCircle, Volume2 } from 'lucide-react';

interface AyahCardProps {
  ayah: Ayah;
  level: MemorizationLevel;
  isActive: boolean;
  onClick: () => void;
  onAnalyze?: () => void;
  isRecording?: boolean;
  isPlaying?: boolean;
  progress?: number; // 0 to 100
  recitationResult?: RecitationResult | null;
}

const AyahCard: React.FC<AyahCardProps> = ({ ayah, level, isActive, onClick, onAnalyze, isRecording, isPlaying, progress = 0, recitationResult }) => {
  
  const renderContent = () => {
    const words = ayah.text.split(' ');

    // 1. Recitation Result (Mistakes Highlight)
    if (level === MemorizationLevel.FULL_TEXT && recitationResult) {
       return (
         <span className="leading-[2.8] text-emerald-100/80">
            {words.map((word, index) => {
                const cleanWord = word.replace(/[^\w\s\u0600-\u06FF]/g, ''); 
                const isMistake = recitationResult.mistakes.some(m => m.includes(cleanWord) || word.includes(m));
                return (
                    <span key={index} className={`mx-1 inline-block transition-colors duration-500 ${isMistake ? 'text-red-400 font-bold border-b-2 border-red-500/30' : 'text-emerald-400'}`}>
                        {word}
                    </span>
                );
            })}
         </span>
       );
    }

    // 2. Playback Mode (Karaoke Effect)
    if (isPlaying && isActive && level === MemorizationLevel.FULL_TEXT) {
        // We use a CSS variable for the progress percentage to drive the gradient
        return (
            <span 
                className="text-fill-anim leading-[2.8]" 
                style={{ '--progress': `${progress}%` } as React.CSSProperties}
            >
                {ayah.text}
            </span>
        );
    }

    // 3. Hidden Mode (Memorization)
    if (level === MemorizationLevel.HIDDEN) {
       return (
         <div className="flex flex-wrap gap-x-3 gap-y-6 justify-center w-full py-4" dir="rtl">
           {words.map((word, i) => (
             <span 
                key={i} 
                className={`h-12 rounded-xl transition-all duration-500 border border-white/5 ${isRecording ? 'bg-red-500/10 animate-pulse border-red-500/20' : 'bg-slate-800/40'}`} 
                style={{ width: `${Math.max(60, word.length * 15 + 20)}px` }}
             ></span>
           ))}
         </div>
       );
    }

    // 4. Standard Modes (Dimmed / First Letter)
    return words.map((word, index) => {
      if (level === MemorizationLevel.DIMMED_WORDS) {
        const shouldDim = (word.length + index) % 2 !== 0; 
        return shouldDim ? (
            <span key={index} className="text-slate-700 blur-[2px] transition-all duration-500 mx-1">{word} </span>
        ) : (
            <span key={index} className="mx-1 text-slate-300">{word} </span>
        );
      }

      if (level === MemorizationLevel.FIRST_LETTER) {
        const firstLetter = word.charAt(0);
        return (
            <span key={index} className="mx-1 relative inline-flex items-center justify-center w-12 h-12 bg-slate-800/50 rounded-lg border border-white/5 mx-1 mb-2">
                <span className="text-emerald-400 font-bold text-2xl font-quran pt-2">{firstLetter}</span>
            </span>
        );
      }
      
      // Default Text
      return <span key={index} className="mx-1 text-slate-300">{word} </span>;
    });
  };


  return (
    <div 
      onClick={onClick}
      className={`
        relative transition-all duration-700 cursor-pointer w-full flex flex-col items-center
        ${isActive 
          ? 'opacity-100 scale-100 py-16' 
          : 'opacity-20 scale-95 py-8 grayscale hover:grayscale-0 hover:opacity-40'
        }
      `}
    >
      
      {/* Decorative Badge */}
      <div className={`
        transition-all duration-700 mb-8
        ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
      `}>
         <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-900/80 border border-emerald-500/20 shadow-lg shadow-emerald-900/20 backdrop-blur-md">
            <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs font-bold border border-emerald-500/20">
                {ayah.numberInSurah}
            </div>
            {isPlaying && <span className="text-[10px] text-emerald-400 tracking-wider font-bold animate-pulse uppercase">تلاوة...</span>}
            {isRecording && <span className="text-[10px] text-red-400 tracking-wider font-bold animate-pulse uppercase">استماع...</span>}
         </div>
      </div>

      {/* Recitation Feedback (Corner) */}
      {isActive && recitationResult && !isRecording && level === MemorizationLevel.FULL_TEXT && (
          <div className="absolute top-4 right-4 animate-in fade-in zoom-in duration-300">
             <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border backdrop-blur-md shadow-xl ${recitationResult.isCorrect ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' : 'bg-red-900/20 border-red-500/30 text-red-400'}`}>
                {recitationResult.isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                <span className="text-sm font-bold">{recitationResult.score}%</span>
             </div>
          </div>
      )}

      {/* AI Button */}
      {isActive && onAnalyze && !isRecording && !isPlaying && (
          <button 
            onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
            className="absolute top-4 left-4 p-3 rounded-xl bg-slate-800/30 border border-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/30 text-slate-500 hover:text-indigo-400 transition-all active:scale-95 group"
          >
            <Brain size={20} className="group-hover:scale-110 transition-transform"/>
          </button>
      )}

      {/* Text Container */}
      <div className={`
        text-center font-quran transition-all duration-500 dir-rtl w-full px-4 md:px-0
        ${isActive 
            ? 'text-3xl md:text-5xl lg:text-[3.5rem] leading-[2.5] md:leading-[2.8]' 
            : 'text-2xl text-slate-600'
        }
      `}>
          {renderContent()}
      </div>

    </div>
  );
};

export default AyahCard;