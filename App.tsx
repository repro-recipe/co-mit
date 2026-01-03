
import React, { useState, useEffect, useRef } from 'react';
import type { UserSettings, Reflection, DailyTask, AppView, ChatMessage, MorningReflectionData, NightReflectionData, SideProject, Memo } from './types';
import * as geminiService from './services/geminiService';
import { BrainCircuitIcon, FlameIcon, GhostIcon, BotIcon, SendIcon, ChevronLeftIcon, ChevronRightIcon, PiggyBankIcon, CoMitLogoIcon, FileTextIcon, UsersIcon, MessageSquareIcon, TrendingUpIcon, StarIcon } from './components/Icons';
import GrowthGraph from './components/GrowthGraph';
import RichTextEditor from './components/RichTextEditor';

// --- Helpers ---

const getLocalTodayDate = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
        commitmentStartDate: settings.commitmentStartDate || today,
        threeWeekGoal: settings.threeWeekGoal || (settings.quarterlyGoals && settings.quarterlyGoals.length > 0 ? settings.quarterlyGoals[0] : ""),
        isPrototyperRegistered: settings.isPrototyperRegistered ?? false,
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
            <div className="bg-white border border-slate-200 rounded-lg shadow-2xl p-6 w-full max-w-lg relative animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4 text-sky-600 text-center">{title}</h2>
                {children}
                {!hideCloseButton && (
                    <button type="button" onClick={onClose} className="absolute top-2 right-2 p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                )}
            </div>
        </div>
    );
};

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center h-full min-h-[200px]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-500"></div>
    </div>
);

const LoadingOverlay: React.FC = () => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm transition-opacity animate-fade-in">
        <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-sky-500"></div>
            <p className="text-sm font-bold text-slate-600 animate-pulse">AI思考中...</p>
        </div>
    </div>
);

const PrototypeRegistrationModal: React.FC<{ onRegister: () => void }> = ({ onRegister }) => (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden relative transform transition-all scale-100">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-400"></div>
             <div className="p-8 md:p-10 text-center">
                <div className="mb-6 inline-flex items-center justify-center p-4 rounded-full bg-sky-50 text-sky-600 mb-6 ring-4 ring-sky-50/50">
                    <CoMitLogoIcon className="w-16 h-20" />
                </div>
                
                <h2 className="text-2xl font-black text-slate-800 mb-2">co-mit プロトタイプ</h2>
                <div className="flex justify-center mb-6">
                    <span className="bg-sky-100 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-widest uppercase border border-sky-200">Early Access</span>
                </div>

                <p className="text-lg font-bold text-slate-700 mb-2">
                    「振り返り、実践することで<br/>行動改善に革命を！！」
                </p>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                    AIパートナーと共に目標達成を目指す<br/>
                    新しい習慣形成アプリへようこそ。<br/>
                    現在はプロトタイプ期間中です。
                </p>

                <button 
                    type="button"
                    onClick={onRegister}
                    className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-xl shadow-xl hover:bg-slate-800 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 group"
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
        <div className="fixed top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full shadow-md text-xs font-mono font-bold text-slate-600 border border-slate-200 z-[100] flex gap-2 items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {getLocalTodayDate(time)} {time.toLocaleTimeString()}
        </div>
    );
};

const Header: React.FC<{ title: string, onBack?: () => void }> = ({ title, onBack }) => (
    <header className="flex items-center mb-6">
        {onBack && (
            <button type="button" onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-slate-200 transition">
                <ChevronLeftIcon className="w-6 h-6" />
            </button>
        )}
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{title}</h1>
    </header>
);

// --- Sub Views ---

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

    const handleSave = () => {
        const settings: UserSettings = {
            longTermGoal,
            threeWeekGoal,
            yearStartMonth: new Date().getMonth(),
            commitmentStartDate: getLocalTodayDate(),
            goalDurationDays: 365,
            depositAmount: 0,
        };
        onSave(settings);
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <>
                        <h2 className="text-xl font-semibold mb-2">Step 1: コミットメント分野</h2>
                        <p className="text-slate-600 mb-4">これから1年間、あなたが本気で取り組む分野を一つだけ決めてください。</p>
                        <Input value={commitmentField} onChange={(e) => setCommitmentField(e.target.value)} placeholder="例：Web開発、英語学習、筋トレ" />
                        <PrimaryButton onClick={() => setStep(2)} disabled={!commitmentField} className="mt-6 w-full">次へ</PrimaryButton>
                    </>
                );
            case 2:
                return (
                    <>
                        <h2 className="text-xl font-semibold mb-4">Step 2: 1年の抱負</h2>
                        <div className="mb-4 p-3 bg-slate-100 rounded-lg">
                            <span className="text-xs font-bold text-slate-500 block uppercase">選択した分野</span>
                            <p className="text-slate-800 font-semibold">{commitmentField}</p>
                        </div>
                        <p className="text-slate-600 mb-4">1年後の厳密なゴールを決める必要はありません。モチベーションの源泉となる「抱負」を言葉にしましょう。</p>
                        <TextArea value={longTermGoal} onChange={(e) => setLongTermGoal(e.target.value)} placeholder="例：技術を楽しみながら、周りから頼られるエンジニアになる" rows={3} className="mb-4"/>
                        <div className="flex justify-end mb-6">
                             <SecondaryButton onClick={handleGenerateSuggestions} className="flex items-center gap-2 text-sm">
                                <BotIcon className="w-4 h-4 text-sky-600" />
                                AIに抱負のアイデアを提案してもらう
                            </SecondaryButton>
                        </div>
                        {suggestions.length > 0 && (
                            <div className="mb-6">
                                <p className="text-sm text-slate-500 mb-2 font-bold">AIからの提案:</p>
                                <div className="grid gap-2">
                                    {suggestions.map((s, i) => (
                                        <button type="button" key={i} onClick={() => setLongTermGoal(s)} className="w-full text-left p-3 bg-white border border-slate-200 hover:border-sky-400 hover:bg-sky-50 rounded-md transition shadow-sm">
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
                        <h2 className="text-xl font-semibold mb-2">Step 3: 3週間後のビジョン</h2>
                        {!threeWeekGoal ? (
                            <div className="flex flex-col h-[400px]">
                                <p className="text-slate-600 text-sm mb-2">AIコーチと対話して、3週間後の「最高にワクワクする状態」を具体化しましょう。</p>
                                <div className="flex-1 overflow-y-auto bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200" ref={chatScrollRef}>
                                    {chatHistory.map((msg, i) => (
                                        <div key={i} className={`flex mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-sky-500 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'}`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))}
                                    {isChatLoading && <div className="text-xs text-slate-400 animate-pulse">AIが考え中...</div>}
                                </div>
                                <div className="flex gap-2 mb-4">
                                    <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChatSend()} placeholder="返信を入力..." className="flex-1" />
                                    <button type="button" onClick={handleChatSend} disabled={!chatInput || isChatLoading} className="bg-sky-500 text-white p-2 rounded hover:bg-sky-600 transition disabled:opacity-50"><SendIcon className="w-5 h-5"/></button>
                                </div>
                                <PrimaryButton onClick={handleFinishChat} disabled={chatHistory.length < 5} className="w-full">
                                    {chatHistory.length < 5 ? "もう少し対話を続ける" : "この内容で3週間のゴールを生成"}
                                </PrimaryButton>
                            </div>
                        ) : (
                            <div className="animate-fade-in">
                                <h3 className="font-bold text-sky-600 mb-2">生成された3週間のゴール:</h3>
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
                    <h1 className="text-3xl font-bold text-slate-800">co-mitへようこそ</h1>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 mb-8">
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
                <h1 className="text-2xl font-bold mb-2">デポジット設定</h1>
                <p className="text-slate-600 mb-6">目標未達の場合に失うデポジット額を設定します。</p>
                <div className="flex items-center justify-center gap-4 mb-8">
                    <span className="text-3xl font-bold text-slate-800">¥</span>
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
}> = ({ settings, reflections, totalScore, currentStreak, currentQuarterlyGoal, todayStr, currentReflection, onNavigate, onUpdateTasks }) => {
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
                <Card className="col-span-1 md:col-span-2">
                    <h2 className="text-sm font-bold text-sky-600 mb-1">現在の3週間ゴール</h2>
                    <p className="text-lg font-semibold text-slate-800">{currentQuarterlyGoal}</p>
                </Card>
                <div className="grid grid-cols-2 gap-4">
                    <Card className="text-center">
                        <div className="flex items-center justify-center"><StarIcon className="w-6 h-6 text-amber-400 mr-2"/><h2 className="text-sm font-bold text-slate-500 mb-1">合計スコア</h2></div>
                        <p className="text-3xl font-bold">{totalScore}</p>
                    </Card>
                    <Card className="text-center">
                       <div className="flex items-center justify-center"><TrendingUpIcon className="w-6 h-6 text-emerald-500 mr-2"/><h2 className="text-sm font-bold text-slate-500 mb-1">継続日数</h2></div>
                        <p className="text-3xl font-bold">{currentStreak}</p>
                    </Card>
                </div>
            </header>
            <GrowthGraph reflections={reflections} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">今日のタスク ({todayStr})</h2>
                            {!currentReflection?.morning ? (
                                <PrimaryButton onClick={() => onNavigate('MORNING_CONVERSATION')}>朝の計画を立てる</PrimaryButton>
                            ) : !currentReflection.night ? (
                                <PrimaryButton onClick={() => onNavigate('NIGHT_REFLECTION')}>夜の振り返りをする</PrimaryButton>
                            ) : (
                                <span className="text-sky-600 font-bold bg-sky-100 px-3 py-1 rounded-full">完了</span>
                            )}
                        </div>
                        {currentReflection?.dailyTasks && currentReflection.dailyTasks.length > 0 ? (
                            <ul className="space-y-3">
                                {currentReflection.dailyTasks.map((task, idx) => (
                                    <li key={idx} className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-100 transition-all hover:shadow-sm">
                                        <input type="checkbox" checked={task.completed} onChange={() => toggleTaskCompletion(idx)} className="task-checkbox mr-4" id={`task-${idx}`}/>
                                        <label htmlFor={`task-${idx}`} className={`flex-1 task-label cursor-pointer font-medium ${task.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>
                                            {task.text}
                                        </label>
                                        <div className="ml-2" title={`Priority: ${task.priority}`}>{priorityIcon(task.priority)}</div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200"><p>まだタスクが設定されていません</p></div>
                        )}
                    </Card>
                </div>
                <div className="space-y-4">
                     <button type="button" onClick={() => onNavigate('SPICY_FEEDBACK')} className="w-full bg-gradient-to-r from-orange-400 to-red-500 text-white p-4 rounded-xl shadow-lg hover:from-orange-500 hover:to-red-600 transition flex items-center justify-center gap-2 font-bold transform hover:scale-[1.02]"><MessageSquareIcon className="w-6 h-6" />仲間の声</button>
                    <button type="button" onClick={() => onNavigate('AI_TWIN')} className="w-full bg-white text-purple-600 border-2 border-purple-200 p-4 rounded-xl shadow-sm hover:bg-purple-50 transition flex items-center justify-center gap-2 font-bold"><GhostIcon className="w-6 h-6" />AIツインと話す</button>
                    <button type="button" onClick={() => onNavigate('SIDE_PROJECTS')} className="w-full bg-white text-slate-700 border border-slate-200 p-4 rounded-xl shadow-sm hover:bg-slate-50 transition flex items-center justify-center gap-2 font-semibold"><BrainCircuitIcon className="w-5 h-5 text-slate-500" />サイドプロジェクト</button>
                    <button type="button" onClick={() => onNavigate('MEMO_PAD')} className="w-full bg-white text-slate-700 border border-slate-200 p-4 rounded-xl shadow-sm hover:bg-slate-50 transition flex items-center justify-center gap-2 font-semibold"><FileTextIcon className="w-5 h-5 text-slate-500" />メモ</button>
                </div>
            </div>
        </div>
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
                    <p className="mb-4 text-slate-600">今の「3週間ゴール」は何ですか？何も見ずに入力してください。</p>
                    {!goalCheckResult ? (
                        <>
                            <TextArea value={goalRecallInput} onChange={(e) => setGoalRecallInput(e.target.value)} placeholder="ゴールを入力..." className="mb-4" />
                            <PrimaryButton onClick={handleGoalRecallSubmit} disabled={!goalRecallInput} className="w-full">確認</PrimaryButton>
                        </>
                    ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-4 text-center">
                            {goalCheckResult.match ? (
                                <div className="mb-4">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-emerald-600">素晴らしい！正解です</h3>
                                    <p className="text-sm text-slate-500">ゴールをしっかり意識できています。</p>
                                </div>
                            ) : (
                                <div className="mb-4">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-600 mb-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-rose-600">惜しい...</h3>
                                    <p className="text-sm text-slate-500">正確なゴールと少しずれています。<br/>ペナルティとして <span className="font-bold text-rose-600">-5pt</span> となります。</p>
                                </div>
                            )}
                            <div className="bg-white border border-slate-200 rounded p-3 mb-6 text-left">
                                <p className="text-xs text-slate-400 font-bold mb-1 uppercase">本来のゴール</p>
                                <p className="font-bold text-slate-800">{quarterlyGoal}</p>
                            </div>
                            <PrimaryButton onClick={handleProceedToTask} className="w-full">次へ進む</PrimaryButton>
                        </div>
                    )}
                </div>
            )}
            {step === 2 && (
                <div className="animate-fade-in">
                    <p className="mb-2 font-bold text-sky-600">{isFirstTask ? "今日の最重要タスク" : "追加のタスク"}</p>
                    <p className="mb-4 text-slate-600">{isFirstTask ? "今日、これさえ達成できれば100点と言えるタスクを1つ決めてください。" : "他にやっておきたいタスクがあれば追加してください。"}</p>
                    <Input value={taskInput} onChange={(e) => setTaskInput(e.target.value)} placeholder="タスクを入力..." className="mb-4" />
                    {aiResponse && <div className="bg-slate-100 p-4 rounded-lg mb-4 border-l-4 border-sky-500"><div className="flex items-start gap-3"><BotIcon className="w-6 h-6 text-sky-600 mt-1 flex-shrink-0" /><p className="text-slate-700">{aiResponse}</p></div></div>}
                    {!aiResponse ? (
                        <PrimaryButton onClick={handleTaskEvaluate} disabled={!taskInput} className="w-full">AIに評価してもらう</PrimaryButton>
                    ) : (
                        <div className="grid grid-cols-2 gap-3"><SecondaryButton onClick={() => setAiResponse(null)}>修正する</SecondaryButton><PrimaryButton onClick={handleConfirmTask}>計画を立てる</PrimaryButton></div>
                    )}
                </div>
            )}
            {step === 4 && (
                <div className="animate-fade-in">
                    <h3 className="font-bold text-lg mb-4 text-slate-800">行動プランの編集</h3>
                    <p className="text-sm text-slate-500 mb-4">AIが提案したステップを編集できます。これらはサブタスクとして追加されます。</p>
                    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
                        <h4 className="font-bold text-sky-600 mb-4 text-lg border-b border-slate-100 pb-2">{taskInput}</h4>
                        <div className="space-y-3">{taskSteps.map((step, index) => (<div key={index} className="flex items-center gap-2"><span className="font-bold text-slate-400 w-6 text-center">{index + 1}.</span><Input value={step} onChange={(e) => { const newSteps = [...taskSteps]; newSteps[index] = e.target.value; setTaskSteps(newSteps); }} className="flex-1" placeholder={`ステップ ${index + 1}`} /><button type="button" onClick={() => { const newSteps = taskSteps.filter((_, i) => i !== index); setTaskSteps(newSteps); }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition" title="削除">x</button></div>))}</div>
                        <button type="button" onClick={() => setTaskSteps([...taskSteps, ""])} className="mt-3 text-sm text-sky-500 font-bold hover:underline flex items-center gap-1">+ ステップを追加</button>
                    </div>
                    <div className="flex flex-col gap-3"><SecondaryButton onClick={handleAddTaskToTemp} className="w-full flex items-center justify-center gap-2"><span className="text-xl font-bold">+</span> さらに今日のタスクを追加する</SecondaryButton><PrimaryButton onClick={handleFinishPlanning} className="w-full">この内容で決定して次に進む</PrimaryButton></div>
                </div>
            )}
            {step === 5 && (
                 <div className="animate-fade-in">
                    <h3 className="font-bold text-lg mb-2 text-slate-800">フリーノート (任意)</h3>
                    <p className="text-slate-600 mb-4 text-sm">今の気持ちや、今日の意気込みを自由に書いてください。これはAI Twinの育成に使われます。</p>
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
    const [wastedTime, setWastedTime] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [extrasList, setExtrasList] = useState<string[]>([]);
    const [extraInput, setExtraInput] = useState("");
    const [failureReason, setFailureReason] = useState("");
    const [aiFailureFeedback, setAiFailureFeedback] = useState("");
    
    const uncompletedTasks = localTasks.filter(t => !t.completed);
    const toggleLocalTask = (index: number) => { const newTasks = [...localTasks]; newTasks[index].completed = !newTasks[index].completed; setLocalTasks(newTasks); };
    const handleFailureAnalysis = async () => { setLoading(true); const result = await geminiService.analyzeFailureReason(failureReason, sideProjects); setLoading(false); setAiFailureFeedback(result.response); };
    const handleAddExtra = () => { if(!extraInput.trim()) return; setExtrasList([...extrasList, extraInput]); setExtraInput(""); };
    const handleRemoveExtra = (index: number) => { setExtrasList(extrasList.filter((_, i) => i !== index)); };
    const handleFinish = () => { if(isSaving) return; setIsSaving(true); const data: NightReflectionData = { feelings: "", freeMemo: feelings, achievementAnalysis: "", wastedTime, extras: extrasList, tomorrowIdeas: "" }; onSave(data, localTasks); };

    const renderStep = () => {
        if (step === 1) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 h-full">
                            <h3 className="font-bold text-sky-700 mb-3 flex items-center gap-2"><FileTextIcon className="w-5 h-5"/> 書くことの目安</h3>
                            <ul className="space-y-3 text-sm text-slate-700">
                                <li className="flex items-start gap-2"><span className="text-sky-400 font-bold">•</span><span>今どう思っているか</span></li>
                                <li className="flex items-start gap-2"><span className="text-sky-400 font-bold">•</span><span><strong className="text-sky-600">今日の成果は何か</strong></span></li>
                                <li className="flex items-start gap-2"><span className="text-sky-400 font-bold">•</span><span>一日を通して感謝している人はだれか</span></li>
                                <li className="flex items-start gap-2"><span className="text-sky-400 font-bold">•</span><span>どんな気持ちで行動していたか</span></li>
                            </ul>
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <h2 className="text-xl font-bold mb-2 text-slate-800">夜のノート</h2>
                        <RichTextEditor value={feelings} onChange={setFeelings} placeholder="今日1日を振り返って..." className="mb-6" minHeight="300px" />
                        <PrimaryButton onClick={() => setStep(2)} disabled={!feelings} className="w-full">次へ</PrimaryButton>
                    </div>
                </div>
            );
        }
        if (step === 2) {
            if (uncompletedTasks.length === 0 && localTasks.length > 0) return <div className="text-center py-10 animate-fade-in"><h2 className="text-2xl font-bold text-sky-600 mb-4">素晴らしい！</h2><p className="text-slate-600 mb-6">全てのタスクを完了しました。</p><PrimaryButton onClick={() => setStep(3)} className="w-full">次へ</PrimaryButton></div>
            if (localTasks.length === 0) return <div className="text-center py-10 animate-fade-in"><p className="text-slate-600 mb-6">タスクがありませんでした。</p><PrimaryButton onClick={() => setStep(3)} className="w-full">次へ</PrimaryButton></div>
            return (
                <div className="max-w-2xl mx-auto animate-fade-in">
                    <h2 className="text-xl font-bold mb-4 text-slate-800">タスクの確認</h2>
                    <div className="mb-6">{localTasks.map((task, idx) => (<div key={idx} className="flex items-center p-3 bg-white border border-slate-200 rounded-lg mb-2"><input type="checkbox" checked={task.completed} onChange={() => toggleLocalTask(idx)} className="task-checkbox mr-3"/><span className={task.completed ? "line-through text-slate-400" : "text-slate-700"}>{task.text}</span></div>))}</div>
                    {uncompletedTasks.length > 0 && (
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 animate-fade-in">
                            <h3 className="font-bold text-rose-600 mb-2">未達成のタスクがあります</h3>
                            <p className="text-sm text-slate-600 mb-3">なぜ達成できなかったのですか？言い訳せず、事実を述べてください。</p>
                            <TextArea value={failureReason} onChange={e => setFailureReason(e.target.value)} placeholder="理由..." className="mb-3" />
                            {aiFailureFeedback && <div className="bg-white p-3 rounded border border-rose-100 mb-3 text-slate-700 text-sm flex gap-2"><BotIcon className="w-5 h-5 text-rose-500 shrink-0" />{aiFailureFeedback}</div>}
                            {!aiFailureFeedback ? <Button onClick={handleFailureAnalysis} disabled={!failureReason} className="w-full bg-rose-500 text-white hover:bg-rose-600">分析する</Button> : <Button onClick={() => setStep(3)} className="w-full bg-slate-800 text-white hover:bg-slate-900">受け入れて次へ</Button>}
                        </div>
                    )}
                    {uncompletedTasks.length === 0 && <PrimaryButton onClick={() => setStep(3)} className="w-full">次へ</PrimaryButton>}
                </div>
            );
        }
        if (step === 3) {
            return (
                 <div className="max-w-2xl mx-auto animate-fade-in text-center">
                    <h2 className="text-xl font-bold mb-4 text-slate-800">時間の使い方</h2>
                    <p className="text-slate-600 mb-6">今日、無駄にしてしまった時間はありますか？正直に記録しましょう。</p>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6"><label className="block text-sm font-bold text-slate-600 mb-2 text-left">無駄にした時間 (分単位/内容)</label><Input value={wastedTime} onChange={e => setWastedTime(e.target.value)} placeholder="例: SNSを見ていた30分, 特になし" /></div>
                    <div className="flex gap-4"><SecondaryButton onClick={() => setStep(2)} className="flex-1">戻る</SecondaryButton><PrimaryButton onClick={() => setStep(4)} className="flex-1">次へ</PrimaryButton></div>
                 </div>
            );
        }
        if (step === 4) {
             return (
                 <div className="max-w-2xl mx-auto animate-fade-in">
                    <h2 className="text-xl font-bold mb-2 text-slate-800">プラスアルファの積み上げ</h2>
                    <p className="text-slate-600 mb-6">予定にはなかったけれど、今日できたことはありますか？些細なことでも構いません。</p>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6">
                         <div className="flex gap-2 mb-4"><Input value={extraInput} onChange={e => setExtraInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddExtra()} placeholder="例: 関連書籍を1章読んだ, スクワット10回" className="flex-1"/><button type="button" onClick={handleAddExtra} disabled={!extraInput.trim()} className="bg-emerald-500 text-white font-bold px-4 rounded-lg hover:bg-emerald-600 transition disabled:opacity-50">追加</button></div>
                         {extrasList.length > 0 ? (<ul className="space-y-2">{extrasList.map((item, index) => (<li key={index} className="flex items-center justify-between bg-white p-3 rounded shadow-sm border border-emerald-100"><span className="text-emerald-800 font-medium">✨ {item}</span><button type="button" onClick={() => handleRemoveExtra(index)} className="text-slate-400 hover:text-rose-500 p-1">x</button></li>))}</ul>) : (<p className="text-emerald-600/50 text-center py-4 text-sm font-bold">まだ追加されていません</p>)}
                    </div>
                    <div className="flex gap-4"><SecondaryButton onClick={() => setStep(3)} className="flex-1">戻る</SecondaryButton><PrimaryButton onClick={() => setStep(5)} className="flex-1">次へ</PrimaryButton></div>
                 </div>
             );
        }
        if (step === 5) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                    <div className="md:col-span-1">
                        <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 h-full">
                            <h3 className="font-bold text-sky-700 mb-3 flex items-center gap-2"><FileTextIcon className="w-5 h-5"/> 書くことの目安</h3>
                            <ul className="space-y-3 text-sm">
                                <li className="flex items-start gap-2 text-slate-400"><span>•</span> <span>今どう思っているか</span></li>
                                <li className="flex items-start gap-2 text-slate-400"><span>•</span> <span>今日の成果は何か</span></li>
                                <li className="flex items-start gap-2 text-slate-400"><span>•</span> <span>一日を通して感謝している人はだれか</span></li>
                                <li className="flex items-start gap-2 text-slate-400"><span>•</span> <span>どんな気持ちで行動していたか</span></li>
                                <li className="flex items-start gap-2 text-sky-700 font-bold text-base mt-4 bg-white/50 p-2 rounded border border-sky-100 shadow-sm"><span className="text-sky-500">→</span><span>明日のアイデア</span></li>
                            </ul>
                            <p className="mt-4 text-xs text-slate-500">今日の振り返りを踏まえて、明日の計画やアイデアを書き足しましょう。</p>
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <h2 className="text-xl font-bold mb-2 text-slate-800">夜のノート (仕上げ)</h2>
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
            <div className="w-full bg-slate-200 rounded-full h-2 mb-8"><div className="bg-sky-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(step / 5) * 100}%` }}></div></div>
            {renderStep()}
        </Card>
    );
};

const AITwinView: React.FC<{ reflections: Reflection[], onBack: () => void }> = ({ reflections, onBack }) => {
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [twinReflection, setTwinReflection] = useState<Reflection | null>(null);

    useEffect(() => {
        const valid = reflections.filter(r => r.morning && r.night && r.date !== getLocalTodayDate());
        if (valid.length > 0) {
            const target = valid[valid.length - 1];
            setTwinReflection(target);
            setHistory([{ role: 'model', text: `こんにちは。${target.date}の私です。あの日のことなら何でも聞いてください。` }]);
        } else {
             setHistory([{ role: 'model', text: "過去の記録が見つかりません。まずは日々の記録をつけましょう。" }]);
        }
    }, [reflections]);

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

    return (
        <Card className="max-w-2xl mx-auto h-[600px] flex flex-col">
            <Header title="AI Twin (過去の自分)" onBack={onBack} />
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 rounded-xl mb-4 border border-slate-100">
                {history.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-start max-w-[80%] gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-sky-500 text-white' : 'bg-purple-500 text-white'}`}>{msg.role === 'user' ? <UsersIcon className="w-5 h-5"/> : <GhostIcon className="w-5 h-5"/>}</div>
                            <div className={`p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-sky-500 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'}`}>{msg.text}</div>
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
            <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200"><h3 className="font-bold text-slate-700 mb-2">新規プロジェクト</h3><div className="flex gap-2 mb-2"><Input value={name} onChange={e => setName(e.target.value)} placeholder="プロジェクト名" className="flex-1" /><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-40" /></div><PrimaryButton onClick={handleAdd} disabled={!name}>追加</PrimaryButton></div>
            <div className="space-y-3">{projects.map(p => (<div key={p.id} className={`flex items-center justify-between p-4 rounded-lg border ${p.completed ? 'bg-slate-100 border-slate-200' : 'bg-white border-slate-200 shadow-sm'}`}><div className="flex items-center gap-3"><input type="checkbox" checked={p.completed} onChange={() => toggleComplete(p.id)} className="w-5 h-5 accent-sky-500" /><div><p className={`font-bold ${p.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{p.name}</p>{p.dueDate && <p className="text-xs text-slate-500">期限: {p.dueDate}</p>}</div></div><button type="button" onClick={() => deleteProject(p.id)} className="text-slate-400 hover:text-rose-500">x</button></div>))}</div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{memos.map(memo => (<div key={memo.id} className="bg-yellow-50 p-4 rounded shadow-sm border border-yellow-200 relative group"><p className="whitespace-pre-wrap text-slate-700 text-sm mb-4">{memo.text}</p><div className="flex justify-between items-center mt-2 border-t border-yellow-100 pt-2"><span className="text-xs text-slate-400">{new Date(memo.createdAt).toLocaleDateString()}</span><button type="button" onClick={() => deleteMemo(memo.id)} className="text-slate-400 hover:text-rose-500">削除</button></div></div>))}</div>
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
    const handleAnalyze = async () => { setLoading(true); const totalScore = reflections.reduce((acc, r) => acc + (r.score || 0), 0); const nextGoal = await geminiService.generateNextGoal(settings.longTermGoal, review, totalScore); setSuggestedGoal(nextGoal); setLoading(false); setStep(2); };
    return (
        <Card className="max-w-2xl mx-auto">
            <div className="text-center mb-6"><h1 className="text-2xl font-bold text-sky-600 mb-2">3週間のサイクルが終了しました！</h1><p className="text-slate-600">お疲れ様でした。この3週間を振り返り、次のステップへ進みましょう。</p></div>
            {step === 1 && (<div className="animate-fade-in"><p className="font-bold text-slate-700 mb-2">これまでの振り返り</p><TextArea value={review} onChange={e => setReview(e.target.value)} placeholder="達成できたこと、難しかったこと、今の気持ちなどを自由に書いてください。" className="mb-4 h-32"/><PrimaryButton onClick={handleAnalyze} disabled={!review} className="w-full">AIと次のゴールを決める</PrimaryButton></div>)}
            {step === 2 && (<div className="animate-fade-in"><h3 className="font-bold text-lg text-slate-800 mb-4">次の3週間ゴール（提案）</h3><TextArea value={suggestedGoal} onChange={e => setSuggestedGoal(e.target.value)} className="mb-6 text-lg font-bold text-slate-800"/><PrimaryButton onClick={() => onSave(suggestedGoal)} className="w-full">新しいサイクルを開始する</PrimaryButton></div>)}
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

    useEffect(() => {
        const savedSettings = localStorage.getItem('comit_settings');
        const savedReflections = localStorage.getItem('comit_reflections');
        let loadedSettings: UserSettings | null = null;
        
        if (savedSettings) {
            loadedSettings = migrateSettings(JSON.parse(savedSettings));
            setSettings(loadedSettings);
            if (loadedSettings.commitmentStartDate) {
                const daysDiff = getDaysDiff(loadedSettings.commitmentStartDate, getLocalTodayDate());
                if (daysDiff >= 21) setView('GOAL_RENEWAL');
            }
        }
        if (savedReflections) setReflections(migrateReflections(JSON.parse(savedReflections)));
        
        setInitializing(false);
    }, []);

    const saveSettings = (newSettings: UserSettings) => { setSettings(newSettings); localStorage.setItem('comit_settings', JSON.stringify(newSettings)); };
    const saveReflections = (newReflections: Reflection[]) => { setReflections(newReflections); localStorage.setItem('comit_reflections', JSON.stringify(newReflections)); };

    const handleSetupSave = (newSettings: UserSettings) => { saveSettings(newSettings); setView('DEPOSIT'); };
    const handleGoalRenewal = (newGoal: string) => { if (!settings) return; const updated = { ...settings, threeWeekGoal: newGoal, commitmentStartDate: today }; saveSettings(updated); setView('DASHBOARD'); };
    const handleUpdateSettings = (newSettings: UserSettings) => saveSettings(newSettings);
    const handleRegisterPrototyper = () => { if (!settings) return; saveSettings({ ...settings, isPrototyperRegistered: true }); };

    const todayStr = getLocalTodayDate();
    const currentReflection = reflections.find(r => r.date === todayStr);
    const totalScore = reflections.reduce((acc, r) => acc + (r.score || 0), 0);
    const currentStreak = reflections.length; 

    if (initializing) return <LoadingSpinner />;

    const renderContent = () => {
        if (!settings) {
            return (
                <div className="min-h-screen bg-slate-100 p-4 flex items-center justify-center">
                    <SetupView onSave={handleSetupSave} setLoading={setLoading} />
                </div>
            );
        }

        if (!settings.depositAmount && view === 'DEPOSIT') {
            return (
                <div className="min-h-screen bg-slate-100 p-4 flex items-center justify-center">
                    <DepositView onSave={(amount) => { saveSettings({ ...settings, depositAmount: amount }); setView('DASHBOARD'); }} />
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-slate-100 text-slate-800 font-sans selection:bg-sky-200">
                 <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-sky-100 via-slate-100 to-slate-200"></div>
                 <Clock />
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
                        />
                    )}
                    {view === 'MORNING_CONVERSATION' && (
                        <MorningConversationView 
                            quarterlyGoal={settings.threeWeekGoal || ""}
                            longTermGoal={settings.longTermGoal}
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
                                 let score = 10 + (updatedTasks.filter(t => t.completed).length * 5) + (data.extras.length * 5);
                                 if (data.wastedTime) score -= 10;
                                 if (currentReflection.pendingScore) score += currentReflection.pendingScore;
                                 const updated: Reflection = { ...currentReflection, night: data, dailyTasks: updatedTasks, score: score, pendingScore: 0 };
                                 const others = reflections.filter(r => r.date !== todayStr);
                                 saveReflections([...others, updated]);
                                 setView('DASHBOARD');
                            }}
                            onBack={() => setView('DASHBOARD')}
                            setLoading={setLoading}
                        />
                    )}
                    {view === 'AI_TWIN' && <AITwinView reflections={reflections} onBack={() => setView('DASHBOARD')} />}
                    {view === 'SPICY_FEEDBACK' && <SpicyFeedbackView reflections={reflections} onBack={() => setView('DASHBOARD')} />}
                    {view === 'SIDE_PROJECTS' && <SideProjectsView settings={settings} onBack={() => setView('DASHBOARD')} onUpdateSettings={handleUpdateSettings} />}
                    {view === 'MEMO_PAD' && <MemoPadView onBack={() => setView('DASHBOARD')} />}
                    {view === 'GOAL_RENEWAL' && <GoalRenewalView settings={settings} reflections={reflections} onSave={handleGoalRenewal} setLoading={setLoading} />}
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
