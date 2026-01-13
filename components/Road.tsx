import React, { useRef, useEffect } from 'react';
import { CoMitLogoIcon, StarIcon } from './Icons';

interface CommitmentRoadProps {
  totalScore: number;
}

const CommitmentRoad: React.FC<CommitmentRoadProps> = ({ totalScore }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Configuration
  const pxPerPoint = 10; // 1 point = 10px (Linear scale)
  
  // Calculate rendering bounds dynamically
  // Ensure we always render a bit behind and ahead of the user/milestones
  const milestones = [50, 100, 250, 500, 1000, 2000, 3000];
  const negativeMilestones = [-50, -100];
  
  const allPoints = [...milestones, ...negativeMilestones, totalScore, 0];
  const minPoint = Math.min(...allPoints) - 100;
  const maxPoint = Math.max(...allPoints) + 200;
  
  const width = (maxPoint - minPoint) * pxPerPoint;
  const zeroOffset = -minPoint * pxPerPoint; // The x-position of the '0' score

  const getX = (score: number) => zeroOffset + score * pxPerPoint;

  // Auto-scroll to center the player
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const playerX = getX(totalScore);
      const containerWidth = container.clientWidth;
      
      // Calculate scroll position to center the player
      const scrollPos = playerX - containerWidth / 2;
      
      container.scrollTo({
        left: scrollPos,
        behavior: 'smooth'
      });
    }
  }, [totalScore, width]);

  // Generate ruler ticks
  const renderTicks = () => {
    const ticks = [];
    const startTick = Math.ceil(minPoint / 50) * 50;
    const endTick = Math.floor(maxPoint / 50) * 50;

    for (let i = startTick; i <= endTick; i += 50) {
      const x = getX(i);
      if (i === 0) continue; // Skip 0 as we handle it separately
      ticks.push(
        <div key={i} className="absolute bottom-0 translate-x-[-50%] flex flex-col items-center" style={{ left: `${x}px` }}>
          <div className="h-4 w-0.5 bg-slate-300"></div>
          {i % 100 === 0 && <span className="text-[10px] text-slate-400 mt-1 font-mono">{i}</span>}
        </div>
      );
    }
    return ticks;
  };

  return (
    <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-lg p-6 relative">
      <h2 className="text-xl font-bold text-center mb-4 text-sky-600 tracking-wider">コミットメントへの道</h2>
      
      {/* Scrollable Container */}
      <div 
        ref={scrollContainerRef}
        className="w-full overflow-x-auto pb-6 relative hide-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Hide scrollbar for cleaner look
      >
        <div className="relative h-40" style={{ width: `${width}px` }}>
          
          {/* The Road Line */}
          <div className="absolute top-1/2 left-0 w-full h-2 bg-slate-100 rounded-full overflow-visible transform -translate-y-1/2">
             {/* Progress Fill */}
             <div 
               className={`absolute top-0 h-full rounded-full transition-all duration-500 opacity-50 ${totalScore >= 0 ? 'bg-sky-200' : 'bg-rose-200'}`}
               style={{ 
                 left: totalScore >= 0 ? `${getX(0)}px` : `${getX(totalScore)}px`,
                 width: `${Math.abs(totalScore * pxPerPoint)}px`
               }}
             />
          </div>

          {/* Center Zero Marker */}
          <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-0" style={{ left: `${getX(0)}px`, transform: 'translate(-50%, -50%)' }}>
             <div className="h-32 w-0.5 bg-slate-300 border-l border-dashed border-slate-400"></div>
             <span className="absolute bottom-[-24px] text-xs font-bold text-slate-500">START</span>
          </div>

          {/* Ticks */}
          <div className="absolute top-1/2 left-0 w-full h-full pointer-events-none">
             {renderTicks()}
          </div>

          {/* Milestones */}
          {milestones.map(ms => (
              <div key={ms} className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-10" style={{ left: `${getX(ms)}px`, transform: 'translate(-50%, -50%)' }}>
                  <StarIcon className="w-6 h-6 text-amber-400 drop-shadow-sm mb-2" />
                  <div className="h-3 w-0.5 bg-amber-200 mb-1"></div>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">{ms}</span>
              </div>
          ))}
          
          {negativeMilestones.map(ms => (
              <div key={ms} className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center z-10" style={{ left: `${getX(ms)}px`, transform: 'translate(-50%, -50%)' }}>
                  <div className="w-4 h-4 rounded-full bg-rose-300 shadow-sm mb-2" />
                  <span className="text-xs font-bold text-rose-500">{ms}</span>
              </div>
          ))}

          {/* Player Icon */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 z-20 transition-all duration-500 ease-out" 
            style={{ left: `${getX(totalScore)}px`, transform: 'translate(-50%, -50%)' }}
          >
              <div className="relative group">
                <CoMitLogoIcon className="w-12 h-16 text-sky-600 drop-shadow-xl filter" />
                
                {/* Score Bubble */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-lg flex flex-col items-center">
                    <span>現在地</span>
                    <span className="text-lg leading-none">{totalScore} pt</span>
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                </div>
              </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CommitmentRoad;