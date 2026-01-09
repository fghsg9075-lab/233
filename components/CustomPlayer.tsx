import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Maximize, Zap, ZoomIn, ZoomOut, Volume2, VolumeX, Settings, Lock, Unlock, Repeat, RotateCcw, FastForward, Rewind, Sun, Cast } from 'lucide-react';

interface CustomPlayerProps {
    videoUrl: string;
    brandingText?: string;
    onEnded?: () => void;
}

export const CustomPlayer: React.FC<CustomPlayerProps> = ({ videoUrl, brandingText = "NSTA", onEnded }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Playback State
    const [isPlaying, setIsPlaying] = useState(true);
    const [speed, setSpeed] = useState(1);
    const [zoomMode, setZoomMode] = useState<'FIT' | 'FILL' | 'ORIGINAL'>('FIT'); 
    const [showControls, setShowControls] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(100);
    const [brightness, setBrightness] = useState(100);
    const [quality, setQuality] = useState('auto');
    const [isLocked, setIsLocked] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    
    // Progress
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    
    // Gesture State
    const [tapFeedback, setTapFeedback] = useState<{side: 'left'|'right', id: number} | null>(null);
    const [gestureFeedback, setGestureFeedback] = useState<{type: 'VOLUME' | 'BRIGHTNESS', value: number} | null>(null);
    const touchStart = useRef<{x: number, y: number} | null>(null);
    const lastTap = useRef<{time: number, side: 'left'|'right'}>({time: 0, side: 'left'});
    const hasResumed = useRef(false);

    // Extract Video ID
    let videoId = '';
    try {
        if (videoUrl.includes('youtu.be/')) videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        else if (videoUrl.includes('v=')) videoId = videoUrl.split('v=')[1].split('&')[0];
        else if (videoUrl.includes('embed/')) videoId = videoUrl.split('embed/')[1].split('?')[0];
        if (videoId && videoId.includes('?')) videoId = videoId.split('?')[0];
    } catch(e) {}
    
    const progressKey = `nst_vid_prog_${videoId}`;

    const sendCommand = (func: string, args: any[] = []) => {
        if (!iframeRef.current) return;
        iframeRef.current.contentWindow?.postMessage(JSON.stringify({
            event: 'command',
            func: func,
            args: args
        }), '*');
    };

    const togglePlay = () => {
        if (isLocked) return;
        if (isPlaying) sendCommand('pauseVideo');
        else sendCommand('playVideo');
        setIsPlaying(!isPlaying);
    };

    const changeSpeed = () => {
        const speeds = [0.5, 1, 1.25, 1.5, 2];
        const idx = speeds.indexOf(speed);
        const nextSpeed = speeds[(idx + 1) % speeds.length];
        setSpeed(nextSpeed);
        sendCommand('setPlaybackRate', [nextSpeed]);
    };

    const changeQuality = (q: string) => {
        setQuality(q);
        sendCommand('setPlaybackQuality', [q]);
        setShowSettings(false);
    };

    const toggleZoom = () => {
        if (zoomMode === 'FIT') setZoomMode('FILL');
        else if (zoomMode === 'FILL') setZoomMode('ORIGINAL');
        else setZoomMode('FIT');
    };

    const getScale = () => {
        switch(zoomMode) {
            case 'FILL': return 1.5;
            case 'ORIGINAL': return 1;
            case 'FIT': default: return 1.06;
        }
    };

    const toggleLock = () => {
        setIsLocked(!isLocked);
        setShowControls(!isLocked);
    };

    const toggleLoop = () => setIsLooping(!isLooping);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const handleSeek = (time: number) => {
        if (isLocked) return;
        const t = Math.max(0, Math.min(duration, time));
        sendCommand('seekTo', [t, true]);
        setCurrentTime(t);
        if (isPlaying) sendCommand('playVideo');
    };

    const handleSkip = (seconds: number) => {
        handleSeek(currentTime + seconds);
        // Visual feedback
        const side = seconds < 0 ? 'left' : 'right';
        setTapFeedback({ side, id: Date.now() });
        setTimeout(() => setTapFeedback(null), 500);
    };

    const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!duration || isLocked) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, x / rect.width));
        handleSeek(duration * pct);
    };

    // --- TOUCH GESTURES ---
    const handleTouchStart = (e: React.TouchEvent) => {
        if (isLocked) return;
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isLocked || !touchStart.current || !containerRef.current) return;
        
        const deltaY = touchStart.current.y - e.touches[0].clientY;
        const deltaX = e.touches[0].clientX - touchStart.current.x;
        const { width, height } = containerRef.current.getBoundingClientRect();
        
        // Ignore horizontal swipes (seeking) to prevent conflicts with native or future seek gestures
        if (Math.abs(deltaX) > Math.abs(deltaY)) return;

        const sensitivity = 0.5; // Adjust sensitivity
        const change = deltaY * sensitivity;

        if (touchStart.current.x < width / 2) {
            // LEFT SIDE: BRIGHTNESS
            const newBrightness = Math.max(20, Math.min(150, brightness + change)); // 20% to 150%
            setBrightness(newBrightness);
            setGestureFeedback({ type: 'BRIGHTNESS', value: newBrightness });
        } else {
            // RIGHT SIDE: VOLUME
            const newVolume = Math.max(0, Math.min(100, volume + change));
            setVolume(newVolume);
            sendCommand('setVolume', [newVolume]);
            setGestureFeedback({ type: 'VOLUME', value: newVolume });
        }
        
        // Update start point for smooth dragging
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = () => {
        touchStart.current = null;
        setTimeout(() => setGestureFeedback(null), 1000);
    };

    const handleDoubleTap = (side: 'left' | 'right') => {
        if (isLocked) return;
        const now = Date.now();
        if (now - lastTap.current.time < 300 && lastTap.current.side === side) {
            handleSkip(side === 'left' ? -10 : 10);
        }
        lastTap.current = { time: now, side };
    };

    const formatTime = (t: number) => {
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getEmbedUrl = (url: string) => {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&fs=0&playsinline=1`;
    };

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            try {
                if (typeof event.data === 'string') {
                    const data = JSON.parse(event.data);
                    
                    if (data.event === 'infoDelivery' && data.info) {
                        if (data.info.currentTime) setCurrentTime(data.info.currentTime);
                        if (data.info.duration) {
                            setDuration(data.info.duration);
                            if (!hasResumed.current && videoId) {
                                const saved = localStorage.getItem(progressKey);
                                if (saved) {
                                    const savedTime = parseFloat(saved);
                                    if (savedTime > 5 && savedTime < (data.info.duration - 10)) {
                                        sendCommand('seekTo', [savedTime, true]);
                                    }
                                }
                                hasResumed.current = true;
                            }
                        }
                        if (data.info.volume) setVolume(data.info.volume);
                        
                        // Loop / End Logic
                        if (data.info.playerState === 0) {
                            if (isLooping) {
                                sendCommand('seekTo', [0, true]);
                                sendCommand('playVideo');
                            } else if (onEnded) {
                                onEnded();
                            }
                        }
                        if (data.info.playerState === 1) setIsPlaying(true);
                        if (data.info.playerState === 2) setIsPlaying(false);
                    }
                }
            } catch (e) {}
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [videoId, onEnded, progressKey, isLooping]);

    // Save Progress
    useEffect(() => {
        const timer = setInterval(() => {
            if (currentTime > 0) localStorage.setItem(progressKey, currentTime.toString());
        }, 5000);
        return () => clearInterval(timer);
    }, [currentTime, progressKey]);

    const progressPercent = duration ? (currentTime / duration) * 100 : 0;

    return (
        <div 
            ref={containerRef}
            className="relative w-full h-full bg-black group overflow-hidden select-none" 
            onMouseEnter={() => !isLocked && setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
             {/* VIDEO AREA */}
             <div 
                className="w-full h-full transition-transform duration-300 ease-out origin-center" 
                style={{ 
                    transform: `scale(${getScale()})`,
                    filter: `brightness(${brightness}%)` 
                }}
             >
                <iframe 
                    ref={iframeRef}
                    src={getEmbedUrl(videoUrl)} 
                    className="w-full h-full pointer-events-none" 
                    allow="autoplay; encrypted-media; fullscreen" 
                    title="Video Player"
                />
             </div>

             {/* TOUCH GESTURE ZONES & OVERLAY */}
             <div 
                 className="absolute inset-0 z-10 flex"
                 onTouchStart={handleTouchStart}
                 onTouchMove={handleTouchMove}
                 onTouchEnd={handleTouchEnd}
             >
                 {/* Left Zone: Brightness / Double Tap Rewind */}
                 <div className="w-1/3 h-full relative" onClick={() => handleDoubleTap('left')}>
                     {tapFeedback?.side === 'left' && (
                         <div className="absolute inset-0 flex items-center justify-center bg-white/10 animate-ping">
                             <Rewind className="text-white w-12 h-12" />
                             <span className="text-white font-bold text-xs">-10s</span>
                         </div>
                     )}
                 </div>
                 
                 {/* Center Zone: Play/Pause */}
                 <div className="w-1/3 h-full flex items-center justify-center cursor-pointer" onClick={togglePlay}>
                     {/* Play Pause Animation could go here if needed */}
                 </div>
                 
                 {/* Right Zone: Volume / Double Tap Skip */}
                 <div className="w-1/3 h-full relative" onClick={() => handleDoubleTap('right')}>
                     {tapFeedback?.side === 'right' && (
                         <div className="absolute inset-0 flex items-center justify-center bg-white/10 animate-ping">
                             <FastForward className="text-white w-12 h-12" />
                             <span className="text-white font-bold text-xs">+10s</span>
                         </div>
                     )}
                 </div>
             </div>

             {/* GESTURE FEEDBACK (Volume/Brightness) */}
             {gestureFeedback && (
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur rounded-xl p-4 flex flex-col items-center z-40 animate-in fade-in zoom-in duration-200">
                     {gestureFeedback.type === 'VOLUME' ? <Volume2 className="text-white mb-2" size={32} /> : <Sun className="text-white mb-2" size={32} />}
                     <div className="w-24 h-1.5 bg-white/30 rounded-full overflow-hidden">
                         <div 
                            className="h-full bg-blue-500 transition-all duration-100" 
                            style={{ 
                                width: `${gestureFeedback.type === 'BRIGHTNESS' ? ((gestureFeedback.value - 20) / 130) * 100 : gestureFeedback.value}%` 
                            }}
                         ></div>
                     </div>
                     <span className="text-white font-bold text-xs mt-1">{Math.round(gestureFeedback.value)}%</span>
                 </div>
             )}

             {/* LOCK BUTTON */}
             <button 
                onClick={(e) => { e.stopPropagation(); toggleLock(); }}
                className={`absolute top-4 left-4 z-50 p-2 rounded-full backdrop-blur-md transition-all ${isLocked ? 'bg-red-500/80 text-white' : 'bg-black/30 text-white/50 hover:bg-black/50 hover:text-white'}`}
             >
                 {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
             </button>

             {/* CAST BUTTON (Placeholder) */}
             {!isLocked && (
                 <button 
                    className="absolute top-4 right-20 z-20 p-2 rounded-full bg-black/30 text-white/70 hover:text-white"
                    onClick={() => alert("Casting requires browser support or native app implementation.")}
                 >
                     <Cast size={20} />
                 </button>
             )}

             {/* BRANDING */}
             {!isLocked && (
                 <div className="absolute top-4 right-4 z-20 pointer-events-none opacity-60 bg-black/40 px-2 py-0.5 rounded border border-white/10">
                     <span className="text-white font-black tracking-widest text-[10px] uppercase">{brandingText}</span>
                 </div>
             )}

             {/* SETTINGS MENU */}
             {showSettings && !isLocked && (
                 <div className="absolute bottom-20 right-4 z-40 bg-black/90 text-white rounded-xl p-3 w-40 border border-white/10 backdrop-blur-md animate-in slide-in-from-bottom-2">
                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 px-2 border-b border-white/10 pb-1">Quality</p>
                     <div className="grid grid-cols-2 gap-1 mb-2">
                        {['auto', '1080p', '720p', '360p', '240p'].map(q => (
                             <button 
                                key={q} 
                                onClick={(e) => { e.stopPropagation(); changeQuality(q); }}
                                className={`text-center py-1.5 rounded text-xs font-bold ${quality === q ? 'bg-blue-600' : 'bg-white/5 hover:bg-white/10'}`}
                             >
                                 {q.toUpperCase()}
                             </button>
                         ))}
                     </div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 px-2 border-b border-white/10 pb-1">Speed</p>
                     <div className="grid grid-cols-3 gap-1">
                        {[0.5, 1, 1.25, 1.5, 2].map(s => (
                             <button 
                                key={s} 
                                onClick={(e) => { e.stopPropagation(); setSpeed(s); sendCommand('setPlaybackRate', [s]); }}
                                className={`text-center py-1 rounded-[4px] text-[10px] font-bold ${speed === s ? 'bg-green-600' : 'bg-white/5 hover:bg-white/10'}`}
                             >
                                 {s}x
                             </button>
                         ))}
                     </div>
                 </div>
             )}

             {/* CONTROLS BAR */}
             <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-4 pt-10 z-30 flex flex-col gap-2 transition-opacity duration-300 ${showControls && !isLocked ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                 
                 {/* Progress Bar */}
                 <div className="flex items-center gap-3 w-full">
                     <span className="text-[10px] text-white font-mono w-10 text-right">{formatTime(currentTime)}</span>
                     <div 
                        className="flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer relative group/bar" 
                        onClick={(e) => { e.stopPropagation(); handleProgressBarClick(e); }}
                     >
                         <div className="absolute inset-0 flex items-center">
                            <div className="h-full bg-red-600 rounded-full relative" style={{ width: `${progressPercent}%` }}>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full shadow-md scale-0 group-hover/bar:scale-125 transition-transform"></div>
                            </div>
                         </div>
                     </div>
                     <span className="text-[10px] text-white font-mono w-10">{formatTime(duration)}</span>
                 </div>

                 {/* Buttons Row */}
                 <div className="flex items-center justify-between mt-1">
                     <div className="flex items-center gap-4">
                         <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="text-white hover:text-blue-400 transition hover:scale-110">
                             {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
                         </button>

                         <div className="flex items-center gap-2">
                             <button onClick={(e) => { e.stopPropagation(); handleSkip(-10); }} className="text-white/80 hover:text-white transition p-1 hover:bg-white/10 rounded-full" title="-10s">
                                 <Rewind size={20} />
                             </button>
                             <button onClick={(e) => { e.stopPropagation(); handleSkip(10); }} className="text-white/80 hover:text-white transition p-1 hover:bg-white/10 rounded-full" title="+10s">
                                 <FastForward size={20} />
                             </button>
                         </div>
                     </div>

                     <div className="flex items-center gap-3">
                         <button onClick={(e) => { e.stopPropagation(); toggleLoop(); }} className={`transition p-1.5 rounded-lg ${isLooping ? 'text-blue-400 bg-blue-400/20' : 'text-white/70 hover:text-white'}`} title="Loop">
                             <Repeat size={18} />
                         </button>

                         <button onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }} className="text-white hover:text-blue-400 transition p-1">
                             <Settings size={20} />
                         </button>

                         <button onClick={(e) => { e.stopPropagation(); toggleZoom(); }} className="text-white hover:text-blue-400 transition p-1 flex items-center gap-1">
                             {zoomMode === 'FIT' ? <ZoomIn size={20} /> : <ZoomOut size={20} />}
                             <span className="text-[9px] font-bold uppercase">{zoomMode}</span>
                         </button>

                         <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="text-white hover:text-blue-400 transition p-1">
                             <Maximize size={20} />
                         </button>
                     </div>
                 </div>
             </div>
        </div>
    );
};
