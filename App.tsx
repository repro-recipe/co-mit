
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { UserSettings, Reflection, DailyTask, AppView, AITwin, ChatMessage, NightReflectionData, MorningReflectionData } from './types';
import * as geminiService from './services/geminiService';
import { BrainCircuitIcon, CalendarIcon, FlameIcon, GoalIcon, GhostIcon, BotIcon, UserIcon, SendIcon, ChevronLeftIcon, ChevronRightIcon, PiggyBankIcon, CoMitLogoIcon } from './components/Icons';
import Road from './components/Road';
import Calendar from './components/Calendar';


// --- UI Components ---
const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={`bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-lg p-6 ${className}`}>
        {children}
    </div>
);

const Button: React.FC<{ onClick: () => void, children: React.ReactNode, className?: string, disabled?: boolean }> = ({ onClick, children, className, disabled }) => (
    <button
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

const Input: React.FC<{ value: string | number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, type?: string, min?: number, onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void, disabled?: boolean }> = ({ value, onChange, placeholder, type = "text", ...props }) => (
    <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-slate-50 border-2 border-slate-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition text-slate-900 placeholder:text-slate-400 disabled:bg-slate-200"
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

const Modal: React.FC<{ isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300" onClick={onClose}>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl m-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-sky-600">{title}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">&times;</button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

const Spinner: React.FC<{}> = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
);


// --- App State & Logic ---

const App: React.FC = () => {
    const [view, setView] = useState<AppView>('DASHBOARD');
    const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
    const [reflections, setReflections] = useState<Reflection[]>([]);
    const [streak, setStreak] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [setupData, setSetupData] = useState<Partial<UserSettings> | null>(null);
    const [selectedReflectionForTwin, setSelectedReflectionForTwin] = useState<Reflection | null>(null);


    // Load data from localStorage on initial render
    useEffect(() => {
        try {
            const settings = localStorage.getItem('userSettings');
            const storedReflections = localStorage.getItem('reflections');
            const storedStreak = localStorage.getItem('streak');
            
            if (settings) {
                setUserSettings(JSON.parse(settings));
                setView('DASHBOARD');
            } else {
                setView('SETUP');
            }
            if (storedReflections) {
                setReflections(JSON.parse(storedReflections));
            }
            if (storedStreak) {
                setStreak(parseInt(storedStreak, 10));
            }
        } catch (error) {
            console.error("Failed to load data from localStorage", error);
            setView('SETUP');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Save data to localStorage whenever it changes
    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem('userSettings', JSON.stringify(userSettings));
            localStorage.setItem('reflections', JSON.stringify(reflections));
            localStorage.setItem('streak', streak.toString());
        }
    }, [userSettings, reflections, streak, isLoading]);

    const getTodayString = () => new Date().toISOString().split('T')[0];
    const getYesterdayString = () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    };

    const todayReflection = useMemo(() => {
        const todayStr = getTodayString();
        return reflections.find(r => r.date === todayStr);
    }, [reflections]);

    const yesterdayReflection = useMemo(() => {
        const yesterdayStr = getYesterdayString();
        return reflections.find(r => r.date === yesterdayStr);
    }, [reflections]);

    const handleProceedToDeposit = (settings: Partial<UserSettings>) => {
        setSetupData(settings);
        setView('DEPOSIT');
    };

    const handleSaveSettings = (settings: UserSettings) => {
        setUserSettings(settings);
        setView('DASHBOARD');
    };

    const handleFinishMorningConversation = (tasks: DailyTask[], score: number) => {
        const morningData: MorningReflectionData = {
            dailyPlan: tasks.map(t => t.text).join('\n'),
        };

        const todayStr = getTodayString();
        const newReflections = [...reflections];
        const existingIndex = newReflections.findIndex(r => r.date === todayStr);

        if (existingIndex > -1) {
            newReflections[existingIndex] = { ...newReflections[existingIndex], morning: morningData, dailyTasks: tasks, score: score };
        } else {
            newReflections.push({ date: todayStr, morning: morningData, dailyTasks: tasks, score: score });
        }
        setReflections(newReflections);
        setView('DASHBOARD');
    };
    
    const handleSaveNightReflection = async (data: NightReflectionData, tasks: DailyTask[], score: number, analysis: string) => {
        setIsLoading(true);
        const todayStr = getTodayString();
        const newReflections = [...reflections];
        const existingIndex = newReflections.findIndex(r => r.date === todayStr);

        if (existingIndex > -1) {
            const morningScore = newReflections[existingIndex].score || 0;
            const finalScore = morningScore + score; // Add night score to morning score
            newReflections[existingIndex] = { ...newReflections[existingIndex], night: data, score: finalScore, analysis, dailyTasks: tasks };
        }
        setReflections(newReflections);

        setStreak(prev => prev + 1);
        setView('DASHBOARD');
        setIsLoading(false);
    };

    const handleUpdateTasks = (tasks: DailyTask[]) => {
        const todayStr = getTodayString();
        const newReflections = reflections.map(r => r.date === todayStr ? { ...r, dailyTasks: tasks } : r);
        setReflections(newReflections);
    };
    
    const handleCloseAITools = () => {
        setSelectedReflectionForTwin(null);
        setView('DASHBOARD');
    }

    const handleCalendarDayClick = (reflection: Reflection) => {
        setSelectedReflectionForTwin(reflection);
        setView('AI_TWIN');
    };

    const renderContent = () => {
        if (isLoading) {
            return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
        }

        switch (view) {
            case 'SETUP':
                return <SetupView onProceedToDeposit={handleProceedToDeposit} />;
            case 'DEPOSIT':
                return <DepositView setupData={setupData!} onSave={handleSaveSettings} />;
            case 'MORNING_CONVERSATION':
                return <MorningConversationView
                    settings={userSettings!}
                    yesterdayReflection={yesterdayReflection || null}
                    onFinish={handleFinishMorningConversation}
                    onClose={() => setView('DASHBOARD')}
                />;
            case 'NIGHT_REFLECTION':
                return <NightReflectionView
                    onSave={handleSaveNightReflection}
                    onClose={() => setView('DASHBOARD')}
                    tasks={todayReflection?.dailyTasks || []}
                    settings={userSettings!}
                />;
            case 'AI_TWIN':
                 return <AIToolsView type="twin" onClose={handleCloseAITools} reflections={reflections} initialReflection={selectedReflectionForTwin} />;
            case 'SPICY_FEEDBACK':
                 return <AIToolsView type="feedback" onClose={handleCloseAITools} reflections={reflections} />;
            case 'DASHBOARD':
            default:
                return <DashboardView
                    settings={userSettings}
                    reflections={reflections}
                    todayReflection={todayReflection}
                    streak={streak}
                    onNavigate={setView}
                    onUpdateTasks={handleUpdateTasks}
                    onCalendarDayClick={handleCalendarDayClick}
                />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 sm:p-6 lg:p-8">
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.1),_transparent_40%)] -z-10"></div>
            <main className="max-w-7xl mx-auto">
                 <header className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <CoMitLogoIcon className="w-8 h-12 text-[#4A6C6F]" />
                        <span className="text-3xl font-bold text-[#344445] tracking-tighter">co-mit</span>
                    </div>
                     <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-amber-500">
                           <FlameIcon className="w-6 h-6" />
                           <span className="text-xl font-bold">{streak}</span>
                        </div>
                    </div>
                </header>
                {renderContent()}
            </main>
        </div>
    );
};

// --- View Components ---

const ProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => (
    <div className="w-full bg-slate-200 rounded-full h-2.5 mb-8">
        <div
            className="bg-sky-500 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${(current / total) * 100}%` }}
        ></div>
    </div>
);

const SetupView: React.FC<{ onProceedToDeposit: (settings: Partial<UserSettings>) => void }> = ({ onProceedToDeposit }) => {
    const [step, setStep] = useState(1);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [commitmentField, setCommitmentField] = useState('');
    const [customCommitmentField, setCustomCommitmentField] = useState('');
    const [goalSuggestions, setGoalSuggestions] = useState<string[]>([]);
    const [settings, setSettings] = useState<Partial<UserSettings>>({
        yearStartMonth: new Date().getMonth(),
        longTermGoal: '',
        quarterlyGoals: ['', '', '', ''],
        commitmentWeeks: 3,
    });
    
    const totalSteps = 6;
    const commitmentOptions = ["受験", "研究", "英検"];

    const fetchGoalSuggestions = async (field: string) => {
        setIsLoadingAI(true);
        setGoalSuggestions([]);
        const suggestions = await geminiService.generateGoalSuggestions(field);
        setGoalSuggestions(suggestions);
        if (suggestions.length > 0 && settings.longTermGoal === '') {
            setSettings(s => ({ ...s, longTermGoal: suggestions[0] }));
        }
        setIsLoadingAI(false);
    };

    const handleCommitmentSelect = (field: string) => {
        if (field === 'その他') {
            setCommitmentField('その他');
        } else {
            setCommitmentField(field);
            setCustomCommitmentField('');
            setStep(2);
            fetchGoalSuggestions(field);
        }
    };
    
    const handleCustomCommitmentNext = () => {
        if (customCommitmentField.trim() === '') {
            alert('コミットする分野を具体的に入力してください。');
            return;
        }
        const fullField = `その他: ${customCommitmentField}`;
        setCommitmentField(fullField);
        setStep(2);
        fetchGoalSuggestions(fullField);
    };

    const handleProceed = () => {
        if (settings.longTermGoal?.trim() === '' || settings.quarterlyGoals?.[0]?.trim() === '') {
            alert("目標をすべて入力してください！");
            return;
        }
        onProceedToDeposit({
          ...settings,
          commitmentStartDate: new Date().toISOString().split('T')[0]
        });
    };

    const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <Card className="w-full max-w-2xl">
                <h2 className="text-3xl font-bold text-center text-sky-600 mb-2">革命の準備</h2>
                <p className="text-center text-slate-500 mb-6">まずは君の羅針盤を設定しよう。</p>
                <ProgressBar current={step} total={totalSteps} />

                {step === 1 && (
                    <div className="space-y-4 animate-fade-in text-center">
                        <h3 className="font-bold text-lg">STEP 1/{totalSteps}: 何にコミットしますか？</h3>
                        <div className="flex flex-wrap justify-center gap-4 py-4">
                            {commitmentOptions.map(opt => (
                                <PrimaryButton key={opt} onClick={() => handleCommitmentSelect(opt)} className="w-32">{opt}</PrimaryButton>
                            ))}
                            <SecondaryButton onClick={() => handleCommitmentSelect('その他')} className="w-32">その他</SecondaryButton>
                        </div>
                        {commitmentField === 'その他' && (
                             <div className="space-y-2 pt-4">
                                 <Input value={customCommitmentField} onChange={e => setCustomCommitmentField(e.target.value)} placeholder="例：Web開発、資格取得など" />
                                 <PrimaryButton onClick={handleCustomCommitmentNext} className="w-full">次へ &rarr;</PrimaryButton>
                             </div>
                        )}
                    </div>
                )}
                
                {step === 2 && (
                     <div className="space-y-6 animate-fade-in">
                        <h3 className="font-bold text-lg text-center">STEP 2/{totalSteps}: 年間の究極目標</h3>
                         {isLoadingAI && <div className="flex justify-center p-8"><Spinner/></div>}
                         {!isLoadingAI && (
                             <>
                                 <p className="text-center text-sm text-slate-500">AIが君の分野「{commitmentField}」に合わせて目標を提案します。</p>
                                 <div className="space-y-2">
                                     {goalSuggestions.map((goal, i) => (
                                         <button key={i} onClick={() => setSettings({...settings, longTermGoal: goal})} className="w-full text-left p-3 rounded-lg bg-slate-100 hover:bg-slate-200 border-2 border-slate-200">
                                             {goal}
                                         </button>
                                     ))}
                                 </div>
                                 <TextArea value={settings.longTermGoal || ''} onChange={e => setSettings({...settings, longTermGoal: e.target.value})} placeholder="または、自分で究極目標を書き出す" rows={3}/>
                             </>
                         )}
                         <div className="flex justify-between items-center">
                             <SecondaryButton onClick={() => setStep(1)}>&larr; 戻る</SecondaryButton>
                             <PrimaryButton onClick={() => setStep(3)} disabled={isLoadingAI || !settings.longTermGoal?.trim()}>次へ &rarr;</PrimaryButton>
                         </div>
                     </div>
                )}

                {step === 3 && (
                     <div className="space-y-6 animate-fade-in">
                        <h3 className="font-bold text-lg text-center">STEP 3/{totalSteps}: 最初の3ヶ月の目標</h3>
                        <p className="text-center text-sm text-slate-500">年間目標に向けた、最初の具体的なマイルストーンを設定しよう。</p>
                        <Input
                             value={settings.quarterlyGoals?.[0] || ''}
                             onChange={e => {
                                 const newGoals = [...(settings.quarterlyGoals || ['', '', '', ''])] as [string, string, string, string];
                                 newGoals[0] = e.target.value;
                                 setSettings({ ...settings, quarterlyGoals: newGoals });
                             }}
                             placeholder="例：基本情報技術者試験に合格する"
                         />
                         <div className="flex justify-between items-center">
                             <SecondaryButton onClick={() => setStep(2)}>&larr; 戻る</SecondaryButton>
                             <PrimaryButton onClick={() => setStep(4)} disabled={!settings.quarterlyGoals?.[0]?.trim()}>次へ &rarr;</PrimaryButton>
                         </div>
                     </div>
                )}

                {step === 4 && (
                    <div className="space-y-6 animate-fade-in text-center">
                        <h3 className="font-bold text-lg">STEP 4/{totalSteps}: コミット期間</h3>
                        <p className="text-slate-500">ずっとコミットし続けるのは大変なことです。<br/>ただ、コミットするには思考の癖を落として習慣化することも必須です。<br/>まずは三週間以上、コミットしましょう。</p>
                        <div className="flex items-center justify-center gap-4">
                             <Input
                                type="number"
                                value={settings.commitmentWeeks}
                                onChange={e => setSettings({...settings, commitmentWeeks: Math.max(3, parseInt(e.target.value) || 3)})}
                                min={3}
                            />
                            <span>週間</span>
                        </div>
                        <div className="flex justify-between items-center">
                             <SecondaryButton onClick={() => setStep(3)}>&larr; 戻る</SecondaryButton>
                             <PrimaryButton onClick={() => setStep(5)} disabled={(settings.commitmentWeeks || 0) < 3}>
                                期間を決定
                            </PrimaryButton>
                        </div>
                    </div>
                )}

                {step === 5 && (
                     <div className="space-y-6 animate-fade-in">
                         <h3 className="font-bold text-lg text-center">STEP 5/{totalSteps}: 年間の始まりはいつ？</h3>
                         <p className="text-center text-sm text-slate-500">始まりは新年とは限らない！いつからでも革命は始められる。</p>
                         <select
                             value={settings.yearStartMonth}
                             onChange={e => setSettings({...settings, yearStartMonth: parseInt(e.target.value)})}
                             className="w-full bg-slate-50 border-2 border-slate-300 rounded-md px-4 py-2"
                         >
                             {months.map((month, i) => <option key={i} value={i}>{month}から</option>)}
                         </select>
                         <div className="flex justify-between items-center">
                             <SecondaryButton onClick={() => setStep(4)}>&larr; 戻る</SecondaryButton>
                             <PrimaryButton onClick={() => setStep(6)}>次へ &rarr;</PrimaryButton>
                         </div>
                     </div>
                )}
                {step === 6 && (
                    <div className="space-y-6 animate-fade-in text-center">
                        <h3 className="font-bold text-lg">STEP 6/{totalSteps}: 記念日</h3>
                        <p className="text-2xl text-amber-500 font-bold tracking-wider">{new Date().toLocaleDateString('ja-JP-u-ca-japanese', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p className="text-slate-500">この日は記念すべき日です！<br/>革命の始まりを記録しました。</p>
                        <PrimaryButton onClick={handleProceed} className="w-full">デポジットへ進む</PrimaryButton>
                    </div>
                )}
            </Card>
        </div>
    );
};

const DepositView: React.FC<{ setupData: Partial<UserSettings>, onSave: (settings: UserSettings) => void }> = ({ setupData, onSave }) => {
    const [depositAmount, setDepositAmount] = useState(0);
    const depositOptions = [
        { amount: 0, label: '無料', successRate: '標準' },
        { amount: 100, label: '¥100', successRate: '1.2x' },
        { amount: 500, label: '¥500', successRate: '1.5x' },
        { amount: 1000, label: '¥1,000', successRate: '2x' },
        { amount: 5000, label: '¥5,000', successRate: '3x' },
    ];

    const handleSave = () => {
        const finalSettings: UserSettings = {
            ...(setupData as UserSettings),
            depositAmount,
        };
        onSave(finalSettings);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <Card className="w-full max-w-2xl">
                <h2 className="text-3xl font-bold text-center text-sky-600 mb-2">デポジット</h2>
                <p className="text-center text-slate-500 mb-6">自分への投資が、成功への鍵だ。</p>
                <div className="space-y-4">
                    <p className="text-slate-600">このサービスでは、先にお金を預け、コミット期間を達成すれば返金される「デポジット」システムを導入しています。高い金額を賭けるほど、成功率が上がるという研究結果があります。</p>
                    <div className="flex flex-wrap justify-center gap-3 py-4">
                        {depositOptions.map(opt => (
                            <button key={opt.amount} onClick={() => setDepositAmount(opt.amount)} 
                                className={`p-4 rounded-lg border-2 transition-all ${depositAmount === opt.amount ? 'bg-sky-500 border-sky-500 text-white' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}>
                                <span className="font-bold text-xl block">{opt.label}</span>
                                <span className="text-xs">成功率: {opt.successRate}</span>
                            </button>
                        ))}
                    </div>
                    <Card className="bg-slate-50/50">
                        <h4 className="font-bold text-sky-600">返金ルール</h4>
                        <ul className="list-disc list-inside text-sm text-slate-500 mt-2">
                            <li>コミット期間を無事に完了すれば<span className="font-bold text-slate-800">全額返金</span>されます。</li>
                            <li>ストリークを途切らせると、その日までの分のみが返金対象となります。</li>
                            <li>3日目までの失敗: 返金率 0%</li>
                            <li>4日目の達成: 返金率 20%</li>
                            <li>5日目以降: 残りの返金額が期間終了まで均等に分配されます。</li>
                        </ul>
                    </Card>
                    <PrimaryButton onClick={handleSave} className="w-full text-lg py-3">
                        {depositAmount === 0 ? "無料で始める" : `¥${depositAmount.toLocaleString()}をデポジットして革命を始める！`}
                    </PrimaryButton>
                </div>
            </Card>
        </div>
    );
};

const DashboardView: React.FC<{
    settings: UserSettings | null;
    reflections: Reflection[];
    todayReflection?: Reflection;
    streak: number;
    onNavigate: (view: AppView) => void;
    onUpdateTasks: (tasks: DailyTask[]) => void;
    onCalendarDayClick: (reflection: Reflection) => void;
}> = ({ settings, reflections, todayReflection, streak, onNavigate, onUpdateTasks, onCalendarDayClick }) => {
    
    const [calendarDate, setCalendarDate] = useState(new Date());

    const handleTaskToggle = (index: number) => {
        if (!todayReflection?.dailyTasks) return;
        const newTasks = [...todayReflection.dailyTasks];
        newTasks[index].completed = !newTasks[index].completed;
        onUpdateTasks(newTasks);
    };
    
    const allTasksCompleted = useMemo(() => {
        return todayReflection?.dailyTasks && todayReflection.dailyTasks.length > 0 && todayReflection.dailyTasks.every(t => t.completed);
    }, [todayReflection?.dailyTasks]);


    if (!settings) {
        return <div>Loading settings...</div>;
    }
    
    const totalScore = useMemo(() => 
        reflections.reduce((sum, r) => sum + (r.score ?? 0), 0),
        [reflections]
    );

    const { currentRefund, refundPercentage } = useMemo(() => {
        if (!settings || settings.depositAmount === 0) {
            return { currentRefund: 0, refundPercentage: 0 };
        }
        
        const totalCommitmentDays = settings.commitmentWeeks * 7;
        let refund = 0;
        const depositAmount = settings.depositAmount;

        if (streak <= 3) {
            refund = 0;
        } else if (streak === 4) {
            refund = depositAmount * 0.2;
        } else if (streak > 4 && totalCommitmentDays > 4) {
            const baseRefund = depositAmount * 0.2;
            const progress = Math.min(1, (streak - 4) / (totalCommitmentDays - 4));
            const additionalRefund = (depositAmount * 0.8) * progress;
            refund = baseRefund + additionalRefund;
        } else if (streak >= totalCommitmentDays) {
            refund = depositAmount;
        }

        const finalRefund = Math.floor(Math.min(depositAmount, refund));
        const percentage = depositAmount > 0 ? (finalRefund / depositAmount) * 100 : 0;
        
        return { currentRefund: finalRefund, refundPercentage: percentage };

    }, [settings, streak]);

    const currentMonth = new Date().getMonth();
    const startMonth = settings.yearStartMonth;
    const monthsPassed = (currentMonth - startMonth + 12) % 12;
    const currentQuarter = Math.floor(monthsPassed / 3);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="flex flex-col space-y-6">
                <Road totalScore={totalScore} />
                <Calendar 
                    reflections={reflections} 
                    onDayClick={onCalendarDayClick} 
                    currentDate={calendarDate}
                    setCurrentDate={setCalendarDate}
                    settings={settings}
                />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
                {settings.depositAmount > 0 && (
                    <Card>
                        <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                            <PiggyBankIcon /> デポジット状況
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>預け入れ金額:</span>
                                <span className="font-bold">¥{settings.depositAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>現在の返金額:</span>
                                <span className="font-bold text-amber-600">¥{currentRefund.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5 mt-4">
                            <div
                                className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                                style={{ width: `${refundPercentage}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 text-center">コミット達成で全額返金されます！</p>
                    </Card>
                )}
                <Card>
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><GoalIcon /> 今のターゲット</h3>
                    <p className="text-sky-600 font-semibold">{settings.quarterlyGoals[currentQuarter]}</p>
                    <p className="text-xs text-slate-500 mt-1">長期目標: {settings.longTermGoal}</p>
                </Card>
                <Card>
                    <h3 className="text-xl font-bold mb-4">今日のミッション</h3>
                    {!todayReflection?.morning && (
                        <div className="text-center py-4">
                            <p className="text-slate-500 mb-4">まだ朝の振り返りが完了していません。</p>
                            <PrimaryButton onClick={() => onNavigate('MORNING_CONVERSATION')}>朝の振り返りを始める</PrimaryButton>
                        </div>
                    )}
                    
                    {todayReflection?.dailyTasks && todayReflection.dailyTasks.length > 0 && !allTasksCompleted && (
                        <div className="space-y-3">
                            {todayReflection.dailyTasks.map((task, i) => (
                                <div key={i} className="flex items-center gap-3 bg-slate-100 p-3 rounded-lg">
                                    <input type="checkbox" checked={task.completed} onChange={() => handleTaskToggle(i)}
                                        className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                    />
                                    <label className={`flex-grow ${task.completed ? 'line-through text-slate-500' : ''}`}>
                                        {task.text}
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {allTasksCompleted && !todayReflection?.night && (
                         <div className="mt-4 text-center">
                            <p className="text-green-600 font-bold mb-2">素晴らしい！今日のミッションはすべて完了です。</p>
                            <PrimaryButton onClick={() => onNavigate('NIGHT_REFLECTION')} className="w-full">
                                終了して夜の振り返りへ
                            </PrimaryButton>
                        </div>
                    )}

                    {todayReflection?.morning && (!todayReflection.dailyTasks || todayReflection.dailyTasks.length === 0) && (
                         <p className="text-slate-500">今日やるべきタスクが設定されていません。</p>
                    )}
                </Card>
                 <Card>
                    <h3 className="text-xl font-bold mb-4">アクション</h3>
                    <div className="space-y-4">
                        {todayReflection?.morning && !todayReflection?.night && (
                             <PrimaryButton 
                                 onClick={() => onNavigate('NIGHT_REFLECTION')} 
                                 className="w-full"
                             >
                                 夜の振り返りを始める
                             </PrimaryButton>
                        )}
                        {todayReflection?.night && (
                            <p className="text-center text-green-700 p-4 bg-green-100 rounded-lg">本日の振り返りは完了しました。お疲れ様でした！</p>
                        )}
                         <SecondaryButton onClick={() => onNavigate('AI_TWIN')} className="w-full flex items-center justify-center gap-2">
                             <GhostIcon /> 過去の自分と対話する
                         </SecondaryButton>
                         <SecondaryButton onClick={() => onNavigate('SPICY_FEEDBACK')} className="w-full flex items-center justify-center gap-2">
                            <BrainCircuitIcon /> 匿名の辛口フィードバック
                         </SecondaryButton>
                    </div>
                </Card>
            </div>
        </div>
    );
};

const MorningConversationView: React.FC<{
    settings: UserSettings;
    yesterdayReflection: Reflection | null;
    onFinish: (tasks: DailyTask[], score: number) => void;
    onClose: () => void;
}> = ({ settings, yesterdayReflection, onFinish, onClose }) => {
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
    const [conversationStep, setConversationStep] = useState('start');
    const [collectedTasks, setCollectedTasks] = useState<string[]>([]);
    const [score, setScore] = useState(0);
    const [pendingTask, setPendingTask] = useState<string | null>(null);

    // UI State
    const [showTaskButtons, setShowTaskButtons] = useState(false);
    const [showReconsiderButtons, setShowReconsiderButtons] = useState(false);
    const [showFinishButton, setShowFinishButton] = useState(false);

    const chatEndRef = useRef<HTMLDivElement | null>(null);

    const currentQuarter = useMemo(() => {
        if (!settings) return 0;
        const currentMonth = new Date().getMonth();
        const startMonth = settings.yearStartMonth;
        const monthsPassed = (currentMonth - startMonth + 12) % 12;
        return Math.floor(monthsPassed / 3);
    }, [settings]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const addMessage = useCallback((message: ChatMessage) => {
        setChatHistory(prev => [...prev, message]);
    }, []);

    const handleUserSubmit = async () => {
        if (!userInput.trim() || isAwaitingResponse) return;

        addMessage({ role: 'user', text: userInput });
        const currentInput = userInput;
        setUserInput('');
        setIsAwaitingResponse(true);

        if (conversationStep === 'awaiting_long_term') {
            const isMatch = await geminiService.compareGoalRecall(currentInput, settings.longTermGoal);
            if (isMatch) {
                setScore(s => s + 10);
                addMessage({ role: 'model', text: `そうです！あなたの年間の目標は「${settings.longTermGoal}」です。毎日集中していると自分がどこに向かうか忘れてしまいがちになるので、毎日意識していきましょう。` });
            } else {
                setScore(s => s - 10);
                addMessage({ role: 'model', text: `うーん...本当は「${settings.longTermGoal}」です。コミットを始めた${new Date(settings.commitmentStartDate).toLocaleDateString()}の気持ちを忘れてはいないでしょうか？一度やると決めたことをやり切るためには、そもそもやるときめたことを覚えていないと何にもなりません。頭に叩き込むようにしてください。` });
            }
            setConversationStep('post_long_term');
        } else if (conversationStep === 'awaiting_quarterly') {
             const quarterlyGoal = settings.quarterlyGoals[currentQuarter];
             const isMatch = await geminiService.compareGoalRecall(currentInput, quarterlyGoal);
             if (isMatch) {
                setScore(s => s + 5);
                addMessage({ role: 'model', text: `その通り！今期の目標は「${quarterlyGoal}」ですね。素晴らしい！` });
            } else {
                setScore(s => s - 5);
                addMessage({ role: 'model', text: `惜しい！正しくは「${quarterlyGoal}」です。長期目標からブレないように、これも毎日意識しましょう。` });
            }
            setConversationStep('post_quarterly');
        } else if (conversationStep === 'awaiting_tasks') {
            const { judgment, response } = await geminiService.evaluateTask(currentInput, settings.longTermGoal, settings.quarterlyGoals[currentQuarter]);
            addMessage({ role: 'model', text: response });
            if (judgment === 'appropriate') {
                setCollectedTasks(prev => [...prev, currentInput]);
                addMessage({ role: 'model', text: '他にはありますか？' });
                setShowTaskButtons(true);
            } else { // insufficient
                setPendingTask(currentInput);
                setShowReconsiderButtons(true);
            }
        }
        setIsAwaitingResponse(false);
    };

    const handleTaskOption = (option: 'more' | 'done') => {
        setShowTaskButtons(false);
        if (option === 'more') {
            addMessage({ role: 'user', text: 'まだあります。' });
            addMessage({ role: 'model', text: '入力してください。' });
        } else {
            addMessage({ role: 'user', text: 'もう思いつかない。' });
            if (collectedTasks.length === 0) {
                 addMessage({ role: 'model', text: 'そうですか...最低でも1つのタスクは計画しましょう。もう一度考えてみてください。' });
                 // Let user try again
            } else if (collectedTasks.length === 1) {
                addMessage({ role: 'model', text: 'そうですか...本当にそれだけでいいんですかね？現時点でそれしか思いつかないということはわかりました。ですが、それだけで終わることはありません。＋αであと2個は行動を起こしてきてください。' });
                 setShowFinishButton(true);
            } else if (collectedTasks.length === 2) {
                 addMessage({ role: 'model', text: '了解です。では、＋αで最低でもあと1個は何か行動して、今日の終わりに報告してくださいね。' });
                 setShowFinishButton(true);
            } else {
                 addMessage({ role: 'model', text: '素晴らしいですね！たくさんのタスクを計画できました。今日の夜、結果を聞くのを楽しみにしています。' });
                 setShowFinishButton(true);
            }
        }
    };

    const handleTaskDecision = (decision: 'reconsider' | 'stick') => {
        setShowReconsiderButtons(false);
        if (decision === 'reconsider') {
            addMessage({ role: 'user', text: '考え直します。' });
            addMessage({ role: 'model', text: '改めて考え直してください。' });
            setPendingTask(null);
        } else { // stick
            addMessage({ role: 'user', text: 'これでやりぬきます。' });
            addMessage({ role: 'model', text: '本当にいいんですね？' });
            setScore(s => s - 5);
            if (pendingTask) {
                setCollectedTasks(prev => [...prev, pendingTask]);
                setPendingTask(null);
            }
            addMessage({ role: 'model', text: '他にはありますか？' });
            setShowTaskButtons(true);
        }
    };

    const handleFinish = () => {
        const finalTasks: DailyTask[] = collectedTasks.map(text => ({ text, completed: false }));
        if (collectedTasks.length === 1) {
            finalTasks.push({ text: "+α ミッション", completed: false });
            finalTasks.push({ text: "+α ミッション", completed: false });
        } else if (collectedTasks.length === 2) {
            finalTasks.push({ text: "+α ミッション", completed: false });
        }
        onFinish(finalTasks, score);
    };
    
    useEffect(() => {
        const runConversation = async () => {
            if (isAwaitingResponse) return;
            setIsAwaitingResponse(true);
            
            if (conversationStep === 'start') {
                addMessage({ role: 'model', text: 'それでは朝のジャーナリングを始めましょう。あなたの長期の目標はなんですか？ざっくりでいいのでまず書いてください。' });
                setConversationStep('awaiting_long_term');
            } else if (conversationStep === 'post_long_term') {
                 addMessage({ role: 'model', text: `で、「${settings.longTermGoal}」のために、この3ヶ月間で何をやるんでしたっけ？まずそれを思い出してください。` });
                 setConversationStep('awaiting_quarterly');
            } else if (conversationStep === 'post_quarterly') {
                if(yesterdayReflection && yesterdayReflection.night) {
                    const summary = await geminiService.summarizeNightReflection(yesterdayReflection.night);
                    addMessage({ role: 'model', text: `昨日は「${summary}」という感じでしたね。その上で、更に今日何ができるでしょうか？まずひとつあげてください。` });
                } else {
                    addMessage({ role: 'model', text: `それでは、「${settings.quarterlyGoals[currentQuarter]}」のために、何が今日できるでしょう？まずひとつあげてください。` });
                }
                setConversationStep('awaiting_tasks');
            }
            
            setIsAwaitingResponse(false);
        };
        runConversation();
    }, [conversationStep, addMessage, settings, yesterdayReflection, isAwaitingResponse, currentQuarter]);

    const showInput = !showTaskButtons && !showReconsiderButtons && !showFinishButton;

    return (
        <div className="fixed inset-0 bg-slate-50 z-40 flex flex-col p-4 sm:p-6 lg:p-8">
            <header className="flex-shrink-0 flex justify-between items-center pb-4 border-b border-slate-200 max-w-4xl mx-auto w-full">
                <h2 className="text-2xl font-bold text-sky-600">朝の振り返り</h2>
                <button onClick={onClose} className="text-slate-500 hover:text-slate-800 text-3xl">&times;</button>
            </header>
            
            <div className="flex-grow overflow-y-auto my-4 w-full max-w-4xl mx-auto">
                <div className="space-y-6">
                    {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'model' && <BotIcon className="w-8 h-8 flex-shrink-0 text-sky-500 mt-1" />}
                            <div className={`max-w-md md:max-w-lg p-3 rounded-lg shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-sky-500 text-white' : 'bg-white text-slate-800 border border-slate-200'}`}>
                                {msg.text}
                            </div>
                            {msg.role === 'user' && <UserIcon className="w-8 h-8 flex-shrink-0 text-slate-600 mt-1" />}
                        </div>
                    ))}
                    {isAwaitingResponse && chatHistory.length > 0 && (
                        <div className="flex items-start gap-3">
                            <BotIcon className="w-8 h-8 flex-shrink-0 text-sky-500 mt-1" />
                            <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-white border border-slate-200 flex items-center">
                                <div className="animate-pulse flex space-x-1">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animation-delay-200"></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animation-delay-400"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                 <div ref={chatEndRef} />
            </div>

            <footer className="flex-shrink-0 pt-4 border-t border-slate-200 w-full max-w-4xl mx-auto">
                {showTaskButtons && (
                    <div className="flex justify-center gap-4">
                        <PrimaryButton onClick={() => handleTaskOption('more')}>まだある</PrimaryButton>
                        <SecondaryButton onClick={() => handleTaskOption('done')}>もう思いつかない</SecondaryButton>
                    </div>
                )}
                {showReconsiderButtons && (
                    <div className="flex justify-center gap-4">
                        <PrimaryButton onClick={() => handleTaskDecision('reconsider')}>考え直す</PrimaryButton>
                        <SecondaryButton onClick={() => handleTaskDecision('stick')}>これでやりぬく</SecondaryButton>
                    </div>
                )}
                {showFinishButton && (
                     <PrimaryButton onClick={handleFinish} className="w-full">終了</PrimaryButton>
                )}
                {showInput && (
                    <div className="flex items-start gap-2">
                        <TextArea 
                            value={userInput} 
                            onChange={e => setUserInput(e.target.value)} 
                            placeholder="メッセージを入力..." 
                            rows={2} 
                            disabled={isAwaitingResponse}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleUserSubmit();
                                }
                            }}
                        />
                        <PrimaryButton onClick={handleUserSubmit} disabled={isAwaitingResponse || !userInput.trim()}><SendIcon className="w-5 h-5" /></PrimaryButton>
                    </div>
                )}
            </footer>
        </div>
    );
}

const NightReflectionView: React.FC<{
    onSave: (data: NightReflectionData, tasks: DailyTask[], score: number, analysis: string) => void;
    onClose: () => void;
    tasks: DailyTask[];
    settings: UserSettings;
}> = ({ onSave, onClose, tasks: initialTasks, settings }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
    
    // State machine
    const [step, setStep] = useState('start');
    const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
    const [alphaTaskCount, setAlphaTaskCount] = useState(0);

    // Data collection
    const [nightData, setNightData] = useState<Partial<NightReflectionData>>({});
    const [tasks, setTasks] = useState<DailyTask[]>(initialTasks);
    const [score, setScore] = useState(0);
    const [sentiment, setSentiment] = useState<'positive' | 'negative' | null>(null);
    // Fix: Add a separate state for the analysis string to avoid type errors.
    const [analysis, setAnalysis] = useState('');

    // UI State
    const [showButtons, setShowButtons] = useState<Array<{label: string, value: any, primary: boolean}>>([]);
    
    const chatEndRef = useRef<HTMLDivElement | null>(null);

    const addMessage = useCallback((message: ChatMessage) => {
        setChatHistory(prev => [...prev, message]);
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    // Main conversation flow logic
    useEffect(() => {
        const runConversation = async () => {
            if (isAwaitingResponse) return;
            setIsAwaitingResponse(true);

            if (step === 'start') {
                const definedTasks = tasks.filter(t => !t.text.includes("+α")).map(t => t.text).join('、');
                addMessage({ role: 'model', text: `それでは、夜のジャーナリングを始めましょう。あなたの本日やることは「${definedTasks}」でした。` });
                addMessage({ role: 'model', text: 'まず今率直にどういう感覚ですか？書きたいことを思うままに書いてください。' });
                setStep('awaiting_feelings');
            } else if (step === 'post_feelings') {
                const userSentiment = await geminiService.analyzeSentiment(nightData.feelings || '');
                setSentiment(userSentiment);
                if (userSentiment === 'negative') {
                    addMessage({ role: 'model', text: 'そうですか...そういう感情は次への挑戦のばねになることはありますが、実際のところ自分のずるずると引きずっていく原因にもなります。今日、無駄なことに時間を使ってしまったなと感じたものはどのようなものがあるのでしょうか？素直にすべてあげてください。' });
                    setStep('awaiting_wasted_time');
                } else {
                    addMessage({ role: 'model', text: 'いいですね！しっかりと集中して取り組むようなマインドセットには出来ているようです。' });
                    setStep('task_review_start');
                }
            } else if (step === 'task_review_start') {
                const task = tasks[currentTaskIndex];
                if (task && !task.text.includes("+α")) {
                    addMessage({ role: 'model', text: `なるほど。いろいろな感情があるかと思いますが、結局今日の朝立てた目標の達成状況はどうですか？まず一つ目から見ていきましょう。「${task.text}」これは出来ましたか？` });
                    setShowButtons([{label: 'できた', value: 'yes', primary: true}, {label: 'できなかった', value: 'no', primary: false}]);
                    setStep('awaiting_task_status');
                } else {
                    setStep('alpha_review_start'); // Move to alpha tasks if no normal tasks left
                }
            } else if (step === 'next_task') {
                const nextIndex = currentTaskIndex + 1;
                setCurrentTaskIndex(nextIndex);
                const nextTask = tasks[nextIndex];
                if (nextTask && !nextTask.text.includes("+α")) {
                    addMessage({ role: 'model', text: `次に行きます。「${nextTask.text}」は出来ましたか？` });
                    setShowButtons([{label: 'できた', value: 'yes', primary: true}, {label: 'できなかった', value: 'no', primary: false}]);
                    setStep('awaiting_task_status');
                } else {
                    setStep('alpha_review_start');
                }
            } else if (step === 'alpha_review_start') {
                const requiredAlphas = initialTasks.filter(t => t.text.includes("+α")).length;
                if (requiredAlphas > 0 && alphaTaskCount < requiredAlphas) {
                    addMessage({ role: 'model', text: `では、+αでほかに何か行動したものを、教えてください。（${alphaTaskCount + 1}/${requiredAlphas}）`});
                    setStep('awaiting_alpha_task');
                } else {
                    addMessage({ role: 'model', text: `他に+αで行動したものはありますか？` });
                    setShowButtons([{label: 'まだある', value: 'yes', primary: true}, {label: 'これだけ', value: 'no', primary: false}]);
                    setStep('awaiting_more_alphas');
                }
            } else if (step === 'ask_for_another_alpha') {
                 addMessage({ role: 'model', text: `では、+αでほかに何か行動したものを、教えてください。`});
                 setStep('awaiting_alpha_task');
            } else if (step === 'summary_start') {
                const summary = await geminiService.generateNightSummary(tasks, nightData as NightReflectionData);
                addMessage({ role: 'model', text: `今日は、「${summary}」を行ったということですね。明日は何を行いますか？` });
                setAnalysis(summary);
                setStep('awaiting_tomorrow_plan');
            } else if (step === 'finish') {
                addMessage({ role: 'model', text: 'これで、今日の振り返りを終わります。お疲れ様でした。明日も頑張りましょう。'});
                setShowButtons([{label: '今日の振り返りを完了', value: 'done', primary: true}]);
            }
            
            setIsAwaitingResponse(false);
        };
        runConversation();
    }, [step]);

    const handleInput = async (value: string) => {
        setIsAwaitingResponse(true);
        addMessage({ role: 'user', text: value });
        setUserInput('');

        if (step === 'awaiting_feelings') {
            setNightData(prev => ({...prev, feelings: value}));
            setStep('post_feelings');
        } else if (step === 'awaiting_wasted_time') {
            setNightData(prev => ({...prev, wastedTime: value}));
            const minutes = parseInt(value.replace(/[^0-9]/g, '')) || 0;
            setScore(s => s - (minutes * 0.1));
            setStep('task_review_start');
        } else if (step === 'awaiting_task_experience') {
            setNightData(prev => ({...prev, achievementAnalysis: `${prev.achievementAnalysis || ''}\n- ${tasks[currentTaskIndex].text}: ${value}`}));
            addMessage({ role: 'model', text: 'いい経験が出来たようですね。'});
            setStep('next_task');
        } else if (step === 'awaiting_task_failure_reason') {
            const { analysis, response } = await geminiService.analyzeFailureReason(value);
            addMessage({ role: 'model', text: response });
            if (analysis === 'excuse') {
                setStep('awaiting_excuse_followup');
            } else {
                setStep('next_task');
            }
        } else if (step === 'awaiting_excuse_followup') {
            addMessage({ role: 'model', text: `そうですね。たぶん行動の余地はあったでしょう。「${value}」のような場所を使っていかないと、進んでいきません。そこは、しっかりと意識するようにしてください。` });
            setStep('next_task');
        } else if (step === 'awaiting_alpha_task') {
            const { meaningful, response } = await geminiService.evaluateAlphaTask(value, settings.longTermGoal);
            if (meaningful) {
                setScore(s => s + 10);
                addMessage({ role: 'model', text: '具体的にどんな経験ができましたか？自由に書いてください(目安5文以上)' });
                setStep('awaiting_alpha_experience');
            } else {
                addMessage({ role: 'model', text: response });
                setStep('awaiting_alpha_justification');
            }
        } else if (step === 'awaiting_alpha_justification') {
            // Assume any justification is a sign of reflection
            setScore(s => s + 10);
            addMessage({ role: 'model', text: 'なるほど、そういう意図があったのですね。承知しました。具体的にどんな経験ができましたか？' });
            setStep('awaiting_alpha_experience');
        } else if (step === 'awaiting_alpha_experience') {
            setNightData(prev => ({ ...prev, extras: `${prev.extras || ''}\n- ${value}` }));
            setAlphaTaskCount(c => c + 1);
            addMessage({ role: 'model', text: 'いい経験が出来たようですね。' });
            setStep('alpha_review_start');
        } else if (step === 'awaiting_tomorrow_plan') {
            setNightData(prev => ({...prev, tomorrowIdeas: value}));
            const { response } = await geminiService.evaluateTask(value, settings.longTermGoal, settings.quarterlyGoals[0]); // Using first quarter goal as proxy
            addMessage({ role: 'model', text: response });
            setStep('finish');
        }
        
        setIsAwaitingResponse(false);
    };

    const handleButton = async (value: any) => {
        setShowButtons([]);
        setIsAwaitingResponse(true);

        if (step === 'awaiting_task_status') {
            const newTasks = [...tasks];
            newTasks[currentTaskIndex].completed = value === 'yes';
            setTasks(newTasks);
            
            if (value === 'yes') {
                addMessage({ role: 'user', text: 'できた' });
                addMessage({ role: 'model', text: 'いいですね！有言実行できたことは素晴らしいことです！！この調子で行きましょう。' });
                setScore(s => s + 10);
                addMessage({ role: 'model', text: '具体的にどんな経験ができましたか？自由に書いてください(目安5文以上)' });
                setStep('awaiting_task_experience');
            } else {
                addMessage({ role: 'user', text: 'できなかった' });
                addMessage({ role: 'model', text: 'そうですか...。' });
                setScore(s => s - 20);
                if (sentiment === 'positive') {
                     addMessage({ role: 'model', text: '出来なかったことには何か原因があります。今日、無駄なことに時間を使ってしまったなと感じたものはどのようなものがあるのでしょうか？素直にすべてあげてください' });
                     setStep('awaiting_wasted_time_after_failure');
                } else {
                     addMessage({ role: 'model', text: `やはり、${nightData.wastedTime ? '無駄にしてしまった時間があった' : '何か原因が'}からでしょうか？なぜできなかったのですか？` });
                     setStep('awaiting_task_failure_reason');
                }
            }
        } else if (step === 'awaiting_more_alphas') {
             if (value === 'yes') {
                 addMessage({ role: 'user', text: 'まだあります' });
                 setStep('ask_for_another_alpha');
             } else {
                 addMessage({ role: 'user', text: 'これだけです' });
                 setStep('summary_start');
             }
        } else if (value === 'done' && step === 'finish') {
            setIsLoading(true);
            await onSave(nightData as NightReflectionData, tasks, score, analysis);
        }

        setIsAwaitingResponse(false);
    };

    const showInput = showButtons.length === 0 && step !== 'finish';

    return (
        <div className="fixed inset-0 bg-slate-50 z-40 flex flex-col p-4 sm:p-6 lg:p-8">
            <header className="flex-shrink-0 flex justify-between items-center pb-4 border-b border-slate-200 max-w-4xl mx-auto w-full">
                <h2 className="text-2xl font-bold text-sky-600">夜の振り返り</h2>
                <button onClick={onClose} className="text-slate-500 hover:text-slate-800 text-3xl">&times;</button>
            </header>
            
            <div className="flex-grow overflow-y-auto my-4 w-full max-w-4xl mx-auto">
                <div className="space-y-6">
                    {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'model' && <BotIcon className="w-8 h-8 flex-shrink-0 text-sky-500 mt-1" />}
                            <div className={`max-w-md md:max-w-lg p-3 rounded-lg shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-sky-500 text-white' : 'bg-white text-slate-800 border border-slate-200'}`}>
                                {msg.text}
                            </div>
                            {msg.role === 'user' && <UserIcon className="w-8 h-8 flex-shrink-0 text-slate-600 mt-1" />}
                        </div>
                    ))}
                    {(isAwaitingResponse || isLoading) && chatHistory.length > 0 && (
                        <div className="flex items-start gap-3">
                            <BotIcon className="w-8 h-8 flex-shrink-0 text-sky-500 mt-1" />
                            <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-white border border-slate-200 flex items-center">
                                <Spinner/>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
            </div>

            <footer className="flex-shrink-0 pt-4 border-t border-slate-200 w-full max-w-4xl mx-auto">
                {showButtons.length > 0 && (
                    <div className="flex justify-center gap-4">
                        {showButtons.map(btn => btn.primary 
                            ? <PrimaryButton key={btn.label} onClick={() => handleButton(btn.value)}>{btn.label}</PrimaryButton>
                            : <SecondaryButton key={btn.label} onClick={() => handleButton(btn.value)}>{btn.label}</SecondaryButton>
                        )}
                    </div>
                )}
                {showInput && (
                     <div className="flex items-start gap-2">
                        <TextArea 
                            value={userInput} 
                            onChange={e => setUserInput(e.target.value)} 
                            placeholder="メッセージを入力..." 
                            rows={2}
                            disabled={isAwaitingResponse}
                             onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleInput(userInput);
                                }
                            }}
                        />
                        <PrimaryButton onClick={() => handleInput(userInput)} disabled={isAwaitingResponse || !userInput.trim()}><SendIcon className="w-5 h-5" /></PrimaryButton>
                    </div>
                )}
            </footer>
        </div>
    );
};


const AIToolsView: React.FC<{
    type: 'twin' | 'feedback',
    onClose: () => void,
    reflections: Reflection[],
    initialReflection?: Reflection | null
}> = ({ type, onClose, reflections, initialReflection }) => {
    // Feedback State
    const [feedback, setFeedback] = useState('');
    const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

    // AI Twin State
    const [selectedTwin, setSelectedTwin] = useState<AITwin | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isTwinLoading, setIsTwinLoading] = useState(false);

    useEffect(() => {
        if (initialReflection) {
            setSelectedTwin({ date: initialReflection.date, reflection: initialReflection });
            setChatHistory([]);
        }
    }, [initialReflection]);

    const aiTwins = useMemo(() => {
        return reflections
            .filter(r => r.morning && r.night) // Only show completed days
            .map(r => ({ date: r.date, reflection: r }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [reflections]);
    
    const handleGetFeedback = useCallback(async () => {
        setIsFeedbackLoading(true);
        const scoreTrend = reflections.map(r => r.score ?? 50).slice(-7);
        const fb = await geminiService.generateSpicyFeedback(scoreTrend);
        setFeedback(fb);
        setIsFeedbackLoading(false);
    }, [reflections]);

    const handleSelectTwin = (twin: AITwin) => {
        setSelectedTwin(twin);
        setChatHistory([]);
    };

    const handleSendMessage = async () => {
        if (userInput.trim() === '' || !selectedTwin) return;
        
        const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', text: userInput }];
        setChatHistory(newHistory);
        setUserInput('');
        setIsTwinLoading(true);

        const aiResponse = await geminiService.generateAITwinResponse(selectedTwin.reflection, newHistory);
        setChatHistory([...newHistory, { role: 'model', text: aiResponse }]);
        setIsTwinLoading(false);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={type === 'twin' ? 'AI Twinとの対話' : '辛口フィードバック'}>
            {type === 'feedback' && (
                <div className="text-center space-y-4">
                    <h3 className="text-lg">他人の進捗（スコア推移）を見て、自分を省みる。</h3>
                    <p className="text-slate-500">これは匿名の誰かのスコア推移だ。もし君がフィードバックを送るなら、どう伝える？</p>
                    <div className="p-4 bg-slate-100 rounded-lg">
                        <p className="font-mono text-xl tracking-widest text-slate-700">{reflections.map(r => r.score ?? '-').slice(-7).join(' -> ')}</p>
                    </div>
                    {isFeedbackLoading ? <Spinner /> : 
                        feedback ? <Card className="text-left"><p className="text-amber-600 font-semibold">{feedback}</p></Card> : null
                    }
                    <PrimaryButton onClick={handleGetFeedback} disabled={isFeedbackLoading}>AIに辛口フィードバックを生成させる</PrimaryButton>
                </div>
            )}
            {type === 'twin' && (
                <div className="flex flex-col md:flex-row gap-4 h-[60vh]">
                    <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-200 pb-4 md:pb-0 md:pr-4 overflow-y-auto">
                        <h3 className="font-bold mb-2">対話したい自分を選ぶ</h3>
                        <div className="space-y-2">
                        {aiTwins.map(twin => (
                            <button key={twin.date} onClick={() => handleSelectTwin(twin)} className={`w-full text-left p-2 rounded-lg ${selectedTwin?.date === twin.date ? 'bg-sky-500 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>
                                {new Date(twin.date).toLocaleDateString()}
                                <span className={`block text-xs ${selectedTwin?.date === twin.date ? 'text-sky-100' : 'text-slate-500'}`}>Score: {twin.reflection.score}</span>
                            </button>
                        ))}
                        </div>
                    </div>
                    <div className="w-full md:w-2/3 flex flex-col">
                        {selectedTwin ? (
                            <>
                                <div className="flex-grow overflow-y-auto mb-4 pr-2 space-y-4">
                                     {chatHistory.map((msg, i) => (
                                         <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                             {msg.role === 'model' && <BotIcon className="w-8 h-8 flex-shrink-0 text-sky-500" />}
                                             <div className={`max-w-xs md:max-w-md p-3 rounded-lg whitespace-pre-wrap ${msg.role === 'user' ? 'bg-sky-500 text-white' : 'bg-white text-slate-800 border border-slate-200'}`}>
                                                 {msg.text}
                                             </div>
                                             {msg.role === 'user' && <UserIcon className="w-8 h-8 flex-shrink-0" />}
                                         </div>
                                     ))}
                                     {isTwinLoading && (
                                         <div className="flex items-start gap-3">
                                             <BotIcon className="w-8 h-8 flex-shrink-0 text-sky-500" />
                                             <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-slate-200">
                                                 <Spinner />
                                             </div>
                                         </div>
                                     )}
                                </div>
                                <div className="flex-shrink-0 flex items-start gap-2">
                                    <TextArea 
                                        value={userInput} 
                                        onChange={e => setUserInput(e.target.value)} 
                                        placeholder="メッセージを入力..." 
                                        rows={2}
                                        disabled={isTwinLoading}
                                    />
                                    <PrimaryButton onClick={handleSendMessage} disabled={isTwinLoading || !userInput.trim()}>
                                        <SendIcon className="w-5 h-5" />
                                    </PrimaryButton>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                <p>左のリストから対話したい過去の自分を選んでください。</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default App;