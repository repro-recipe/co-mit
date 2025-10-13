export interface UserSettings {
  yearStartMonth: number; // 0-11 for Jan-Dec
  longTermGoal: string;
  quarterlyGoals: [string, string, string, string];
  commitmentStartDate: string; // YYYY-MM-DD
  commitmentWeeks: number;
  depositAmount: number;
}

export interface MorningReflectionData {
  dailyPlan: string;
}

export interface NightReflectionData {
  feelings: string;
  achievementAnalysis: string;
  wastedTime: string;
  extras: string;
  tomorrowIdeas: string;
}

export interface DailyTask {
  text: string;
  completed: boolean;
}

export interface Reflection {
  date: string; // YYYY-MM-DD
  morning?: MorningReflectionData;
  night?: NightReflectionData;
  dailyTasks?: DailyTask[];
  score?: number;
  analysis?: string;
}

export interface RoadSegment {
  date: string;
  status: 'pristine' | 'cracked' | 'broken' | 'empty';
  score: number;
}

export type AppView = 'SETUP' | 'DEPOSIT' | 'DASHBOARD' | 'MORNING_CONVERSATION' | 'NIGHT_REFLECTION' | 'AI_TWIN' | 'SPICY_FEEDBACK';

export interface AITwin {
  date: string;
  reflection: Reflection;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}