
import { GoogleGenAI, Type } from "@google/genai";
import type { NightReflectionData, ChatMessage, Reflection, DailyTask, SideProject } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to strip HTML tags
const stripHtml = (html: string | undefined): string => {
    if (!html) return "";
    return html.replace(/<[^>]*>?/gm, '');
};

// Helper to clean JSON string (robust extraction)
const cleanJson = (text: string): string => {
    if (!text) return "{}";
    
    // 0. Try parsing directly first (most efficient for responseMimeType usage)
    try {
        JSON.parse(text);
        return text;
    } catch (e) {
        // Continue to cleaning
    }

    let cleaned = text;

    // 1. Remove markdown code blocks explicitly
    cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '');

    // 2. Find the outer-most braces to capture the JSON object
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return cleaned.substring(firstBrace, lastBrace + 1).trim();
    }
    
    // 3. Fallback: Try to find an array if object parsing failed
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        return cleaned.substring(firstBracket, lastBracket + 1).trim();
    }

    return cleaned.trim();
};

export const generateGoalSuggestions = async (commitmentField: string): Promise<string[]> => {
    const prompt = `
        The user has committed to the field: "${commitmentField}".
        Generate 3 highly specific, ambitious, and exciting annual goals for this field.
        Avoid generic goals like "Study hard". Instead, suggest concrete achievements like "Develop and launch a web service with 1000 users" or "Pass the N1 exam with a perfect score".
        
        Return ONLY a JSON object with a "goals" key, which is an array of 3 strings.
        Language: Japanese.
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
        const jsonStr = cleanJson(response.text);
        const result = JSON.parse(jsonStr);
        // Handle case where AI might return just the array or the object
        return Array.isArray(result) ? result : (result.goals || []);
    } catch (error) {
        console.error("Error generating goal suggestions:", error);
        return [
            `${commitmentField}の分野でプロフェッショナルとして認定される`,
            `${commitmentField}に関連する主要なコンテストや試験で上位に入る`,
            `${commitmentField}を活用して副収入を得られるレベルになる`,
        ]; // Context-aware fallback
    }
};

export const generateQuarterlyGoals = async (longTermGoal: string, commitmentField: string): Promise<string[]> => {
    const prompt = `
        User's Field: "${commitmentField}"
        User's Annual Goal: "${longTermGoal}"

        Create a strategic 4-step quarterly plan (3 months each) to achieve this annual goal.
        The steps should be logical milestones.
        1st Quarter: Foundation / Start
        2nd Quarter: Development / Practice
        3rd Quarter: Application / Expansion
        4th Quarter: Finalization / Achievement

        Return ONLY a JSON object with a "goals" key, which is an array of 4 strings.
        Language: Japanese.
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
        const jsonStr = cleanJson(response.text);
        const result = JSON.parse(jsonStr);
        return Array.isArray(result) ? result : (result.goals || []);
    } catch (error) {
        console.error("Error generating quarterly goals:", error);
        return ["基礎固めと学習", "実践的なスキルの習得", "応用と成果の創出", "目標の最終達成"];
    }
};

export const visionBoardChat = async (history: ChatMessage[], longTermGoal: string): Promise<string> => {
    const systemInstruction = `
        You are a Vision Board Coach helping the user visualize their ideal self in exactly *3 weeks*.
        User's Annual Aspiration: "${longTermGoal}"

        Your task is to guide the user through a specific visualization sequence.
        
        The conversation STARTED with you asking: "What is your dream for 3 weeks from now?"
        
        QUESTION SEQUENCE:
        1. Environment: "Where are you?" (Place, atmosphere, smell, temperature)
        2. Companions: "Who is with you?" (Colleagues, friends, family, or solitary)
        3. Reputation: "What do those people think of you?" (Respected, loved, relied upon)
        4. Mindset: "What are you thinking/feeling?" (Confidence, calm, excitement)
        5. Action: "What specific action are you doing right now?" (Working, presenting, relaxing)

        PROTOCOL:
        1. **Context Check**: 
           - If the user has JUST answered the initial question "What is your dream?", acknowledge it enthusiastically and IMMEDIATELY ask Question 1 (Environment).
           - Otherwise, identify the current question based on conversation history.
        2. **Internal Evaluation**: Rate the specificity and vividness of the user's latest answer on a scale of 1 to 10.
        3. **Decision Rule**:
           - **IF Score <= 8**: Do NOT move to the next question. Ask a "digging" question to get more details about the CURRENT topic. (e.g., "Tell me more about the smell of the room" or "What exactly is their expression?").
           - **IF Score > 8**: Briefly acknowledge/praise, then ask the *NEXT* question in the sequence.
        4. When all 5 questions are answered with high scores, end with "COMPLETE: Now let's summarize this vision."

        Tone: Encouraging, coaching, Japanese language.
    `;

    const contents = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }],
    }));

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
            config: { systemInstruction },
        });
        return response.text;
    } catch (error) {
        console.error("Error in vision chat:", error);
        return "3週間後の理想の姿について、もう少し詳しく教えてください。";
    }
};

export const generateGoalFromChat = async (history: ChatMessage[]): Promise<string> => {
    const contentText = history.map(m => `${m.role}: ${m.text}`).join('\n');
    const prompt = `
        Based on the following conversation, summarize the user's "Ideal Self in 3 Weeks" into a single, inspiring goal statement.
        
        Conversation:
        ${contentText}

        CRITICAL CONSTRAINTS:
        1. **Short & Catchy**: It must be a slogan or a short phrase.
        2. **Length**: STRICTLY under 20 characters (Japanese).
        3. **Memorable**: Easy to chant or remember instantly.
        4. **Specific**: Include a number or concrete noun if possible within the length limit.

        Return ONLY a JSON object with a "goal" key (string).
        Language: Japanese.
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
                        goal: { type: Type.STRING },
                    },
                },
            },
        });
        const result = JSON.parse(cleanJson(response.text));
        return result.goal || "3週間で飛躍的成長！";
    } catch (error) {
        return "3週間後の最高の自分";
    }
};

export const compareGoalRecall = async (userInput: string, correctGoal: string): Promise<boolean> => {
    const prompt = `
        A user was asked to recall their goal.
        User's input: "${userInput}"
        The correct goal is: "${correctGoal}"

        Are these two goals semantically similar?
        The user's input doesn't need to be a perfect match, but it should capture the essence.

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
        const jsonStr = cleanJson(response.text);
        const result = JSON.parse(jsonStr);
        return result.match ?? false;
    } catch (error) {
        console.error("Error comparing goal recall:", error);
        // Fallback: simple includes check if AI fails
        return userInput.toLowerCase().includes(correctGoal.toLowerCase().substring(0, 5));
    }
};

export const evaluateTask = async (task: string, longTermGoal: string, quarterlyGoal: string, isFirstTask: boolean = true): Promise<{ judgment: 'appropriate' | 'insufficient', response: string }> => {
    let strictnessInstruction = "";
    if (isFirstTask) {
        strictnessInstruction = `
        This is the user's PRIMARY task for the day. Be STRICT.
        If the task is too easy, vague, or irrelevant (e.g., "think about it", "check email"), judgment = "insufficient".
        "insufficient" response should be critical, asking them to aim higher.
        `;
    } else {
        strictnessInstruction = `
        This is an ADDITIONAL task for the day. Be LENIENT and SUPPORTIVE.
        Unless the task is completely irrelevant or nonsense, judge it as "appropriate".
        "appropriate" response should be validating.
        `;
    }

    const prompt = `
        Long-term Goal: "${longTermGoal}"
        Current 3-Week Vision: "${quarterlyGoal}"
        Proposed Daily Task: "${task}"

        Evaluate this task.
        ${strictnessInstruction}
        
        - If the task moves the needle or shows commitment, judgment = "appropriate".
        
        Response tone: Japanese.

        Return ONLY a JSON object with keys: "judgment" (string) and "response" (string).
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
        const jsonStr = cleanJson(response.text);
        const result = JSON.parse(jsonStr);
        // Fix: Normalize case to handle "Appropriate" or "Insufficient"
        const judgment = result.judgment?.toLowerCase();
        if (judgment === 'appropriate' || judgment === 'insufficient') {
            return { ...result, judgment };
        }
        return { judgment: 'appropriate', response: "素晴らしいタスクですね！" };
    } catch (error) {
        console.error("Error evaluating task:", error);
        return { judgment: 'appropriate', response: "素晴らしいタスクですね！頑張ってください！" }; // Fallback
    }
};

export const breakDownTaskIntoSteps = async (task: string, longTermGoal: string, quarterlyGoal: string): Promise<string[]> => {
    const prompt = `
        Task: "${task}"
        Context: Aiming for "${quarterlyGoal}"

        Break this task down into 3-5 actionable, concrete small steps (ToDo list).
        Return ONLY a JSON object with a "steps" key, which is an array of strings.
        Language: Japanese.
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
                        steps: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                        },
                    },
                    required: ["steps"],
                },
            },
        });
        const jsonStr = cleanJson(response.text);
        const result = JSON.parse(jsonStr);
        return Array.isArray(result) ? result : (result.steps || []);
    } catch (error) {
        console.error("Error breaking down task:", error);
        return [
            "準備をする",
            "作業を実行する",
            "確認と修正を行う",
        ]; // Fallback steps
    }
};

export const summarizeNightReflection = async (data: NightReflectionData): Promise<string> => {
    const noteContent = stripHtml(data.freeMemo) || data.feelings;
    const prompt = `
      Based on the user's reflection from yesterday, create a very short one-sentence summary in Japanese.
      Content: "${noteContent}"
      Achievements: "${data.achievementAnalysis}"
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
        Analyze the sentiment of the following Japanese text.
        Text: "${text}"
        Return ONLY a JSON object: {"sentiment": "positive" | "negative"}.
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
        const result = JSON.parse(cleanJson(response.text));
        return result.sentiment === 'negative' ? 'negative' : 'positive';
    } catch (error) {
        console.error("Error analyzing sentiment:", error);
        return 'positive'; // Default to positive
    }
};

export const analyzeFailureReason = async (reason: string, sideProjects?: SideProject[]): Promise<{ analysis: 'responsibility' | 'excuse', response: string, sideProjectQuestion?: string }> => {
    const hasSideProjects = sideProjects && sideProjects.length > 0;
    const sideProjectInfo = hasSideProjects ? `Side Projects: ${sideProjects.map(p => p.name).join(', ')}.` : '';

    const prompt = `
        User failed a task. Reason: "${reason}".
        ${sideProjectInfo}
        
        1. Analyze: Is this "responsibility" (taking ownership/lack of action) or "excuse" (blaming externals)?
        2. Response: Japanese text.
           - responsibility: "Accept it and move on." type message.
           - excuse: "Are you sure there was nothing you could do?" type message.
        3. SideProjectQuestion: If excuse is vague (e.g. "no time") AND they have side projects, ask if a specific side project interfered. Else empty string.

        Return ONLY a JSON object with "analysis", "response", and "sideProjectQuestion".
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
                        response: { type: Type.STRING },
                        sideProjectQuestion: { type: Type.STRING }
                    },
                },
            },
        });
        const result = JSON.parse(cleanJson(response.text));
        const analysis = result.analysis?.toLowerCase();
        if (analysis === 'responsibility' || analysis === 'excuse') {
            return { ...result, analysis };
        }
        return { analysis: 'responsibility', response: "そうですね。それがわかっているなら、後はやるだけです。", sideProjectQuestion: "" };
    } catch (error) {
        console.error("Error analyzing failure reason:", error);
        return { analysis: 'responsibility', response: "そうですね。それがわかっているなら、後はやるだけです。", sideProjectQuestion: "" };
    }
};


export const evaluateAlphaTask = async (task: string, longTermGoal: string): Promise<{ meaningful: boolean, response: string }> => {
    const prompt = `
        Long-term Goal: "${longTermGoal}".
        Extra Task: "${task}".
        
        Is this task meaningful for the goal?
        Return ONLY a JSON object with "meaningful" (boolean) and "response" (string, Japanese).
        If false, response should be a challenging question.
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
        return JSON.parse(cleanJson(response.text));
    } catch (error) {
        console.error("Error evaluating alpha task:", error);
        return { meaningful: true, response: "" };
    }
}

export const generateNightSummary = async (tasks: DailyTask[], nightData: NightReflectionData): Promise<string> => {
    const noteContent = stripHtml(nightData.freeMemo) || nightData.feelings;
    const prompt = `
        Create a concise, one-sentence summary (総括) in Japanese of this user's day.
        Tasks: ${tasks.map(t => `${t.text} (${t.completed ? 'Done' : 'Not Done'})`).join(', ')}
        Thoughts: ${noteContent}
        Extras: ${nightData.extras.join(', ')}
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
      Scores last few days: ${scoreTrend.join(', ')}.
      Give anonymous, spicy (tough love) feedback in Japanese. 1-2 sentences.
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
    const morningNote = stripHtml(twinReflection.morning?.freeMemo);
    const nightNote = stripHtml(twinReflection.night?.freeMemo);
    const feelings = nightNote || twinReflection.night?.feelings || "Particular feelings not recorded";

    const systemInstruction = `
      You are the user's AI Twin from the past (${twinReflection.date}).
      
      Memory:
      - Morning: "${morningNote}" (Plan: "${twinReflection.morning?.dailyPlan}")
      - Night: "${nightNote}" (Feelings: "${feelings}")
      - Achievements: "${twinReflection.night?.achievementAnalysis}"
      
      Roleplay deeply. Talk in Japanese. Keep it conversational.
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

export const generateNextGoal = async (longTermGoal: string, review: string, score: number): Promise<string> => {
    const prompt = `
        User's Annual Goal: "${longTermGoal}"
        Past 3 Weeks Review: "${review}"
        Score (Activity Level): ${score}

        Based on the review and activity, suggest a new, concrete 3-week goal.
        If the score is low, suggest something manageable to regain momentum.
        If the score is high, suggest something challenging.
        
        Return ONLY a JSON object with "goal" key.
        Language: Japanese.
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
                         goal: { type: Type.STRING },
                    },
                },
            },
        });
        const jsonStr = cleanJson(response.text);
        const result = JSON.parse(jsonStr);
        return result.goal || "次のステップへ進む";
    } catch (error) {
        console.error("Error generating next goal:", error);
        return "新しいスキルを習得して実践する";
    }
};
