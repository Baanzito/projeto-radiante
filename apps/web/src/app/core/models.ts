export type FocusCategory =
  | 'DECISION'
  | 'COMMUNICATION'
  | 'AWARENESS'
  | 'MOVEMENT'
  | 'AIM'
  | 'POSITIONING'
  | 'MENTAL'
  | 'OTHER';

export type FocusPriority = 'PRIMARY' | 'SECONDARY';
export type CycleStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type CycleConclusion = 'IMPROVED' | 'UNCHANGED' | 'REGRESSED' | 'INCONCLUSIVE';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  services: { api: 'up'; database: 'up' | 'down' };
  version: string;
}

export interface ActiveFocus {
  name: string;
  priority: FocusPriority;
  successCriteria: string;
}

export interface Profile {
  id: string;
  displayName: string;
  timezone: string;
  currentRank: string;
  currentRr: number | null;
  peakRank: string | null;
  valorantName: string | null;
  valorantTag: string | null;
  sensitivity: number;
  dpi: number;
  weeklyRankedMin: number;
  weeklyRankedMax: number;
  primaryGoal: string;
  defaultSessionStart: string | null;
  defaultSessionEnd: string | null;
  activeCycle: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    focuses: ActiveFocus[];
  } | null;
}

export type ProfileInput = Omit<Profile, 'id' | 'activeCycle'>;

export interface FocusArea {
  id: string;
  name: string;
  category: FocusCategory;
  observableBehavior: string;
  active: boolean;
}

export interface CycleFocus {
  focusAreaId: string;
  name: string;
  priority: FocusPriority;
  successCriteria: string;
}

export interface TrainingCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  durationDays: 7 | 14 | 30;
  status: CycleStatus;
  conclusion: CycleConclusion | null;
  conclusionNotes: string | null;
  focuses: CycleFocus[];
}

export interface CycleInput {
  name: string;
  startDate: string;
  durationDays: 7 | 14 | 30;
  focuses: Array<{
    focusAreaId: string;
    priority: FocusPriority;
    successCriteria: string;
  }>;
}

export type BlockType =
  | 'RANKED'
  | 'AIM_TRAINING'
  | 'VOD_REVIEW'
  | 'COACHING'
  | 'COMPETITIVE'
  | 'THEORY'
  | 'FREE'
  | 'COMMITMENT'
  | 'OTHER';
export interface RoutineBlock {
  id: string;
  weeklyPlanId: string;
  type: BlockType;
  status: 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  title: string;
  plannedStart: string;
  plannedEnd: string;
  focusAreaId: string | null;
  focusAreaName: string | null;
  notes: string | null;
  sessionId: string | null;
  conflicts: Array<{ blockId: string; title: string }>;
}
export interface WeeklyPlan {
  id: string;
  weekStart: string;
  weekEnd: string;
  status: 'DRAFT' | 'CONFIRMED' | 'CLOSED';
  rankedTargetMin: number;
  rankedTargetMax: number;
  weeklyIntent: string;
  blocks: RoutineBlock[];
}
export interface TrainingSession {
  id: string;
  plannedBlockId: string | null;
  plannedBlockTitle: string | null;
  focusAreaId: string | null;
  focusAreaName: string | null;
  type: BlockType;
  status: 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  startedAt: string;
  endedAt: string | null;
  totalPausedSeconds: number;
  elapsedSeconds: number;
  preEnergy: number | null;
  preFocus: number | null;
}
