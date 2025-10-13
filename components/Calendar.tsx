import React from 'react';
import type { Reflection } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface CalendarProps {
  reflections: Reflection[];
  onDayClick: (reflection: Reflection) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

const Calendar: React.FC<CalendarProps> = ({ reflections, onDayClick, currentDate, setCurrentDate }) => {
  const reflectionsMap = React.useMemo(() => {
    const map = new Map<string, Reflection>();
    for (const r of reflections) {
      if(r.morning && r.night) {
        map.set(r.date, r);
      }
    }
    return map;
  }, [reflections]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const blanks = Array(firstDayOfMonth).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-slate-200 transition">
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <h3 className="text-xl font-bold text-sky-600">
          {year}年 {month + 1}月
        </h3>
        <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-slate-200 transition">
          <ChevronRightIcon className="w-6 h-6" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map(day => (
          <div key={day} className="font-bold text-slate-500 text-sm">{day}</div>
        ))}
        {blanks.map((_, i) => <div key={`blank-${i}`}></div>)}
        {days.map(day => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const reflection = reflectionsMap.get(dateStr);
          const isToday = new Date().toISOString().split('T')[0] === dateStr;

          return (
            <button
              key={day}
              onClick={() => reflection && onDayClick(reflection)}
              disabled={!reflection}
              className={`relative w-full aspect-square flex items-center justify-center rounded-full transition-colors text-sm
                ${reflection ? 'cursor-pointer hover:bg-sky-200' : 'text-slate-400'}
                ${isToday ? 'font-bold ring-2 ring-sky-500' : ''}
              `}
            >
              {day}
              {reflection && (
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-sky-500 rounded-full"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
