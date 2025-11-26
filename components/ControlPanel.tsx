import React from 'react';
import { MemorizationLevel } from '../types';
import { EyeOff, BookOpen, BrainCircuit, Mic, Square, Sparkles, Play, Pause, ListMusic } from 'lucide-react';

interface ControlPanelProps {
  currentLevel: MemorizationLevel;
  setLevel: (l: MemorizationLevel) => void;
  onAskAI: () => void;
  onQuiz: () => void;
  onRecord: () => void;
  onPlay: () => void;
  isRecording: boolean;
  isPlaying: boolean;
  loadingAI: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ currentLevel, setLevel, onAskAI, onQuiz, onRecord, onPlay, isRecording, isPlaying, loadingAI }) => {
  
  return (
    <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
      <div className="pointer-events-auto glass px-6 py-3 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.4)] bg-slate-900/80 backdrop-blur-2xl border border-white/10 flex items-center gap-6 md:gap-8 transition-all duration-300 hover:shadow-[0_8px_40px_rgba(16,185,129,0.1)]">
          
          {/* Left Group */}
          <div className="flex items-center gap-2">
            <button 
                onClick={onAskAI}
                disabled={loadingAI || isRecording}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200 transition-all active:scale-90 disabled:opacity-30 relative group"
            >
                <BrainCircuit size={22} className={loadingAI ? 'animate-spin' : ''} strokeWidth={1.5} />
                <span className="absolute -top-8 bg-slate-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">التدبر</span>
            </button>
            
             <button 
                onClick={() => setLevel(currentLevel === MemorizationLevel.HIDDEN ? MemorizationLevel.FULL_TEXT : MemorizationLevel.HIDDEN)}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${currentLevel === MemorizationLevel.HIDDEN ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
                {currentLevel === MemorizationLevel.HIDDEN ? <BookOpen size={20} strokeWidth={1.5} /> : <EyeOff size={20} strokeWidth={1.5} />}
            </button>
          </div>

          {/* Center Action (Record) */}
          <div className="relative -mt-8">
              <button 
                onClick={onRecord}
                disabled={loadingAI || isPlaying}
                className={`
                  w-20 h-20 md:w-24 md:h-24 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-95
                  ${isRecording 
                    ? 'bg-red-500 text-white shadow-red-500/40 ring-4 ring-red-500/20 animate-pulse' 
                    : 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-1 ring-4 ring-slate-900'}
                  disabled:opacity-50 disabled:grayscale
                `}
              >
                 {isRecording ? (
                    <Square size={28} fill="currentColor" />
                 ) : (
                    <Mic size={32} strokeWidth={2} />
                 )}
              </button>
          </div>

          {/* Right Group */}
          <div className="flex items-center gap-2">
             <button 
                onClick={onPlay}
                disabled={isRecording}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 ${isPlaying ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
              >
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
              </button>

             <button 
                onClick={onQuiz}
                disabled={loadingAI || isRecording}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 transition-all active:scale-90 disabled:opacity-30 relative group"
            >
                <Sparkles size={22} strokeWidth={1.5} />
                <span className="absolute -top-8 bg-slate-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">اختبار</span>
            </button>
          </div>

      </div>
    </div>
  );
};

export default ControlPanel;