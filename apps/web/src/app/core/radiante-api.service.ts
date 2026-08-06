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
  MatchReflection,
  ReflectionInput,
} from './models';

const API_BASE_URL = 'http://127.0.0.1:3000/api/v1';

@Injectable({ providedIn: 'root' })
export class RadianteApiService {
  private readonly http = inject(HttpClient);

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

  listMatches(sessionId?: string) {
    const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}&pageSize=100` : '';
    return this.http.get<MatchPage>(`${API_BASE_URL}/matches${query}`);
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
}
