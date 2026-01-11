
import React, { useState, useEffect, useRef } from 'react';
import type { UserSettings, Reflection, DailyTask, AppView, ChatMessage, MorningReflectionData, NightReflectionData, SideProject, Memo, WastedTimeLog } from './types';
import * as geminiService from './services/geminiService';
import { BrainCircuitIcon, FlameIcon, GhostIcon, BotIcon, SendIcon, ChevronLeftIcon, ChevronRightIcon, PiggyBankIcon, CoMitLogoIcon, FileTextIcon, UsersIcon, MessageSquareIcon, TrendingUpIcon, StarIcon, SettingsIcon, CalendarIcon, ImageIcon, SunIcon, MoonIcon, HelpIcon } from './components/Icons';
import GrowthGraph from './components/GrowthGraph';
import RichTextEditor from './components/RichTextEditor';
import Calendar from './components/Calendar';

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
    
    // Determine deadline for existing users (legacy migration) vs new usage
    let deadline = settings.quarterlyGoalDeadline;
    if (!deadline) {
        if (settings.commitmentStartDate) {
            // Existing user with history -> Set specific legacy deadline
            deadline = "2026-03-31"; 
        } else {
            // Very new or fresh state -> 90 days from now
            deadline = addDays(today, 90);
        }
    }

    return {
        ...settings,
        commitmentStartDate: settings.commitmentStartDate || today,
        // Map longTermGoal to quarterlyGoal if migrating
        quarterlyGoal: settings.quarterlyGoal || settings.longTermGoal || "",
        quarterlyGoalDeadline: deadline,
        threeWeekGoal: settings.threeWeekGoal || (settings.quarterlyGoals && settings.quarterlyGoals.length > 0 ? settings.quarterlyGoals[0] : ""),
        isPrototyperRegistered: settings.isPrototyperRegistered ?? false,
        threeWeekGoalDeadline: settings.threeWeekGoalDeadline || "2026-01-21",
        visionBoardImage: settings.visionBoardImage,
        hasSeenTour: settings.hasSeenTour ?? false, // New users default to false
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
    <div className={`bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-lg p-6 dark:bg-slate-800/70 dark:border-slate-700/80 ${className}`}>
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
    <Button onClick={onClick} disabled={disabled} className={`bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/30 shadow-[0_0_15px] dark:bg-sky-600 dark:hover:bg-sky-500 dark:shadow-sky-600/20 ${className}`}>
        {children}
    </Button>
);

const SecondaryButton: React.FC<{ onClick: () => void, children: React.ReactNode, className?: string, disabled?: boolean }> = ({ onClick, children, className, disabled }) => (
    <Button onClick={onClick} disabled={disabled} className={`bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 ${className}`}>
        {children}
    </Button>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
    <input 
        className={`w-full bg-slate-50 border-2 border-slate-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition text-slate-900 placeholder:text-slate-400 disabled:bg-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800 ${className}`}
        {...props} 
    />
);

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className, ...props }) => (
    <textarea 
        className={`w-full bg-slate-50 border-2 border-slate-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition text-slate-900 placeholder:text-slate-400 disabled:bg-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800 ${className}`}
        {...props} 
    />
);

const Modal: React.FC<{ isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, hideCloseButton?: boolean }> = ({ isOpen, onClose, title, children, hideCloseButton }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300" onClick={hideCloseButton ? undefined : onClose}>
            <div className="bg-white border border-slate-200 rounded-lg shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto relative animate-fade-in-up dark:bg-slate-800 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4 text-sky-600 text-center sticky top-0 bg-white dark:bg-slate-800 pb-2 z-10 border-b border-slate-100 dark:border-slate-700 dark:text-sky-400">{title}</h2>
                {children}
                {!hideCloseButton && (
                    <button type="button" onClick={onClose} className="absolute top-2 right-2 p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors z-20 dark:hover:text-slate-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                )}
            </div>
        </div>
    );
};

const HelpModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && history.length === 0) {
            setHistory([{ role: 'model', text: "こんにちは！co-mitのAIサポートです。アプリの使い方や機能について、何かお困りですか？" }]);
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

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="AIヘルプ">
            <div className="flex flex-col h-[400px]">
                <div className="flex-1 overflow-y-auto bg-slate-50 p-4 rounded mb-4 border border-slate-200 dark:bg-slate-900 dark:border-slate-700" ref={scrollRef}>
                    {history.map((msg, i) => (
                        <div key={i} className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-sky-500 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {loading && <div className="text-xs text-slate-400 animate-pulse">AIが入力中...</div>}
                </div>
                <div className="flex gap-2">
                    <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="質問を入力..." className="flex-1" />
                    <button onClick={handleSend} disabled={!input || loading} className="p-2 bg-sky-500 text-white rounded hover:bg-sky-600"><SendIcon className="w-5 h-5"/></button>
                </div>
            </div>
        </Modal>
    );
};

const TourTooltip: React.FC = () => (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-slate-800 text-white p-4 rounded-xl shadow-2xl z-50 animate-bounce dark:bg-white dark:text-slate-900">
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-800 rotate-45 dark:bg-white"></div>
        <p className="font-bold text-sm text-center">まずはここから！<br/>今日の計画を立てましょう。</p>
    </div>
);

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center h-full min-h-[200px]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-500"></div>
    </div>
);

const LoadingOverlay: React.FC = () => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm transition-opacity animate-fade-in">
        <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3 dark:bg-slate-800">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-sky-500 dark:border-slate-600 dark:border-t-sky-400"></div>
            <p className="text-sm font-bold text-slate-600 animate-pulse dark:text-slate-300">AI思考中...</p>
        </div>
    </div>
);

const PrototypeRegistrationModal: React.FC<{ onRegister: () => void }> = ({ onRegister }) => (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden relative transform transition-all scale-100 dark:bg-slate-800">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-400"></div>
             <div className="p-8 md:p-10 text-center">
                <div className="mb-6 inline-flex items-center justify-center p-4 rounded-full bg-sky-50 text-sky-600 mb-6 ring-4 ring-sky-50/50 dark:bg-sky-900/30 dark:text-sky-400 dark:ring-sky-900/50">
                    <CoMitLogoIcon className="w-16 h-20" />
                </div>
                
                <h2 className="text-2xl font-black text-slate-800 mb-2 dark:text-slate-100">co-mit プロトタイプ</h2>
                <div className="flex justify-center mb-6">
                    <span className="bg-sky-100 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-widest uppercase border border-sky-200 dark:bg-sky-900 dark:text-sky-300 dark:border-sky-800">Early Access</span>
                </div>

                <p className="text-lg font-bold text-slate-700 mb-2 dark:text-slate-200">
                    「振り返り、実践することで<br/>行動改善に革命を！！」
                </p>
                <p className="text-slate-500 text-sm leading-relaxed mb-8 dark:text-slate-400">
                    AIパートナーと共に目標達成を目指す<br/>
                    新しい習慣形成アプリへようこそ。<br/>
                    現在はプロトタイプ期間中です。
                </p>

                <button 
                    type="button"
                    onClick={onRegister}
                    className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-xl shadow-xl hover:bg-slate-800 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 group dark:bg-sky-600 dark:hover:bg-sky-500"
                >
                    <span>革命に参加する</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
             </div>
        </div>
    </div>
);

const Clock: React.FC = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return (
        <div className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full shadow-md text-xs font-mono font-bold text-slate-600 border border-slate-200 flex gap-2 items-center dark:bg-slate-800/90 dark:text-slate-300 dark:border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {getLocalTodayDate(time)} {time.toLocaleTimeString()}
        </div>
    );
};

const Header: React.FC<{ title: string, onBack?: () => void }> = ({ title, onBack }) => (
    <header className="flex items-center mb-6">
        {onBack && (
            <button type="button" onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-slate-200 transition dark:hover:bg-slate-700 dark:text-slate-200">
                <ChevronLeftIcon className="w-6 h-6" />
            </button>
        )}
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight dark:text-slate-100">{title}</h1>
    </header>
);

const JournalDetail: React.FC<{ reflection: Reflection }> = ({ reflection }) => (
    <div className="space-y-8 animate-fade-in">
        <div className="text-center">
            <div className="inline-block px-4 py-1 bg-sky-100 text-sky-700 rounded-full font-bold text-sm mb-2 dark:bg-sky-900/50 dark:text-sky-300">
                スコア: {reflection.score || 0}点
            </div>
            <p className="text-slate-500 text-sm dark:text-slate-400">記録日: {reflection.date}</p>
        </div>

        {reflection.morning && (
            <div className="bg-white border border-yellow-100 rounded-xl p-6 shadow-sm relative overflow-hidden dark:bg-slate-800 dark:border-yellow-900/50">
                <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400 dark:bg-yellow-600"></div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 dark:text-slate-200">
                    <span className="text-2xl">☀️</span> 朝の作戦会議
                </h3>
                {reflection.morning.freeMemo && (
                    <div className="mb-4">
                        <p className="text-xs font-bold text-slate-400 mb-1 dark:text-slate-500">フリーメモ</p>
                        <div className="text-slate-700 bg-yellow-50/50 p-3 rounded dark:text-slate-300 dark:bg-yellow-900/20" dangerouslySetInnerHTML={{ __html: reflection.morning.freeMemo }} />
                    </div>
                )}
            </div>
        )}

        {reflection.dailyTasks && reflection.dailyTasks.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 dark:text-slate-200">
                    <span className="text-2xl">📝</span> タスク実行結果
                </h3>
                <ul className="space-y-2">
                    {reflection.dailyTasks.map((task, i) => (
                        <li key={i} className={`flex items-center p-3 rounded border ${task.completed ? 'bg-sky-50 border-sky-100 dark:bg-sky-900/20 dark:border-sky-800' : 'bg-slate-50 border-slate-100 dark:bg-slate-900 dark:border-slate-700'}`}>
                            <span className={`mr-2 ${task.completed ? 'text-sky-500' : 'text-slate-300 dark:text-slate-600'}`}>
                                {task.completed ? '✔' : '◻'}
                            </span>
                            <span className={task.completed ? 'text-slate-500 line-through dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}>{task.text}</span>
                            {task.type === 'main' && <span className="ml-auto text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded dark:bg-rose-900/30 dark:text-rose-400">MAIN</span>}
                        </li>
                    ))}
                </ul>
            </div>
        )}

        {reflection.night && (
            <div className="bg-white border border-indigo-100 rounded-xl p-6 shadow-sm relative overflow-hidden dark:bg-slate-800 dark:border-indigo-900/50">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 dark:bg-indigo-600"></div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 dark:text-slate-200">
                    <span className="text-2xl">🌙</span> 夜の振り返り
                </h3>
                <div className="space-y-4">
                    {reflection.night.freeMemo && (
                        <div>
                             <p className="text-xs font-bold text-slate-400 mb-1 dark:text-slate-500">振り返り・感情</p>
                             <div className="text-slate-700 bg-indigo-50/50 p-3 rounded dark:text-slate-300 dark:bg-indigo-900/20" dangerouslySetInnerHTML={{ __html: reflection.night.freeMemo }} />
                        </div>
                    )}
                    {reflection.night.wastedTimeLogs && reflection.night.wastedTimeLogs.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-slate-400 mb-1 dark:text-slate-500">無駄にした時間</p>
                            <div className="bg-rose-50 p-3 rounded border border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/50">
                                <ul className="list-disc list-inside text-rose-600 mb-2 dark:text-rose-400">
                                    {reflection.night.wastedTimeLogs.map((log, idx) => (
                                        <li key={idx} className="text-sm">
                                            {log.activity} <span className="font-bold">({log.minutes}分)</span>
                                        </li>
                                    ))}
                                </ul>
                                {reflection.night.wastedTimeMinutes !== undefined && (
                                     <p className="text-right text-xs font-bold text-rose-400">合計: {reflection.night.wastedTimeMinutes}分 (減点: -{Math.floor(reflection.night.wastedTimeMinutes / 10)})</p>
                                )}
                            </div>
                        </div>
                    )}
                    {!reflection.night.wastedTimeLogs && reflection.night.wastedTime && (
                         <div>
                             <p className="text-xs font-bold text-slate-400 mb-1 dark:text-slate-500">無駄にした時間</p>
                             <p className="text-rose-600 bg-rose-50 p-2 rounded border border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/50">{reflection.night.wastedTime}</p>
                        </div>
                    )}
                    
                    {reflection.night.extras && reflection.night.extras.length > 0 && (
                        <div>
                             <p className="text-xs font-bold text-slate-400 mb-1 dark:text-slate-500">プラスアルファの積み上げ</p>
                             <ul className="list-disc list-inside text-emerald-600 bg-emerald-50 p-2 rounded border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50">
                                {reflection.night.extras.map((e, i) => <li key={i}>{e}</li>)}
                             </ul>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
);

// --- Sub Views ---

const SettingsView: React.FC<{ settings: UserSettings, onSave: (settings: UserSettings) => void, onBack: () => void }> = ({ settings, onSave, onBack }) => {
    const [longTermGoal, setLongTermGoal] = useState(settings.quarterlyGoal);
    const [quarterlyDeadline, setQuarterlyDeadline] = useState(settings.quarterlyGoalDeadline);
    const [threeWeekGoal, setThreeWeekGoal] = useState(settings.threeWeekGoal || "");
    const [threeWeekGoalDeadline, setThreeWeekGoalDeadline] = useState(settings.threeWeekGoalDeadline || "");

    const handleSave = () => {
        onSave({ ...settings, quarterlyGoal: longTermGoal, quarterlyGoalDeadline: quarterlyDeadline, threeWeekGoal, threeWeekGoalDeadline });
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <Header title="設定・目標編集" onBack={onBack} />
            <div className="space-y-6">
                <div>
                    <h3 className="font-bold text-slate-700 mb-2 dark:text-slate-300">3ヶ月の抱負 (四半期目標)</h3>
                    <TextArea 
                        value={longTermGoal} 
                        onChange={(e) => setLongTermGoal(e.target.value)} 
                        rows={3} 
                        placeholder="3ヶ月後の理想の状態..."
                        className="mb-2"
                    />
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">期限設定</label>
                        <Input 
                            type="date"
                            value={quarterlyDeadline} 
                            onChange={(e) => setQuarterlyDeadline(e.target.value)} 
                        />
                    </div>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <h3 className="font-bold text-slate-700 mb-2 dark:text-slate-300">
                        三週間後
                        {threeWeekGoalDeadline ? ` (${threeWeekGoalDeadline.replace(/-/g, '/')}) ` : ' '}
                        のゴール
                    </h3>
                    <div className="space-y-3">
                        <Input 
                            value={threeWeekGoal} 
                            onChange={(e) => setThreeWeekGoal(e.target.value)} 
                            placeholder="短く覚えやすいスローガン..." 
                        />
                         <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">期限設定</label>
                            <Input 
                                type="date"
                                value={threeWeekGoalDeadline} 
                                onChange={(e) => setThreeWeekGoalDeadline(e.target.value)} 
                            />
                        </div>
                    </div>
                </div>
                
                <div className="pt-4">
                    <PrimaryButton onClick={handleSave} className="w-full">
                        変更を保存
                    </PrimaryButton>
                </div>
            </div>
        </Card>
    );
};

const VisionBoardCreationView: React.FC<{
    settings: UserSettings;
    onSave: (imageUrl: string) => void;
    onBack: () => void;
}> = ({ settings, onSave, onBack }) => {
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [visionImage, setVisionImage] = useState<string | null>(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatHistory.length === 0) {
            setChatHistory([{
                role: 'model',
                text: `現在の3週間ゴール：「${settings.threeWeekGoal}」\n\nこのゴールを達成した時の最高の瞬間をイメージして、ビジョンボードを描きましょう。\n\nその時、あなたはどこにいて、どんな景色を見ていますか？`
            }]);
        }
    }, [settings.threeWeekGoal]);

    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chatHistory, isChatLoading, isGeneratingImage]);

    const handleChatSend = async () => {
        if (!chatInput.trim()) return;
        const userMsg = { role: 'user' as const, text: chatInput };
        const newHistory = [...chatHistory, userMsg];
        setChatHistory(newHistory);
        setChatInput("");
        setIsChatLoading(true);
        const responseText = await geminiService.visionBoardChat(newHistory, settings.quarterlyGoal);
        setChatHistory([...newHistory, { role: 'model', text: responseText }]);
        setIsChatLoading(false);
    };

    const handleGenerateVisionBoard = async () => {
        setIsGeneratingImage(true);
        const imageUrl = await geminiService.generateVisionBoardImage(chatHistory, settings.quarterlyGoal);
        setVisionImage(imageUrl);
        setIsGeneratingImage(false);
    };

    return (
        <Card className="max-w-2xl mx-auto h-[600px] flex flex-col">
            <Header title="ビジョンボード作成" onBack={onBack} />
            
            {!visionImage ? (
                <>
                    <div className="flex-1 overflow-y-auto bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200 dark:bg-slate-900 dark:border-slate-700" ref={chatScrollRef}>
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-sky-500 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isChatLoading && <div className="text-xs text-slate-400 animate-pulse">AIが考え中...</div>}
                        
                        {isGeneratingImage && (
                            <div className="flex flex-col items-center justify-center p-6 bg-slate-100 rounded-lg animate-pulse my-4 dark:bg-slate-900">
                                <ImageIcon className="w-10 h-10 text-slate-300 mb-2" />
                                <p className="text-xs text-slate-500 dark:text-slate-400">ビジョンボードを描いています...</p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 mb-4">
                        <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChatSend()} placeholder="返信を入力..." className="flex-1" disabled={isGeneratingImage} />
                        <button type="button" onClick={handleChatSend} disabled={!chatInput || isChatLoading || isGeneratingImage} className="bg-sky-500 text-white p-2 rounded hover:bg-sky-600 transition disabled:opacity-50"><SendIcon className="w-5 h-5"/></button>
                    </div>

                    {chatHistory.length > 2 && !isGeneratingImage && (
                        <div className="mb-2">
                            <button 
                                onClick={handleGenerateVisionBoard}
                                className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                            >
                                <ImageIcon className="w-5 h-5" />
                                <span>この内容でビジョンボードを描く</span>
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full animate-fade-in">
                    <img src={visionImage} alt="Generated Vision Board" className="max-h-[300px] rounded-lg shadow-xl border-4 border-white mb-6" />
                    <p className="text-slate-600 font-bold mb-4 text-center dark:text-slate-300">ビジョンボードが完成しました！</p>
                    <div className="flex gap-4 w-full">
                        <SecondaryButton onClick={() => setVisionImage(null)} className="flex-1">描き直す</SecondaryButton>
                        <PrimaryButton onClick={() => onSave(visionImage)} className="flex-1">保存して完了</PrimaryButton>
                    </div>
                </div>
            )}
        </Card>
    );
};

const SetupView: React.FC<{ onSave: (settings: UserSettings) => void; setLoading: (loading: boolean) => void }> = ({ onSave, setLoading }) => {
    const [step, setStep] = useState(1);
    const [commitmentField, setCommitmentField] = useState("");
    const [longTermGoal, setLongTermGoal] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    
    // Step 3 Chat State
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [threeWeekGoal, setThreeWeekGoal] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);
    // Vision Board State
    const [visionImage, setVisionImage] = useState<string | null>(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    const chatScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (step === 3 && chatHistory.length === 0) {
            setChatHistory([{
                role: 'model',
                text: `「${longTermGoal}」。素晴らしいと思います。\n\nそれでは、もう少し短期で考えてみましょう。あなたの**3週間後の夢**は何ですか？`
            }]);
        }
    }, [step, longTermGoal]);

    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chatHistory]);

    const handleGenerateSuggestions = async () => {
        if (!commitmentField) return;
        setLoading(true);
        const newSuggestions = await geminiService.generateGoalSuggestions(commitmentField);
        setSuggestions(newSuggestions);
        setLoading(false);
    };

    const handleChatSend = async () => {
        if (!chatInput.trim()) return;
        const userMsg = { role: 'user' as const, text: chatInput };
        const newHistory = [...chatHistory, userMsg];
        setChatHistory(newHistory);
        setChatInput("");
        setIsChatLoading(true);
        const responseText = await geminiService.visionBoardChat(newHistory, longTermGoal);
        setChatHistory([...newHistory, { role: 'model', text: responseText }]);
        setIsChatLoading(false);
    };

    const handleFinishChat = async () => {
        setLoading(true);
        const goal = await geminiService.generateGoalFromChat(chatHistory);
        setThreeWeekGoal(goal);
        setLoading(false);
    };

    const handleGenerateVisionBoard = async () => {
        setIsGeneratingImage(true);
        const imageUrl = await geminiService.generateVisionBoardImage(chatHistory, longTermGoal);
        setVisionImage(imageUrl);
        setIsGeneratingImage(false);
    };

    const handleSave = () => {
        const today = getLocalTodayDate();
        const settings: UserSettings = {
            quarterlyGoal: longTermGoal, // Mapped to quarterlyGoal
            quarterlyGoalDeadline: addDays(today, 90), // New users get 90 days from today
            threeWeekGoal,
            threeWeekGoalDeadline: addDays(today, 21), // Set initial deadline
            yearStartMonth: new Date().getMonth(),
            commitmentStartDate: today,
            goalDurationDays: 365,
            depositAmount: 0,
            visionBoardImage: visionImage || undefined,
            hasSeenTour: false, // Initial value for new users
        };
        onSave(settings);
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="animate-fade-in">
                        <h2 className="text-2xl font-bold mb-4 text-center text-slate-800 dark:text-slate-100">これからコミットを始めていきましょう！</h2>
                        <p className="text-slate-600 mb-8 text-center dark:text-slate-400">この後詳細に目標を決めていくので、まずは分野を決めましょう！</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                            {["Web開発", "英語学習", "筋トレ", "研究", "受験勉強"].map(s => (
                                <button 
                                    key={s}
                                    type="button"
                                    onClick={() => setCommitmentField(s)}
                                    className={`p-3 rounded-xl border transition-all font-bold text-sm ${commitmentField === s ? 'bg-sky-500 text-white border-sky-500 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-sky-50 hover:border-sky-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        <div className="mb-2">
                            <label className="text-xs font-bold text-slate-400 mb-1 block dark:text-slate-500">その他の分野</label>
                            <Input value={commitmentField} onChange={(e) => setCommitmentField(e.target.value)} placeholder="自由に入力してください" />
                        </div>
                        
                        <PrimaryButton onClick={() => setStep(2)} disabled={!commitmentField} className="mt-6 w-full py-3 text-lg">次へ</PrimaryButton>
                    </div>
                );
            case 2:
                return (
                    <>
                        <h2 className="text-xl font-semibold mb-4 dark:text-slate-100">Step 2: 3ヶ月の抱負</h2>
                        <div className="mb-4 p-3 bg-slate-100 rounded-lg dark:bg-slate-700">
                            <span className="text-xs font-bold text-slate-500 block uppercase dark:text-slate-400">選択した分野</span>
                            <p className="text-slate-800 font-semibold dark:text-slate-200">{commitmentField}</p>
                        </div>
                        <p className="text-slate-600 mb-4 dark:text-slate-400">まずは3ヶ月の抱負を言葉にしましょう。</p>
                        <TextArea value={longTermGoal} onChange={(e) => setLongTermGoal(e.target.value)} placeholder="例：技術を楽しみながら、周りから頼られるエンジニアになる" rows={3} className="mb-4"/>
                        <div className="flex justify-end mb-6">
                             <SecondaryButton onClick={handleGenerateSuggestions} className="flex items-center gap-2 text-sm">
                                <BotIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                                AIに抱負のアイデアを提案してもらう
                            </SecondaryButton>
                        </div>
                        {suggestions.length > 0 && (
                            <div className="mb-6">
                                <p className="text-sm text-slate-500 mb-2 font-bold dark:text-slate-400">AIからの提案:</p>
                                <div className="grid gap-2">
                                    {suggestions.map((s, i) => (
                                        <button type="button" key={i} onClick={() => setLongTermGoal(s)} className="w-full text-left p-3 bg-white border border-slate-200 hover:border-sky-400 hover:bg-sky-50 rounded-md transition shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:hover:border-sky-500 dark:hover:bg-slate-700 dark:text-slate-200">
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3 mt-8">
                            <SecondaryButton onClick={() => setStep(1)} className="flex-1">戻る</SecondaryButton>
                            <PrimaryButton onClick={() => setStep(3)} disabled={!longTermGoal} className="flex-1">次へ</PrimaryButton>
                        </div>
                    </>
                );
            case 3:
                return (
                    <>
                        <h2 className="text-xl font-semibold mb-2 dark:text-slate-100">Step 3: 3週間後のビジョン</h2>
                        {!threeWeekGoal ? (
                            <div className="flex flex-col h-[500px]">
                                <p className="text-slate-600 text-sm mb-2 dark:text-slate-400">AIコーチと対話して、3週間後の「最高にワクワクする状態」を具体化しましょう。</p>
                                
                                <div className="flex-1 overflow-y-auto bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200 dark:bg-slate-900 dark:border-slate-700" ref={chatScrollRef}>
                                    {chatHistory.map((msg, i) => (
                                        <div key={i} className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-sky-500 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'}`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))}
                                    {isChatLoading && <div className="text-xs text-slate-400 animate-pulse">AIが考え中...</div>}
                                    
                                    {/* Vision Board Image Preview */}
                                    {isGeneratingImage && (
                                        <div className="flex flex-col items-center justify-center p-6 bg-slate-100 rounded-lg animate-pulse dark:bg-slate-900">
                                            <ImageIcon className="w-10 h-10 text-slate-300 mb-2" />
                                            <p className="text-xs text-slate-500 dark:text-slate-400">ビジョンボードを描いています...</p>
                                        </div>
                                    )}
                                    {visionImage && (
                                        <div className="mt-4 mb-2">
                                            <p className="text-xs font-bold text-sky-600 mb-1 dark:text-sky-400">生成されたビジョンボード</p>
                                            <img src={visionImage} alt="Vision Board" className="w-full rounded-lg shadow-md border-4 border-white" />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex gap-2 mb-4">
                                    <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChatSend()} placeholder="返信を入力..." className="flex-1" />
                                    <button type="button" onClick={handleChatSend} disabled={!chatInput || isChatLoading} className="bg-sky-500 text-white p-2 rounded hover:bg-sky-600 transition disabled:opacity-50"><SendIcon className="w-5 h-5"/></button>
                                </div>

                                {/* Vision Board Generation Button */}
                                {chatHistory.length > 4 && !visionImage && !isGeneratingImage && (
                                    <div className="mb-4">
                                        <button 
                                            onClick={handleGenerateVisionBoard}
                                            className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                        >
                                            <ImageIcon className="w-5 h-5" />
                                            <span>AIでビジョンボードを描く</span>
                                        </button>
                                        <p className="text-xs text-center text-slate-400 mt-1">※会話内容を元にAIが未来の絵を描きます</p>
                                    </div>
                                )}

                                <PrimaryButton onClick={handleFinishChat} disabled={chatHistory.length < 5} className="w-full">
                                    {chatHistory.length < 5 ? "もう少し対話を続ける" : "この内容で3週間のゴールを生成"}
                                </PrimaryButton>
                            </div>
                        ) : (
                            <div className="animate-fade-in">
                                {visionImage && (
                                    <div className="mb-6 flex justify-center">
                                        <div className="relative max-w-sm">
                                            <img src={visionImage} alt="Vision Board" className="rounded-lg shadow-xl rotate-1 border-4 border-white" />
                                            <div className="absolute -bottom-3 -right-3 bg-white p-2 rounded-full shadow-lg">
                                                <ImageIcon className="w-6 h-6 text-purple-600" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <h3 className="font-bold text-sky-600 mb-2 dark:text-sky-400">生成された3週間のゴール:</h3>
                                <TextArea value={threeWeekGoal} onChange={(e) => setThreeWeekGoal(e.target.value)} className="mb-6 text-lg font-bold text-slate-800" />
                                <div className="flex gap-3">
                                    <SecondaryButton onClick={() => setThreeWeekGoal("")} className="flex-1">修正する</SecondaryButton>
                                    <PrimaryButton onClick={handleSave} className="flex-1">設定完了</PrimaryButton>
                                </div>
                            </div>
                        )}
                    </>
                );
            default: return null;
        }
    }
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <div className="flex items-center justify-center mb-6">
                    <CoMitLogoIcon className="w-10 h-16 text-sky-500 mr-3" />
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">co-mitへようこそ</h1>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 mb-8 dark:bg-slate-700">
                    <div className="bg-sky-500 h-2.5 rounded-full" style={{ width: `${(step / 3) * 100}%`, transition: 'width 0.3s' }}></div>
                </div>
                {renderStep()}
            </Card>
        </div>
    );
};

const DepositView: React.FC<{ onSave: (amount: number) => void }> = ({ onSave }) => {
    const [amount, setAmount] = useState(1000);
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
                <PiggyBankIcon className="w-16 h-16 mx-auto text-sky-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2 dark:text-slate-100">デポジット設定</h1>
                <p className="text-slate-600 mb-6 dark:text-slate-400">目標未達の場合に失うデポジット額を設定します。</p>
                <div className="flex items-center justify-center gap-4 mb-8">
                    <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">¥</span>
                    <Input id="deposit" type="number" min={0} step={100} value={amount} onChange={e => setAmount(Number(e.target.value))} className="text-3xl font-bold text-center w-48" />
                </div>
                <PrimaryButton onClick={() => onSave(amount)} className="w-full">コミットメント開始</PrimaryButton>
            </Card>
        </div>
    );
};

const DashboardView: React.FC<{
    settings: UserSettings;
    reflections: Reflection[];
    totalScore: number;
    currentStreak: number;
    currentQuarterlyGoal: string;
    todayStr: string;
    currentReflection: Reflection | undefined;
    onNavigate: (view: AppView) => void;
    onUpdateTasks: (tasks: DailyTask[]) => void;
    onMarkTourSeen: () => void;
}> = ({ settings, reflections, totalScore, currentStreak, currentQuarterlyGoal, todayStr, currentReflection, onNavigate, onUpdateTasks, onMarkTourSeen }) => {
    const [isVisionBoardOpen, setIsVisionBoardOpen] = useState(false);

    const toggleTaskCompletion = (index: number) => {
        if (!currentReflection || !currentReflection.dailyTasks) return;
        const newTasks = [...currentReflection.dailyTasks];
        newTasks[index].completed = !newTasks[index].completed;
        onUpdateTasks(newTasks);
    };
    const priorityIcon = (priority: 'high' | 'medium' | 'low') => {
        switch(priority) {
            case 'high': return <FlameIcon className="w-5 h-5 text-red-500" />;
            case 'medium': return <FlameIcon className="w-5 h-5 text-yellow-500" />;
            case 'low': return <FlameIcon className="w-5 h-5 text-gray-400" />;
            default: return null;
        }
    };
    return (
        <div className="space-y-6">
            <header className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 md:col-span-2 space-y-4">
                    <Card className="relative border-l-4 border-l-indigo-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-sm font-bold text-indigo-600 mb-1 dark:text-indigo-400">現在の3ヶ月の抱負</h2>
                                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{settings.quarterlyGoal}</p>
                            </div>
                            <div className="text-right">
                                 <span className="text-xs font-bold text-indigo-400 bg-indigo-50 px-2 py-1 rounded dark:bg-indigo-900/50 dark:text-indigo-300">
                                    期限: {settings.quarterlyGoalDeadline.replace(/-/g, '/')}
                                </span>
                            </div>
                        </div>
                    </Card>
                    <Card className="relative">
                        <h2 className="text-sm font-bold text-sky-600 mb-1 dark:text-sky-400">現在の3週間ゴール</h2>
                        <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{currentQuarterlyGoal}</p>
                        {settings.threeWeekGoalDeadline && (
                            <div className="flex justify-end mt-2">
                                <span className="text-sm text-slate-400 font-medium">
                                    ({settings.threeWeekGoalDeadline.replace(/-/g, '/')}まで)
                                </span>
                            </div>
                        )}
                    </Card>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Card className="text-center">
                        <div className="flex items-center justify-center"><StarIcon className="w-6 h-6 text-amber-400 mr-2"/><h2 className="text-sm font-bold text-slate-500 mb-1 dark:text-slate-400">合計スコア</h2></div>
                        <p className="text-3xl font-bold dark:text-slate-100">{totalScore}</p>
                    </Card>
                    <Card className="text-center">
                       <div className="flex items-center justify-center"><TrendingUpIcon className="w-6 h-6 text-emerald-500 mr-2"/><h2 className="text-sm font-bold text-slate-500 mb-1 dark:text-slate-400">継続日数</h2></div>
                        <p className="text-3xl font-bold dark:text-slate-100">{currentStreak}</p>
                    </Card>
                </div>
            </header>
            <GrowthGraph reflections={reflections} settings={settings} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold dark:text-slate-100">今日のタスク ({todayStr})</h2>
                            {!currentReflection?.morning ? (
                                <div className="relative">
                                    <PrimaryButton onClick={() => {
                                        onMarkTourSeen();
                                        onNavigate('MORNING_CONVERSATION');
                                    }}>朝の計画を立てる</PrimaryButton>
                                    {!settings.hasSeenTour && <TourTooltip />}
                                </div>
                            ) : !currentReflection.night ? (
                                <PrimaryButton onClick={() => onNavigate('NIGHT_REFLECTION')}>夜の振り返りをする</PrimaryButton>
                            ) : (
                                <span className="text-sky-600 font-bold bg-sky-100 px-3 py-1 rounded-full dark:bg-sky-900/50 dark:text-sky-300">完了</span>
                            )}
                        </div>
                        {currentReflection?.dailyTasks && currentReflection.dailyTasks.length > 0 ? (
                            <ul className="space-y-3">
                                {currentReflection.dailyTasks.map((task, idx) => (
                                    <li key={idx} className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-100 transition-all hover:shadow-sm dark:bg-slate-800 dark:border-slate-700">
                                        <input type="checkbox" checked={task.completed} onChange={() => toggleTaskCompletion(idx)} className="task-checkbox mr-4" id={`task-${idx}`}/>
                                        <label htmlFor={`task-${idx}`} className={`flex-1 task-label cursor-pointer font-medium ${task.completed ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}`}>
                                            {task.text}
                                        </label>
                                        <div className="ml-2" title={`Priority: ${task.priority}`}>{priorityIcon(task.priority)}</div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 dark:bg-slate-800/50 dark:border-slate-700"><p>まだタスクが設定されていません</p></div>
                        )}
                    </Card>
                </div>
                <div className="space-y-4">
                    {settings.visionBoardImage ? (
                        <button type="button" onClick={() => setIsVisionBoardOpen(true)} className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 font-bold transform hover:scale-[1.02]">
                            <ImageIcon className="w-6 h-6" />ビジョンボードを見る
                        </button>
                    ) : (
                        <button type="button" onClick={() => onNavigate('VISION_BOARD_CREATION')} className="w-full bg-white text-purple-600 border-2 border-purple-200 p-4 rounded-xl shadow-sm hover:bg-purple-50 transition flex items-center justify-center gap-2 font-bold group dark:bg-slate-800 dark:border-purple-900 dark:text-purple-400 dark:hover:bg-slate-700">
                            <ImageIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />ビジョンボードを作成
                        </button>
                    )}
                    <button type="button" onClick={() => onNavigate('SPICY_FEEDBACK')} className="w-full bg-gradient-to-r from-orange-400 to-red-500 text-white p-4 rounded-xl shadow-lg hover:from-orange-500 hover:to-red-600 transition flex items-center justify-center gap-2 font-bold transform hover:scale-[1.02]"><MessageSquareIcon className="w-6 h-6" />仲間の声</button>
                    <button type="button" onClick={() => onNavigate('AI_TWIN')} className="w-full bg-white text-purple-600 border-2 border-purple-200 p-4 rounded-xl shadow-sm hover:bg-purple-50 transition flex items-center justify-center gap-2 font-bold dark:bg-slate-800 dark:border-purple-900 dark:text-purple-400 dark:hover:bg-slate-700"><GhostIcon className="w-6 h-6" />AIツインと話す</button>
                    <button type="button" onClick={() => onNavigate('JOURNAL_LOG')} className="w-full bg-white text-slate-700 border border-slate-200 p-4 rounded-xl shadow-sm hover:bg-slate-50 transition flex items-center justify-center gap-2 font-semibold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"><CalendarIcon className="w-5 h-5 text-slate-500" />ジャーナル履歴</button>
                    <button type="button" onClick={() => onNavigate('SIDE_PROJECTS')} className="w-full bg-white text-slate-700 border border-slate-200 p-4 rounded-xl shadow-sm hover:bg-slate-50 transition flex items-center justify-center gap-2 font-semibold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"><BrainCircuitIcon className="w-5 h-5 text-slate-500" />サイドプロジェクト</button>
                    <button type="button" onClick={() => onNavigate('MEMO_PAD')} className="w-full bg-white text-slate-700 border border-slate-200 p-4 rounded-xl shadow-sm hover:bg-slate-50 transition flex items-center justify-center gap-2 font-semibold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"><FileTextIcon className="w-5 h-5 text-slate-500" />メモ</button>
                    <button type="button" onClick={() => onNavigate('SETTINGS')} className="w-full bg-white text-slate-700 border border-slate-200 p-4 rounded-xl shadow-sm hover:bg-slate-50 transition flex items-center justify-center gap-2 font-semibold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"><SettingsIcon className="w-5 h-5 text-slate-500" />目標・設定の編集</button>
                </div>
            </div>
            
            {/* Vision Board Modal */}
            <Modal isOpen={isVisionBoardOpen} onClose={() => setIsVisionBoardOpen(false)} title="あなたのビジョンボード">
                <div className="flex flex-col items-center">
                    {settings.visionBoardImage && (
                        <img src={settings.visionBoardImage} alt="Vision Board" className="w-full rounded-lg shadow-xl border-4 border-white mb-4" />
                    )}
                    <p className="text-center text-slate-600 font-bold mb-2 dark:text-slate-300">"{settings.threeWeekGoal}"</p>
                    <p className="text-sm text-slate-400">理想の未来を毎日眺めて、潜在意識に刻み込みましょう。</p>
                </div>
            </Modal>
        </div>
    );
};

const QuarterlyRenewalView: React.FC<{
    settings: UserSettings;
    onSave: (newGoal: string, newDeadline: string) => void;
}> = ({ settings, onSave }) => {
    const [newGoal, setNewGoal] = useState("");
    
    return (
        <Card className="max-w-2xl mx-auto text-center p-10">
            <h1 className="text-3xl font-bold text-indigo-600 mb-4 dark:text-indigo-400">3ヶ月の抱負の更新</h1>
            <p className="text-slate-600 mb-8 dark:text-slate-400">
                お疲れ様です！前回の抱負「{settings.quarterlyGoal}」の期限が到来しました。<br/>
                次の3ヶ月に向けた新しい抱負を設定しましょう。
            </p>
            
            <div className="mb-6 text-left">
                <label className="block text-sm font-bold text-slate-700 mb-2 dark:text-slate-300">新しい3ヶ月の抱負</label>
                <TextArea 
                    value={newGoal} 
                    onChange={(e) => setNewGoal(e.target.value)} 
                    placeholder="新しい四半期の抱負を入力..."
                    rows={4}
                />
            </div>

            <PrimaryButton 
                onClick={() => {
                    // Default to 90 days from now
                    const nextDeadline = addDays(getLocalTodayDate(), 90);
                    onSave(newGoal, nextDeadline);
                }} 
                disabled={!newGoal}
                className="w-full py-4 text-lg"
            >
                新しい抱負でスタートする
            </PrimaryButton>
        </Card>
    );
};

const MorningConversationView: React.FC<{
    quarterlyGoal: string;
    longTermGoal: string;
    onSave: (data: MorningReflectionData, tasks: DailyTask[], penalty?: number) => void;
    onBack: () => void;
    setLoading: (loading: boolean) => void;
}> = ({ quarterlyGoal, longTermGoal, onSave, onBack, setLoading }) => {
    const [step, setStep] = useState(1);
    const [goalRecallInput, setGoalRecallInput] = useState("");
    const [taskInput, setTaskInput] = useState("");
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [taskSteps, setTaskSteps] = useState<string[]>([]);
    const [goalCheckResult, setGoalCheckResult] = useState<{ match: boolean } | null>(null);
    const [tempTasks, setTempTasks] = useState<DailyTask[]>([]);
    const [isFirstTask, setIsFirstTask] = useState(true);
    const [freeMemo, setFreeMemo] = useState("");
    const [penalty, setPenalty] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    const handleGoalRecallSubmit = async () => {
        setLoading(true);
        const match = await geminiService.compareGoalRecall(goalRecallInput, quarterlyGoal);
        setLoading(false);
        setGoalCheckResult({ match });
        if (!match) {
            setPenalty(5);
        }
    };
    const handleProceedToTask = () => setStep(2);

    const handleTaskEvaluate = async () => {
        if(!taskInput) return;
        setLoading(true);
        const evaluation = await geminiService.evaluateTask(taskInput, longTermGoal, quarterlyGoal, isFirstTask);
        setLoading(false);
        setAiResponse(evaluation.response);
    };

    const handleConfirmTask = async () => {
        setLoading(true);
        const steps = await geminiService.breakDownTaskIntoSteps(taskInput, longTermGoal, quarterlyGoal);
        setTaskSteps(steps);
        setLoading(false);
        setStep(4);
    };

    const handleAddTaskToTemp = () => {
        const mainTask: DailyTask = { text: taskInput, completed: false, type: isFirstTask ? 'main' : 'sub', priority: isFirstTask ? 'high' : 'medium' };
        const subTasks: DailyTask[] = taskSteps.map(step => ({ text: step, completed: false, type: 'sub' as const, priority: 'low' as const })).filter(t => t.text.trim() !== "");
        setTempTasks([...tempTasks, mainTask, ...subTasks]);
        setTaskInput("");
        setAiResponse(null);
        setTaskSteps([]);
        setIsFirstTask(false);
        setStep(2);
    };

    const handleFinishPlanning = () => {
        const mainTask: DailyTask = { text: taskInput, completed: false, type: isFirstTask ? 'main' : 'sub', priority: isFirstTask ? 'high' : 'medium' };
        const subTasks: DailyTask[] = taskSteps.map(step => ({ text: step, completed: false, type: 'sub' as const, priority: 'low' as const })).filter(t => t.text.trim() !== "");
        setTempTasks([...tempTasks, mainTask, ...subTasks]);
        setStep(5);
    };

    const handleSaveAll = () => {
        if(isSaving) return;
        setIsSaving(true);
        const data: MorningReflectionData = { dailyPlan: tempTasks.map(t => t.text).join(', '), freeMemo: freeMemo };
        onSave(data, tempTasks, penalty);
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <Header title="朝の作戦会議" onBack={onBack} />
            {step === 1 && (
                <div className="animate-fade-in">
                    <p className="mb-4 text-slate-600 dark:text-slate-400">今の「3週間ゴール」は何ですか？何も見ずに入力してください。</p>
                    {!goalCheckResult ? (
                        <>
                            <TextArea value={goalRecallInput} onChange={(e) => setGoalRecallInput(e.target.value)} placeholder="ゴールを入力..." className="mb-4" />
                            <PrimaryButton onClick={handleGoalRecallSubmit} disabled={!goalRecallInput} className="w-full">確認</PrimaryButton>
                        </>
                    ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-4 text-center dark:bg-slate-800 dark:border-slate-700">
                            {goalCheckResult.match ? (
                                <div className="mb-4">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-2 dark:bg-emerald-900/30 dark:text-emerald-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">素晴らしい！正解です</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">ゴールをしっかり意識できています。</p>
                                </div>
                            ) : (
                                <div className="mb-4">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-600 mb-2 dark:bg-rose-900/30 dark:text-rose-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400">惜しい...</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">正確なゴールと少しずれています。<br/>ペナルティとして <span className="font-bold text-rose-600 dark:text-rose-400">-5pt</span> となります。</p>
                                </div>
                            )}
                            <div className="bg-white border border-slate-200 rounded p-3 mb-6 text-left dark:bg-slate-700 dark:border-slate-600">
                                <p className="text-xs text-slate-400 font-bold mb-1 uppercase dark:text-slate-300">本来のゴール</p>
                                <p className="font-bold text-slate-800 dark:text-slate-100">{quarterlyGoal}</p>
                            </div>
                            <PrimaryButton onClick={handleProceedToTask} className="w-full">次へ進む</PrimaryButton>
                        </div>
                    )}
                </div>
            )}
            {step === 2 && (
                <div className="animate-fade-in">
                    <p className="mb-2 font-bold text-sky-600 dark:text-sky-400">{isFirstTask ? "今日の最重要タスク" : "追加のタスク"}</p>
                    <p className="mb-4 text-slate-600 dark:text-slate-400">{isFirstTask ? "今日、これさえ達成できれば100点と言えるタスクを1つ決めてください。" : "他にやっておきたいタスクがあれば追加してください。"}</p>
                    <Input value={taskInput} onChange={(e) => setTaskInput(e.target.value)} placeholder="タスクを入力..." className="mb-4" />
                    {aiResponse && <div className="bg-slate-100 p-4 rounded-lg mb-4 border-l-4 border-sky-500 dark:bg-slate-800 dark:border-sky-400"><div className="flex items-start gap-3"><BotIcon className="w-6 h-6 text-sky-600 mt-1 flex-shrink-0 dark:text-sky-400" /><p className="text-slate-700 dark:text-slate-200">{aiResponse}</p></div></div>}
                    {!aiResponse ? (
                        <PrimaryButton onClick={handleTaskEvaluate} disabled={!taskInput} className="w-full">AIに評価してもらう</PrimaryButton>
                    ) : (
                        <div className="grid grid-cols-2 gap-3"><SecondaryButton onClick={() => setAiResponse(null)}>修正する</SecondaryButton><PrimaryButton onClick={handleConfirmTask}>計画を立てる</PrimaryButton></div>
                    )}
                </div>
            )}
            {step === 4 && (
                <div className="animate-fade-in">
                    <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-100">行動プランの編集</h3>
                    <p className="text-sm text-slate-500 mb-4 dark:text-slate-400">AIが提案したステップを編集できます。これらはサブタスクとして追加されます。</p>
                    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 dark:bg-slate-800 dark:border-slate-700">
                        <h4 className="font-bold text-sky-600 mb-4 text-lg border-b border-slate-100 pb-2 dark:text-sky-400 dark:border-slate-700">{taskInput}</h4>
                        <div className="space-y-3">{taskSteps.map((step, index) => (<div key={index} className="flex items-center gap-2"><span className="font-bold text-slate-400 w-6 text-center">{index + 1}.</span><Input value={step} onChange={(e) => { const newSteps = [...taskSteps]; newSteps[index] = e.target.value; setTaskSteps(newSteps); }} className="flex-1" placeholder={`ステップ ${index + 1}`} /><button type="button" onClick={() => { const newSteps = taskSteps.filter((_, i) => i !== index); setTaskSteps(newSteps); }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition dark:hover:bg-rose-900/50" title="削除">x</button></div>))}</div>
                        <button type="button" onClick={() => setTaskSteps([...taskSteps, ""])} className="mt-3 text-sm text-sky-500 font-bold hover:underline flex items-center gap-1 dark:text-sky-400">+ ステップを追加</button>
                    </div>
                    <div className="flex flex-col gap-3"><SecondaryButton onClick={handleAddTaskToTemp} className="w-full flex items-center justify-center gap-2"><span className="text-xl font-bold">+</span> さらに今日のタスクを追加する</SecondaryButton><PrimaryButton onClick={handleFinishPlanning} className="w-full">この内容で決定して次に進む</PrimaryButton></div>
                </div>
            )}
            {step === 5 && (
                 <div className="animate-fade-in">
                    <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-slate-100">フリーノート (任意)</h3>
                    <p className="text-slate-600 mb-4 text-sm dark:text-slate-400">今の気持ちや、今日の意気込みを自由に書いてください。これはAI Twinの育成に使われます。</p>
                    <RichTextEditor value={freeMemo} onChange={setFreeMemo} placeholder="今日はどんな1日にしたい？" className="mb-6" />
                    <PrimaryButton onClick={handleSaveAll} disabled={isSaving} className="w-full">{isSaving ? "保存中..." : "朝のジャーナリングを完了"}</PrimaryButton>
                </div>
            )}
        </Card>
    );
};

const NightReflectionView: React.FC<{
    tasks: DailyTask[];
    sideProjects?: SideProject[];
    onSave: (data: NightReflectionData, updatedTasks: DailyTask[]) => void;
    onBack: () => void;
    setLoading: (loading: boolean) => void;
}> = ({ tasks, sideProjects, onSave, onBack, setLoading }) => {
    const [step, setStep] = useState(1);
    const [localTasks, setLocalTasks] = useState<DailyTask[]>(tasks);
    const [feelings, setFeelings] = useState(""); 
    const [isSaving, setIsSaving] = useState(false);
    const [extrasList, setExtrasList] = useState<string[]>([]);
    const [extraInput, setExtraInput] = useState("");
    const [failureReason, setFailureReason] = useState("");
    const [aiFailureFeedback, setAiFailureFeedback] = useState("");
    
    // Wasted Time State (New Feature)
    const [wastedTimeLogs, setWastedTimeLogs] = useState<WastedTimeLog[]>([]);
    const [currentWastedActivity, setCurrentWastedActivity] = useState("");
    const [currentWastedMinutes, setCurrentWastedMinutes] = useState(0);
    
    const uncompletedTasks = localTasks.filter(t => !t.completed);
    const toggleLocalTask = (index: number) => { const newTasks = [...localTasks]; newTasks[index].completed = !newTasks[index].completed; setLocalTasks(newTasks); };
    const handleFailureAnalysis = async () => { setLoading(true); const result = await geminiService.analyzeFailureReason(failureReason, sideProjects); setLoading(false); setAiFailureFeedback(result.response); };
    const handleAddExtra = () => { if(!extraInput.trim()) return; setExtrasList([...extrasList, extraInput]); setExtraInput(""); };
    const handleRemoveExtra = (index: number) => { setExtrasList(extrasList.filter((_, i) => i !== index)); };

    const handleAddWastedTime = () => {
        if (currentWastedActivity && currentWastedMinutes > 0) {
            setWastedTimeLogs([...wastedTimeLogs, { activity: currentWastedActivity, minutes: currentWastedMinutes }]);
            setCurrentWastedActivity("");
            setCurrentWastedMinutes(0);
        }
    };
    const handleRemoveWastedTime = (index: number) => {
        setWastedTimeLogs(wastedTimeLogs.filter((_, i) => i !== index));
    };

    const handleFinish = () => { 
        if(isSaving) return; 
        setIsSaving(true); 
        
        const totalWasted = wastedTimeLogs.reduce((acc, log) => acc + log.minutes, 0);

        const data: NightReflectionData = { 
            feelings: "", // Deprecated field
            freeMemo: feelings, 
            achievementAnalysis: "", // Not used in this version
            wastedTime: "", // Deprecated field
            wastedTimeLogs: wastedTimeLogs, // New Feature
            wastedTimeMinutes: totalWasted, // New Feature
            extras: extrasList, 
            tomorrowIdeas: "" // Not used in this version
        }; 
        onSave(data, localTasks); 
    };

    const renderStep = () => {
        if (step === 1) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 h-full dark:bg-sky-900/20 dark:border-sky-800">
                            <h3 className="font-bold text-sky-700 mb-3 flex items-center gap-2 dark:text-sky-400"><FileTextIcon className="w-5 h-5"/> 書くことの目安</h3>
                            <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                                <li className="flex items-start gap-2"><span className="text-sky-400 font-bold">•</span><span>今どう思っているか</span></li>
                                <li className="flex items-start gap-2"><span className="text-sky-400 font-bold">•</span><span><strong className="text-sky-600 dark:text-sky-400">今日の成果は何か</strong></span></li>
                                <li className="flex items-start gap-2"><span className="text-sky-400 font-bold">•</span><span>一日を通して感謝している人はだれか</span></li>
                                <li className="flex items-start gap-2"><span className="text-sky-400 font-bold">•</span><span>どんな気持ちで行動していたか</span></li>
                            </ul>
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <h2 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100">夜のノート</h2>
                        <RichTextEditor value={feelings} onChange={setFeelings} placeholder="今日1日を振り返って..." className="mb-6" minHeight="300px" />
                        <PrimaryButton onClick={() => setStep(2)} disabled={!feelings} className="w-full">次へ</PrimaryButton>
                    </div>
                </div>
            );
        }
        if (step === 2) {
            if (uncompletedTasks.length === 0 && localTasks.length > 0) return <div className="text-center py-10 animate-fade-in"><h2 className="text-2xl font-bold text-sky-600 mb-4 dark:text-sky-400">素晴らしい！</h2><p className="text-slate-600 mb-6 dark:text-slate-400">全てのタスクを完了しました。</p><PrimaryButton onClick={() => setStep(3)} className="w-full">次へ</PrimaryButton></div>
            if (localTasks.length === 0) return <div className="text-center py-10 animate-fade-in"><p className="text-slate-600 mb-6 dark:text-slate-400">タスクがありませんでした。</p><PrimaryButton onClick={() => setStep(3)} className="w-full">次へ</PrimaryButton></div>
            return (
                <div className="max-w-2xl mx-auto animate-fade-in">
                    <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">タスクの確認</h2>
                    <div className="mb-6">{localTasks.map((task, idx) => (<div key={idx} className="flex items-center p-3 bg-white border border-slate-200 rounded-lg mb-2 dark:bg-slate-800 dark:border-slate-700"><input type="checkbox" checked={task.completed} onChange={() => toggleLocalTask(idx)} className="task-checkbox mr-3"/><span className={task.completed ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-200"}>{task.text}</span></div>))}</div>
                    {uncompletedTasks.length > 0 && (
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 animate-fade-in dark:bg-rose-900/20 dark:border-rose-900/50">
                            <h3 className="font-bold text-rose-600 mb-2 dark:text-rose-400">未達成のタスクがあります</h3>
                            <p className="text-sm text-slate-600 mb-3 dark:text-slate-400">なぜ達成できなかったのですか？言い訳せず、事実を述べてください。</p>
                            <TextArea value={failureReason} onChange={e => setFailureReason(e.target.value)} placeholder="理由..." className="mb-3" />
                            {aiFailureFeedback && <div className="bg-white p-3 rounded border border-rose-100 mb-3 text-slate-700 text-sm flex gap-2 dark:bg-slate-800 dark:text-slate-200 dark:border-rose-900/50"><BotIcon className="w-5 h-5 text-rose-500 shrink-0" />{aiFailureFeedback}</div>}
                            {!aiFailureFeedback ? <Button onClick={handleFailureAnalysis} disabled={!failureReason} className="w-full bg-rose-500 text-white hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-500">分析する</Button> : <Button onClick={() => setStep(3)} className="w-full bg-slate-800 text-white hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600">受け入れて次へ</Button>}
                        </div>
                    )}
                    {uncompletedTasks.length === 0 && <PrimaryButton onClick={() => setStep(3)} className="w-full">次へ</PrimaryButton>}
                </div>
            );
        }
        if (step === 3) {
            return (
                 <div className="max-w-2xl mx-auto animate-fade-in text-center">
                    <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">時間の使い方</h2>
                    <p className="text-slate-600 mb-6 dark:text-slate-400">今日、無駄にしてしまった時間はありますか？正直に記録しましょう。</p>
                    
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6 text-left dark:bg-slate-800 dark:border-slate-700">
                        <label className="block text-sm font-bold text-slate-600 mb-2 dark:text-slate-300">無駄にした時間</label>
                        
                        <div className="flex gap-2 mb-4">
                            <Input 
                                placeholder="内容 (例: SNS, 動画)" 
                                value={currentWastedActivity} 
                                onChange={e => setCurrentWastedActivity(e.target.value)} 
                                className="flex-1"
                            />
                            <Input 
                                type="number" 
                                placeholder="分" 
                                value={currentWastedMinutes || ""} 
                                onChange={e => setCurrentWastedMinutes(Number(e.target.value))} 
                                className="w-24"
                            />
                            <button 
                                type="button" 
                                onClick={handleAddWastedTime} 
                                disabled={!currentWastedActivity || !currentWastedMinutes} 
                                className="bg-rose-500 text-white px-4 rounded-lg font-bold disabled:opacity-50 hover:bg-rose-600 transition dark:bg-rose-600 dark:hover:bg-rose-500"
                            >
                                追加
                            </button>
                        </div>

                        {wastedTimeLogs.length > 0 ? (
                            <ul className="space-y-2 mb-2">
                                {wastedTimeLogs.map((log, i) => (
                                    <li key={i} className="flex justify-between items-center bg-rose-50 p-3 rounded text-rose-800 border border-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-900/50">
                                        <span>{log.activity}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold">{log.minutes}分</span>
                                            <button type="button" onClick={() => handleRemoveWastedTime(i)} className="text-rose-400 hover:text-rose-600">×</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                             <p className="text-center text-slate-400 text-sm py-2">記録なし (Good!)</p>
                        )}
                        
                        {wastedTimeLogs.length > 0 && (
                            <div className="text-right text-sm font-bold text-rose-600 mt-2 dark:text-rose-400">
                                合計: {wastedTimeLogs.reduce((acc, l) => acc + l.minutes, 0)}分
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <SecondaryButton onClick={() => setStep(2)} className="flex-1">戻る</SecondaryButton>
                        <PrimaryButton onClick={() => setStep(4)} className="flex-1">次へ</PrimaryButton>
                    </div>
                 </div>
            );
        }
        if (step === 4) {
             return (
                 <div className="max-w-2xl mx-auto animate-fade-in">
                    <h2 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100">プラスアルファの積み上げ</h2>
                    <p className="text-slate-600 mb-6 dark:text-slate-400">予定にはなかったけれど、今日できたことはありますか？些細なことでも構いません。</p>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6 dark:bg-emerald-900/20 dark:border-emerald-900/50">
                         <div className="flex gap-2 mb-4"><Input value={extraInput} onChange={e => setExtraInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddExtra()} placeholder="例: 関連書籍を1章読んだ, スクワット10回" className="flex-1"/><button type="button" onClick={handleAddExtra} disabled={!extraInput.trim()} className="bg-emerald-500 text-white font-bold px-4 rounded-lg hover:bg-emerald-600 transition disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500">追加</button></div>
                         {extrasList.length > 0 ? (<ul className="space-y-2">{extrasList.map((item, index) => (<li key={index} className="flex items-center justify-between bg-white p-3 rounded shadow-sm border border-emerald-100 dark:bg-slate-800 dark:border-emerald-900/50"><span className="text-emerald-800 font-medium dark:text-emerald-400">✨ {item}</span><button type="button" onClick={() => handleRemoveExtra(index)} className="text-slate-400 hover:text-rose-500 p-1">x</button></li>))}</ul>) : (<p className="text-emerald-600/50 text-center py-4 text-sm font-bold dark:text-emerald-400/50">まだ追加されていません</p>)}
                    </div>
                    <div className="flex gap-4"><SecondaryButton onClick={() => setStep(3)} className="flex-1">戻る</SecondaryButton><PrimaryButton onClick={() => setStep(5)} className="flex-1">次へ</PrimaryButton></div>
                 </div>
             );
        }
        if (step === 5) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                    <div className="md:col-span-1">
                        <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 h-full dark:bg-sky-900/20 dark:border-sky-800">
                            <h3 className="font-bold text-sky-700 mb-3 flex items-center gap-2 dark:text-sky-400"><FileTextIcon className="w-5 h-5"/> 書くことの目安</h3>
                            <ul className="space-y-3 text-sm">
                                <li className="flex items-start gap-2 text-slate-400"><span>•</span> <span>今どう思っているか</span></li>
                                <li className="flex items-start gap-2 text-slate-400"><span>•</span> <span>今日の成果は何か</span></li>
                                <li className="flex items-start gap-2 text-slate-400"><span>•</span> <span>一日を通して感謝している人はだれか</span></li>
                                <li className="flex items-start gap-2 text-slate-400"><span>•</span> <span>どんな気持ちで行動していたか</span></li>
                                <li className="flex items-start gap-2 text-sky-700 font-bold text-base mt-4 bg-white/50 p-2 rounded border border-sky-100 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-sky-400"><span className="text-sky-500">→</span><span>明日のアイデア</span></li>
                            </ul>
                            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">今日の振り返りを踏まえて、明日の計画やアイデアを書き足しましょう。</p>
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <h2 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100">夜のノート (仕上げ)</h2>
                        <RichTextEditor value={feelings} onChange={setFeelings} placeholder="明日へのアイデアを追記..." className="mb-6" minHeight="300px" />
                        <div className="flex gap-4"><SecondaryButton onClick={() => setStep(4)} className="flex-1">戻る</SecondaryButton><PrimaryButton onClick={handleFinish} disabled={isSaving} className="flex-1 py-4 text-lg shadow-xl">{isSaving ? "保存中..." : "完了してスコアを確定"}</PrimaryButton></div>
                    </div>
                </div>
            );
        }
    };

    return (
        <Card className={`mx-auto transition-all duration-300 ${step === 1 || step === 5 ? 'max-w-5xl' : 'max-w-2xl'}`}>
            <Header title="夜の振り返り" onBack={onBack} />
            <div className="w-full bg-slate-200 rounded-full h-2 mb-8 dark:bg-slate-700"><div className="bg-sky-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(step / 5) * 100}%` }}></div></div>
            {renderStep()}
        </Card>
    );
};

const AITwinView: React.FC<{ reflections: Reflection[], onBack: () => void, settings: UserSettings | null }> = ({ reflections, onBack, settings }) => {
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [twinReflection, setTwinReflection] = useState<Reflection | null>(null);
    const [calendarDate, setCalendarDate] = useState(new Date());

    const handleSelectDate = (reflection: Reflection) => {
        setTwinReflection(reflection);
        setHistory([{ role: 'model', text: `こんにちは。${reflection.date}の私です。あの日のことなら何でも聞いてください。` }]);
    };

    const handleSend = async () => {
        if (!input.trim() || !twinReflection) return;
        const newHistory: ChatMessage[] = [...history, { role: 'user', text: input }];
        setHistory(newHistory);
        setInput("");
        setLoading(true);
        const response = await geminiService.generateAITwinResponse(twinReflection, newHistory);
        setHistory([...newHistory, { role: 'model', text: response }]);
        setLoading(false);
    };

    if (!twinReflection) {
        return (
            <Card className="max-w-2xl mx-auto min-h-[500px] flex flex-col">
                <Header title="AI Twin (過去の自分と対話)" onBack={onBack} />
                <p className="text-slate-600 mb-6 dark:text-slate-400">いつの自分と話したいですか？カレンダーから日付を選択してください。</p>
                <div className="flex-1">
                    <Calendar 
                        reflections={reflections} 
                        onDayClick={handleSelectDate} 
                        currentDate={calendarDate} 
                        setCurrentDate={setCalendarDate}
                        settings={settings}
                    />
                </div>
            </Card>
        );
    }

    return (
        <Card className="max-w-2xl mx-auto h-[600px] flex flex-col">
            <header className="flex items-center mb-6">
                 <button type="button" onClick={() => setTwinReflection(null)} className="mr-4 p-2 rounded-full hover:bg-slate-200 transition dark:hover:bg-slate-700 dark:text-slate-200">
                    <ChevronLeftIcon className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight dark:text-slate-100">AI Twin ({twinReflection.date})</h1>
            </header>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 rounded-xl mb-4 border border-slate-100 dark:bg-slate-900 dark:border-slate-700">
                {history.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-start max-w-[80%] gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-sky-500 text-white' : 'bg-purple-500 text-white'}`}>{msg.role === 'user' ? <UsersIcon className="w-5 h-5"/> : <GhostIcon className="w-5 h-5"/>}</div>
                            <div className={`p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-sky-500 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'}`}>{msg.text}</div>
                        </div>
                    </div>
                ))}
                {loading && <div className="text-center text-xs text-slate-400 animate-pulse">考え中...</div>}
            </div>
            <div className="flex gap-2">
                <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="メッセージを入力..." disabled={!twinReflection} />
                <PrimaryButton onClick={handleSend} disabled={!input || !twinReflection} className="px-4"><SendIcon className="w-5 h-5"/></PrimaryButton>
            </div>
        </Card>
    );
};

const JournalLogView: React.FC<{ reflections: Reflection[], onBack: () => void, settings: UserSettings | null }> = ({ reflections, onBack, settings }) => {
    const [selectedReflection, setSelectedReflection] = useState<Reflection | null>(null);
    const [calendarDate, setCalendarDate] = useState(new Date());

    return (
        <Card className="max-w-4xl mx-auto min-h-[600px]">
            <Header title="ジャーナル履歴" onBack={onBack} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="font-bold text-slate-700 mb-4 dark:text-slate-300">日付を選択</h3>
                    <Calendar 
                        reflections={reflections} 
                        onDayClick={setSelectedReflection} 
                        currentDate={calendarDate} 
                        setCurrentDate={setCalendarDate}
                        settings={settings}
                    />
                </div>
                <div className="border-l border-slate-100 pl-8 md:block hidden dark:border-slate-700">
                    <h3 className="font-bold text-slate-700 mb-4 dark:text-slate-300">詳細</h3>
                    {selectedReflection ? (
                        <div className="h-[500px] overflow-y-auto pr-2">
                             <JournalDetail reflection={selectedReflection} />
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
                             <CalendarIcon className="w-16 h-16 mb-4 opacity-20" />
                             <p>左のカレンダーから<br/>日付を選択してください</p>
                         </div>
                    )}
                </div>
            </div>
            {/* Mobile Modal for Detail */}
            <Modal isOpen={!!selectedReflection && window.innerWidth < 768} onClose={() => setSelectedReflection(null)} title={selectedReflection?.date || ""} hideCloseButton={false}>
                 {selectedReflection && <JournalDetail reflection={selectedReflection} />}
            </Modal>
        </Card>
    );
};

const SideProjectsView: React.FC<{ onBack: () => void, settings: UserSettings, onUpdateSettings: (s: UserSettings) => void }> = ({ onBack, settings, onUpdateSettings }) => {
    const [projects, setProjects] = useState<SideProject[]>(settings.sideProjects || []);
    const [name, setName] = useState("");
    const [dueDate, setDueDate] = useState("");
    const handleAdd = () => { if(!name) return; const newProject: SideProject = { id: Date.now().toString(), name, dueDate, completed: false }; const updated = [...projects, newProject]; setProjects(updated); onUpdateSettings({ ...settings, sideProjects: updated }); setName(""); setDueDate(""); };
    const toggleComplete = (id: string) => { const updated = projects.map(p => p.id === id ? { ...p, completed: !p.completed } : p); setProjects(updated); onUpdateSettings({ ...settings, sideProjects: updated }); };
    const deleteProject = (id: string) => { const updated = projects.filter(p => p.id !== id); setProjects(updated); onUpdateSettings({ ...settings, sideProjects: updated }); }
    return (
        <Card>
            <Header title="サイドプロジェクト" onBack={onBack} />
            <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200 dark:bg-slate-800 dark:border-slate-700"><h3 className="font-bold text-slate-700 mb-2 dark:text-slate-300">新規プロジェクト</h3><div className="flex gap-2 mb-2"><Input value={name} onChange={e => setName(e.target.value)} placeholder="プロジェクト名" className="flex-1" /><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-40" /></div><PrimaryButton onClick={handleAdd} disabled={!name}>追加</PrimaryButton></div>
            <div className="space-y-3">{projects.map(p => (<div key={p.id} className={`flex items-center justify-between p-4 rounded-lg border ${p.completed ? 'bg-slate-100 border-slate-200 dark:bg-slate-900/50 dark:border-slate-700' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700'}`}><div className="flex items-center gap-3"><input type="checkbox" checked={p.completed} onChange={() => toggleComplete(p.id)} className="w-5 h-5 accent-sky-500" /><div><p className={`font-bold ${p.completed ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{p.name}</p>{p.dueDate && <p className="text-xs text-slate-500 dark:text-slate-400">期限: {p.dueDate}</p>}</div></div><button type="button" onClick={() => deleteProject(p.id)} className="text-slate-400 hover:text-rose-500">x</button></div>))}</div>
        </Card>
    );
};

const MemoPadView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [memos, setMemos] = useState<Memo[]>([]);
    const [text, setText] = useState("");
    useEffect(() => { const saved = localStorage.getItem('comit_memos'); if (saved) setMemos(JSON.parse(saved)); }, []);
    const saveMemos = (newMemos: Memo[]) => { setMemos(newMemos); localStorage.setItem('comit_memos', JSON.stringify(newMemos)); };
    const addMemo = () => { if (!text.trim()) return; const newMemo: Memo = { id: Date.now().toString(), text, createdAt: new Date().toISOString() }; saveMemos([newMemo, ...memos]); setText(""); };
    const deleteMemo = (id: string) => { saveMemos(memos.filter(m => m.id !== id)); };
    return (
        <Card>
            <Header title="メモパッド" onBack={onBack} />
            <div className="mb-6"><TextArea value={text} onChange={e => setText(e.target.value)} placeholder="何か思いつきましたか？" className="mb-2" /><PrimaryButton onClick={addMemo} disabled={!text.trim()} className="w-full">メモを追加</PrimaryButton></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{memos.map(memo => (<div key={memo.id} className="bg-yellow-50 p-4 rounded shadow-sm border border-yellow-200 relative group dark:bg-yellow-900/20 dark:border-yellow-900/50"><p className="whitespace-pre-wrap text-slate-700 text-sm mb-4 dark:text-slate-200">{memo.text}</p><div className="flex justify-between items-center mt-2 border-t border-yellow-100 pt-2 dark:border-yellow-900/30"><span className="text-xs text-slate-400">{new Date(memo.createdAt).toLocaleDateString()}</span><button type="button" onClick={() => deleteMemo(memo.id)} className="text-slate-400 hover:text-rose-500">削除</button></div></div>))}</div>
        </Card>
    );
}

const SpicyFeedbackView: React.FC<{ onBack: () => void, reflections: Reflection[] }> = ({ onBack, reflections }) => {
    const [feedback, setFeedback] = useState("");
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        const fetchFeedback = async () => {
            setLoading(true);
            const recentScores = reflections.slice(-5).map(r => r.score || 0);
            const text = await geminiService.generateSpicyFeedback(recentScores);
            setFeedback(text);
            setLoading(false);
        };
        fetchFeedback();
    }, [reflections]);
    return (
        <Card><Header title="辛口フィードバック" onBack={onBack} /><div className="flex flex-col items-center justify-center py-10"><div className="bg-slate-800 text-white p-6 rounded-xl shadow-2xl max-w-lg w-full relative"><div className="absolute -top-4 -left-4 bg-red-500 text-white font-bold px-3 py-1 rounded shadow-lg transform -rotate-12">Spicy!</div>{loading ? <p className="animate-pulse">Loading...</p> : <p className="text-lg font-bold leading-relaxed">"{feedback}"</p>}<div className="mt-4 text-right text-slate-400 text-xs">- Your Peer (AI)</div></div></div></Card>
    );
};

const GoalRenewalView: React.FC<{
    settings: UserSettings;
    reflections: Reflection[];
    onSave: (goal: string) => void;
    setLoading: (l: boolean) => void;
}> = ({ settings, reflections, onSave, setLoading }) => {
    const [review, setReview] = useState("");
    const [suggestedGoal, setSuggestedGoal] = useState("");
    const [step, setStep] = useState(1);
    const handleAnalyze = async () => { setLoading(true); const totalScore = reflections.reduce((acc, r) => acc + (r.score || 0), 0); const nextGoal = await geminiService.generateNextGoal(settings.quarterlyGoal, review, totalScore); setSuggestedGoal(nextGoal); setLoading(false); setStep(2); };
    return (
        <Card className="max-w-2xl mx-auto">
            <div className="text-center mb-6"><h1 className="text-2xl font-bold text-sky-600 mb-2 dark:text-sky-400">3週間のサイクルが終了しました！</h1><p className="text-slate-600 dark:text-slate-400">お疲れ様でした。この3週間を振り返り、次のステップへ進みましょう。</p></div>
            {step === 1 && (<div className="animate-fade-in"><p className="font-bold text-slate-700 mb-2 dark:text-slate-300">これまでの振り返り</p><TextArea value={review} onChange={e => setReview(e.target.value)} placeholder="達成できたこと、難しかったこと、今の気持ちなどを自由に書いてください。" className="mb-4 h-32"/><PrimaryButton onClick={handleAnalyze} disabled={!review} className="w-full">AIと次のゴールを決める</PrimaryButton></div>)}
            {step === 2 && (<div className="animate-fade-in"><h3 className="font-bold text-lg text-slate-800 mb-4 dark:text-slate-200">次の3週間ゴール（提案）</h3><TextArea value={suggestedGoal} onChange={e => setSuggestedGoal(e.target.value)} className="mb-6 text-lg font-bold text-slate-800" /><PrimaryButton onClick={() => onSave(suggestedGoal)} className="w-full">新しいサイクルを開始する</PrimaryButton></div>)}
        </Card>
    );
};

const App: React.FC = () => {
    const [initializing, setInitializing] = useState(true);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<AppView>('DASHBOARD');
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [reflections, setReflections] = useState<Reflection[]>([]);
    const [today, setToday] = useState(getLocalTodayDate());
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    
    // Theme State
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
        }
        return 'light';
    });

    useEffect(() => {
        const savedSettings = localStorage.getItem('comit_settings');
        const savedReflections = localStorage.getItem('comit_reflections');
        let loadedSettings: UserSettings | null = null;
        
        if (savedSettings) {
            loadedSettings = migrateSettings(JSON.parse(savedSettings));
            setSettings(loadedSettings);
            
            const todayDateStr = getLocalTodayDate();

            // Check for Quarterly Renewal First
            if (loadedSettings.quarterlyGoalDeadline && todayDateStr > loadedSettings.quarterlyGoalDeadline) {
                setView('QUARTERLY_RENEWAL');
            } 
            // Check for 3-Week Renewal
            else if (loadedSettings.commitmentStartDate) {
                const daysDiff = getDaysDiff(loadedSettings.commitmentStartDate, todayDateStr);
                // Simple logic: if 3 weeks passed. Better logic: if today > threeWeekGoalDeadline
                if (loadedSettings.threeWeekGoalDeadline && todayDateStr > loadedSettings.threeWeekGoalDeadline) {
                     setView('GOAL_RENEWAL');
                } else if (daysDiff >= 21) {
                     // Fallback for old data
                     setView('GOAL_RENEWAL');
                }
            }
        }
        if (savedReflections) setReflections(migrateReflections(JSON.parse(savedReflections)));
        
        setInitializing(false);
    }, []);

    // Theme Effect
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const saveSettings = (newSettings: UserSettings) => { setSettings(newSettings); localStorage.setItem('comit_settings', JSON.stringify(newSettings)); };
    const saveReflections = (newReflections: Reflection[]) => { setReflections(newReflections); localStorage.setItem('comit_reflections', JSON.stringify(newReflections)); };

    const handleSetupSave = (newSettings: UserSettings) => { saveSettings(newSettings); setView('DEPOSIT'); };
    
    const handleGoalRenewal = (newGoal: string) => { 
        if (!settings) return; 
        const updated = { 
            ...settings, 
            threeWeekGoal: newGoal, 
            commitmentStartDate: today,
            threeWeekGoalDeadline: addDays(today, 21), // Update deadline on renewal
        }; 
        saveSettings(updated); 
        setView('DASHBOARD'); 
    };

    const handleQuarterlyRenewal = (newGoal: string, newDeadline: string) => {
        if (!settings) return;
        const updated = {
            ...settings,
            quarterlyGoal: newGoal,
            quarterlyGoalDeadline: newDeadline
        };
        saveSettings(updated);
        setView('DASHBOARD');
    };

    const handleUpdateSettings = (newSettings: UserSettings) => saveSettings(newSettings);
    const handleRegisterPrototyper = () => { if (!settings) return; saveSettings({ ...settings, isPrototyperRegistered: true }); };
    
    const handleMarkTourSeen = () => {
        if (!settings) return;
        const updated = { ...settings, hasSeenTour: true };
        saveSettings(updated);
    };

    const todayStr = getLocalTodayDate();
    const currentReflection = reflections.find(r => r.date === todayStr);
    const totalScore = reflections.reduce((acc, r) => acc + (r.score || 0), 0);
    const currentStreak = reflections.length; 

    if (initializing) return <LoadingSpinner />;

    const renderContent = () => {
        if (!settings) {
            return (
                <div className="min-h-screen bg-slate-100 p-4 flex items-center justify-center dark:bg-slate-900">
                    <SetupView onSave={handleSetupSave} setLoading={setLoading} />
                </div>
            );
        }

        if (!settings.depositAmount && view === 'DEPOSIT') {
            return (
                <div className="min-h-screen bg-slate-100 p-4 flex items-center justify-center dark:bg-slate-900">
                    <DepositView onSave={(amount) => { saveSettings({ ...settings, depositAmount: amount }); setView('DASHBOARD'); }} />
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-slate-100 text-slate-800 font-sans selection:bg-sky-200 dark:bg-slate-950 dark:text-slate-100 dark:selection:bg-sky-900">
                 <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-sky-100 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-950 dark:to-black"></div>
                 
                 {/* Top Right Controls */}
                 <div className="fixed top-4 right-4 z-[100] flex gap-2 items-center">
                    <Clock />
                    <button 
                        onClick={toggleTheme}
                        className="bg-white/90 backdrop-blur-md p-2 rounded-full shadow-md border border-slate-200 hover:bg-slate-100 transition-all dark:bg-slate-800/90 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                        title={theme === 'light' ? "ダークモードに切り替え" : "ライトモードに切り替え"}
                    >
                        {theme === 'light' ? <MoonIcon className="w-4 h-4 text-slate-600" /> : <SunIcon className="w-4 h-4 text-yellow-400" />}
                    </button>
                 </div>

                 {/* Help Button (FAB) */}
                 <div className="fixed bottom-6 right-6 z-[100]">
                    <button
                        onClick={() => setIsHelpOpen(true)}
                        className="bg-sky-500 hover:bg-sky-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center"
                        title="AIヘルプ"
                    >
                        <HelpIcon className="w-8 h-8" />
                    </button>
                 </div>

                 {/* Help Modal */}
                 <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

                 <div className="container mx-auto p-4 md:p-8 max-w-6xl">
                    {view === 'DASHBOARD' && (
                        <DashboardView 
                            settings={settings}
                            reflections={reflections}
                            totalScore={totalScore}
                            currentStreak={currentStreak}
                            currentQuarterlyGoal={settings.threeWeekGoal || ""}
                            todayStr={todayStr}
                            currentReflection={currentReflection}
                            onNavigate={setView}
                            onUpdateTasks={(tasks) => {
                                if (!currentReflection) return;
                                const updated = { ...currentReflection, dailyTasks: tasks };
                                const others = reflections.filter(r => r.date !== todayStr);
                                saveReflections([...others, updated]);
                            }}
                            onMarkTourSeen={handleMarkTourSeen}
                        />
                    )}
                    {view === 'MORNING_CONVERSATION' && (
                        <MorningConversationView 
                            quarterlyGoal={settings.threeWeekGoal || ""}
                            longTermGoal={settings.quarterlyGoal}
                            onSave={(data, tasks, penalty) => {
                                 const newReflection: Reflection = currentReflection 
                                    ? { ...currentReflection, morning: data, dailyTasks: tasks, pendingScore: penalty ? -penalty : 0 }
                                    : { date: todayStr, morning: data, dailyTasks: tasks, score: 0, pendingScore: penalty ? -penalty : 0 };
                                 const others = reflections.filter(r => r.date !== todayStr);
                                 saveReflections([...others, newReflection]);
                                 setView('DASHBOARD');
                            }}
                            onBack={() => setView('DASHBOARD')}
                            setLoading={setLoading}
                        />
                    )}
                    {view === 'NIGHT_REFLECTION' && currentReflection && (
                        <NightReflectionView 
                            tasks={currentReflection.dailyTasks || []}
                            sideProjects={settings.sideProjects}
                            onSave={(data, updatedTasks) => {
                                 // Calculate score with penalty for wasted minutes (10 mins = -1 pt)
                                 const taskScore = updatedTasks.filter(t => t.completed).length * 5;
                                 const extraScore = data.extras.length * 5;
                                 const baseScore = 10 + taskScore + extraScore;
                                 
                                 const wastedPenalty = data.wastedTimeMinutes 
                                     ? Math.floor(data.wastedTimeMinutes / 10) 
                                     : (data.wastedTime ? 10 : 0); // Fallback for legacy string

                                 let score = baseScore - wastedPenalty;
                                 if (currentReflection.pendingScore) score += currentReflection.pendingScore;
                                 
                                 // Prevent negative daily score? Maybe allow it. Current logic allows it.

                                 const updated: Reflection = { ...currentReflection, night: data, dailyTasks: updatedTasks, score: score, pendingScore: 0 };
                                 const others = reflections.filter(r => r.date !== todayStr);
                                 saveReflections([...others, updated]);
                                 setView('DASHBOARD');
                            }}
                            onBack={() => setView('DASHBOARD')}
                            setLoading={setLoading}
                        />
                    )}
                    {view === 'AI_TWIN' && <AITwinView reflections={reflections} onBack={() => setView('DASHBOARD')} settings={settings} />}
                    {view === 'SPICY_FEEDBACK' && <SpicyFeedbackView reflections={reflections} onBack={() => setView('DASHBOARD')} />}
                    {view === 'JOURNAL_LOG' && <JournalLogView reflections={reflections} onBack={() => setView('DASHBOARD')} settings={settings} />}
                    {view === 'VISION_BOARD_CREATION' && (
                        <VisionBoardCreationView 
                            settings={settings} 
                            onSave={(imageUrl) => { 
                                handleUpdateSettings({ ...settings, visionBoardImage: imageUrl }); 
                                setView('DASHBOARD'); 
                            }} 
                            onBack={() => setView('DASHBOARD')} 
                        />
                    )}
                    {view === 'SIDE_PROJECTS' && <SideProjectsView settings={settings} onBack={() => setView('DASHBOARD')} onUpdateSettings={handleUpdateSettings} />}
                    {view === 'MEMO_PAD' && <MemoPadView onBack={() => setView('DASHBOARD')} />}
                    {view === 'SETTINGS' && (
                        <SettingsView 
                            settings={settings} 
                            onSave={(newSettings) => { 
                                handleUpdateSettings(newSettings); 
                                setView('DASHBOARD'); 
                            }} 
                            onBack={() => setView('DASHBOARD')} 
                        />
                    )}
                    {view === 'GOAL_RENEWAL' && <GoalRenewalView settings={settings} reflections={reflections} onSave={handleGoalRenewal} setLoading={setLoading} />}
                    {view === 'QUARTERLY_RENEWAL' && <QuarterlyRenewalView settings={settings} onSave={handleQuarterlyRenewal} />}
                 </div>
            </div>
        );
    };

    return (
        <>
            {loading && <LoadingOverlay />}
            {settings && !settings.isPrototyperRegistered && <PrototypeRegistrationModal onRegister={handleRegisterPrototyper} />}
            {renderContent()}
        </>
    );
};

export default App;
