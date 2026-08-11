import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import type { Observable } from 'rxjs';
import {
  CycleConclusion,
  CycleInput,
  FocusArea,
  FocusCategory,
  Profile,
  ProfileInput,
  TrainingCycle,
  BlockType,
  RoutineBlock,
  TrainingSession,
  WeeklyPlan,
  Match,
  MatchInput,
  MatchQueue,
  MatchReflection,
  MatchResult,
  MatchSummary,
  ReflectionInput,
  CoachFeedback,
  CoachSession,
  DashboardSummary,
  FeedbackPriority,
  FeedbackStatus,
  WeeklyReview,
  AiRecommendation,
  AuditEvent,
  IntegrationsStatus,
  CalendarSyncResult,
} from './core/models';
import { RadianteApiService } from './core/radiante-api.service';

type View =
  | 'dashboard'
  | 'profile'
  | 'focuses'
  | 'cycles'
  | 'week'
  | 'session'
  | 'matches'
  | 'coach'
  | 'evolution'
  | 'assistant'
  | 'data';

interface FocusDraft {
  id: string | null;
  name: string;
  category: FocusCategory;
  observableBehavior: string;
}

interface CycleDraft {
  id: string | null;
  name: string;
  startDate: string;
  durationDays: 7 | 14 | 30;
  primaryId: string;
  primaryCriteria: string;
  secondaryOneId: string;
  secondaryOneCriteria: string;
  secondaryTwoId: string;
  secondaryTwoCriteria: string;
}

interface MatchDraft {
  id: string | null;
  sessionId: string | null;
  date: string;
  time: string;
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
  notes: string;
}

interface CoachSessionDraft {
  id: string | null;
  coachName: string;
  date: string;
  time: string;
  durationMinutes: number;
  summary: string;
}

interface FeedbackDraft {
  id: string | null;
  sessionId: string;
  category: FocusCategory;
  priority: FeedbackPriority;
  feedbackText: string;
  evidence: string;
  suggestedAction: string;
  focusAreaId: string;
}

const emptyFocus = (): FocusDraft => ({
  id: null,
  name: '',
  category: 'DECISION',
  observableBehavior: '',
});

const today = () => new Date().toISOString().slice(0, 10);

const emptyCycle = (): CycleDraft => ({
  id: null,
  name: '',
  startDate: today(),
  durationDays: 14,
  primaryId: '',
  primaryCriteria: '',
  secondaryOneId: '',
  secondaryOneCriteria: '',
  secondaryTwoId: '',
  secondaryTwoCriteria: '',
});

const emptyMatch = (sessionId: string | null = null): MatchDraft => {
  const now = new Date();
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return {
    id: null,
    sessionId,
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    queueType: 'COMPETITIVE',
    agentName: '',
    mapName: '',
    result: 'UNKNOWN',
    allyScore: 0,
    enemyScore: 0,
    rrChange: null,
    kills: null,
    deaths: null,
    assists: null,
    acs: null,
    headshotPct: null,
    firstKills: null,
    firstDeaths: null,
    notes: '',
  };
};

const emptyReflection = (): ReflectionInput => ({
  decisionClarity: 3,
  callResponse: 3,
  patternReading: 3,
  freezesCount: 0,
  taskConflictsCount: 0,
  delayedCallsCount: 0,
  communicatedIntentionsCount: 0,
  movementErrorsCount: 0,
  ecoPositioningErrorsCount: 0,
  unnecessaryCrosshairMovesCount: 0,
  patternsRecognizedCount: 0,
  adaptationsAppliedCount: 0,
  goodDecision: null,
  nextCorrection: null,
});

const emptyCoachSession = (): CoachSessionDraft => ({
  id: null,
  coachName: 'Glym',
  date: today(),
  time: '11:00',
  durationMinutes: 60,
  summary: '',
});

const emptyFeedback = (sessionId = ''): FeedbackDraft => ({
  id: null,
  sessionId,
  category: 'DECISION',
  priority: 'HIGH',
  feedbackText: '',
  evidence: '',
  suggestedAction: '',
  focusAreaId: '',
});

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly api = inject(RadianteApiService);

  protected readonly authChecking = signal(true);
  protected readonly authEnabled = signal(false);
  protected readonly authenticated = signal(false);
  protected readonly authenticatedEmail = signal<string | null>(null);
  protected readonly loginPending = signal(false);
  protected readonly loginError = signal<string | null>(null);
  protected readonly view = signal<View>('dashboard');
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly healthVersion = signal('0.7.0');
  protected readonly profile = signal<Profile | null>(null);
  protected readonly focusAreas = signal<FocusArea[]>([]);
  protected readonly cycles = signal<TrainingCycle[]>([]);
  protected readonly plans = signal<WeeklyPlan[]>([]);
  protected readonly activeSession = signal<TrainingSession | null>(null);
  protected readonly sessionMatches = signal<Match[]>([]);
  protected readonly historyMatches = signal<Match[]>([]);
  protected readonly historyTotal = signal(0);
  protected readonly historyPage = signal(1);
  protected readonly matchSummary = signal<MatchSummary | null>(null);
  protected readonly pendingMatches = signal<Match[]>([]);
  protected readonly coachSessions = signal<CoachSession[]>([]);
  protected readonly dashboardSummary = signal<DashboardSummary | null>(null);
  protected readonly weeklyReviews = signal<WeeklyReview[]>([]);
  protected readonly aiRecommendations = signal<AiRecommendation[]>([]);
  protected readonly auditEvents = signal<AuditEvent[]>([]);
  protected readonly integrations = signal<IntegrationsStatus | null>(null);
  protected readonly calendarSyncResult = signal<CalendarSyncResult | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly replacementCycle = signal<TrainingCycle | null>(null);
  protected readonly completingCycle = signal<TrainingCycle | null>(null);
  protected readonly reusingCycle = signal<TrainingCycle | null>(null);
  protected readonly editingPlan = signal(false);
  protected readonly editingMatch = signal(false);
  protected readonly reflectingMatch = signal<Match | null>(null);
  protected readonly addingFeedback = signal<CoachSession | null>(null);
  protected readonly convertingFeedback = signal<CoachFeedback | null>(null);
  protected showOptionalMatchStats = false;
  protected showDetailedReflection = false;

  protected profileDraft: ProfileInput | null = null;
  protected focusDraft = emptyFocus();
  protected cycleDraft = emptyCycle();
  protected conclusion: CycleConclusion = 'IMPROVED';
  protected conclusionNotes = '';
  protected reuseName = '';
  protected reuseStartDate = today();
  protected planDraft = {
    weekStart: this.monday(),
    rankedTargetMin: 10,
    rankedTargetMax: 14,
    weeklyIntent: '',
  };
  protected blockDraft: {
    id: string | null;
    type: BlockType;
    title: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    focusAreaId: string;
    notes: string;
  } = {
    id: null,
    type: 'RANKED',
    title: 'Ranked consciente',
    startDate: today(),
    startTime: '20:15',
    endDate: today(),
    endTime: '22:15',
    focusAreaId: '',
    notes: '',
  };
  protected adHocType: BlockType = 'RANKED';
  protected preEnergy = 3;
  protected preFocus = 3;
  protected completion = {
    overallConcentration: 3,
    focusAdherence: 3,
    mainLearning: '',
    nextAdjustment: '',
    mentalState: '',
  };
  protected completingSession = false;
  protected matchDraft = emptyMatch();
  protected reflectionDraft = emptyReflection();
  protected coachSessionDraft = emptyCoachSession();
  protected feedbackDraft = emptyFeedback();
  protected convertFocusDraft = { name: '', observableBehavior: '', existingFocusAreaId: '' };
  protected reviewDraft = {
    id: '',
    selfConclusion: '',
    repeatedPatterns: '',
    nextWeekProposal: '',
  };
  protected csvDataset = 'matches';
  protected restoreConfirmed = false;
  protected loginEmail = '';
  protected loginPassword = '';

  protected readonly categories: Array<{ value: FocusCategory; label: string }> = [
    { value: 'DECISION', label: 'Decisão' },
    { value: 'COMMUNICATION', label: 'Comunicação' },
    { value: 'AWARENESS', label: 'Atenção e leitura' },
    { value: 'MOVEMENT', label: 'Movimentação' },
    { value: 'AIM', label: 'Mira' },
    { value: 'POSITIONING', label: 'Posicionamento' },
    { value: 'MENTAL', label: 'Mental' },
    { value: 'OTHER', label: 'Outro' },
  ];

  constructor() {
    this.initializeSession();
  }

  protected login(): void {
    if (!this.loginEmail || !this.loginPassword) return;
    this.loginPending.set(true);
    this.loginError.set(null);
    this.api.login(this.loginEmail, this.loginPassword).subscribe({
      next: (session) => {
        this.loginPending.set(false);
        this.authEnabled.set(session.enabled);
        this.authenticated.set(session.authenticated);
        this.authenticatedEmail.set(session.email);
        this.loginPassword = '';
        this.loadWorkspace();
      },
      error: (error: HttpErrorResponse) => {
        this.loginPending.set(false);
        this.loginError.set(
          error.error?.detail ?? error.error?.message ?? 'Não foi possível entrar.',
        );
      },
    });
  }

  protected logout(): void {
    this.api.logout().subscribe({
      next: () => this.returnToLogin(),
      error: () => this.returnToLogin(),
    });
  }

  protected setView(view: View): void {
    this.view.set(view);
    this.clearMessages();
  }

  protected loadWorkspace(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      health: this.api.health(),
      profile: this.api.getProfile(),
      focusAreas: this.api.listFocusAreas(),
      cycles: this.api.listCycles(),
      plans: this.api.listWeeklyPlans(),
      session: this.api.activeSession(),
      pendingMatches: this.api.listPendingReflections(),
      matchHistory: this.api.listMatches(),
      matchSummary: this.api.getMatchSummary(),
      coachSessions: this.api.listCoachSessions(),
      dashboardSummary: this.api.getDashboardSummary(),
      weeklyReviews: this.api.listWeeklyReviews(),
      aiRecommendations: this.api.listAiRecommendations(),
      auditEvents: this.api.listAuditEvents(),
      integrations: this.api.getIntegrationsStatus(),
    }).subscribe({
      next: ({
        health,
        profile,
        focusAreas,
        cycles,
        plans,
        session,
        pendingMatches,
        matchHistory,
        matchSummary,
        coachSessions,
        dashboardSummary,
        weeklyReviews,
        aiRecommendations,
        auditEvents,
        integrations,
      }) => {
        this.healthVersion.set(health.version);
        this.profile.set(profile);
        this.profileDraft = this.toProfileInput(profile);
        this.focusAreas.set(focusAreas);
        this.cycles.set(cycles);
        this.plans.set(plans);
        this.activeSession.set(session);
        this.pendingMatches.set(pendingMatches);
        this.historyMatches.set(matchHistory.items);
        this.historyTotal.set(matchHistory.total);
        this.historyPage.set(matchHistory.page);
        this.matchSummary.set(matchSummary);
        this.coachSessions.set(coachSessions);
        this.dashboardSummary.set(dashboardSummary);
        this.weeklyReviews.set(weeklyReviews);
        this.aiRecommendations.set(aiRecommendations);
        this.auditEvents.set(auditEvents);
        this.integrations.set(integrations);
        if (session) this.loadSessionMatches(session.id);
        this.planDraft.rankedTargetMin = profile.weeklyRankedMin;
        this.planDraft.rankedTargetMax = profile.weeklyRankedMax;
        if (plans[0]) this.syncPlanDraft(plans[0]);
        this.loading.set(false);
      },
      error: (error) => this.fail(error, 'Não foi possível carregar o ambiente local.'),
    });
  }

  private initializeSession(): void {
    this.api.authSession().subscribe({
      next: (session) => {
        this.authChecking.set(false);
        this.authEnabled.set(session.enabled);
        this.authenticated.set(session.authenticated);
        this.authenticatedEmail.set(session.email);
        if (session.authenticated) this.loadWorkspace();
        else this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.authChecking.set(false);
        this.loading.set(false);
        this.loginError.set(
          error.error?.detail ?? 'Não foi possível consultar a API do Projeto Radiante.',
        );
      },
    });
  }

  private returnToLogin(): void {
    this.authenticated.set(false);
    this.authenticatedEmail.set(null);
    this.profile.set(null);
    this.focusAreas.set([]);
    this.cycles.set([]);
    this.plans.set([]);
    this.activeSession.set(null);
    this.sessionMatches.set([]);
    this.historyMatches.set([]);
    this.historyTotal.set(0);
    this.pendingMatches.set([]);
    this.matchSummary.set(null);
    this.coachSessions.set([]);
    this.dashboardSummary.set(null);
    this.weeklyReviews.set([]);
    this.aiRecommendations.set([]);
    this.auditEvents.set([]);
    this.integrations.set(null);
    this.calendarSyncResult.set(null);
    this.replacementCycle.set(null);
    this.completingCycle.set(null);
    this.reusingCycle.set(null);
    this.reflectingMatch.set(null);
    this.addingFeedback.set(null);
    this.convertingFeedback.set(null);
    this.editingPlan.set(false);
    this.editingMatch.set(false);
    this.completingSession = false;
    this.loginPassword = '';
    this.clearMessages();
  }

  protected saveProfile(): void {
    if (!this.profileDraft) return;
    this.runSave(this.api.updateProfile(this.profileDraft), (profile) => {
      this.profile.set(profile);
      this.profileDraft = this.toProfileInput(profile);
      this.notice.set('Perfil atualizado.');
    });
  }

  protected editFocus(area: FocusArea): void {
    this.focusDraft = {
      id: area.id,
      name: area.name,
      category: area.category,
      observableBehavior: area.observableBehavior,
    };
  }

  protected resetFocus(): void {
    this.focusDraft = emptyFocus();
  }

  protected saveFocus(): void {
    const input = {
      name: this.focusDraft.name,
      category: this.focusDraft.category,
      observableBehavior: this.focusDraft.observableBehavior,
    };
    const request = this.focusDraft.id
      ? this.api.updateFocusArea(this.focusDraft.id, input)
      : this.api.createFocusArea(input);

    this.runSave(request, () => {
      this.resetFocus();
      this.reloadFocusAreas('Área de foco salva.');
    });
  }

  protected toggleFocus(area: FocusArea): void {
    this.runSave(this.api.updateFocusArea(area.id, { active: !area.active }), () => {
      this.reloadFocusAreas(area.active ? 'Área arquivada.' : 'Área reativada.');
    });
  }

  protected editCycle(cycle: TrainingCycle): void {
    const primary = cycle.focuses.find((focus) => focus.priority === 'PRIMARY');
    const secondary = cycle.focuses.filter((focus) => focus.priority === 'SECONDARY');
    this.cycleDraft = {
      id: cycle.id,
      name: cycle.name,
      startDate: cycle.startDate,
      durationDays: cycle.durationDays,
      primaryId: primary?.focusAreaId ?? '',
      primaryCriteria: primary?.successCriteria ?? '',
      secondaryOneId: secondary[0]?.focusAreaId ?? '',
      secondaryOneCriteria: secondary[0]?.successCriteria ?? '',
      secondaryTwoId: secondary[1]?.focusAreaId ?? '',
      secondaryTwoCriteria: secondary[1]?.successCriteria ?? '',
    };
    this.setView('cycles');
  }

  protected resetCycle(): void {
    this.cycleDraft = emptyCycle();
  }

  protected saveCycle(): void {
    const input = this.toCycleInput();
    const request = this.cycleDraft.id
      ? this.api.updateCycle(this.cycleDraft.id, input)
      : this.api.createCycle(input);

    this.runSave(request, () => {
      this.resetCycle();
      this.reloadCycles('Ciclo salvo como rascunho.');
    });
  }

  protected requestActivation(cycle: TrainingCycle): void {
    const current = this.activeCycle();
    if (current && current.id !== cycle.id) {
      this.replacementCycle.set(cycle);
      return;
    }
    this.activateCycle(cycle, false);
  }

  protected confirmReplacement(): void {
    const cycle = this.replacementCycle();
    if (cycle) this.activateCycle(cycle, true);
  }

  protected openCompletion(cycle: TrainingCycle): void {
    this.completingCycle.set(cycle);
    this.conclusion = 'IMPROVED';
    this.conclusionNotes = '';
  }

  protected completeCycle(): void {
    const cycle = this.completingCycle();
    if (!cycle) return;
    this.runSave(this.api.completeCycle(cycle.id, this.conclusion, this.conclusionNotes), () => {
      this.completingCycle.set(null);
      this.reloadAllDomain('Ciclo concluído e registrado no histórico.');
    });
  }

  protected openReuse(cycle: TrainingCycle): void {
    this.reusingCycle.set(cycle);
    this.reuseName = `${cycle.name} — nova etapa`;
    this.reuseStartDate = today();
  }

  protected reuseCycle(): void {
    const source = this.reusingCycle();
    if (!source) return;

    this.runSave(this.api.reuseCycle(source.id, this.reuseName, this.reuseStartDate), (copy) => {
      this.cycles.update((cycles) => [copy, ...cycles]);
      this.reusingCycle.set(null);
      this.editCycle(copy);
      this.notice.set('Novo rascunho criado. Revise os dados antes de ativá-lo.');
    });
  }

  protected activeCycle(): TrainingCycle | undefined {
    return this.cycles().find((cycle) => cycle.status === 'ACTIVE');
  }

  protected currentPlan() {
    return this.plans()[0];
  }
  protected createPlan() {
    this.runSave(this.api.createWeeklyPlan(this.planDraft), (p) => {
      this.plans.update((x) => [p, ...x]);
      this.syncPlanDraft(p);
      this.notice.set('Semana criada como rascunho.');
    });
  }
  protected confirmPlan(p: WeeklyPlan) {
    this.runSave(this.api.confirmWeeklyPlan(p.id), (x) => {
      this.replacePlan(x);
      this.editingPlan.set(false);
      this.notice.set('Semana confirmada.');
    });
  }
  protected editPlan(p: WeeklyPlan) {
    this.syncPlanDraft(p);
    this.resetBlock(p);
    this.editingPlan.set(true);
  }
  protected cancelPlanEdit(p: WeeklyPlan) {
    this.syncPlanDraft(p);
    this.resetBlock(p);
    this.editingPlan.set(false);
  }
  protected savePlan(p: WeeklyPlan) {
    this.runSave(this.api.updateWeeklyPlan(p.id, this.planDraft), (updated) => {
      this.replacePlan(updated);
      this.editingPlan.set(false);
      this.notice.set('Semana atualizada. Os blocos foram mantidos nas mesmas posições relativas.');
    });
  }
  protected closePlan(p: WeeklyPlan) {
    this.runSave(this.api.closeWeeklyPlan(p.id), (closed) => {
      this.replacePlan(closed);
      this.editingPlan.set(false);
      this.notice.set('Semana concluída.');
    });
  }
  protected saveBlock(p: WeeklyPlan) {
    const editing = this.blockDraft.id !== null;
    const input = {
      type: this.blockDraft.type,
      title: this.blockDraft.title,
      plannedStart: this.isoFromParts(this.blockDraft.startDate, this.blockDraft.startTime),
      plannedEnd: this.isoFromParts(this.blockDraft.endDate, this.blockDraft.endTime),
      focusAreaId: this.blockDraft.focusAreaId || null,
      notes: this.blockDraft.notes || null,
    };
    const request = this.blockDraft.id
      ? this.api.updateBlock(this.blockDraft.id, input)
      : this.api.createBlock(p.id, input);
    this.runSave(request, () => {
      this.resetBlock(p);
      this.reloadPlanning(editing ? 'Bloco atualizado.' : 'Bloco adicionado.');
    });
  }
  protected editBlock(b: RoutineBlock) {
    const start = this.partsFromIso(b.plannedStart);
    const end = this.partsFromIso(b.plannedEnd);
    this.blockDraft = {
      id: b.id,
      type: b.type,
      title: b.title,
      startDate: start.date,
      startTime: start.time,
      endDate: end.date,
      endTime: end.time,
      focusAreaId: b.focusAreaId ?? '',
      notes: b.notes ?? '',
    };
  }
  protected resetBlock(p = this.currentPlan()) {
    const date = p?.weekStart ?? today();
    this.blockDraft = {
      id: null,
      type: 'RANKED',
      title: 'Ranked consciente',
      startDate: date,
      startTime: '20:15',
      endDate: date,
      endTime: '22:15',
      focusAreaId: '',
      notes: '',
    };
  }
  protected deleteBlock(b: RoutineBlock) {
    this.runSave(this.api.deleteBlock(b.id), () => this.reloadPlanning('Bloco excluído.'));
  }
  protected cancelBlock(b: RoutineBlock) {
    this.runSave(this.api.cancelBlock(b.id), () => this.reloadPlanning('Bloco cancelado.'));
  }
  protected startBlock(b: RoutineBlock) {
    this.runSave(
      this.api.startSession({
        plannedBlockId: b.id,
        preEnergy: this.preEnergy,
        preFocus: this.preFocus,
      }),
      (s) => {
        this.activeSession.set(s);
        this.sessionMatches.set([]);
        this.view.set('session');
        this.reloadPlanning('Sessão iniciada.');
      },
    );
  }
  protected startAdHoc() {
    this.runSave(
      this.api.startSession({
        type: this.adHocType,
        preEnergy: this.preEnergy,
        preFocus: this.preFocus,
      }),
      (s) => {
        this.activeSession.set(s);
        this.sessionMatches.set([]);
        this.notice.set('Sessão avulsa iniciada.');
      },
    );
  }
  protected pause(s: TrainingSession) {
    this.runSave(this.api.pauseSession(s.id), (x) => this.activeSession.set(x));
  }
  protected resume(s: TrainingSession) {
    this.runSave(this.api.resumeSession(s.id), (x) => this.activeSession.set(x));
  }
  protected finish() {
    const s = this.activeSession();
    if (!s) return;
    this.runSave(this.api.completeSession(s.id, this.completion), () => {
      this.activeSession.set(null);
      this.completingSession = false;
      this.reloadPlanning('Sessão concluída.');
    });
  }
  protected cancelSession(s: TrainingSession) {
    this.runSave(this.api.cancelSession(s.id), () => {
      this.activeSession.set(null);
      this.reloadPlanning('Sessão cancelada.');
    });
  }

  protected openNewMatch(): void {
    const session = this.activeSession();
    if (!session) return;
    this.matchDraft = emptyMatch(session.id);
    this.showOptionalMatchStats = false;
    this.editingMatch.set(true);
  }

  protected editMatch(match: Match): void {
    const started = this.partsFromIso(match.startedAt);
    this.matchDraft = {
      id: match.id,
      sessionId: match.sessionId,
      date: started.date,
      time: started.time,
      queueType: match.queueType,
      agentName: match.agentName,
      mapName: match.mapName,
      result: match.result,
      allyScore: match.allyScore,
      enemyScore: match.enemyScore,
      rrChange: match.rrChange,
      kills: match.kills,
      deaths: match.deaths,
      assists: match.assists,
      acs: match.acs,
      headshotPct: match.headshotPct,
      firstKills: match.firstKills,
      firstDeaths: match.firstDeaths,
      notes: match.notes ?? '',
    };
    this.showOptionalMatchStats = this.hasOptionalStats(match);
    this.editingMatch.set(true);
  }

  protected saveMatch(): void {
    if (!this.matchDraft.id && !this.matchDraft.sessionId) return;
    const input: MatchInput = {
      sessionId: this.matchDraft.sessionId,
      startedAt: this.isoFromParts(this.matchDraft.date, this.matchDraft.time),
      queueType: this.matchDraft.queueType,
      agentName: this.matchDraft.agentName,
      mapName: this.matchDraft.mapName,
      result: this.matchDraft.result,
      allyScore: this.matchDraft.allyScore,
      enemyScore: this.matchDraft.enemyScore,
      rrChange: this.matchDraft.rrChange,
      kills: this.matchDraft.kills,
      deaths: this.matchDraft.deaths,
      assists: this.matchDraft.assists,
      acs: this.matchDraft.acs,
      headshotPct: this.matchDraft.headshotPct,
      firstKills: this.matchDraft.firstKills,
      firstDeaths: this.matchDraft.firstDeaths,
      notes: this.matchDraft.notes || null,
    };
    const wasEditing = Boolean(this.matchDraft.id);
    const request = this.matchDraft.id
      ? this.api.updateMatch(this.matchDraft.id, input)
      : this.api.createMatch(input);
    this.runSave(request, (match) => {
      this.editingMatch.set(false);
      this.reloadMatchData(this.activeSession()?.id);
      if (!wasEditing) this.openReflection(match);
      this.notice.set(wasEditing ? 'Partida atualizada.' : 'Partida registrada.');
    });
  }

  protected openReflection(match: Match): void {
    this.reflectingMatch.set(match);
    this.reflectionDraft = match.reflection
      ? this.toReflectionInput(match.reflection)
      : emptyReflection();
    this.showDetailedReflection = Boolean(
      match.reflection &&
      (match.reflection.delayedCallsCount ||
        match.reflection.communicatedIntentionsCount ||
        match.reflection.movementErrorsCount ||
        match.reflection.ecoPositioningErrorsCount ||
        match.reflection.unnecessaryCrosshairMovesCount ||
        match.reflection.patternsRecognizedCount ||
        match.reflection.adaptationsAppliedCount ||
        match.reflection.goodDecision ||
        match.reflection.nextCorrection),
    );
  }

  protected saveReflection(): void {
    const match = this.reflectingMatch();
    if (!match) return;
    this.runSave(this.api.upsertReflection(match.id, this.reflectionDraft), () => {
      this.reflectingMatch.set(null);
      this.reloadMatchData(this.activeSession()?.id);
      this.notice.set('Reflexão registrada.');
    });
  }

  protected resultLabel(result: MatchResult): string {
    return {
      WIN: 'Vitória',
      LOSS: 'Derrota',
      DRAW: 'Empate',
      REMAKE: 'Remake',
      UNKNOWN: 'Não informado',
    }[result];
  }

  protected queueLabel(queue: MatchQueue): string {
    return {
      COMPETITIVE: 'Competitivo',
      UNRATED: 'Sem classificação',
      PREMIER: 'Premier',
      SWIFTPLAY: 'Disputa da Spike',
      SPIKE_RUSH: 'Corrida da Spike',
      DEATHMATCH: 'Mata-mata',
      TEAM_DEATHMATCH: 'Mata-mata em equipe',
      CUSTOM: 'Personalizada',
      OTHER: 'Outro',
    }[queue];
  }

  protected hasOptionalStats(match: Match): boolean {
    return [
      match.rrChange,
      match.kills,
      match.deaths,
      match.assists,
      match.acs,
      match.headshotPct,
      match.firstKills,
      match.firstDeaths,
      match.notes,
    ].some((value) => value !== null && value !== '');
  }
  protected loadMatchHistory(page: number): void {
    if (page < 1) return;
    this.api.listMatches(undefined, page).subscribe({
      next: (history) => {
        this.historyMatches.set(history.items);
        this.historyTotal.set(history.total);
        this.historyPage.set(history.page);
      },
      error: (error) => this.fail(error, 'Não foi possível carregar o histórico de partidas.'),
    });
  }
  protected historyPages(): number {
    return Math.max(1, Math.ceil(this.historyTotal() / 20));
  }
  protected average(value: number | null, suffix = ''): string {
    return value === null ? '—' : `${value.toLocaleString('pt-BR')}${suffix}`;
  }
  protected sessionLabel(match: Match): string {
    if (!match.session) return 'Sem sessão vinculada';
    return match.session.plannedBlockTitle || `Sessão ${this.typeLabel(match.session.type)}`;
  }

  protected saveCoachSession(): void {
    const input = {
      coachName: this.coachSessionDraft.coachName,
      heldAt: this.isoFromParts(this.coachSessionDraft.date, this.coachSessionDraft.time),
      durationMinutes: this.coachSessionDraft.durationMinutes,
      summary: this.coachSessionDraft.summary,
    };
    const editing = Boolean(this.coachSessionDraft.id);
    const request = this.coachSessionDraft.id
      ? this.api.updateCoachSession(this.coachSessionDraft.id, input)
      : this.api.createCoachSession(input);
    this.runSave(request, (session) => {
      this.coachSessionDraft = emptyCoachSession();
      this.reloadCoaching(editing ? 'Aula atualizada.' : 'Aula registrada.');
      if (!editing) this.openFeedbackForm(session);
    });
  }

  protected editCoachSession(session: CoachSession): void {
    const heldAt = this.partsFromIso(session.heldAt);
    this.coachSessionDraft = {
      id: session.id,
      coachName: session.coachName,
      date: heldAt.date,
      time: heldAt.time,
      durationMinutes: session.durationMinutes,
      summary: session.summary,
    };
  }

  protected resetCoachSession(): void {
    this.coachSessionDraft = emptyCoachSession();
  }

  protected openFeedbackForm(session: CoachSession): void {
    this.addingFeedback.set(session);
    this.feedbackDraft = emptyFeedback(session.id);
  }

  protected editCoachFeedback(session: CoachSession, feedback: CoachFeedback): void {
    this.addingFeedback.set(session);
    this.feedbackDraft = {
      id: feedback.id,
      sessionId: session.id,
      category: feedback.category,
      priority: feedback.priority,
      feedbackText: feedback.feedbackText,
      evidence: feedback.evidence ?? '',
      suggestedAction: feedback.suggestedAction ?? '',
      focusAreaId: feedback.focusAreaId ?? '',
    };
  }

  protected saveCoachFeedback(): void {
    const session = this.addingFeedback();
    if (!session) return;
    const input = {
      category: this.feedbackDraft.category,
      priority: this.feedbackDraft.priority,
      feedbackText: this.feedbackDraft.feedbackText,
      evidence: this.feedbackDraft.evidence || null,
      suggestedAction: this.feedbackDraft.suggestedAction || null,
      focusAreaId: this.feedbackDraft.focusAreaId || null,
    };
    const editing = Boolean(this.feedbackDraft.id);
    const request = this.feedbackDraft.id
      ? this.api.updateCoachFeedback(this.feedbackDraft.id, input)
      : this.api.addCoachFeedback(session.id, input);
    this.runSave(request, () => {
      this.addingFeedback.set(null);
      this.feedbackDraft = emptyFeedback();
      this.reloadCoaching(editing ? 'Feedback atualizado.' : 'Feedback adicionado.');
    });
  }

  protected setFeedbackStatus(feedback: CoachFeedback, status: FeedbackStatus): void {
    this.runSave(this.api.updateCoachFeedback(feedback.id, { status }), () => {
      this.reloadCoaching('Estado do feedback atualizado.');
    });
  }

  protected openFocusConversion(feedback: CoachFeedback): void {
    this.convertingFeedback.set(feedback);
    this.convertFocusDraft = {
      name: feedback.feedbackText.slice(0, 120),
      observableBehavior: feedback.suggestedAction || feedback.feedbackText,
      existingFocusAreaId: '',
    };
  }

  protected convertFeedback(): void {
    const feedback = this.convertingFeedback();
    if (!feedback) return;
    const input = this.convertFocusDraft.existingFocusAreaId
      ? { focusAreaId: this.convertFocusDraft.existingFocusAreaId }
      : {
          name: this.convertFocusDraft.name,
          observableBehavior: this.convertFocusDraft.observableBehavior,
        };
    this.runSave(this.api.convertFeedbackToFocus(feedback.id, input), () => {
      this.convertingFeedback.set(null);
      this.reloadCoaching('Feedback transformado em área de foco.');
    });
  }

  protected priorityLabel(priority: FeedbackPriority): string {
    return { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica' }[priority];
  }

  protected feedbackStatusLabel(status: FeedbackStatus): string {
    return {
      OPEN: 'Aberto',
      IN_PROGRESS: 'Em prática',
      VALIDATED: 'Validado',
      DISMISSED: 'Descartado',
    }[status];
  }

  protected generateReview(): void {
    const planId = this.dashboardSummary()?.week.planId;
    if (!planId) return;
    this.runSave(this.api.generateWeeklyReview(planId), (review) => {
      this.upsertReview(review);
      this.editWeeklyReview(review);
      this.notice.set('Revisão gerada com os dados atuais da semana.');
    });
  }

  protected editWeeklyReview(review: WeeklyReview): void {
    this.reviewDraft = {
      id: review.id,
      selfConclusion: review.selfConclusion ?? '',
      repeatedPatterns: review.repeatedPatterns.join('\n'),
      nextWeekProposal: review.nextWeekProposal ?? '',
    };
  }

  protected saveWeeklyReview(): void {
    if (!this.reviewDraft.id) return;
    this.runSave(
      this.api.updateWeeklyReview(this.reviewDraft.id, {
        selfConclusion: this.reviewDraft.selfConclusion,
        repeatedPatterns: this.reviewDraft.repeatedPatterns
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
        nextWeekProposal: this.reviewDraft.nextWeekProposal || null,
      }),
      (review) => {
        this.upsertReview(review);
        this.editWeeklyReview(review);
        this.notice.set('Sua conclusão semanal foi salva.');
      },
    );
  }

  protected applyWeeklyReview(review: WeeklyReview): void {
    this.runSave(this.api.applyWeeklyReview(review.id), (updated) => {
      this.upsertReview(updated);
      this.reviewDraft.id = '';
      this.reloadDashboard('Revisão semanal aplicada e preservada no histórico.');
    });
  }

  protected generateSessionAiSummary(): void {
    const session = this.activeSession();
    if (!session) {
      this.error.set('Inicie ou selecione uma sessão antes de gerar o resumo.');
      return;
    }
    this.runSave(this.api.generateSessionAiSummary(session.id), (recommendation) => {
      this.upsertAiRecommendation(recommendation);
      this.reloadAudit('Resumo estruturado da sessão gerado.');
    });
  }

  protected generateWeeklyAiSummary(): void {
    const plan = this.currentPlan();
    if (!plan) {
      this.error.set('Crie uma semana antes de gerar o resumo.');
      return;
    }
    this.runSave(this.api.generateWeeklyAiSummary(plan.id), (recommendation) => {
      this.upsertAiRecommendation(recommendation);
      this.reloadAudit('Resumo estruturado da semana gerado.');
    });
  }

  protected generateWeeklyAiProposal(): void {
    const plan = this.currentPlan();
    if (!plan || plan.status === 'CLOSED') {
      this.error.set('Selecione uma semana aberta para receber uma proposta.');
      return;
    }
    this.runSave(this.api.generateWeeklyAiProposal(plan.id), (recommendation) => {
      this.upsertAiRecommendation(recommendation);
      this.reloadAudit('Proposta gerada. Nenhum dado foi alterado.');
    });
  }

  protected confirmAiProposal(recommendation: AiRecommendation): void {
    const proposal = recommendation.structuredOutput.proposal;
    if (!proposal) return;
    const description = [
      proposal.weeklyIntent ? `Intenção: ${proposal.weeklyIntent}` : null,
      proposal.rankedTargetMin !== null || proposal.rankedTargetMax !== null
        ? `Meta: ${proposal.rankedTargetMin ?? 'atual'}–${proposal.rankedTargetMax ?? 'atual'}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');
    if (!window.confirm(`Aplicar esta proposta à semana?\n\n${description}`)) return;
    this.runSave(this.api.confirmAiRecommendation(recommendation.id), (updated) => {
      this.upsertAiRecommendation(updated);
      this.api.listWeeklyPlans().subscribe((plans) => {
        this.plans.set(plans);
        if (plans[0]) this.syncPlanDraft(plans[0]);
      });
      this.reloadAudit('Proposta aplicada após sua confirmação.');
    });
  }

  protected rejectAiRecommendation(recommendation: AiRecommendation): void {
    this.runSave(this.api.rejectAiRecommendation(recommendation.id), (updated) => {
      this.upsertAiRecommendation(updated);
      this.reloadAudit('Recomendação rejeitada e preservada no histórico.');
    });
  }

  protected connectGoogleCalendar(): void {
    this.runSave(this.api.googleCalendarAuthorizationUrl(), ({ authorizationUrl }) => {
      window.location.assign(authorizationUrl);
    });
  }

  protected disconnectGoogleCalendar(): void {
    if (!window.confirm('Desconectar o Google Calendar e remover a credencial local?')) return;
    this.runSave(this.api.disconnectGoogleCalendar(), () => {
      this.reloadIntegrations('Google Calendar desconectado.');
    });
  }

  protected syncGoogleCalendar(): void {
    const plan = this.currentPlan();
    if (!plan || !['CONFIRMED', 'CLOSED'].includes(plan.status)) {
      this.error.set('Confirme a semana antes de sincronizar o calendário.');
      return;
    }
    this.runSave(this.api.syncGoogleCalendar(plan.id), (result) => {
      this.calendarSyncResult.set(result);
      this.reloadIntegrations(
        result.errors.length
          ? 'Sincronização concluída com pendências; confira o resultado abaixo.'
          : 'Semana sincronizada com o Google Calendar.',
      );
    });
  }

  protected reloadIntegrationStatus(): void {
    this.reloadIntegrations('Status das integrações atualizado.');
  }

  protected aiTypeLabel(type: AiRecommendation['type']): string {
    return {
      SESSION_SUMMARY: 'Resumo de sessão',
      WEEKLY_SUMMARY: 'Resumo semanal',
      WEEKLY_PLAN_PROPOSAL: 'Proposta de semana',
    }[type];
  }

  protected aiStatusLabel(status: AiRecommendation['status']): string {
    return {
      GENERATED: 'Aguardando decisão',
      CONFIRMED: 'Confirmada',
      APPLIED: 'Aplicada',
      REJECTED: 'Rejeitada',
      FAILED: 'Falhou',
    }[status];
  }

  protected canGenerateAiProposal(): boolean {
    const plan = this.currentPlan();
    return Boolean(plan && plan.status !== 'CLOSED');
  }

  protected canSyncCalendar(): boolean {
    const plan = this.currentPlan();
    return Boolean(plan && ['CONFIRMED', 'CLOSED'].includes(plan.status));
  }

  protected downloadBackup(): void {
    this.runSave(this.api.downloadJsonBackup(), (blob) => {
      this.downloadBlob(blob, `projeto-radiante-backup-${today()}.json`);
      this.notice.set('Backup JSON gerado.');
    });
  }

  protected downloadSelectedCsv(): void {
    this.runSave(this.api.downloadCsv(this.csvDataset), (blob) => {
      this.downloadBlob(blob, `projeto-radiante-${this.csvDataset}-${today()}.csv`);
      this.notice.set('Arquivo CSV gerado.');
    });
  }

  protected restoreBackup(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = JSON.parse(String(reader.result)) as Record<string, unknown>;
        this.runSave(this.api.restoreBackup(backup), () => {
          input.value = '';
          this.restoreConfirmed = false;
          this.notice.set('Backup restaurado. Recarregando o workspace.');
          this.loadWorkspace();
        });
      } catch {
        this.error.set('O arquivo selecionado não contém um JSON válido.');
        input.value = '';
      }
    };
    reader.readAsText(file);
  }

  protected minutesLabel(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours ? `${hours}h${rest ? ` ${rest}min` : ''}` : `${rest}min`;
  }
  protected format(v: string) {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(v));
  }
  protected typeLabel(v: BlockType) {
    return (
      {
        RANKED: 'Ranked',
        AIM_TRAINING: 'Treino de mira',
        VOD_REVIEW: 'Revisão de VOD',
        COACHING: 'Coaching',
        COMPETITIVE: 'Competitivo',
        THEORY: 'Teoria',
        FREE: 'Livre',
        COMMITMENT: 'Compromisso',
        OTHER: 'Outro',
      } as Record<BlockType, string>
    )[v];
  }
  protected planStatusLabel(status: WeeklyPlan['status']) {
    return { DRAFT: 'em rascunho', CONFIRMED: 'confirmada', CLOSED: 'encerrada' }[status];
  }

  protected activeFocusAreas(): FocusArea[] {
    return this.focusAreas().filter((area) => area.active);
  }

  protected categoryLabel(category: FocusCategory): string {
    return this.categories.find((item) => item.value === category)?.label ?? category;
  }

  protected statusLabel(status: TrainingCycle['status']): string {
    return {
      DRAFT: 'Rascunho',
      ACTIVE: 'Ativo',
      COMPLETED: 'Concluído',
      CANCELLED: 'Cancelado',
    }[status];
  }

  private activateCycle(cycle: TrainingCycle, replaceActive: boolean): void {
    this.runSave(this.api.activateCycle(cycle.id, replaceActive), () => {
      this.replacementCycle.set(null);
      this.reloadAllDomain('Novo ciclo ativado.');
    });
  }

  private reloadFocusAreas(message: string): void {
    this.api.listFocusAreas().subscribe({
      next: (areas) => {
        this.focusAreas.set(areas);
        this.notice.set(message);
      },
      error: (error) => this.fail(error, 'Não foi possível atualizar os focos.'),
    });
  }

  private reloadCycles(message: string): void {
    this.api.listCycles().subscribe({
      next: (cycles) => {
        this.cycles.set(cycles);
        this.notice.set(message);
      },
      error: (error) => this.fail(error, 'Não foi possível atualizar os ciclos.'),
    });
  }

  private reloadAllDomain(message: string): void {
    forkJoin({ profile: this.api.getProfile(), cycles: this.api.listCycles() }).subscribe({
      next: ({ profile, cycles }) => {
        this.profile.set(profile);
        this.profileDraft = this.toProfileInput(profile);
        this.cycles.set(cycles);
        this.notice.set(message);
      },
      error: (error) => this.fail(error, 'Não foi possível atualizar o ciclo.'),
    });
  }
  private reloadPlanning(message: string) {
    forkJoin({ plans: this.api.listWeeklyPlans(), session: this.api.activeSession() }).subscribe({
      next: ({ plans, session }) => {
        this.plans.set(plans);
        if (plans[0]) this.syncPlanDraft(plans[0]);
        this.activeSession.set(session);
        if (session) this.loadSessionMatches(session.id);
        else this.sessionMatches.set([]);
        this.notice.set(message);
      },
      error: (e) => this.fail(e, 'Não foi possível atualizar o planejamento.'),
    });
  }

  private loadSessionMatches(sessionId: string): void {
    this.api.listMatches(sessionId).subscribe({
      next: (page) => this.sessionMatches.set(page.items),
      error: (error) => this.fail(error, 'Não foi possível carregar as partidas da sessão.'),
    });
  }

  private reloadMatchData(sessionId?: string): void {
    const requests: {
      pending: ReturnType<RadianteApiService['listPendingReflections']>;
      history: ReturnType<RadianteApiService['listMatches']>;
      summary: ReturnType<RadianteApiService['getMatchSummary']>;
      session?: ReturnType<RadianteApiService['listMatches']>;
    } = {
      pending: this.api.listPendingReflections(),
      history: this.api.listMatches(undefined, this.historyPage()),
      summary: this.api.getMatchSummary(),
    };
    if (sessionId) requests.session = this.api.listMatches(sessionId);
    forkJoin(requests).subscribe({
      next: ({ pending, history, summary, session }) => {
        this.pendingMatches.set(pending);
        this.historyMatches.set(history.items);
        this.historyTotal.set(history.total);
        this.matchSummary.set(summary);
        if (session) this.sessionMatches.set(session.items);
      },
      error: (error) => this.fail(error, 'Não foi possível atualizar as partidas.'),
    });
  }
  private reloadCoaching(message: string): void {
    forkJoin({
      sessions: this.api.listCoachSessions(),
      focuses: this.api.listFocusAreas(),
      dashboard: this.api.getDashboardSummary(),
    }).subscribe({
      next: ({ sessions, focuses, dashboard }) => {
        this.coachSessions.set(sessions);
        this.focusAreas.set(focuses);
        this.dashboardSummary.set(dashboard);
        this.notice.set(message);
      },
      error: (error) => this.fail(error, 'Não foi possível atualizar o coaching.'),
    });
  }

  private reloadDashboard(message: string): void {
    forkJoin({
      dashboard: this.api.getDashboardSummary(),
      reviews: this.api.listWeeklyReviews(),
    }).subscribe({
      next: ({ dashboard, reviews }) => {
        this.dashboardSummary.set(dashboard);
        this.weeklyReviews.set(reviews);
        this.notice.set(message);
      },
      error: (error) => this.fail(error, 'Não foi possível atualizar a evolução.'),
    });
  }

  private reloadIntegrations(message: string): void {
    this.api.getIntegrationsStatus().subscribe({
      next: (status) => {
        this.integrations.set(status);
        this.notice.set(message);
      },
      error: (error) => this.fail(error, 'Não foi possível atualizar as integrações.'),
    });
  }

  private reloadAudit(message: string): void {
    this.api.listAuditEvents().subscribe({
      next: (events) => {
        this.auditEvents.set(events);
        this.notice.set(message);
      },
      error: (error) => this.fail(error, 'Não foi possível atualizar a auditoria.'),
    });
  }

  private upsertAiRecommendation(recommendation: AiRecommendation): void {
    this.aiRecommendations.update((items) => {
      const exists = items.some((item) => item.id === recommendation.id);
      return exists
        ? items.map((item) => (item.id === recommendation.id ? recommendation : item))
        : [recommendation, ...items];
    });
  }

  private upsertReview(review: WeeklyReview): void {
    this.weeklyReviews.update((reviews) => {
      const exists = reviews.some((item) => item.id === review.id);
      return exists
        ? reviews.map((item) => (item.id === review.id ? review : item))
        : [review, ...reviews];
    });
    this.dashboardSummary.update((summary) =>
      summary?.week.planId === review.weeklyPlanId
        ? {
            ...summary,
            review: {
              id: review.id,
              status: review.status,
              selfConclusion: review.selfConclusion,
            },
          }
        : summary,
    );
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  private replacePlan(p: WeeklyPlan) {
    this.plans.update((xs) => xs.map((x) => (x.id === p.id ? p : x)));
    this.syncPlanDraft(p);
  }
  private syncPlanDraft(p: WeeklyPlan) {
    this.planDraft = {
      weekStart: p.weekStart,
      rankedTargetMin: p.rankedTargetMin,
      rankedTargetMax: p.rankedTargetMax,
      weeklyIntent: p.weeklyIntent,
    };
  }
  private partsFromIso(value: string) {
    const date = new Date(value);
    const pad = (part: number) => `${part}`.padStart(2, '0');
    return {
      date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    };
  }
  private isoFromParts(date: string, time: string) {
    return new Date(`${date}T${time}:00`).toISOString();
  }
  private monday() {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  }

  private runSave<T>(request: Observable<T>, onSuccess: (value: T) => void): void {
    this.saving.set(true);
    this.clearMessages();
    request.subscribe({
      next: (value: T) => {
        this.saving.set(false);
        onSuccess(value);
      },
      error: (error: HttpErrorResponse) => this.fail(error, 'Não foi possível salvar.'),
    });
  }

  private toProfileInput(profile: Profile): ProfileInput {
    const { id: _id, activeCycle: _cycle, ...input } = profile;
    return { ...input };
  }

  private toCycleInput(): CycleInput {
    const focuses: CycleInput['focuses'] = [
      {
        focusAreaId: this.cycleDraft.primaryId,
        priority: 'PRIMARY',
        successCriteria: this.cycleDraft.primaryCriteria,
      },
    ];
    if (this.cycleDraft.secondaryOneId) {
      focuses.push({
        focusAreaId: this.cycleDraft.secondaryOneId,
        priority: 'SECONDARY',
        successCriteria: this.cycleDraft.secondaryOneCriteria,
      });
    }
    if (this.cycleDraft.secondaryTwoId) {
      focuses.push({
        focusAreaId: this.cycleDraft.secondaryTwoId,
        priority: 'SECONDARY',
        successCriteria: this.cycleDraft.secondaryTwoCriteria,
      });
    }
    return {
      name: this.cycleDraft.name,
      startDate: this.cycleDraft.startDate,
      durationDays: this.cycleDraft.durationDays,
      focuses,
    };
  }

  private toReflectionInput(reflection: MatchReflection): ReflectionInput {
    const { id: _id, matchId: _matchId, ...input } = reflection;
    return input;
  }

  private clearMessages(): void {
    this.error.set(null);
    this.notice.set(null);
  }

  private fail(error: HttpErrorResponse, fallback: string): void {
    if (error.status === 401 && this.authEnabled()) {
      this.returnToLogin();
      this.loginError.set('Sua sessão expirou. Entre novamente.');
      this.loading.set(false);
      this.saving.set(false);
      return;
    }
    const message = error.error?.detail ?? error.error?.message;
    this.error.set(
      Array.isArray(message) ? message.join(' ') : typeof message === 'string' ? message : fallback,
    );
    this.loading.set(false);
    this.saving.set(false);
  }
}
