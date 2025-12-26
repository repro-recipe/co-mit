
import React, { useState, useEffect, useRef } from 'react';
import type { UserSettings, Reflection, DailyTask, AppView, AITwin, ChatMessage, NightReflectionData, MorningReflectionData, SideProject, Memo } from './types';
import * as geminiService from './services/geminiService';
import { BrainCircuitIcon, CalendarIcon, FlameIcon, GoalIcon, GhostIcon, BotIcon, UserIcon, SendIcon, ChevronLeftIcon, ChevronRightIcon, PiggyBankIcon, CoMitLogoIcon, FileTextIcon, UsersIcon, VideoIcon, MessageSquareIcon, TrendingUpIcon, StarIcon } from './components/Icons';
import CommitmentRoad from './components/Road';
import Calendar from './components/Calendar';
import RichTextEditor from './components/RichTextEditor';

// --- Helpers ---

// Get local date string YYYY-MM-DD
const getLocalTodayDate = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

const Input: React.FC<{ value: string | number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, type?: string, min?: number, step?: number, onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void, disabled?: boolean, className?: string, id?: string }> = ({ value, onChange, placeholder, type = "text", className, ...props }) => (
    <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full bg-slate-50 border-2 border-slate-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition text-slate-900 placeholder:text-slate-400 disabled:bg-slate-200 ${className}`}
        {...props}
    />
);

const TextArea: React.FC<{ value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, placeholder?: string, rows?: number, className?: string, onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void, disabled?: boolean }> = ({ value, onChange, placeholder, rows = 4, className, ...props }) => (
    <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
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
                    <button onClick={onClose} className="absolute top-2 right-2 p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                )}
            </div>
        </div>
    );
};

const MentoringModal: React.FC<{ isOpen: boolean, onSelect: (view: AppView) => void }> = ({ isOpen, onSelect }) => {
    return (
        <Modal isOpen={isOpen} onClose={() => {}} title="メンタリングに参加しましょう！" hideCloseButton={true}>
            <div className="text-center">
                <p className="text-slate-600 mb-6">少し疲れが見えるようです。一人で抱え込まず、仲間の力を借りてエネルギーを充填しましょう。</p>
                <div className="space-y-3">
                    <button onClick={() => onSelect('SPICY_FEEDBACK')} className="w-full flex items-center justify-between p-4 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-all group">
                        <div className="flex items-center gap-3">
                             <div className="bg-white p-2 rounded-full shadow-sm text-sky-500">
                                <MessageSquareIcon className="w-5 h-5"/>
                             </div>
                             <span className="font-bold text-slate-700">仲間からのフィードバック</span>
                        </div>
                        <ChevronRightIcon className="w-5 h-5 text-slate-400 group-hover:text-sky-500" />
                    </button>

                    <button onClick={() => onSelect('AI_TWIN')} className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-all group">
                         <div className="flex items-center gap-3">
                             <div className="bg-white p-2 rounded-full shadow-sm text-purple-500">
                                <GhostIcon className="w-5 h-5"/>
                             </div>
                             <span className="font-bold text-slate-700">過去の自分との対話</span>
                        </div>
                        <ChevronRightIcon className="w-5 h-5 text-slate-400 group-hover:text-purple-500" />
                    </button>

                    <button onClick={() => onSelect('PEER_PROFILE')} className="w-full flex items-center justify-between p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all group">
                         <div className="flex items-center gap-3">
                             <div className="bg-white p-2 rounded-full shadow-sm text-emerald-500">
                                <UsersIcon className="w-5 h-5"/>
                             </div>
                             <span className="font-bold text-slate-700">仲間とのメンタリング</span>
                        </div>
                        <ChevronRightIcon className="w-5 h-5 text-slate-400 group-hover:text-emerald-500" />
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const PrototypeModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
     <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
        <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full text-center border-4 border-sky-500 animate-bounce-in">
            <h2 className="text-xl font-bold text-slate-800 mb-4">ご協力のお願い</h2>
            <p className="text-slate-600 mb-6 text-sm">
                co-mitのプロトタイプ検証にご参加いただきありがとうございます。<br/>
                サービスの改善のため、まずは下記フォームより利用者登録をお願いいたします。
            </p>
            <a 
                href="https://forms.gle/Shdjdj8gbtu8hJR39" 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={onClose}
                className="block w-full bg-sky-500 text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition mb-4 shadow-md flex items-center justify-center gap-2"
            >
                <span>利用者登録フォームを開く</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
            <button onClick={onClose} className="text-slate-400 text-xs hover:text-slate-600 underline">
                登録済みの方 / 後でする
            </button>
        </div>
    </div>
);

const PrototypeBanner: React.FC = () => (
    <div className="fixed top-14 right-4 z-[90] bg-yellow-50/90 backdrop-blur border border-yellow-200 shadow-md rounded-lg p-2 text-xs text-right max-w-[220px]">
        <p className="mb-1 text-slate-700 font-bold">⚠️ プロトタイプ検証のお願い</p>
        <p className="mb-1 text-slate-600">利用者の登録をお願いします</p>
        <a 
            href="https://forms.gle/Shdjdj8gbtu8hJR39" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-sky-600 font-bold underline hover:text-sky-800 block break-all"
        >
            https://forms.gle/Shdjdj8gbtu8hJR39
        </a>
    </div>
);

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center h-full min-h-[200px]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-500"></div>
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
            <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-slate-200 transition">
                <ChevronLeftIcon className="w-6 h-6" />
            </button>
        )}
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{title}</h1>
    </header>
);

// --- App Views ---

const SetupView: React.FC<{ onSave: (settings: UserSettings) => void; setLoading: (loading: boolean) => void }> = ({ onSave, setLoading }) => {
    const [step, setStep] = useState(1);
    const [commitmentField, setCommitmentField] = useState("");
    const [longTermGoal, setLongTermGoal] = useState("");
    const [quarterlyGoals, setQuarterlyGoals] = useState<[string, string, string, string]>(["", "", "", ""]);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const handleGenerateSuggestions = async () => {
        if (!commitmentField) return;
        setLoading(true);
        const newSuggestions = await geminiService.generateGoalSuggestions(commitmentField);
        setSuggestions(newSuggestions);
        setLoading(false);
    };
    
    const handleGenerateQuarterlyGoals = async () => {
        if (!longTermGoal || !commitmentField) return;
        setLoading(true);
        const goals = await geminiService.generateQuarterlyGoals(longTermGoal, commitmentField);
        if (goals.length === 4) {
            setQuarterlyGoals(goals as [string, string, string, string]);
        }
        setLoading(false);
    }

    const handleSave = () => {
        const settings: UserSettings = {
            longTermGoal,
            quarterlyGoals,
            yearStartMonth: new Date().getMonth(),
            commitmentStartDate: getLocalTodayDate(), // Use local date
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
                        <h2 className="text-xl font-semibold mb-4">Step 2: 年間ゴール</h2>
                        
                        <div className="mb-4 p-3 bg-slate-100 rounded-lg">
                            <span className="text-xs font-bold text-slate-500 block uppercase">選択した分野</span>
                            <p className="text-slate-800 font-semibold">{commitmentField}</p>
                        </div>

                        <p className="text-slate-600 mb-4">1年後の理想の状態を具体的に記述してください。</p>
                        
                        <TextArea 
                            value={longTermGoal} 
                            onChange={(e) => setLongTermGoal(e.target.value)} 
                            placeholder="例：Webサービスを自力で開発し、1000人のユーザーを獲得する" 
                            rows={3}
                            className="mb-4"
                        />
                        
                        <div className="flex justify-end mb-6">
                             <SecondaryButton onClick={handleGenerateSuggestions} className="flex items-center gap-2 text-sm">
                                <BotIcon className="w-4 h-4 text-sky-600" />
                                AIに目標案を提案してもらう
                            </SecondaryButton>
                        </div>

                        {suggestions.length > 0 && (
                            <div className="mb-6">
                                <p className="text-sm text-slate-500 mb-2 font-bold">AIからの提案 (クリックして選択):</p>
                                <div className="grid gap-2">
                                    {suggestions.map((s, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => setLongTermGoal(s)} 
                                            className="w-full text-left p-3 bg-white border border-slate-200 hover:border-sky-400 hover:bg-sky-50 rounded-md transition shadow-sm"
                                        >
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
                        <h2 className="text-xl font-semibold mb-2">Step 3: 3ヶ月ごとのゴール</h2>
                        <div className="mb-4 p-3 bg-slate-100 rounded-lg">
                            <span className="text-xs font-bold text-slate-500 block uppercase">年間ゴール</span>
                            <p className="text-slate-800 font-semibold">{longTermGoal}</p>
                        </div>
                        <p className="text-slate-600 mb-4">年間ゴールを達成するために、3ヶ月ごとに何を達成すべきか設定しましょう。</p>
                        
                        <div className="flex justify-end mb-4">
                             <SecondaryButton onClick={handleGenerateQuarterlyGoals} className="flex items-center gap-2 text-sm">
                                <BotIcon className="w-4 h-4 text-sky-600" />
                                AIに中間目標を提案してもらう
                            </SecondaryButton>
                        </div>

                        <div className="space-y-4">
                            {quarterlyGoals.map((g, i) => (
                                <div key={i}>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">{i * 3 + 1}〜{i * 3 + 3}ヶ月目</label>
                                    <Input
                                        value={g}
                                        onChange={(e) => {
                                            const newGoals = [...quarterlyGoals] as [string, string, string, string];
                                            newGoals[i] = e.target.value;
                                            setQuarterlyGoals(newGoals);
                                        }}
                                        placeholder={`${(i * 3) + 1}〜${(i + 1) * 3}ヶ月目のゴール`}
                                    />
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex gap-3 mt-8">
                            <SecondaryButton onClick={() => setStep(2)} className="flex-1">戻る</SecondaryButton>
                            <PrimaryButton onClick={handleSave} disabled={quarterlyGoals.some(g => !g)} className="flex-1">設定完了</PrimaryButton>
                        </div>
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
                <p className="text-slate-600 mb-6">目標未達の場合に失うデポジット額を設定します。これによりコミットメントを高めます。(このアプリはシミュレーションです。実際に課金はされません)</p>
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
                    <h2 className="text-sm font-bold text-sky-600 mb-1">現在の3ヶ月ゴール</h2>
                    <p className="text-lg font-semibold text-slate-800">{currentQuarterlyGoal}</p>
                </Card>
                <div className="grid grid-cols-2 gap-4">
                    <Card className="text-center">
                        <div className="flex items-center justify-center">
                           <StarIcon className="w-6 h-6 text-amber-400 mr-2"/>
                           <h2 className="text-sm font-bold text-slate-500 mb-1">合計スコア</h2>
                        </div>
                        <p className="text-3xl font-bold">{totalScore}</p>
                    </Card>
                    <Card className="text-center">
                       <div className="flex items-center justify-center">
                           <TrendingUpIcon className="w-6 h-6 text-emerald-500 mr-2"/>
                           <h2 className="text-sm font-bold text-slate-500 mb-1">継続日数</h2>
                        </div>
                        <p className="text-3xl font-bold">{currentStreak}</p>
                    </Card>
                </div>
            </header>

            <CommitmentRoad totalScore={totalScore} />

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
                                        <input
                                            type="checkbox"
                                            checked={task.completed}
                                            onChange={() => toggleTaskCompletion(idx)}
                                            className="task-checkbox mr-4"
                                            id={`task-${idx}`}
                                        />
                                        <label htmlFor={`task-${idx}`} className={`flex-1 task-label cursor-pointer font-medium ${task.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>
                                            {task.text}
                                        </label>
                                        <div className="ml-2" title={`Priority: ${task.priority}`}>
                                            {priorityIcon(task.priority)}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                                <p>まだタスクが設定されていません</p>
                            </div>
                        )}
                    </Card>
                </div>

                <div className="space-y-4">
                     <button onClick={() => onNavigate('SPICY_FEEDBACK')} className="w-full bg-gradient-to-r from-orange-400 to-red-500 text-white p-4 rounded-xl shadow-lg hover:from-orange-500 hover:to-red-600 transition flex items-center justify-center gap-2 font-bold transform hover:scale-[1.02]">
                        <MessageSquareIcon className="w-6 h-6" />
                        仲間の声
                    </button>
                    <button onClick={() => onNavigate('AI_TWIN')} className="w-full bg-white text-purple-600 border-2 border-purple-200 p-4 rounded-xl shadow-sm hover:bg-purple-50 transition flex items-center justify-center gap-2 font-bold">
                        <GhostIcon className="w-6 h-6" />
                        AIツインと話す
                    </button>
                    <button onClick={() => onNavigate('SIDE_PROJECTS')} className="w-full bg-white text-slate-700 border border-slate-200 p-4 rounded-xl shadow-sm hover:bg-slate-50 transition flex items-center justify-center gap-2 font-semibold">
                        <BrainCircuitIcon className="w-5 h-5 text-slate-500" />
                        サイドプロジェクト
                    </button>
                    <button onClick={() => onNavigate('MEMO_PAD')} className="w-full bg-white text-slate-700 border border-slate-200 p-4 rounded-xl shadow-sm hover:bg-slate-50 transition flex items-center justify-center gap-2 font-semibold">
                        <FileTextIcon className="w-5 h-5 text-slate-500" />
                        メモ
                    </button>
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
    
    // Multiple Tasks Support
    const [tempTasks, setTempTasks] = useState<DailyTask[]>([]);
    const [isFirstTask, setIsFirstTask] = useState(true);

    const [freeMemo, setFreeMemo] = useState("");
    const [penalty, setPenalty] = useState(0);

    const handleGoalRecallSubmit = async () => {
        setLoading(true);
        const match = await geminiService.compareGoalRecall(goalRecallInput, quarterlyGoal);
        setLoading(false);
        if (match) {
            setStep(2);
        } else {
            alert("目標と一致しません。ペナルティとして-5点となりますが、次へ進みます。目標を再確認してください。");
            setPenalty(5);
            setStep(2);
        }
    };

    const handleTaskEvaluate = async () => {
        if(!taskInput) return;
        setLoading(true);
        const evaluation = await geminiService.evaluateTask(taskInput, longTermGoal, quarterlyGoal, isFirstTask);
        setLoading(false);
        
        setAiResponse(evaluation.response);
        // If appropriate, user can proceed. If insufficient, they stay to retry.
        if (evaluation.judgment === 'appropriate') {
             // Show confirmation button in UI
        }
    };

    const handleConfirmTask = async () => {
        setLoading(true);
        const steps = await geminiService.breakDownTaskIntoSteps(taskInput, longTermGoal, quarterlyGoal);
        setTaskSteps(steps);
        setLoading(false);
        setStep(4);
    };

    const handleAddTaskToTemp = () => {
        const mainTask: DailyTask = {
            text: taskInput,
            completed: false,
            type: isFirstTask ? 'main' : 'sub',
            priority: isFirstTask ? 'high' : 'medium'
        };
        
        // Add breakdown steps as sub-tasks (low priority)
        const subTasks: DailyTask[] = taskSteps.map(step => ({
            text: step,
            completed: false,
            type: 'sub' as const,
            priority: 'low' as const
        })).filter(t => t.text.trim() !== "");

        setTempTasks([...tempTasks, mainTask, ...subTasks]);
        
        // Reset for next task
        setTaskInput("");
        setAiResponse(null);
        setTaskSteps([]);
        setIsFirstTask(false);
        setStep(2); // Go back to task input
    };

    const handleFinishPlanning = () => {
        const mainTask: DailyTask = {
            text: taskInput,
            completed: false,
            type: isFirstTask ? 'main' : 'sub',
            priority: isFirstTask ? 'high' : 'medium'
        };

        // Add breakdown steps as sub-tasks
        const subTasks: DailyTask[] = taskSteps.map(step => ({
            text: step,
            completed: false,
            type: 'sub' as const,
            priority: 'low' as const
        })).filter(t => t.text.trim() !== "");

        setTempTasks([...tempTasks, mainTask, ...subTasks]);
        setStep(5); // Go to free memo
    };

    const handleSaveAll = () => {
        const data: MorningReflectionData = {
            dailyPlan: tempTasks.map(t => t.text).join(', '),
            freeMemo: freeMemo
        };
        onSave(data, tempTasks, penalty);
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <Header title="朝の作戦会議" onBack={onBack} />
            
            {step === 1 && (
                <div className="animate-fade-in">
                    <p className="mb-4 text-slate-600">あなたの3ヶ月ごとのゴールは何ですか？何も見ずに入力してください。</p>
                    <TextArea value={goalRecallInput} onChange={(e) => setGoalRecallInput(e.target.value)} placeholder="ゴールを入力..." className="mb-4" />
                    <PrimaryButton onClick={handleGoalRecallSubmit} disabled={!goalRecallInput} className="w-full">確認</PrimaryButton>
                </div>
            )}

            {step === 2 && (
                <div className="animate-fade-in">
                    <p className="mb-2 font-bold text-sky-600">{isFirstTask ? "今日の最重要タスク" : "追加のタスク"}</p>
                    <p className="mb-4 text-slate-600">
                        {isFirstTask 
                            ? "今日、これさえ達成できれば100点と言えるタスクを1つ決めてください。" 
                            : "他にやっておきたいタスクがあれば追加してください。"}
                    </p>
                    <Input value={taskInput} onChange={(e) => setTaskInput(e.target.value)} placeholder="タスクを入力..." className="mb-4" />
                    
                    {aiResponse && (
                        <div className="bg-slate-100 p-4 rounded-lg mb-4 border-l-4 border-sky-500">
                            <div className="flex items-start gap-3">
                                <BotIcon className="w-6 h-6 text-sky-600 mt-1 flex-shrink-0" />
                                <p className="text-slate-700">{aiResponse}</p>
                            </div>
                        </div>
                    )}

                    {!aiResponse ? (
                        <PrimaryButton onClick={handleTaskEvaluate} disabled={!taskInput} className="w-full">AIに評価してもらう</PrimaryButton>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <SecondaryButton onClick={() => setAiResponse(null)}>修正する</SecondaryButton>
                            <PrimaryButton onClick={handleConfirmTask}>計画を立てる</PrimaryButton>
                        </div>
                    )}
                </div>
            )}
            
            {step === 4 && (
                <div className="animate-fade-in">
                    <h3 className="font-bold text-lg mb-4 text-slate-800">行動プランの編集</h3>
                    <p className="text-sm text-slate-500 mb-4">AIが提案したステップを編集できます。これらはサブタスクとして追加されます。</p>
                    
                    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
                        <h4 className="font-bold text-sky-600 mb-4 text-lg border-b border-slate-100 pb-2">{taskInput}</h4>
                        <div className="space-y-3">
                            {taskSteps.map((step, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <span className="font-bold text-slate-400 w-6 text-center">{index + 1}.</span>
                                    <Input
                                        value={step}
                                        onChange={(e) => {
                                            const newSteps = [...taskSteps];
                                            newSteps[index] = e.target.value;
                                            setTaskSteps(newSteps);
                                        }}
                                        className="flex-1"
                                        placeholder={`ステップ ${index + 1}`}
                                    />
                                    <button
                                        onClick={() => {
                                            const newSteps = taskSteps.filter((_, i) => i !== index);
                                            setTaskSteps(newSteps);
                                        }}
                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition"
                                        title="削除"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setTaskSteps([...taskSteps, ""])}
                            className="mt-3 text-sm text-sky-500 font-bold hover:underline flex items-center gap-1"
                        >
                            + ステップを追加
                        </button>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        <SecondaryButton onClick={handleAddTaskToTemp} className="w-full flex items-center justify-center gap-2">
                            <span className="text-xl font-bold">+</span> さらに今日のタスクを追加する
                        </SecondaryButton>
                        <PrimaryButton onClick={handleFinishPlanning} className="w-full">
                            この内容で決定して次に進む
                        </PrimaryButton>
                    </div>
                </div>
            )}

            {step === 5 && (
                 <div className="animate-fade-in">
                    <h3 className="font-bold text-lg mb-2 text-slate-800">フリーノート (任意)</h3>
                    <p className="text-slate-600 mb-4 text-sm">今の気持ちや、今日の意気込みを自由に書いてください。これはAI Twinの育成に使われます。</p>
                    <RichTextEditor
                        value={freeMemo}
                        onChange={setFreeMemo}
                        placeholder="今日はどんな1日にしたい？"
                        className="mb-6"
                    />
                    <PrimaryButton onClick={handleSaveAll} className="w-full">朝のジャーナリングを完了</PrimaryButton>
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
    const [localTasks, setLocalTasks] = useState<DailyTask[]>(tasks); // Keep local state for checking off
    
    // Data Fields
    const [feelings, setFeelings] = useState(""); // Used as freeMemo now
    const [achievementAnalysis, setAchievementAnalysis] = useState("");
    const [wastedTime, setWastedTime] = useState("");
    const [extrasInput, setExtrasInput] = useState("");
    const [tomorrowIdeas, setTomorrowIdeas] = useState("");

    // Failure Analysis State
    const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
    const [failureReason, setFailureReason] = useState("");
    const [aiFailureFeedback, setAiFailureFeedback] = useState("");
    
    const uncompletedTasks = localTasks.filter(t => !t.completed);

    const toggleLocalTask = (index: number) => {
        const newTasks = [...localTasks];
        newTasks[index].completed = !newTasks[index].completed;
        setLocalTasks(newTasks);
    };

    const handleFailureAnalysis = async () => {
        setLoading(true);
        const result = await geminiService.analyzeFailureReason(failureReason, sideProjects);
        setLoading(false);
        setAiFailureFeedback(result.response);
    };

    const handleFinish = () => {
        const data: NightReflectionData = {
            feelings: "", // Legacy field
            freeMemo: feelings, // Use rich text feelings as freeMemo
            achievementAnalysis,
            wastedTime,
            extras: extrasInput ? [extrasInput] : [],
            tomorrowIdeas
        };
        onSave(data, localTasks);
    };

    const renderStep = () => {
        // Step 1: Free Journaling (Essential)
        if (step === 1) {
            return (
                <>
                    <h2 className="text-xl font-bold mb-2 text-slate-800">夜のノート</h2>
                    <p className="text-slate-600 mb-4">今日1日を振り返って、起きたことや感じたことを自由に書き出しましょう。</p>
                    <RichTextEditor
                        value={feelings}
                        onChange={setFeelings}
                        placeholder="今日はどんな1日だった？..."
                        className="mb-6"
                        minHeight="300px"
                    />
                    <PrimaryButton onClick={() => setStep(2)} disabled={!feelings} className="w-full">次へ</PrimaryButton>
                </>
            );
        }

        // Step 2: Task Check & Failure Analysis
        if (step === 2) {
             // If all done, skip to 3
            if (uncompletedTasks.length === 0 && localTasks.length > 0) {
                 return (
                     <div className="text-center py-10">
                         <h2 className="text-2xl font-bold text-sky-600 mb-4">素晴らしい！</h2>
                         <p className="text-slate-600 mb-6">全てのタスクを完了しました。</p>
                         <PrimaryButton onClick={() => setStep(3)} className="w-full">次へ</PrimaryButton>
                     </div>
                 )
            }
            if (localTasks.length === 0) {
                 return (
                    <div className="text-center py-10">
                         <p className="text-slate-600 mb-6">タスクがありませんでした。</p>
                         <PrimaryButton onClick={() => setStep(3)} className="w-full">次へ</PrimaryButton>
                     </div>
                 )
            }

            return (
                <>
                    <h2 className="text-xl font-bold mb-4 text-slate-800">タスクの確認</h2>
                    <div className="mb-6">
                        {localTasks.map((task, idx) => (
                             <div key={idx} className="flex items-center p-3 bg-white border border-slate-200 rounded-lg mb-2">
                                <input 
                                    type="checkbox" 
                                    checked={task.completed} 
                                    onChange={() => toggleLocalTask(idx)}
                                    className="task-checkbox mr-3"
                                />
                                <span className={task.completed ? "line-through text-slate-400" : "text-slate-700"}>{task.text}</span>
                             </div>
                        ))}
                    </div>
                    
                    {uncompletedTasks.length > 0 && (
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 animate-fade-in">
                            <h3 className="font-bold text-rose-600 mb-2">未達成のタスクがあります</h3>
                            <p className="text-sm text-slate-600 mb-3">なぜ達成できなかったのですか？言い訳せず、事実を述べてください。</p>
                            <TextArea value={failureReason} onChange={e => setFailureReason(e.target.value)} placeholder="理由..." className="mb-3" />
                            
                            {aiFailureFeedback && (
                                <div className="bg-white p-3 rounded border border-rose-100 mb-3 text-slate-700 text-sm flex gap-2">
                                     <BotIcon className="w-5 h-5 text-rose-500 shrink-0" />
                                     {aiFailureFeedback}
                                </div>
                            )}

                            {!aiFailureFeedback ? (
                                <Button onClick={handleFailureAnalysis} disabled={!failureReason} className="w-full bg-rose-500 text-white hover:bg-rose-600">分析する</Button>
                            ) : (
                                <Button onClick={() => setStep(3)} className="w-full bg-slate-800 text-white hover:bg-slate-900">受け入れて次へ</Button>
                            )}
                        </div>
                    )}
                    
                    {uncompletedTasks.length === 0 && (
                         <PrimaryButton onClick={() => setStep(3)} className="w-full">次へ</PrimaryButton>
                    )}
                </>
            );
        }

        // Step 3: Other Analysis
        if (step === 3) {
            return (
                <>
                    <h2 className="text-xl font-bold mb-4 text-slate-800">その他の振り返り</h2>
                    
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">成果・良かったこと</label>
                            <TextArea value={achievementAnalysis} onChange={e => setAchievementAnalysis(e.target.value)} rows={2} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">無駄にした時間 (分単位/内容)</label>
                            <Input value={wastedTime} onChange={e => setWastedTime(e.target.value)} placeholder="例: SNSを見ていた30分" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">予定外の努力 (+α)</label>
                            <Input value={extrasInput} onChange={e => setExtrasInput(e.target.value)} placeholder="例: 関連書籍を1章読んだ" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1">明日のためのアイデア</label>
                            <TextArea value={tomorrowIdeas} onChange={e => setTomorrowIdeas(e.target.value)} rows={2} />
                        </div>
                    </div>

                    <PrimaryButton onClick={handleFinish} className="w-full">完了してスコアを確定</PrimaryButton>
                </>
            );
        }
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <Header title="夜の振り返り" onBack={onBack} />
            {renderStep()}
        </Card>
    );
};

const AITwinView: React.FC<{ reflections: Reflection[], onBack: () => void }> = ({ reflections, onBack }) => {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const selectedReflection = reflections.find(r => r.date === getLocalTodayDate(selectedDate));

    const handleSendMessage = async () => {
        if (!input.trim() || !selectedReflection) return;
        
        const newHistory = [...messages, { role: 'user' as const, text: input }];
        setMessages(newHistory);
        setInput("");
        setLoading(true);

        const responseText = await geminiService.generateAITwinResponse(selectedReflection, newHistory);
        
        setMessages([...newHistory, { role: 'model' as const, text: responseText }]);
        setLoading(false);
    };
    
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
            <div className="md:col-span-1">
                 <Card className="h-full overflow-y-auto">
                    <h2 className="font-bold text-slate-700 mb-4">日付を選択</h2>
                    {/* Simplified Calendar for selection */}
                    <input 
                        type="date" 
                        value={getLocalTodayDate(selectedDate)} 
                        onChange={(e) => {
                            const d = new Date(e.target.value);
                            if(!isNaN(d.getTime())) setSelectedDate(d);
                            setMessages([]);
                        }}
                        className="w-full p-2 border border-slate-300 rounded mb-4"
                    />
                    
                    {selectedReflection ? (
                        <div className="text-sm text-slate-600">
                            <p><strong>朝のプラン:</strong> {selectedReflection.morning?.dailyPlan || "なし"}</p>
                            <div className="my-2 border-t border-slate-200"></div>
                             <p><strong>夜の記録:</strong></p>
                             <div className="line-clamp-6 italic text-slate-500" dangerouslySetInnerHTML={{ __html: selectedReflection.night?.freeMemo || "記録なし" }} />
                        </div>
                    ) : (
                        <p className="text-slate-400 text-sm">この日の記録はありません。</p>
                    )}
                 </Card>
            </div>
            
            <div className="md:col-span-2 flex flex-col h-full">
                <Card className="flex-1 flex flex-col h-full relative">
                     <Header title="AI Twin" onBack={onBack} />
                     {!selectedReflection && <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center text-slate-400 font-bold">記録のある日付を選択してください</div>}
                     
                     <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2" ref={scrollRef}>
                        {messages.length === 0 && (
                            <div className="text-center text-slate-400 mt-10">
                                <GhostIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>過去の自分と対話してみましょう</p>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-sky-500 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                             <div className="flex justify-start">
                                <div className="bg-slate-100 p-3 rounded-xl rounded-bl-none text-slate-400 text-sm animate-pulse">
                                    入力中...
                                </div>
                            </div>
                        )}
                     </div>

                     <div className="flex gap-2">
                        <Input 
                            value={input} 
                            onChange={(e) => setInput(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                            placeholder="メッセージを入力..." 
                            className="flex-1"
                        />
                        <button onClick={handleSendMessage} disabled={loading || !input} className="bg-sky-500 text-white p-3 rounded-lg hover:bg-sky-600 transition disabled:opacity-50">
                            <SendIcon className="w-5 h-5" />
                        </button>
                     </div>
                </Card>
            </div>
        </div>
    );
};

const SpicyFeedbackView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    // Prototype: Fixed messages
    const messages = [
        { text: "めっちゃ頑張ってるじゃん。たぶん行けるよ", type: 'positive' },
        { text: "私も頑張らないと", type: 'neutral' },
        { text: "最近ちょっと下がってきてない？大丈夫？", type: 'worry' },
        { text: "もしよければ相談乗るよ？", type: 'support' }
    ];

    const handleConsult = (msg: string) => {
        alert(`「${msg}」と言ってくれた仲間に相談リクエストを送りました（プロトタイプ）`);
    };

    return (
        <Card className="max-w-2xl mx-auto min-h-[500px]">
            <Header title="仲間からのフィードバック" onBack={onBack} />
            <div className="space-y-6 mt-8">
                {messages.map((m, i) => (
                    <div key={i} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm gap-4 transition hover:shadow-md">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
                                <UserIcon className="w-6 h-6 text-slate-500" />
                            </div>
                            <div className="relative bg-slate-50 p-3 rounded-lg rounded-tl-none border border-slate-100">
                                <p className="text-slate-700 font-medium">"{m.text}"</p>
                            </div>
                        </div>
                        <Button onClick={() => handleConsult(m.text)} className="bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 whitespace-nowrap text-sm">
                            この人に相談する
                        </Button>
                    </div>
                ))}
            </div>
            
            <div className="mt-12 text-center text-slate-400 text-sm">
                <p>※ これはプロトタイプ版です。実際の仲間からのメッセージが表示されます。</p>
            </div>
        </Card>
    );
};

const SideProjectsView: React.FC<{ onBack: () => void }> = ({ onBack }) => (
    <Card className="max-w-4xl mx-auto h-[600px] flex flex-col items-center justify-center">
        <Header title="サイドプロジェクト" onBack={onBack} />
        <BrainCircuitIcon className="w-24 h-24 text-slate-200 mb-4" />
        <p className="text-slate-500">この機能は現在開発中です。</p>
    </Card>
);

const MemoPadView: React.FC<{ onBack: () => void }> = ({ onBack }) => (
    <Card className="max-w-4xl mx-auto h-[600px] flex flex-col items-center justify-center">
        <Header title="メモ帳" onBack={onBack} />
        <FileTextIcon className="w-24 h-24 text-slate-200 mb-4" />
        <p className="text-slate-500">この機能は現在開発中です。</p>
    </Card>
);

const PeerProfileView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    return (
        <Card className="max-w-2xl mx-auto">
            <Header title="仲間のプロフィール" onBack={onBack} />
            <div className="flex flex-col items-center mb-8">
                <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                    <UserIcon className="w-12 h-12 text-slate-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Yamada Taro</h2>
                <p className="text-slate-500">Web Engineer Goal: Full Stack Master</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="bg-slate-50 p-4 rounded-lg text-center">
                     <p className="text-xs text-slate-500 uppercase font-bold">Current Streak</p>
                     <p className="text-2xl font-bold text-sky-600">42 Days</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-lg text-center">
                     <p className="text-xs text-slate-500 uppercase font-bold">Total Score</p>
                     <p className="text-2xl font-bold text-amber-500">1250</p>
                 </div>
            </div>

            <div className="space-y-3">
                <Button onClick={() => {}} className="w-full bg-sky-500 text-white flex items-center justify-center gap-2">
                    <VideoIcon className="w-5 h-5" />
                    メンタリングを申し込む
                </Button>
                <Button onClick={() => {}} className="w-full bg-white border border-slate-300 text-slate-700 flex items-center justify-center gap-2">
                    <MessageSquareIcon className="w-5 h-5" />
                    メッセージを送る
                </Button>
            </div>
        </Card>
    );
};

// --- Main App Component ---

const App: React.FC = () => {
    const [view, setView] = useState<AppView>('SETUP');
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [reflections, setReflections] = useState<Reflection[]>([]);
    const [today, setToday] = useState(getLocalTodayDate());
    const [loading, setLoading] = useState(false);
    
    // Modal State
    const [showMentoringModal, setShowMentoringModal] = useState(false);
    const [showProtoModal, setShowProtoModal] = useState(true);

    // Initial Load
    useEffect(() => {
        const savedSettings = localStorage.getItem('comit_settings');
        const savedReflections = localStorage.getItem('comit_reflections');
        
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
            setView('DASHBOARD');
        }
        if (savedReflections) {
            setReflections(JSON.parse(savedReflections));
        }

        // Keep date updated
        const timer = setInterval(() => {
            setToday(getLocalTodayDate());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    // Helper to persist reflections immediately
    const persistReflections = (newReflections: Reflection[]) => {
        setReflections(newReflections);
        localStorage.setItem('comit_reflections', JSON.stringify(newReflections));
    };

    const handleSetupSave = (newSettings: UserSettings) => {
        setSettings(newSettings);
        localStorage.setItem('comit_settings', JSON.stringify(newSettings));
        setView('DEPOSIT');
    };

    const handleDepositSave = (amount: number) => {
        if (!settings) return;
        const updatedSettings = { ...settings, depositAmount: amount };
        setSettings(updatedSettings);
        localStorage.setItem('comit_settings', JSON.stringify(updatedSettings));
        setView('DASHBOARD');
    };

    const handleSaveMorning = (data: MorningReflectionData, tasks: DailyTask[], penaltyScore: number = 0) => {
        // Find existing reflection or create new
        const existingIndex = reflections.findIndex(r => r.date === today);
        let newReflections = [...reflections];
        
        const newReflection: Reflection = existingIndex >= 0 ? {
            ...newReflections[existingIndex],
            morning: data,
            dailyTasks: tasks,
            pendingScore: penaltyScore !== 0 ? -Math.abs(penaltyScore) : 0 
        } : {
            date: today,
            morning: data,
            dailyTasks: tasks,
            score: 0,
            pendingScore: penaltyScore !== 0 ? -Math.abs(penaltyScore) : 0 
        };

        if (existingIndex >= 0) {
            newReflections[existingIndex] = newReflection;
        } else {
            newReflections.push(newReflection);
        }

        persistReflections(newReflections);
        setView('DASHBOARD');

        // Check for mentoring popup trigger
        // Logic: If yesterday's score was negative AND last mentoring was > 3 days ago (or never)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalTodayDate(yesterday);
        const yesterdayReflection = reflections.find(r => r.date === yesterdayStr);

        const lastMentoring = settings?.lastMentoringDate ? new Date(settings.lastMentoringDate) : null;
        const daysSinceMentoring = lastMentoring ? (new Date().getTime() - lastMentoring.getTime()) / (1000 * 3600 * 24) : 999;

        // Condition: Yesterday negative score OR currently carrying a penalty for today
        if ((yesterdayReflection?.score && yesterdayReflection.score < 0) || penaltyScore > 0) {
            if (daysSinceMentoring >= 3) {
                 setTimeout(() => setShowMentoringModal(true), 500);
            }
        }
    };

    const handleSaveNight = (data: NightReflectionData, updatedTasks: DailyTask[]) => {
        const existingIndex = reflections.findIndex(r => r.date === today);
        if (existingIndex === -1) return; // Should not happen flow-wise

        let newReflections = [...reflections];
        const reflection = newReflections[existingIndex];
        
        // Calculate Score
        // Basic rule: Main task complete = +50. Sub tasks = +10 each.
        // Penalty from morning applies.
        // Extras = +5 each.
        // Wasted time = -1 per 10 mins? (Simplified: -10 flat if wasted time exists)
        
        let score = reflection.pendingScore || 0;
        
        updatedTasks.forEach(t => {
            if (t.completed) {
                score += t.type === 'main' ? 50 : 10;
            } else {
                score -= 10; // Penalty for incomplete
            }
        });

        if (data.extras.length > 0) score += (data.extras.length * 5);
        if (data.wastedTime) score -= 10;

        const updatedReflection: Reflection = {
            ...reflection,
            night: data,
            dailyTasks: updatedTasks,
            score: score,
            pendingScore: 0
        };

        newReflections[existingIndex] = updatedReflection;
        persistReflections(newReflections);
        setView('DASHBOARD');
    };

    const handleUpdateTasks = (tasks: DailyTask[]) => {
        const existingIndex = reflections.findIndex(r => r.date === today);
        if (existingIndex === -1) return;
        
        let newReflections = [...reflections];
        newReflections[existingIndex] = {
            ...newReflections[existingIndex],
            dailyTasks: tasks
        };
        persistReflections(newReflections);
    };

    const handleMentoringSelect = (targetView: AppView) => {
        setShowMentoringModal(false);
        // Update lastMentoringDate
        if(settings) {
            const newSettings = { ...settings, lastMentoringDate: new Date().toISOString() };
            setSettings(newSettings);
            localStorage.setItem('comit_settings', JSON.stringify(newSettings));
        }
        setView(targetView);
    };

    // Calculate Dashboard Stats
    const totalScore = reflections.reduce((acc, r) => acc + (r.score || 0), 0);
    // Simple streak calculation (consecutive days with score > 0)
    // This is a naive implementation for the prototype
    const currentStreak = reflections.filter(r => (r.score || 0) > 0).length;

    const getCurrentQuarterGoal = () => {
        if (!settings) return "";
        // Logic to determine which quarter we are in relative to start date
        // For prototype, just return the first one or based on month
        return settings.quarterlyGoals[0];
    };

    const currentReflection = reflections.find(r => r.date === today);

    // Development Trigger
    const triggerMentoringPopup = () => {
        setShowMentoringModal(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-sky-200">
             {/* Background Decoration */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-sky-200/20 rounded-full blur-3xl"></div>
                <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] bg-emerald-200/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-[10%] right-[20%] w-[30%] h-[30%] bg-purple-200/20 rounded-full blur-3xl"></div>
            </div>

            <Clock />
            <PrototypeBanner />

            {loading && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
                    <LoadingSpinner />
                </div>
            )}

            <MentoringModal isOpen={showMentoringModal} onSelect={handleMentoringSelect} />
            {showProtoModal && <PrototypeModal onClose={() => setShowProtoModal(false)} />}

            <main className="container mx-auto max-w-5xl px-4 py-8 relative">
                {/* Dev Trigger Button */}
                {view === 'DASHBOARD' && (
                    <button 
                        onClick={triggerMentoringPopup}
                        className="fixed bottom-4 right-4 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-50 hover:opacity-100 transition z-50"
                    >
                        🔔 ポップアップを表示
                    </button>
                )}

                {view === 'SETUP' && (
                    <SetupView onSave={handleSetupSave} setLoading={setLoading} />
                )}
                {view === 'DEPOSIT' && (
                    <DepositView onSave={handleDepositSave} />
                )}
                {view === 'DASHBOARD' && settings && (
                    <DashboardView
                        settings={settings}
                        reflections={reflections}
                        totalScore={totalScore}
                        currentStreak={currentStreak}
                        currentQuarterlyGoal={getCurrentQuarterGoal()}
                        todayStr={today}
                        currentReflection={currentReflection}
                        onNavigate={setView}
                        onUpdateTasks={handleUpdateTasks}
                    />
                )}
                {view === 'MORNING_CONVERSATION' && settings && (
                    <MorningConversationView
                        quarterlyGoal={getCurrentQuarterGoal()}
                        longTermGoal={settings.longTermGoal}
                        onSave={handleSaveMorning}
                        onBack={() => setView('DASHBOARD')}
                        setLoading={setLoading}
                    />
                )}
                {view === 'NIGHT_REFLECTION' && currentReflection && (
                    <NightReflectionView
                        tasks={currentReflection.dailyTasks || []}
                        sideProjects={settings?.sideProjects}
                        onSave={handleSaveNight}
                        onBack={() => setView('DASHBOARD')}
                        setLoading={setLoading}
                    />
                )}
                {view === 'AI_TWIN' && (
                    <AITwinView reflections={reflections} onBack={() => setView('DASHBOARD')} />
                )}
                {view === 'SPICY_FEEDBACK' && (
                    <SpicyFeedbackView onBack={() => setView('DASHBOARD')} />
                )}
                {view === 'SIDE_PROJECTS' && (
                    <SideProjectsView onBack={() => setView('DASHBOARD')} />
                )}
                {view === 'MEMO_PAD' && (
                    <MemoPadView onBack={() => setView('DASHBOARD')} />
                )}
                {view === 'PEER_PROFILE' && (
                    <PeerProfileView onBack={() => setView('DASHBOARD')} />
                )}
            </main>
        </div>
    );
};

export default App;
