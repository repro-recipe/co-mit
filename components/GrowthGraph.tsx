
import React, { useMemo } from 'react';
import type { Reflection } from '../types';
import { TrendingUpIcon } from './Icons';

interface GrowthGraphProps {
  reflections: Reflection[];
}

const GrowthGraph: React.FC<GrowthGraphProps> = ({ reflections }) => {
  // Process data for the chart
  const data = useMemo(() => {
    // 1. Sort reflections by date
    const sorted = [...reflections].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // 2. Calculate cumulative score
    let cumulative = 0;
    const points = sorted.map(r => {
      cumulative += (r.score || 0);
      return { date: r.date, score: cumulative, rawScore: r.score };
    });

    // Add a starting point if empty
    if (points.length === 0) {
      return [{ date: 'Start', score: 0 }];
    }
    
    // Ensure we start from 0 if the first point isn't 0 (visual preference)
    if (points.length > 0) {
        points.unshift({ date: 'Start', score: 0, rawScore: 0 });
    }

    return points;
  }, [reflections]);

  if (data.length < 2) {
    return (
      <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-lg p-6 flex flex-col items-center justify-center min-h-[200px]">
        <TrendingUpIcon className="w-12 h-12 text-slate-300 mb-2" />
        <p className="text-slate-500 font-bold">まだデータがありません</p>
        <p className="text-slate-400 text-sm">日々の活動を記録すると、ここに成長グラフが表示されます。</p>
      </div>
    );
  }

  // Chart Dimensions
  const width = 800;
  const height = 250;
  const padding = 40;

  // Scales
  const maxScore = Math.max(...data.map(d => d.score), 100); // Minimum max height
  const minScore = Math.min(...data.map(d => d.score), 0);
  
  const getX = (index: number) => {
    return padding + (index / (data.length - 1)) * (width - padding * 2);
  };

  const getY = (score: number) => {
    // Normalize score between min and max
    const range = maxScore - minScore;
    const normalized = (score - minScore) / (range || 1); 
    return height - padding - (normalized * (height - padding * 2));
  };

  // Generate SVG Path for Area
  const areaPath = `
    M ${getX(0)},${height - padding} 
    ${data.map((d, i) => `L ${getX(i)},${getY(d.score)}`).join(' ')}
    L ${getX(data.length - 1)},${height - padding} 
    Z
  `;

  // Generate SVG Path for Line
  const linePath = `
    M ${getX(0)},${getY(data[0].score)} 
    ${data.map((d, i) => `L ${getX(i)},${getY(d.score)}`).join(' ')}
  `;

  return (
    <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
         <TrendingUpIcon className="w-6 h-6 text-sky-500" />
         成長の軌跡
      </h2>
      <div className="w-full overflow-x-auto">
        <div className="min-w-[600px]">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                <defs>
                <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                </linearGradient>
                </defs>

                {/* Grid Lines (Horizontal) */}
                {[0, 0.25, 0.5, 0.75, 1].map(t => {
                    const y = padding + t * (height - padding * 2);
                    return <line key={t} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeDasharray="4" />;
                })}

                {/* Area */}
                <path d={areaPath} fill="url(#gradient)" />

                {/* Line */}
                <path d={linePath} fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                {/* Points */}
                {data.map((d, i) => (
                <circle 
                    key={i} 
                    cx={getX(i)} 
                    cy={getY(d.score)} 
                    r="4" 
                    className="fill-white stroke-sky-500 stroke-2 hover:r-6 transition-all cursor-pointer"
                >
                    <title>{d.date}: {d.score}pts</title>
                </circle>
                ))}

                {/* Labels (Last Point) */}
                <text x={getX(data.length - 1)} y={getY(data[data.length - 1].score) - 10} textAnchor="middle" className="text-xs font-bold fill-slate-600">
                    {data[data.length - 1].score}
                </text>
            </svg>
        </div>
      </div>
    </div>
  );
};

export default GrowthGraph;
