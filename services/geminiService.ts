import type { NightReflectionData, DailyTask } from '../types';

// Hardcoded responses to replace AI generation
const goalSuggestions = [
    "1年間で分野の基礎を完全にマスターする",
    "関連する資格を2つ以上取得する",
    "分野のトップエキスパートとコンタクトを取る",
];

const responses = {
    appropriateTask: "いいですね。成功した方のペースと比べてもちょうどよいスピード感です。その調子でやっていくといいでしょう",
    insufficientTask: "本当にそれだけでいいんですか？実際他の方のペースと比較すると遅いです。それでは達成できない可能性もあり、何よりコミットしきれないでしょう。もう少し高い目標を考え直してみてください",
    takeResponsibility: "そうですね。それがわかっているなら、後はやるだけです。",
    makeExcuse: "なるほど...で、本当にあなたには成すすべがなかったんですかね？よく考えなおしてみてください。あそこで行動できていたなど在りませんでしたか？",
    spicyFeedback: "結果は行動の後にしかついてこない。今のままで満足するな。",
};

export const generateGoalSuggestions = async (commitmentField: string): Promise<string[]> => {
    console.log(`Generating suggestions for: ${commitmentField}`);
    // Return a fixed list of goals, ignoring the input field.
    return Promise.resolve(goalSuggestions);
};

export const compareGoalRecall = async (userInput: string, correctGoal: string): Promise<boolean> => {
    // A simple heuristic: if the user input is longer than 5 chars, we'll say it's a good faith effort.
    // In a real non-AI app, this would be a more robust string similarity check.
    return Promise.resolve(userInput.trim().length > 5);
};

export const evaluateTask = async (task: string, longTermGoal: string, quarterlyGoal: string): Promise<{ judgment: 'appropriate' | 'insufficient', response: string }> => {
    // Judge task based on length.
    if (task.trim().length < 10) {
        return Promise.resolve({ judgment: 'insufficient', response: responses.insufficientTask });
    }
    return Promise.resolve({ judgment: 'appropriate', response: responses.appropriateTask });
};

export const summarizeNightReflection = async (data: NightReflectionData): Promise<string> => {
    // Return a generic summary.
    return Promise.resolve("昨日の活動を振り返りました。");
};

export const analyzeSentiment = async (text: string): Promise<'positive' | 'negative'> => {
    // Simple keyword check for negative sentiment.
    const negativeKeywords = ['ダメ', '最悪', 'できなかった', 'つらい', '悲しい', '残念'];
    if (negativeKeywords.some(kw => text.includes(kw))) {
        return Promise.resolve('negative');
    }
    return Promise.resolve('positive');
};

export const analyzeFailureReason = async (reason: string): Promise<{ analysis: 'responsibility' | 'excuse', response: string }> => {
    // Simple keyword check for excuses.
    const excuseKeywords = ['時間', 'せい', '体調', '余裕', '忙しい'];
     if (excuseKeywords.some(kw => reason.includes(kw))) {
        return Promise.resolve({ analysis: 'excuse', response: responses.makeExcuse });
    }
    return Promise.resolve({ analysis: 'responsibility', response: responses.takeResponsibility });
};


export const evaluateAlphaTask = async (task: string, longTermGoal: string): Promise<{ meaningful: boolean, response: string }> => {
    // Judge task based on length.
    if (task.trim().length < 5) {
         return Promise.resolve({ meaningful: false, response: "本当にそれは意味があると思っているのですか？" });
    }
    return Promise.resolve({ meaningful: true, response: "" });
}

export const generateNightSummary = async (tasks: DailyTask[], nightData: NightReflectionData): Promise<string> => {
    const completedTasks = tasks.filter(t => t.completed).length;
    // Generate a simple summary based on data.
    return Promise.resolve(`計画タスクを${completedTasks}件完了し、一日を終えました。`);
}


export const generateSpicyFeedback = async (scoreTrend: number[]): Promise<string> => {
    // Return a single, hardcoded piece of feedback.
    return Promise.resolve(responses.spicyFeedback);
};
