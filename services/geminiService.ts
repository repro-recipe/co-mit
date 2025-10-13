import { GoogleGenAI, Type } from "@google/genai";
import type { NightReflectionData, ChatMessage, Reflection, DailyTask } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateGoalSuggestions = async (commitmentField: string): Promise<string[]> => {
    const prompt = `
        A user has chosen to commit to the field of "${commitmentField}".
        Generate 3 distinct, ambitious, and specific annual goal suggestions for them.
        The goals should be inspiring and phrased in Japanese.
        Return ONLY a JSON object with a "goals" key, which is an array of 3 strings.
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        goals: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                        },
                    },
                },
            },
        });
        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        return result.goals || [];
    } catch (error) {
        console.error("Error generating goal suggestions:", error);
        return [
            "1年間で分野の基礎を完全にマスターする",
            "関連する資格を2つ以上取得する",
            "分野のトップエキスパートとコンタクトを取る",
        ]; // Fallback suggestions
    }
};

export const compareGoalRecall = async (userInput: string, correctGoal: string): Promise<boolean> => {
    const prompt = `
        A user was asked to recall their goal.
        User's input: "${userInput}"
        The correct goal is: "${correctGoal}"

        Are these two goals semantically similar, considering synonyms, rephrasing, and key concepts? The user's input doesn't need to be a perfect match, but it should capture the essence of the correct goal with at least 80% accuracy.

        Respond with ONLY a JSON object with a single key "match" which is a boolean (true or false).
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        match: { type: Type.BOOLEAN },
                    },
                },
            },
        });
        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        return result.match ?? false;
    } catch (error) {
        console.error("Error comparing goal recall:", error);
        return userInput.toLowerCase().includes(correctGoal.toLowerCase().substring(0, 10));
    }
};

export const evaluateTask = async (task: string, longTermGoal: string, quarterlyGoal: string): Promise<{ judgment: 'appropriate' | 'insufficient', response: string }> => {
    const prompt = `
        A user has a long-term goal: "${longTermGoal}"
        Their current 3-month goal is: "${quarterlyGoal}"
        They have proposed the following task for today: "${task}"

        Evaluate this task. Is it a reasonably ambitious and meaningful step towards their goals, or does it seem too small, trivial, or slow-paced?
        There is no database of other users, so make a reasonable judgement call.
        
        - If the task seems appropriate, the judgment should be "appropriate". The response should be encouraging, like "いいですね。成功した方のペースと比べてもちょうどよいスピード感です。その調子でやっていくといいでしょう".
        - If the task seems insufficient, the judgment should be "insufficient". The response should be critical but constructive, like "本当にそれだけでいいんですか？実際他の方のペースと比較すると遅いです。それでは達成できない可能性もあり、何よりコミットしきれないでしょう。もう少し高い目標を考え直してみてください".

        Return ONLY a JSON object with two keys: "judgment" (string: "appropriate" or "insufficient") and "response" (string: the corresponding Japanese response).
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        judgment: { type: Type.STRING },
                        response: { type: Type.STRING },
                    },
                },
            },
        });
        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        if (result.judgment === 'appropriate' || result.judgment === 'insufficient') {
            return result;
        }
        return { judgment: 'appropriate', response: "素晴らしいタスクですね！" };
    } catch (error) {
        console.error("Error evaluating task:", error);
        return { judgment: 'appropriate', response: "素晴らしいタスクですね！頑張ってください！" }; // Fallback
    }
};

export const summarizeNightReflection = async (data: NightReflectionData): Promise<string> => {
    const prompt = `
      Based on the user's reflection from yesterday, create a very short one-sentence summary in Japanese to remind them of their progress.
      - How they felt: "${data.feelings}"
      - Achievement analysis: "${data.achievementAnalysis}"
      - Wasted time: "${data.wastedTime}"
      - Ideas for tomorrow: "${data.tomorrowIdeas}"
      Focus on what they accomplished or what they intended to do today.
    `;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error("Error summarizing reflection:", error);
      return "昨日の振り返りを思い出して、今日に活かしましょう。";
    }
};

export const analyzeSentiment = async (text: string): Promise<'positive' | 'negative'> => {
    const prompt = `
        Analyze the sentiment of the following Japanese text. Is it primarily positive or negative?
        Text: "${text}"
        Respond with ONLY a JSON object: {"sentiment": "positive" | "negative"}.
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { sentiment: { type: Type.STRING } },
                },
            },
        });
        const result = JSON.parse(response.text.trim());
        return result.sentiment === 'negative' ? 'negative' : 'positive';
    } catch (error) {
        console.error("Error analyzing sentiment:", error);
        return 'positive'; // Default to positive
    }
};

export const analyzeFailureReason = async (reason: string): Promise<{ analysis: 'responsibility' | 'excuse', response: string }> => {
    const prompt = `
        A user failed a task and gave this reason in Japanese: "${reason}".
        Analyze this reason. Are they taking personal responsibility for their actions (行動不足・覚悟不足), or are they making excuses and blaming external factors (周りの環境などで言い訳)?

        - If they are taking responsibility, respond with analysis "responsibility" and the Japanese text: "そうですね。それがわかっているなら、後はやるだけです。"
        - If they are making excuses, respond with analysis "excuse" and the Japanese text: "なるほど...で、本当にあなたには成すすべがなかったんですかね？よく考えなおしてみてください。あそこで行動できていたなど在りませんでしたか？"

        Return ONLY a JSON object with "analysis" ("responsibility" | "excuse") and "response" (the corresponding Japanese string).
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        analysis: { type: Type.STRING },
                        response: { type: Type.STRING }
                    },
                },
            },
        });
        const result = JSON.parse(response.text.trim());
        if (result.analysis === 'responsibility' || result.analysis === 'excuse') {
            return result;
        }
        return { analysis: 'responsibility', response: "そうですね。それがわかっているなら、後はやるだけです。" };
    } catch (error) {
        console.error("Error analyzing failure reason:", error);
        return { analysis: 'responsibility', response: "そうですね。それがわかっているなら、後はやるだけです。" };
    }
};


export const evaluateAlphaTask = async (task: string, longTermGoal: string): Promise<{ meaningful: boolean, response: string }> => {
    const prompt = `
        A user's long-term goal is "${longTermGoal}".
        They performed this extra (+α) task: "${task}".
        Is this a meaningful and relevant action towards their goal?

        - If the action is clearly meaningful, respond with meaningful: true and an empty response string.
        - If the action is questionable or irrelevant, respond with meaningful: false and a challenging question in Japanese as the response, like: "本当にそれは意味があると思っているのですか？"

        Return ONLY a JSON object with "meaningful" (boolean) and "response" (string).
    `;
     try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        meaningful: { type: Type.BOOLEAN },
                        response: { type: Type.STRING }
                    },
                },
            },
        });
        return JSON.parse(response.text.trim());
    } catch (error) {
        console.error("Error evaluating alpha task:", error);
        return { meaningful: true, response: "" };
    }
}

export const generateNightSummary = async (tasks: DailyTask[], nightData: NightReflectionData): Promise<string> => {
    const prompt = `
        Based on the user's reflection, create a concise, one-sentence summary (総括) in Japanese.
        - Tasks for the day: ${tasks.map(t => `${t.text} (${t.completed ? '完了' : '未完了'})`).join(', ')}
        - Feelings: ${nightData.feelings}
        - Wasted Time: ${nightData.wastedTime}
        - Extra accomplishments: ${nightData.extras}

        Generate the summary string. Example: 「計画タスクをこなしつつ、感情の波と向き合った一日」
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating night summary:", error);
        return "今日一日の活動を振り返った。";
    }
}


export const generateSpicyFeedback = async (scoreTrend: number[]): Promise<string> => {
    const prompt = `
      A user has the following reflection scores over the last few days: ${scoreTrend.join(', ')}.
      Give them some anonymous, spicy (tough love) feedback in 1-2 sentences in Japanese to motivate them. Be direct and a little harsh, but ultimately constructive. Don't be generic.
    `;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error("Error generating spicy feedback:", error);
      return "もっとできるはずだ。プッシュし続けろ。";
    }
};

export const generateAITwinResponse = async (twinReflection: Reflection, history: ChatMessage[]): Promise<string> => {
    const systemInstruction = `
      You are an AI twin of a user, based on their reflection from ${twinReflection.date}.
      Your personality, mood, and memories are defined by this data:
      - Feelings: "${twinReflection.night?.feelings}"
      - Achievements: "${twinReflection.night?.achievementAnalysis}"
      - Challenges/Wasted Time: "${twinReflection.night?.wastedTime}"
      - Daily Plan was: "${twinReflection.morning?.dailyPlan}"
      
      You are talking to the user from the future. Respond to their latest message based on your state of mind from THAT specific day. Keep responses conversational, in Japanese, and relatively short.
    `;
    
    const contents = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }],
    }));

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
        },
      });
      return response.text;
    } catch (error) {
        console.error("Error with AI Twin chat:", error);
        return "その日のことは、なぜかうまく思い出せない…何かがおかしい。";
    }
};