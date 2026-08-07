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

export type MatchQueue =
  | 'COMPETITIVE'
  | 'UNRATED'
  | 'PREMIER'
  | 'SWIFTPLAY'
  | 'SPIKE_RUSH'
  | 'DEATHMATCH'
  | 'TEAM_DEATHMATCH'
  | 'CUSTOM'
  | 'OTHER';
export type MatchResult = 'WIN' | 'LOSS' | 'DRAW' | 'REMAKE' | 'UNKNOWN';

export interface MatchReflection {
  id: string;
  matchId: string;
  decisionClarity: number;
  callResponse: number;
  patternReading: number;
  freezesCount: number;
  taskConflictsCount: number;
  delayedCallsCount: number;
  communicatedIntentionsCount: number;
  movementErrorsCount: number;
  ecoPositioningErrorsCount: number;
  unnecessaryCrosshairMovesCount: number;
  patternsRecognizedCount: number;
  adaptationsAppliedCount: number;
  goodDecision: string | null;
  nextCorrection: string | null;
}

export interface Match {
  id: string;
  sessionId: string | null;
  session: {
    id: string;
    type: BlockType;
    status: TrainingSession['status'];
    startedAt: string;
    endedAt: string | null;
    plannedBlockTitle: string | null;
  } | null;
  startedAt: string;
  queueType: MatchQueue;
  agentName: string;
  mapName: string;
  result: MatchResult;
  allyScore: number;
  enemyScore: number;
  rrChange: number | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  acs: number | null;
  headshotPct: number | null;
  firstKills: number | null;
  firstDeaths: number | null;
  notes: string | null;
  reflection: MatchReflection | null;
  reflectionPending: boolean;
}

export interface MatchPage {
  items: Match[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MatchSummary {
  totalMatches: number;
  linkedSessions: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number | null;
  totalRr: number;
  averageRr: number | null;
  averageKills: number | null;
  averageDeaths: number | null;
  averageAssists: number | null;
  kdRatio: number | null;
  averageAcs: number | null;
  averageHeadshotPct: number | null;
  averageFirstKills: number | null;
  averageFirstDeaths: number | null;
  reflectionCount: number;
  averageDecisionClarity: number | null;
  averageCallResponse: number | null;
  averagePatternReading: number | null;
}

export interface MatchInput {
  sessionId?: string | null;
  startedAt: string;
  queueType: MatchQueue;
  agentName: string;
  mapName: string;
  result: MatchResult;
  allyScore: number;
  enemyScore: number;
  rrChange?: number | null;
  kills?: number | null;
  deaths?: number | null;
  assists?: number | null;
  acs?: number | null;
  headshotPct?: number | null;
  firstKills?: number | null;
  firstDeaths?: number | null;
  notes?: string | null;
}

export type ReflectionInput = Omit<MatchReflection, 'id' | 'matchId'>;

export type FeedbackPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FeedbackStatus = 'OPEN' | 'IN_PROGRESS' | 'VALIDATED' | 'DISMISSED';

export interface CoachFeedback {
  id: string;
  coachSessionId: string;
  category: FocusCategory;
  priority: FeedbackPriority;
  feedbackText: string;
  evidence: string | null;
  suggestedAction: string | null;
  status: FeedbackStatus;
  focusAreaId: string | null;
  focusArea: { id: string; name: string } | null;
}

export interface CoachSession {
  id: string;
  coachName: string;
  heldAt: string;
  durationMinutes: number;
  summary: string;
  feedbacks: CoachFeedback[];
}

export interface DashboardSummary {
  week: {
    planId: string | null;
    weekStart: string;
    weekEnd: string;
    status: WeeklyPlan['status'] | null;
    weeklyIntent: string | null;
  };
  adherence: {
    plannedMinutes: number;
    completedMinutes: number;
    timePercent: number | null;
    plannedBlocks: number;
    completedBlocks: number;
    consciousRankedCount: number;
    rankedTargetMin: number;
    rankedTargetMax: number;
  };
  results: { matchCount: number; wins: number; losses: number; rrDelta: number };
  process: {
    sampleSize: number;
    decisionClarity: number | null;
    callResponse: number | null;
    patternReading: number | null;
    patternsRecognized: number;
    adaptationsApplied: number;
    repeatedPatterns: Array<{ label: string; count: number }>;
  };
  coaching: {
    openFeedbackCount: number;
    highPriorityCount: number;
    latestPriorityFeedback: CoachFeedback | null;
  };
  cycle: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    focuses: Array<{ name: string; priority: FocusPriority; successCriteria: string }>;
  } | null;
  review: { id: string; status: ReviewStatus; selfConclusion: string | null } | null;
}

export type ReviewStatus = 'GENERATED' | 'REVIEWED' | 'APPLIED';
export interface WeeklyReview {
  id: string;
  weeklyPlanId: string;
  plannedMinutes: number;
  completedMinutes: number;
  consciousRankedCount: number;
  wins: number;
  losses: number;
  rrDelta: number;
  selfConclusion: string | null;
  repeatedPatterns: string[];
  nextWeekProposal: string | null;
  status: ReviewStatus;
  weeklyPlan: {
    weekStart: string;
    weekEnd: string;
    status: WeeklyPlan['status'];
    weeklyIntent: string;
    rankedTargetMin: number;
    rankedTargetMax: number;
  };
}

export interface RestoreResult {
  restored: boolean;
  counts: Record<string, number>;
}

export interface AiCoachOutput {
  title: string;
  summary: string;
  strengths: string[];
  patterns: string[];
  nextActions: string[];
  evidence: Array<{ claim: string; sourceType: string; sourceId: string | null }>;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  initialHypothesis: boolean;
  proposal: {
    weeklyIntent: string | null;
    rankedTargetMin: number | null;
    rankedTargetMax: number | null;
  } | null;
}

export interface AiRecommendation {
  id: string;
  type: 'SESSION_SUMMARY' | 'WEEKLY_SUMMARY' | 'WEEKLY_PLAN_PROPOSAL';
  status: 'GENERATED' | 'CONFIRMED' | 'APPLIED' | 'REJECTED' | 'FAILED';
  sourceType: string;
  sourceId: string | null;
  model: string;
  promptVersion: string;
  structuredOutput: AiCoachOutput;
  proposedMutation: AiCoachOutput['proposal'];
  failureReason: string | null;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actor: 'USER' | 'AI' | 'MCP' | 'SYSTEM';
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  createdAt: string;
}

export interface IntegrationsStatus {
  openai: {
    configured: boolean;
    model: string;
    provider: 'openai';
    storeResponses: boolean;
    writesRequireConfirmation: boolean;
  };
  googleCalendar: {
    configured: boolean;
    connected: boolean;
    status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
    accountLabel: string | null;
    scopes: string[];
    lastSyncedAt: string | null;
    direction: 'OUTBOUND_ONLY';
  };
  mcp: {
    enabled: boolean;
    mode: 'READ_ONLY';
    endpoint: string;
    tokenConfigured: boolean;
    tools: string[];
  };
}

export interface CalendarSyncResult {
  created: number;
  updated: number;
  cancelled: number;
  unchanged: number;
  errors: string[];
}
