import React from 'react';
import type { Reflection, UserSettings } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface CalendarProps {
  reflections: Reflection[];
  onDayClick: (reflection: Reflection) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  settings: UserSettings | null;
}

const Calendar: React.FC<CalendarProps> = ({ reflections, onDayClick, currentDate, setCurrentDate, settings }) => {
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
  
  const commitmentStartDateStr = settings?.commitmentStartDate;
  const goalDurationDays = settings?.goalDurationDays;

  const { commitmentStart, commitmentEnd } = React.useMemo(() => {
      if (!commitmentStartDateStr || !goalDurationDays) {
          return { commitmentStart: null, commitmentEnd: null };
      }
      const startDate = new Date(commitmentStartDateStr + 'T00:00:00');
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + goalDurationDays);
      return { commitmentStart: startDate, commitmentEnd: endDate };
  }, [commitmentStartDateStr, goalDurationDays]);


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
    <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-lg p-6 dark:bg-slate-800/70 dark:border-slate-700">
      <div className="flex justify-between items-center mb-4">
        <button type="button" onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition dark:text-slate-200">
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <h3 className="text-xl font-bold text-sky-600 dark:text-sky-400">
          {year}年 {month + 1}月
        </h3>
        <button type="button" onClick={handleNextMonth} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition dark:text-slate-200">
          <ChevronRightIcon className="w-6 h-6" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map(day => (
          <div key={day} className="font-bold text-slate-500 dark:text-slate-400 text-sm">{day}</div>
        ))}
        {blanks.map((_, i) => <div key={`blank-${i}`}></div>)}
        {days.map(day => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayDate = new Date(dateStr + 'T00:00:00');
          const reflection = reflectionsMap.get(dateStr);
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isToday = dayDate.getTime() === today.getTime();
          
          const isCommitted = commitmentStart && commitmentEnd && dayDate >= commitmentStart && dayDate < commitmentEnd;

          return (
            <button
              type="button"
              key={day}
              onClick={() => reflection && onDayClick(reflection)}
              disabled={!reflection}
              className={`relative w-full aspect-square flex items-center justify-center rounded-md transition-colors text-sm font-medium disabled:cursor-default
                ${isToday
                    ? 'bg-rose-500 text-white dark:bg-rose-600'
                    : isCommitted
                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200'
                    : reflection ? 'bg-white text-slate-700 dark:bg-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'
                }
                ${reflection && !isToday ? 'cursor-pointer hover:bg-sky-200 dark:hover:bg-slate-600' : ''}
              `}
            >
              {day}
              {reflection && (
                <span className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 ${isToday ? 'bg-white' : 'bg-sky-500 dark:bg-sky-400'} rounded-full`}></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;