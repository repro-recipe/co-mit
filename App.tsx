import React, { useState, useEffect, useRef } from 'react';
import type { UserSettings, Reflection, DailyTask, AppView, ChatMessage, MorningReflectionData, NightReflectionData, SideProject, Memo } from './types';
import * as geminiService from './services/geminiService';
import { BrainCircuitIcon, FlameIcon, GhostIcon, BotIcon, SendIcon, ChevronLeftIcon, ChevronRightIcon, PiggyBankIcon, CoMitLogoIcon, FileTextIcon, UsersIcon, MessageSquareIcon, TrendingUpIcon, StarIcon, SettingsIcon, CalendarIcon, ImageIcon, HelpCircleIcon } from './components/Icons';
import GrowthGraph from './components/GrowthGraph';
import RichTextEditor from './components/RichTextEditor';
import Calendar from './components/Calendar';
import CommitmentRoad from './components/Road';

// --- Helpers ---

const getLocalTodayDate = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const addDays = (dateStr: string, days: number): string => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const getDaysDiff = (date1Str: string, date2Str: string): number => {
    const d1 = new Date(date1Str);
    const d2 = new Date(date2Str);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
};

const migrateSettings = (settings: any): UserSettings => {
    const today = getLocalTodayDate();
    return {
        ...settings,
        // Map legacy longTermGoal to quarterlyGoal if missing
        quarterlyGoal: settings.quarterlyGoal || settings.longTermGoal || "",
        // Default quarterlyGoalDeadline to 90 days if missing
        quarterlyGoalDeadline: settings.quarterlyGoalDeadline || addDays(today, 90),
        commitmentStartDate: settings.commitmentStartDate || today,
        threeWeekGoal: settings.threeWeekGoal || (settings.quarterlyGoals && settings.quarterlyGoals.length > 0 ? settings.quarterlyGoals[0] : ""),
        isPrototyperRegistered: settings.isPrototyperRegistered ?? false,
        // Default to 2026-01-21 if no deadline exists (Requested by user for legacy data)
        threeWeekGoalDeadline: settings.threeWeekGoalDeadline || "2026-01-21",
        visionBoardImage: settings.visionBoardImage, // Ensure this is carried over
        hasSeenTour: settings.hasSeenTour ?? false,
    };
};

const migrateReflections = (reflections: any[]): Reflection[] => {
    return reflections.map(r => ({
        ...r,
        dailyTasks: r.dailyTasks?.map((t: any) => ({
            ...t,
            type: t.type || 'sub',
            priority: t.priority || 'medium'
        }))
    }));
};

// --- UI Components ---
const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={`bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-lg p-6 ${className}`}>
        {children}
    </div>
);

const Button: React.FC<{ onClick: () => void, children: React.ReactNode, className?: string, disabled?: boolean, type?: "button" | "submit" | "reset" }> = ({ onClick, children, className, disabled, type = "button" }) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`px-6 py-2 font-bold rounded-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
        {children}
    </button>
);

const PrimaryButton: React.FC<{ onClick: () => void, children: React.ReactNode, className?: string, disabled?: boolean }> = ({ onClick, children, className, disabled }) => (
    <Button onClick={onClick} disabled={disabled} className={`bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/30 shadow-[0_0_15px] ${className}`}>
        {children}
    </Button>
);

const SecondaryButton: React.FC<{ onClick: () => void, children: React.ReactNode, className?: string, disabled?: boolean }> = ({ onClick, children, className, disabled }) => (
    <Button onClick={onClick} disabled={disabled} className={`bg-slate-200 hover:bg-slate-300 text-slate-700 ${className}`}>
        {children}
    </Button>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
    <input 
        className={`w-full bg-slate-50 border-2 border-slate-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition text-slate-900 placeholder:text-slate-400 disabled:bg-slate-200 ${className}`}
        {...props} 
    />
);

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className, ...props }) => (
    <textarea 
        className={`w-full bg-slate-50 border-2 border-slate-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition text-slate-900 placeholder:text-slate-400 disabled:bg-slate-200 ${className}`}
        {...props} 
    />
);

const Modal: React.FC<{ isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, hideCloseButton?: boolean }> = ({ isOpen, onClose, title, children, hideCloseButton }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300" onClick={hideCloseButton ? undefined : onClose}>
            <div className="bg-white border border-slate-200 rounded-lg shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto relative animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4 text-sky-600 text-center sticky top-0 bg-white pb-2 z-10 border-b border-slate-100">{title}</h2>
                {children}
                {!hideCloseButton && (
                    <button type="button" onClick={onClose} className="absolute top-2 right-2 p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors z-20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                )}
            </div>
        </div>
    );
};

const HelpChatModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && history.length === 0) {
            setHistory([{ role: 'model', text: 'こんにちは！co-mitのサポートAIです。アプリの使い方や機能について、わからないことがあれば何でも聞いてください。' }]);
        }
    }, [isOpen]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [history, loading]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const newHistory: ChatMessage[] = [...history, { role: 'user', text: input }];
        setHistory(newHistory);
        setInput("");
        setLoading(true);
        const response = await geminiService.getHelpResponse(newHistory);
        setHistory([...newHistory, { role: 'model', text: response }]);
        setLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="AIヘルプデスク">
            <div className="flex flex-col h-[500px]">
                <div className="flex-1 overflow-y-auto bg-slate-50 p-4 rounded-lg mb-4 border border-slate-100" ref={scrollRef}>
                    {history.map((msg, i) => (
                        <div key={i} className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-sky-500 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {loading && <div className="text-xs text-slate-400 animate-pulse">AIが考え中...</div>}
                </div>
                <div className="flex gap-2">
                    <