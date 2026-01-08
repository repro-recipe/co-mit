
export interface SideProject {
  id: string;
  name: string;
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
}

export interface UserSettings {
  yearStartMonth: number; // 0-11 for Jan-Dec
  longTermGoal: string;
  quarterlyGoals?: [string, string, string, string]; // Deprecated but kept for type safety if needed temporarily
  threeWeekGoal?: string; // New: 3-week ideal vision
  threeWeekGoalDeadline?: string; // New: The specific date the 3-week goal ends
  visionBoardImage?: string; // New: Base64 string of the generated vision board
  commitmentStartDate: string; // YYYY-MM-DD
  goalDurationDays: number;
  depositAmount: number;
  sideProjects?: SideProject[];
  firstSuccessAchieved?: boolean;
  lastAITwinSessionDate?: string;
  lastMentoringDate?: string; // For controlling pop-up frequency
  isPrototyperRegistered?: boolean; // New: Hides prototype modal/banner
}

export interface MorningReflectionData {
  dailyPlan: string;
  freeMemo?: string;
}

export interface NightReflectionData {
  feelings: string;
  freeMemo?: string;
  achievementAnalysis: string;
  wastedTime: string;
  wastedTimeMinutes?: number;
  extras: string[];
  tomorrowIdeas: string;
}

export interface DailyTask {
  text: string;
  completed: boolean;
  type: 'main' | 'sub';
  priority: 'high' | 'medium' | 'low';
}

export interface Reflection {
  date: string; // YYYY-MM-DD
  morning?: MorningReflectionData;
  night?: NightReflectionData;
  dailyTasks?: DailyTask[];
  score?: number;
  pendingScore?: number; // Score from morning, confirmed at night
  analysis?: string;
}

export interface RoadSegment {
  date: string;
  status: 'pristine' | 'cracked' | 'broken' | 'empty';
  score: number;
}

export type AppView = 'SETUP' | 'DEPOSIT' | 'DASHBOARD' | 'MORNING_CONVERSATION' | 'NIGHT_REFLECTION' | 'AI_TWIN' | 'SPICY_FEEDBACK' | 'SIDE_PROJECTS' | 'MEMO_PAD' | 'ONLINE_FEATURES' | 'PEER_PROFILE' | 'GOAL_RENEWAL' | 'SETTINGS' | 'JOURNAL_LOG' | 'VISION_BOARD_CREATION';

export interface AITwin {
  date: string;
  reflection: Reflection;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export interface Memo {
  id: string;
  text: string;
  createdAt: string;
}
