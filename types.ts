
export interface SideProject {
  id: string;
  name: string;
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
}

export interface UserSettings {
  yearStartMonth: number; // 0-11 for Jan-Dec
  quarterlyGoal: string; // Renamed from longTermGoal: 3-Month Aspiration
  quarterlyGoalDeadline: string; // New: Deadline for the 3-month goal
  threeWeekGoal?: string; // 3-week ideal vision
  threeWeekGoalDeadline?: string; // The specific date the 3-week goal ends
  visionBoardImage?: string; // Base64 string of the generated vision board
  commitmentStartDate: string; // YYYY-MM-DD
  goalDurationDays: number;
  depositAmount: number;
  sideProjects?: SideProject[];
  firstSuccessAchieved?: boolean;
  lastAITwinSessionDate?: string;
  lastMentoringDate?: string; // For controlling pop-up frequency
  isPrototyperRegistered?: boolean; // Hides prototype modal/banner
  hasSeenTour?: boolean; // New: Tracks if the user has been guided to the first morning plan
}

export interface MorningReflectionData {
  dailyPlan: string;
  freeMemo?: string;
}

export interface WastedTimeLog {
  activity: string;
  minutes: number;
}

export interface NightReflectionData {
  feelings: string;
  freeMemo?: string;
  achievementAnalysis: string;
  wastedTime?: string; // Deprecated string format
  wastedTimeLogs?: WastedTimeLog[]; // New structured format
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

export type AppView = 'SETUP' | 'DEPOSIT' | 'DASHBOARD' | 'MORNING_CONVERSATION' | 'NIGHT_REFLECTION' | 'AI_TWIN' | 'SPICY_FEEDBACK' | 'SIDE_PROJECTS' | 'MEMO_PAD' | 'ONLINE_FEATURES' | 'PEER_PROFILE' | 'GOAL_RENEWAL' | 'QUARTERLY_RENEWAL' | 'SETTINGS' | 'JOURNAL_LOG' | 'VISION_BOARD_CREATION';

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