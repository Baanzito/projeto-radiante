import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  CycleConclusion,
  CycleInput,
  FocusArea,
  HealthResponse,
  Profile,
  ProfileInput,
  TrainingCycle,
  BlockType,
  RoutineBlock,
  TrainingSession,
  WeeklyPlan,
  Match,
  MatchInput,
  MatchPage,
  MatchSummary,
  MatchReflection,
  ReflectionInput,
  CoachFeedback,
  CoachSession,
  DashboardSummary,
  FeedbackPriority,
  FeedbackStatus,
  FocusCategory,
  RestoreResult,
  WeeklyReview,
  AiRecommendation,
  AuditEvent,
  IntegrationsStatus,
  CalendarSyncResult,
} from './models';

const API_BASE_URL = '/api/v1';

export interface AuthSession {
  enabled: boolean;
  authenticated: boolean;
  email: string | null;
}

@Injectable({ providedIn: 'root' })
export class RadianteApiService {
  private readonly http = inject(HttpClient);

  authSession() {
    return this.http.get<AuthSession>(`${API_BASE_URL}/auth/session`);
  }

  login(email: string, password: string) {
    return this.http.post<AuthSession>(`${API_BASE_URL}/auth/login`, {
      email,
      password,
    });
  }

  logout() {
    return this.http.post<AuthSession>(`${API_BASE_URL}/auth/logout`, {});
  }

  health() {
    return this.http.get<HealthResponse>(`${API_BASE_URL}/health`);
  }

  getProfile() {
    return this.http.get<Profile>(`${API_BASE_URL}/profile`);
  }

  updateProfile(input: ProfileInput) {
    return this.http.put<Profile>(`${API_BASE_URL}/profile`, input);
  }

  listFocusAreas() {
    return this.http.get<FocusArea[]>(`${API_BASE_URL}/focus-areas?includeInactive=true`);
  }

  createFocusArea(input: Omit<FocusArea, 'id' | 'active'>) {
    return this.http.post<FocusArea>(`${API_BASE_URL}/focus-areas`, input);
  }

  updateFocusArea(id: string, input: Partial<Omit<FocusArea, 'id'>>) {
    return this.http.patch<FocusArea>(`${API_BASE_URL}/focus-areas/${id}`, input);
  }

  listCycles() {
    return this.http.get<TrainingCycle[]>(`${API_BASE_URL}/training-cycles`);
  }

  createCycle(input: CycleInput) {
    return this.http.post<TrainingCycle>(`${API_BASE_URL}/training-cycles`, input);
  }

  updateCycle(id: string, input: CycleInput) {
    return this.http.patch<TrainingCycle>(`${API_BASE_URL}/training-cycles/${id}`, input);
  }

  activateCycle(id: string, replaceActive: boolean) {
    return this.http.post<TrainingCycle>(`${API_BASE_URL}/training-cycles/${id}/activate`, {
      replaceActive,
    });
  }

  completeCycle(id: string, conclusion: CycleConclusion, conclusionNotes: string) {
    return this.http.post<TrainingCycle>(`${API_BASE_URL}/training-cycles/${id}/complete`, {
      conclusion,
      conclusionNotes: conclusionNotes || null,
    });
  }

  reuseCycle(id: string, name: string, startDate: string) {
    return this.http.post<TrainingCycle>(`${API_BASE_URL}/training-cycles/${id}/reuse`, {
      name,
      startDate,
    });
  }
  listWeeklyPlans() {
    return this.http.get<WeeklyPlan[]>(`${API_BASE_URL}/weekly-plans`);
  }
  createWeeklyPlan(input: {
    weekStart: string;
    rankedTargetMin: number;
    rankedTargetMax: number;
    weeklyIntent: string;
  }) {
    return this.http.post<WeeklyPlan>(`${API_BASE_URL}/weekly-plans`, input);
  }
  updateWeeklyPlan(id: string, input: Partial<WeeklyPlan>) {
    return this.http.patch<WeeklyPlan>(`${API_BASE_URL}/weekly-plans/${id}`, input);
  }
  confirmWeeklyPlan(id: string) {
    return this.http.post<WeeklyPlan>(`${API_BASE_URL}/weekly-plans/${id}/confirm`, {});
  }
  closeWeeklyPlan(id: string) {
    return this.http.post<WeeklyPlan>(`${API_BASE_URL}/weekly-plans/${id}/close`, {});
  }
  createBlock(
    planId: string,
    input: {
      type: BlockType;
      title: string;
      plannedStart: string;
      plannedEnd: string;
      focusAreaId: string | null;
      notes: string | null;
    },
  ) {
    return this.http.post<RoutineBlock>(`${API_BASE_URL}/weekly-plans/${planId}/blocks`, input);
  }
  updateBlock(
    id: string,
    input: {
      type: BlockType;
      title: string;
      plannedStart: string;
      plannedEnd: string;
      focusAreaId: string | null;
      notes: string | null;
    },
  ) {
    return this.http.patch<RoutineBlock>(`${API_BASE_URL}/routine-blocks/${id}`, input);
  }
  deleteBlock(id: string) {
    return this.http.delete<void>(`${API_BASE_URL}/routine-blocks/${id}`);
  }
  cancelBlock(id: string) {
    return this.http.post<RoutineBlock>(`${API_BASE_URL}/routine-blocks/${id}/cancel`, {});
  }
  activeSession() {
    return this.http.get<TrainingSession | null>(`${API_BASE_URL}/sessions/active`);
  }
  startSession(input: {
    plannedBlockId?: string;
    type?: BlockType;
    focusAreaId?: string | null;
    preEnergy: number;
    preFocus: number;
  }) {
    return this.http.post<TrainingSession>(`${API_BASE_URL}/sessions`, input);
  }
  pauseSession(id: string) {
    return this.http.post<TrainingSession>(`${API_BASE_URL}/sessions/${id}/pause`, {});
  }
  resumeSession(id: string) {
    return this.http.post<TrainingSession>(`${API_BASE_URL}/sessions/${id}/resume`, {});
  }
  completeSession(
    id: string,
    input: {
      overallConcentration: number;
      focusAdherence: number;
      mainLearning: string;
      nextAdjustment: string;
      mentalState: string;
    },
  ) {
    return this.http.post<TrainingSession>(`${API_BASE_URL}/sessions/${id}/complete`, input);
  }
  cancelSession(id: string) {
    return this.http.post<TrainingSession>(`${API_BASE_URL}/sessions/${id}/cancel`, {});
  }

  listMatches(sessionId?: string, page = 1, pageSize = sessionId ? 100 : 20) {
    const sessionQuery = sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : '';
    return this.http.get<MatchPage>(
      `${API_BASE_URL}/matches?page=${page}&pageSize=${pageSize}${sessionQuery}`,
    );
  }

  getMatchSummary() {
    return this.http.get<MatchSummary>(`${API_BASE_URL}/matches/summary`);
  }

  createMatch(input: MatchInput) {
    return this.http.post<Match>(`${API_BASE_URL}/matches`, input);
  }

  updateMatch(id: string, input: MatchInput) {
    return this.http.patch<Match>(`${API_BASE_URL}/matches/${id}`, input);
  }

  listPendingReflections() {
    return this.http.get<Match[]>(`${API_BASE_URL}/reflections/pending`);
  }

  upsertReflection(matchId: string, input: ReflectionInput) {
    return this.http.put<MatchReflection>(`${API_BASE_URL}/matches/${matchId}/reflection`, input);
  }

  listCoachSessions() {
    return this.http.get<CoachSession[]>(`${API_BASE_URL}/coach-sessions`);
  }

  createCoachSession(input: {
    coachName: string;
    heldAt: string;
    durationMinutes: number;
    summary: string;
  }) {
    return this.http.post<CoachSession>(`${API_BASE_URL}/coach-sessions`, input);
  }

  updateCoachSession(
    id: string,
    input: { coachName: string; heldAt: string; durationMinutes: number; summary: string },
  ) {
    return this.http.patch<CoachSession>(`${API_BASE_URL}/coach-sessions/${id}`, input);
  }

  addCoachFeedback(
    sessionId: string,
    input: {
      category: FocusCategory;
      priority: FeedbackPriority;
      feedbackText: string;
      evidence: string | null;
      suggestedAction: string | null;
      focusAreaId: string | null;
    },
  ) {
    return this.http.post<CoachFeedback>(
      `${API_BASE_URL}/coach-sessions/${sessionId}/feedbacks`,
      input,
    );
  }

  updateCoachFeedback(
    id: string,
    input: Partial<{
      category: FocusCategory;
      priority: FeedbackPriority;
      feedbackText: string;
      evidence: string | null;
      suggestedAction: string | null;
      focusAreaId: string | null;
      status: FeedbackStatus;
    }>,
  ) {
    return this.http.patch<CoachFeedback>(`${API_BASE_URL}/coach-feedbacks/${id}`, input);
  }

  convertFeedbackToFocus(
    id: string,
    input: { focusAreaId?: string; name?: string; observableBehavior?: string },
  ) {
    return this.http.post<CoachFeedback>(
      `${API_BASE_URL}/coach-feedbacks/${id}/convert-to-focus`,
      input,
    );
  }

  getDashboardSummary(weekStart?: string) {
    const query = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : '';
    return this.http.get<DashboardSummary>(`${API_BASE_URL}/dashboard/summary${query}`);
  }

  listWeeklyReviews() {
    return this.http.get<WeeklyReview[]>(`${API_BASE_URL}/weekly-reviews`);
  }

  generateWeeklyReview(weeklyPlanId: string) {
    return this.http.post<WeeklyReview>(`${API_BASE_URL}/weekly-reviews`, { weeklyPlanId });
  }

  updateWeeklyReview(
    id: string,
    input: { selfConclusion: string; repeatedPatterns: string[]; nextWeekProposal: string | null },
  ) {
    return this.http.patch<WeeklyReview>(`${API_BASE_URL}/weekly-reviews/${id}`, input);
  }

  applyWeeklyReview(id: string) {
    return this.http.post<WeeklyReview>(`${API_BASE_URL}/weekly-reviews/${id}/apply`, {});
  }

  downloadJsonBackup() {
    return this.http.get(`${API_BASE_URL}/exports/json`, { responseType: 'blob' });
  }

  downloadCsv(dataset: string) {
    return this.http.get(`${API_BASE_URL}/exports/csv/${dataset}`, { responseType: 'blob' });
  }

  restoreBackup(backup: Record<string, unknown>) {
    return this.http.post<RestoreResult>(`${API_BASE_URL}/exports/restore`, { backup });
  }

  getIntegrationsStatus() {
    return this.http.get<IntegrationsStatus>(`${API_BASE_URL}/integrations/status`);
  }

  listAiRecommendations() {
    return this.http.get<AiRecommendation[]>(`${API_BASE_URL}/ai/recommendations`);
  }

  generateSessionAiSummary(sessionId: string) {
    return this.http.post<AiRecommendation>(`${API_BASE_URL}/ai/sessions/${sessionId}/summary`, {});
  }

  generateWeeklyAiSummary(weeklyPlanId: string) {
    return this.http.post<AiRecommendation>(
      `${API_BASE_URL}/ai/weekly-plans/${weeklyPlanId}/summary`,
      {},
    );
  }

  generateWeeklyAiProposal(weeklyPlanId: string) {
    return this.http.post<AiRecommendation>(
      `${API_BASE_URL}/ai/weekly-plans/${weeklyPlanId}/proposal`,
      {},
    );
  }

  confirmAiRecommendation(id: string) {
    return this.http.post<AiRecommendation>(`${API_BASE_URL}/ai/recommendations/${id}/confirm`, {
      reason: 'Confirmado na interface do Projeto Radiante.',
    });
  }

  rejectAiRecommendation(id: string) {
    return this.http.post<AiRecommendation>(`${API_BASE_URL}/ai/recommendations/${id}/reject`, {});
  }

  listAuditEvents() {
    return this.http.get<AuditEvent[]>(`${API_BASE_URL}/audit-events?limit=50`);
  }

  googleCalendarAuthorizationUrl() {
    return this.http.get<{ authorizationUrl: string; expiresInSeconds: number }>(
      `${API_BASE_URL}/integrations/google-calendar/auth-url`,
    );
  }

  disconnectGoogleCalendar() {
    return this.http.delete<{ disconnected: boolean }>(
      `${API_BASE_URL}/integrations/google-calendar`,
    );
  }

  syncGoogleCalendar(weeklyPlanId: string) {
    return this.http.post<CalendarSyncResult>(
      `${API_BASE_URL}/integrations/google-calendar/sync/${weeklyPlanId}`,
      {},
    );
  }
}
