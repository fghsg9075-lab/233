
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { LessonContent, Subject, ClassLevel, Chapter, MCQItem, ContentType, User, SystemSettings } from '../types';
import { ArrowLeft, Clock, AlertTriangle, ExternalLink, CheckCircle, XCircle, Trophy, BookOpen, Play, Lock, ChevronRight, ChevronLeft, Save, X, Maximize } from 'lucide-react';
import { CustomConfirm, CustomAlert } from './CustomDialogs';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { decodeHtml } from '../utils/htmlDecoder';

interface Props {
  content: LessonContent | null;
  subject: Subject;
  classLevel: ClassLevel;
  chapter: Chapter;
  loading: boolean;
  onBack: () => void;
  onMCQComplete?: (count: number, answers: Record<number, number>, usedData: MCQItem[], timeTaken: number) => void; 
  user?: User; // Optional for non-MCQ views
  onUpdateUser?: (user: User) => void;
  settings?: SystemSettings; // New Prop for Pricing
}

export const LessonView: React.FC<Props> = ({ 
  content, 
  subject, 
  classLevel, 
  chapter,
  loading, 
  onBack,
  onMCQComplete,
  user,
  onUpdateUser,
  settings
}) => {
  const [mcqState, setMcqState] = useState<Record<number, number | null>>({});
  const [showResults, setShowResults] = useState(false); // Used to trigger Analysis Mode
  const [localMcqData, setLocalMcqData] = useState<MCQItem[]>([]);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [analysisUnlocked, setAnalysisUnlocked] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  
  // Full Screen Ref
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleFullScreen = () => {
      if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen().catch(e => console.error(e));
      } else {
          document.exitFullscreen();
      }
  };

  // TIMER STATE
  const [sessionTime, setSessionTime] = useState(0); // Total seconds
  
  // TIMER EFFECT
  useEffect(() => {
      let interval: any;
      if (!showResults && !showSubmitModal && !showResumePrompt) {
          interval = setInterval(() => {
              setSessionTime(prev => prev + 1);
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [showResults, showSubmitModal, showResumePrompt]);

  // Custom Dialog State
  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, message: string}>({isOpen: false, message: ''});
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({isOpen: false, title: '', message: '', onConfirm: () => {}});

  if (loading) {
      return (
          <div className="h-[70vh] flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <h3 className="text-xl font-bold text-slate-800 animate-pulse">Loading Content...</h3>
              <p className="text-slate-500 text-sm">Please wait while we fetch the data.</p>
          </div>
      );
  }

  // AI IMAGE NOTES VIEWER - STRICT MODE
  if (content.type === 'NOTES_IMAGE_AI') {
      // Prevent context menu (Right click / Long press)
      const preventMenu = (e: React.MouseEvent | React.TouchEvent) => e.preventDefault();

      // OPTION A: HTML CONTENT (If Admin pasted code)
      if (content.aiHtmlContent) {
          const decodedContent = decodeHtml(content.aiHtmlContent);
          return (
              <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in">
                  <header className="bg-white/95 backdrop-blur-md text-slate-800 p-4 absolute top-0 left-0 right-0 z-10 flex items-center justify-between border-b border-slate-100 shadow-sm">
                      <div>
                          <h2 className="text-sm font-bold">{content.title}</h2>
                          <p className="text-[10px] text-teal-600 font-bold uppercase tracking-widest">AI Generated Notes</p>
                      </div>
                      <button onClick={onBack} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"><X size={20} /></button>
                  </header>
                  
                  <div className="flex-1 overflow-y-auto w-full pt-16 pb-20 px-4 md:px-8">
                      <div 
                          className="prose prose-slate max-w-none prose-img:rounded-xl prose-img:shadow-lg prose-headings:text-slate-800 prose-a:text-blue-600 [&_a]:pointer-events-none [&_a]:cursor-text [&_a]:no-underline [&_iframe]:pointer-events-none"
                          dangerouslySetInnerHTML={{ __html: decodedContent }}
                      />
                      <div className="h-10"></div>
                  </div>
              </div>
          );
      }

      // OPTION B: IMAGE VIEWER (If Admin pasted Image URL)
      return (
          <div 
              className="fixed inset-0 z-50 bg-[#111] flex flex-col animate-in fade-in"
              style={{ 
                  width: '100vw',
                  height: '100vh',
                  touchAction: 'none' 
              }} 
          >
              <header className="bg-black/90 backdrop-blur-md text-white p-4 absolute top-0 left-0 right-0 z-10 flex items-center justify-between border-b border-white/10">
                  <div>
                      <h2 className="text-sm font-bold text-white/90">{content.title}</h2>
                      <p className="text-[10px] text-teal-400 font-bold uppercase tracking-widest">AI Generated Notes</p>
                  </div>
                  <button onClick={onBack} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors backdrop-blur-md"><X size={20} /></button>
              </header>
              
              {/* Scroll Container - Vertical Only, No Zoom */}
              <div 
                  className="viewer"
                  style={{ 
                      width: '100vw',
                      height: '100vh',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      touchAction: 'pan-y',   /* only vertical scroll */
                      background: '#111'
                  }}
                  onContextMenu={preventMenu}
              >
                  <div className="pt-16 pb-20 w-full min-h-screen">
                      <img 
                          src={content.content} 
                          alt="AI Notes" 
                          className="zoomed-image"
                          loading="lazy"
                          onContextMenu={preventMenu}
                          draggable={false}
                          style={{ 
                              width: '140%',        /* 🔥 APP ZOOM (Layout Safe) */
                              marginLeft: '-20%',   /* Center the zoomed image */
                              userSelect: 'none',
                              pointerEvents: 'none'
                          }}
                      />
                  </div>
                  
                  <div className="h-20 w-full flex items-center justify-center bg-[#111] text-zinc-600 text-xs font-mono pb-8">
                      -- END OF NOTES --
                  </div>
              </div>
          </div>
      );
  }

  if (!content || content.isComingSoon) {
      return (
          <div className="h-[70vh] flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-2xl m-4 border-2 border-dashed border-slate-200">
              <Clock size={64} className="text-orange-400 mb-4 opacity-80" />
              <h2 className="text-2xl font-black text-slate-800 mb-2">Coming Soon</h2>
              <p className="text-slate-600 max-w-xs mx-auto mb-6">
                  This content is currently being prepared by the Admin.
              </p>
              <button onClick={onBack} className="mt-8 text-slate-400 font-bold hover:text-slate-600">
                  Go Back
              </button>
          </div>
      );
  }

  // --- MCQ RENDERER ---
  if ((content.type === 'MCQ_ANALYSIS' || content.type === 'MCQ_SIMPLE') && content.mcqData) {
      const BATCH_SIZE = 50;
      const [batchIndex, setBatchIndex] = useState(0);

      // --- INITIALIZATION & RESUME LOGIC ---
      useEffect(() => {
          if (!content.mcqData) return;
          
          // Check if viewing History (Pre-filled answers)
          if (content.userAnswers) {
              // @ts-ignore
              setMcqState(content.userAnswers);
              setShowResults(true);
              setAnalysisUnlocked(true); // History usually allows viewing analysis? Or should we lock it? 
              // "History me save hi jayega aur analysis dikhega" implies it is visible.
              // Assuming history viewing is free/unlocked.
              setLocalMcqData(content.mcqData); // No shuffle for history, or use saved order?
              // Ideally history should save the order too, but 'userAnswers' keys are indices. 
              // If we shuffled, indices mismatch. 
              // For now assume history viewing uses default order OR we need to save 'localMcqData' in history too.
              // Let's assume standard order for history or that 'content.mcqData' passed in is already the correct order (if we saved it that way).
              return;
          }

          // Check for saved progress
          const key = `nst_mcq_progress_${chapter.id}`;
          const saved = localStorage.getItem(key);
          if (saved) {
              setShowResumePrompt(true);
              // Initialize with a fresh shuffle for the background (if they choose restart)
              setLocalMcqData([...content.mcqData].sort(() => Math.random() - 0.5));
          } else {
              // No save -> Start Random
              setLocalMcqData([...content.mcqData].sort(() => Math.random() - 0.5));
          }
      }, [content.mcqData, chapter.id, content.userAnswers]);

      // --- SAVE PROGRESS LOGIC ---
      useEffect(() => {
          if (!showResults && Object.keys(mcqState).length > 0) {
              const key = `nst_mcq_progress_${chapter.id}`;
              localStorage.setItem(key, JSON.stringify({
                  mcqState,
                  batchIndex,
                  localMcqData // Save the shuffled order
              }));
          }
      }, [mcqState, batchIndex, chapter.id, localMcqData, showResults]);

      const handleResume = () => {
          const key = `nst_mcq_progress_${chapter.id}`;
          const saved = localStorage.getItem(key);
          if (saved) {
              const parsed = JSON.parse(saved);
              setMcqState(parsed.mcqState || {});
              setBatchIndex(parsed.batchIndex || 0);
              if (parsed.localMcqData) setLocalMcqData(parsed.localMcqData);
          }
          setShowResumePrompt(false);
      };

      const handleRestart = () => {
          const key = `nst_mcq_progress_${chapter.id}`;
          localStorage.removeItem(key);
          setMcqState({});
          setBatchIndex(0);
          // New Shuffle
          setLocalMcqData([...(content.mcqData || [])].sort(() => Math.random() - 0.5));
          setShowResumePrompt(false);
          setAnalysisUnlocked(false);
          setShowResults(false);
      };

      const handleRecreate = () => {
          setConfirmConfig({
              isOpen: true,
              title: "Restart Quiz?",
              message: "This will shuffle questions and reset your current progress.",
              onConfirm: () => {
                  // Shuffle
                  const shuffled = [...(content.mcqData || [])].sort(() => Math.random() - 0.5);
                  setLocalMcqData(shuffled);
                  // Reset
                  setMcqState({});
                  setBatchIndex(0);
                  setShowResults(false);
                  setAnalysisUnlocked(false);
                  const key = `nst_mcq_progress_${chapter.id}`;
                  localStorage.removeItem(key);
                  setConfirmConfig(prev => ({...prev, isOpen: false}));
              }
          });
      };

      const displayData = localMcqData.length > 0 ? localMcqData : (content.mcqData || []);
      const currentBatchData = displayData.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE);
      const hasMore = (batchIndex + 1) * BATCH_SIZE < displayData.length;

      const score = Object.keys(mcqState).reduce((acc, key) => {
          const qIdx = parseInt(key);
          return acc + (mcqState[qIdx] === displayData[qIdx].correctAnswer ? 1 : 0);
      }, 0);

      const currentCorrect = score;
      const currentWrong = Object.keys(mcqState).length - currentCorrect;
      
      const attemptedCount = Object.keys(mcqState).length;
      // User requirement: "50 se kam submitte na karo"
      // We take the minimum of 50 or total available questions (in case a chapter has < 50)
      const minRequired = Math.min(50, displayData.length);
      const canSubmit = attemptedCount >= minRequired;

      const handleSubmitRequest = () => {
          setShowSubmitModal(true);
      };

      const handleConfirmSubmit = () => {
          // Finalize Submission
          setShowSubmitModal(false);
          const key = `nst_mcq_progress_${chapter.id}`;
          localStorage.removeItem(key); // Clear progress on finish

          // @ts-ignore
          if (onMCQComplete) onMCQComplete(score, mcqState, displayData, sessionTime);
      };

      const handleExit = () => {
           onBack();
      };

      const handleNextPage = () => {
          setBatchIndex(prev => prev + 1);
          const container = document.querySelector('.mcq-container');
          if(container) container.scrollTop = 0;
      };

      const handlePrevPage = () => {
          if (batchIndex > 0) {
              setBatchIndex(prev => prev - 1);
              const container = document.querySelector('.mcq-container');
              if(container) container.scrollTop = 0;
          }
      };

      return (
          <div className="flex flex-col h-full bg-slate-50 animate-in fade-in relative">
               <CustomAlert 
                   isOpen={alertConfig.isOpen} 
                   message={alertConfig.message} 
                   type="ERROR"
                   onClose={() => setAlertConfig({...alertConfig, isOpen: false})} 
               />
               <CustomConfirm
                   isOpen={confirmConfig.isOpen}
                   title={confirmConfig.title}
                   message={confirmConfig.message}
                   onConfirm={confirmConfig.onConfirm}
                   onCancel={() => setConfirmConfig({...confirmConfig, isOpen: false})}
               />

               {/* RESUME PROMPT */}
               {showResumePrompt && !showResults && (
                   <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                       <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
                           <h3 className="text-xl font-black text-slate-800 mb-2">Resume Session?</h3>
                           <p className="text-slate-500 text-sm mb-6">You have a saved session for this chapter.</p>
                           <div className="flex gap-3">
                               <button onClick={handleRestart} className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl">Restart</button>
                               <button onClick={handleResume} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg">Resume</button>
                           </div>
                       </div>
                   </div>
               )}

               {/* SUBMIT MODAL */}
               {showSubmitModal && (
                   <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-end justify-center sm:items-center p-4">
                       <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in mb-0 sm:mb-auto">
                           <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6"></div>
                           <Trophy size={48} className="mx-auto text-yellow-400 mb-4" />
                           <h3 className="text-xl font-black text-slate-800 mb-2">Submit Test?</h3>
                           <p className="text-slate-500 text-sm mb-6">
                               You have answered {Object.keys(mcqState).length} out of {displayData.length} questions.
                           </p>
                           <div className="flex gap-3">
                               <button onClick={() => setShowSubmitModal(false)} className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl">Cancel</button>
                               <button onClick={handleConfirmSubmit} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg">Yes, Submit</button>
                           </div>
                       </div>
                   </div>
               )}


               <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                   <div className="flex gap-2">
                       <button onClick={onBack} className="flex items-center gap-2 text-slate-600 font-bold text-sm bg-slate-100 px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors">
                           <ArrowLeft size={16} /> Exit
                       </button>
                       {!showResults && (
                           <button onClick={handleRecreate} className="flex items-center gap-2 text-purple-600 font-bold text-xs bg-purple-50 border border-purple-100 px-3 py-2 rounded-lg hover:bg-purple-100 transition-colors">
                               Re-create MCQ
                           </button>
                       )}
                   </div>
                   <div className="text-right">
                       <h3 className="font-bold text-slate-800 text-sm">MCQ Test</h3>
                       {showResults ? (
                           <span className="text-xs font-bold text-green-600">Analysis Mode • Page {batchIndex + 1}</span>
                       ) : (
                           <div className="flex flex-col items-end">
                               <div className="flex gap-3 text-xs font-bold mb-1">
                                   <span className="text-slate-500 flex items-center gap-1"><Clock size={12}/> {Math.floor(sessionTime / 60)}:{String(sessionTime % 60).padStart(2, '0')}</span>
                                   <span className="text-green-600 flex items-center gap-1"><CheckCircle size={12}/> {currentCorrect}</span>
                               </div>
                               <span className="text-xs text-slate-400">
                                   {Object.keys(mcqState).length}/{displayData.length} Attempted
                               </span>
                           </div>
                       )}
                   </div>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-3xl mx-auto w-full pb-20 mcq-container">
                   {currentBatchData.map((q, localIdx) => {
                       const idx = (batchIndex * BATCH_SIZE) + localIdx;
                       const userAnswer = mcqState[idx];
                       const isAnswered = userAnswer !== undefined && userAnswer !== null;
                       const isCorrect = userAnswer === q.correctAnswer;
                       
                       return (
                           <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                               <h4 className="font-bold text-slate-800 mb-4 flex gap-3 leading-relaxed">
                                   <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 font-bold mt-0.5">{idx + 1}</span>
                                   {q.question}
                               </h4>
                               <div className="space-y-2">
                                   {q.options.map((opt, oIdx) => {
                                       let btnClass = "w-full text-left p-3 rounded-xl border transition-all text-sm font-medium relative overflow-hidden ";
                                       
                                       // ANALYSIS MODE: Show Full Details
                                       if (showResults && analysisUnlocked) {
                                           if (oIdx === q.correctAnswer) {
                                               btnClass += "bg-green-100 border-green-300 text-green-800";
                                           } else if (userAnswer === oIdx) {
                                               btnClass += "bg-red-100 border-red-300 text-red-800";
                                           } else {
                                               btnClass += "bg-slate-50 border-slate-100 opacity-60";
                                           }
                                       } 
                                       // PRACTICE MODE: Immediate Feedback
                                       else if (isAnswered) {
                                            if (oIdx === q.correctAnswer) {
                                                // Hidden until Analysis unlocked for 'Test' mode? 
                                                // Actually the prompt says "jab submit karega tab explanation dega".
                                                // Before submission, it should probably act like a test (no feedback)? 
                                                // "user jab jab mcq banane jaye... submit karega tab explanation".
                                                // So during test, it should highlight selection but NOT show correct answer if it's a test.
                                                // But current implementation was 'Practice Mode' with immediate feedback.
                                                // Let's assume standard test behavior: Show selection.
                                                if (userAnswer === oIdx) {
                                                     btnClass += "bg-blue-100 border-blue-300 text-blue-800";
                                                } else {
                                                     btnClass += "bg-slate-50 border-slate-100 opacity-60";
                                                }
                                            }
                                       } else {
                                           btnClass += "bg-white border-slate-200 hover:bg-slate-50 hover:border-blue-200";
                                       }

                                       return (
                                           <button 
                                               key={oIdx}
                                               disabled={isAnswered || showResults} 
                                               onClick={() => setMcqState(prev => ({ ...prev, [idx]: oIdx }))}
                                               className={btnClass}
                                           >
                                               <span className="relative z-10 flex justify-between items-center">
                                                   {opt}
                                                   {showResults && analysisUnlocked && oIdx === q.correctAnswer && <CheckCircle size={16} className="text-green-600" />}
                                                   {showResults && analysisUnlocked && userAnswer === oIdx && userAnswer !== q.correctAnswer && <XCircle size={16} className="text-red-500" />}
                                                   
                                                   {!showResults && isAnswered && userAnswer === oIdx && <CheckCircle size={16} className="text-blue-600" />}
                                               </span>
                                           </button>
                                       );
                                   })}
                               </div>
                               
                               {/* Show Explanation Only in Analysis Mode */}
                               {showResults && analysisUnlocked && (
                                   <div className="mt-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2">
                                       <div className={`flex items-center gap-2 text-sm font-bold mb-1 ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                                           {isCorrect ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                           {isCorrect ? 'Correct Answer' : 'Incorrect'}
                                       </div>
                                       {q.explanation && q.explanation !== "Answer Key Provided" && (
                                            <p className="text-slate-600 text-sm bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2">
                                                <span className="font-bold text-slate-800 block text-xs uppercase mb-1">Explanation:</span>
                                                {q.explanation}
                                            </p>
                                       )}
                                   </div>
                               )}
                           </div>
                       );
                   })}
               </div>

               {/* BOTTOM BUTTONS - REDESIGNED */}
               <div className="p-4 bg-white border-t border-slate-200 sticky bottom-0 z-[60] grid grid-cols-3 gap-2 items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                   {/* LEFT: Prev Page */}
                   <div className="flex justify-start">
                       {batchIndex > 0 && (
                           <button 
                               onClick={handlePrevPage}
                               className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 px-4 rounded-xl transition-all active:scale-95 flex items-center gap-1"
                           >
                               <ChevronLeft size={18} /> Prev
                           </button>
                       )}
                   </div>

                   {/* CENTER: Submit */}
                   <div className="flex justify-center">
                       {!showResults && (
                           <div className="flex flex-col items-center w-full">
                               <button 
                                   onClick={handleSubmitRequest}
                                   disabled={!canSubmit} 
                                   className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-300 disabled:cursor-not-allowed font-bold py-3 px-4 rounded-xl transition-all active:scale-95 flex items-center gap-1 w-full justify-center"
                               >
                                   <Trophy size={18} /> Submit
                               </button>
                               {!canSubmit && (
                                   <span className="text-[9px] text-slate-400 mt-1 font-medium whitespace-nowrap">Min {minRequired}</span>
                               )}
                           </div>
                       )}
                   </div>

                   {/* RIGHT: Next Page */}
                   <div className="flex justify-end">
                       {hasMore && (
                           <button 
                               onClick={handleNextPage}
                               disabled={!showResults && currentBatchData.some((_, i) => mcqState[(batchIndex * BATCH_SIZE) + i] === undefined)}
                               className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-1"
                           >
                               Next <ChevronRight size={18} />
                           </button>
                       )}
                   </div>
               </div>
          </div>
      );
  }

  // --- VIDEO RENDERER (Playlist Support) ---
  if ((content.type === 'PDF_VIEWER' || content.type === 'VIDEO_LECTURE') && (content.content.includes('youtube.com') || content.content.includes('youtu.be') || content.content.includes('drive.google.com/file') || content.content.includes('.mp4') || (content.videoPlaylist && content.videoPlaylist.length > 0))) {
      const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
      const playlist = content.videoPlaylist && content.videoPlaylist.length > 0 
          ? content.videoPlaylist 
          : [{ title: chapter.title, url: content.content }];
      
      const currentVideo = playlist[currentVideoIndex];
      let embedUrl = currentVideo.url;
      
      // YouTube URL conversion
      if (embedUrl.includes('youtube.com/watch')) {
          const videoId = new URL(embedUrl).searchParams.get('v');
          embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      } else if (embedUrl.includes('youtu.be/')) {
          const videoId = embedUrl.split('youtu.be/')[1];
          embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      } else if (embedUrl.includes('drive.google.com/file')) {
          const fileId = embedUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
          embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      }
      
      return (
          <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-900">
              <div className="flex items-center justify-between p-3 bg-slate-800 border-b border-slate-700 shadow-sm">
                   <button onClick={onBack} className="flex items-center gap-2 text-slate-300 font-bold text-sm hover:text-white">
                       <ArrowLeft size={18} /> Back
                   </button>
                   <h3 className="font-bold text-white text-sm truncate max-w-[200px]">{currentVideo.title}</h3>
                   <div className="w-10"></div>
              </div>
              
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                  <div ref={containerRef} className="flex-1 bg-black relative group">
                      {/* Full Screen Button */}
                      <button 
                          onClick={toggleFullScreen} 
                          className="absolute top-4 right-4 z-50 bg-black/50 p-2 rounded-full text-white/80 hover:text-white hover:bg-black/70 backdrop-blur-sm transition-all shadow-lg"
                      >
                          <Maximize size={20} />
                      </button>

                      {/* CUSTOM BRANDING OVERLAY - MASKS YOUTUBE LOGO */}
                      <div className="absolute bottom-0 right-0 z-40 bg-black px-4 py-2 rounded-tl-xl border-t border-l border-white/10 pointer-events-auto cursor-default flex items-center justify-center min-w-[100px] min-h-[40px]">
                           <span className="text-white font-black text-sm tracking-widest">NSTA</span>
                      </div>

                      <iframe 
                           key={embedUrl} // Force reload on URL change
                           src={embedUrl}
                           className="w-full h-full border-0" 
                           allow="autoplay; fullscreen; picture-in-picture"
                           allowFullScreen
                           sandbox="allow-scripts allow-same-origin allow-presentation"
                           title={currentVideo.title}
                           onLoad={() => {
                               // Note: Cannot auto-detect end of video in iframe without API. 
                               // User has to click 'Next' manually or we rely on YouTube autoplay if playlist.
                           }}
                       />
                  </div>
                  
                  {/* Playlist Sidebar */}
                  {playlist.length > 1 && (
                      <div className="w-full md:w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
                          <div className="p-3 bg-slate-800 font-bold text-white text-xs uppercase tracking-widest border-b border-slate-700">
                              Up Next ({currentVideoIndex + 1}/{playlist.length})
                          </div>
                          <div className="flex-1 overflow-y-auto p-2 space-y-2">
                              {playlist.map((vid, idx) => (
                                  <button 
                                      key={idx}
                                      onClick={() => setCurrentVideoIndex(idx)}
                                      className={`w-full p-3 rounded-lg flex gap-3 items-center text-left transition-all ${
                                          idx === currentVideoIndex 
                                          ? 'bg-blue-600 text-white shadow-lg' 
                                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                      }`}
                                  >
                                      <div className="text-xs font-bold opacity-50">{idx + 1}</div>
                                      <div className="flex-1 truncate">
                                          <p className="font-bold text-xs truncate">{vid.title}</p>
                                      </div>
                                      {idx === currentVideoIndex && <Play size={12} fill="currentColor" />}
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  }
  
  // --- PDF / EXTERNAL LINK RENDERER ---
  if (content.type === 'PDF_VIEWER' || content.type === 'PDF_FREE' || content.type === 'PDF_PREMIUM') {
      const isPdf = content.content.toLowerCase().endsWith('.pdf') || content.content.includes('drive.google.com') || content.content.includes('docs.google.com');
      
      return (
          <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-100">
              <div className="flex items-center justify-between p-3 bg-white border-b border-slate-200 shadow-sm">
                   <button onClick={onBack} className="flex items-center gap-2 text-slate-600 font-bold text-sm hover:text-slate-900">
                       <ArrowLeft size={18} /> Back
                   </button>
                   <h3 className="font-bold text-slate-800 text-sm truncate max-w-[200px]">{chapter.title}</h3>
                   
                   {/* Full Screen Button */}
                   <button onClick={toggleFullScreen} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                       <Maximize size={20} />
                   </button>
              </div>
              
              <div ref={containerRef} className="flex-1 w-full bg-white relative overflow-hidden">
                  {isPdf ? (
                     <div className="relative w-full h-full">
                        <iframe 
                             src={content.content.replace('/view', '/preview').replace('/edit', '/preview')} 
                             className="w-full h-full border-0" 
                             allowFullScreen
                             sandbox="allow-scripts allow-same-origin"
                             title="PDF Viewer"
                         />
                         {/* TRANSPARENT BLOCKER for Top-Right 'Pop-out' Button */}
                         <div className="absolute top-0 right-0 w-20 h-20 z-10 bg-transparent"></div>
                     </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                          <ExternalLink size={48} className="text-slate-400 mb-4" />
                          <h3 className="text-xl font-bold text-slate-700 mb-2">External Content</h3>
                          <p className="text-slate-500 mb-6 max-w-md">
                              This content is hosted externally and cannot be embedded.
                          </p>
                          {/* Removed 'Open Content' button to prevent link sharing */}
                          <p className="text-xs text-slate-400 font-medium">Please contact admin if this content is not loading.</p>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // --- HTML NOTES RENDERER ---
  if (content.type === 'NOTES_HTML_FREE' || content.type === 'NOTES_HTML_PREMIUM') {
      const decodedContent = decodeHtml(content.content);
      return (
        <div className="bg-white min-h-screen pb-20 animate-in fade-in">
           {/* Header */}
           <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm">
               <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 transition-colors">
                   <ArrowLeft size={20} />
               </button>
               <div className="text-center">
                   <h3 className="font-bold text-slate-800 text-sm leading-tight">{chapter.title}</h3>
                   <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{content.type === 'NOTES_HTML_PREMIUM' ? 'Premium Notes' : 'Free Notes'}</p>
               </div>
               <div className="w-8"></div>
           </div>

           {/* Content */}
           <div className="max-w-3xl mx-auto p-6 md:p-10">
               {/* Using dangerous HTML as it comes from Admin */}
               <div 
                   className="prose prose-slate max-w-none prose-img:rounded-xl prose-headings:text-slate-800 prose-a:text-blue-600 [&_a]:pointer-events-none [&_a]:cursor-text [&_a]:no-underline [&_iframe]:pointer-events-none"
                   dangerouslySetInnerHTML={{ __html: decodedContent }}
               />
               
               <div className="mt-12 pt-8 border-t border-slate-100 text-center">
                   <p className="text-xs text-slate-400 font-medium mb-4">End of Chapter</p>
                   <button onClick={onBack} className="bg-slate-900 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-slate-800 transition-all active:scale-95">
                       Complete & Close
                   </button>
               </div>
           </div>
        </div>
      );
  }

  // --- NOTES (MARKDOWN) RENDERER ---
  return (
    <div className="bg-white min-h-screen pb-20 animate-in fade-in">
       {/* Notes Header */}
       <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm">
           <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 transition-colors">
               <ArrowLeft size={20} />
           </button>
           <div className="text-center">
               <h3 className="font-bold text-slate-800 text-sm leading-tight">{chapter.title}</h3>
               <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{content.subtitle}</p>
           </div>
           <div className="w-8"></div> {/* Spacer to balance Back button */}
       </div>

       {/* Notes Body */}
       <div className="max-w-3xl mx-auto p-6 md:p-10">
           <div className="prose prose-slate prose-headings:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-900 prose-a:text-blue-600 max-w-none">
               <ReactMarkdown 
                   remarkPlugins={[remarkMath]} 
                   rehypePlugins={[rehypeKatex]}
                   components={{
                       h1: ({node, ...props}) => <h1 className="text-2xl font-black mb-4 pb-2 border-b border-slate-100" {...props} />,
                       h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-8 mb-4 text-blue-800 flex items-center gap-2" {...props} />,
                       ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-2 my-4" {...props} />,
                       li: ({node, ...props}) => <li className="pl-1" {...props} />,
                       blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-6 bg-blue-50 rounded-r-lg italic text-blue-800" {...props} />,
                       code: ({node, ...props}) => <code className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono font-bold" {...props} />,
                   }}
               >
                   {content.content}
               </ReactMarkdown>
           </div>
           
           <div className="mt-12 pt-8 border-t border-slate-100 text-center">
               <p className="text-xs text-slate-400 font-medium mb-4">End of Chapter</p>
               <button onClick={onBack} className="bg-slate-900 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-slate-800 transition-all active:scale-95">
                   Complete & Close
               </button>
           </div>
       </div>
    </div>
  );
};
