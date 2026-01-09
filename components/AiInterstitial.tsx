
import React, { useEffect, useState, useRef } from 'react';

import { User } from '../types';

interface Props {
  onComplete: () => void;
  userType?: 'FREE' | 'PREMIUM';
  user?: User;
  customImage?: string; // Optional: Admin configured image
  imageUrl?: string; // For backward compatibility if needed, but we prefer customImage
}

export const AiInterstitial: React.FC<Props> = ({ onComplete, userType, user, customImage, imageUrl }) => {
  // Determine Type
  let type = userType;
  if (!type && user) {
      const isPremium = user.isPremium && user.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date();
      type = isPremium ? 'PREMIUM' : 'FREE';
  }
  
  const duration = type === 'FREE' ? 10 : 3; // 10s vs 3s
  const [timeLeft, setTimeLeft] = useState(duration);
  
  const displayImage = customImage || imageUrl;
  
  // Use ref to keep track of the latest onComplete callback without restarting the effect
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
      onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Single effect for timer logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onCompleteRef.current(); // Call the latest callback
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []); // Run once on mount

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-sm animate-in fade-in duration-300">
        {/* Admin Configured Image or Professional Brain/AI Animation Simulation */}
        <div className="relative mb-8 flex flex-col items-center">
            {displayImage ? (
                <div className="w-full max-w-sm rounded-xl overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.5)] border-4 border-blue-500/30 mb-6">
                    <img src={displayImage} alt="AI Working" className="w-full h-auto object-cover animate-pulse" />
                </div>
            ) : (
                <div className="relative w-32 h-32 mb-4">
                    <div className="w-32 h-32 rounded-full border-4 border-blue-500/30 animate-ping absolute top-0 left-0"></div>
                    <div className="w-32 h-32 rounded-full border-4 border-blue-400 animate-[spin_3s_linear_infinite] flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)] bg-slate-800">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 animate-pulse flex items-center justify-center">
                           <span className="text-4xl">🧠</span>
                        </div>
                    </div>
                </div>
            )}
            
            <h3 className="text-2xl font-black text-white tracking-widest uppercase mb-2 animate-pulse text-center">
                AI is Working...
            </h3>
            <p className="text-blue-200 text-sm font-medium animate-bounce text-center">
                Preparing professional content for you
            </p>
            
            {/* Timer Display */}
            <div className="mt-6 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700 text-slate-300 text-xs font-mono">
                Please wait {timeLeft}s
            </div>
        </div>
    </div>
  );
};
