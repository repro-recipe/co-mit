import React from 'react';

// A single tile component for styling
const Tile = ({ className, children }: { className: string, children?: React.ReactNode }) => (
    <div className={`w-10 h-16 rounded-md shadow-inner flex-shrink-0 flex items-center justify-center font-bold text-white ${className}`}>
        {children}
    </div>
);

interface RoadProps {
  totalScore: number;
}

const Road: React.FC<RoadProps> = ({ totalScore }) => {
  const pointsPerTile = 10;
  const numPositiveTiles = totalScore > 0 ? Math.floor(totalScore / pointsPerTile) : 0;
  const numNegativeTiles = totalScore < 0 ? Math.floor(Math.abs(totalScore) / pointsPerTile) : 0;
  
  // To avoid performance issues with huge scores, we can cap the visible tiles
  const visiblePositiveTiles = Math.min(numPositiveTiles, 100);
  const visibleNegativeTiles = Math.min(numNegativeTiles, 100);

  return (
    <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-center mb-6 text-sky-600 tracking-wider">コミットメントの道</h2>
      <div className="w-full overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex items-center justify-center h-24 py-2 min-w-max">
          <div className="flex-1 flex justify-end gap-1 pr-2">
            {/* Negative Tiles */}
            {Array.from({ length: visibleNegativeTiles }).map((_, i) => (
              <Tile key={`neg-${i}`} className="bg-rose-500/80" />
            )).reverse()}
          </div>

          {/* Start Tile */}
          <div className="w-24 h-20 bg-slate-600 text-white flex flex-col items-center justify-center rounded-lg shadow-xl z-10 flex-shrink-0 mx-2">
            <span className="text-xs font-bold tracking-widest">START</span>
            <span className="text-3xl font-bold font-mono">{totalScore}</span>
          </div>

          <div className="flex-1 flex justify-start gap-1 pl-2">
            {/* Positive Tiles */}
            {Array.from({ length: visiblePositiveTiles }).map((_, i) => (
              <Tile key={`pos-${i}`} className="bg-sky-500/80" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Road;
