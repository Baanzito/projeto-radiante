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
} from './core/models';
import { RadianteApiService } from './core/radiante-api.service';

type View = 'dashboard' | 'profile' | 'focuses' | 'cycles' | 'week' | 'session';

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

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly api = inject(RadianteApiService);

  protected readonly view = signal<View>('dashboard');
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly healthVersion = signal('0.3.0');
  protected readonly profile = signal<Profile | null>(null);
  protected readonly focusAreas = signal<FocusArea[]>([]);
  protected readonly cycles = signal<TrainingCycle[]>([]);
  protected readonly plans = signal<WeeklyPlan[]>([]);
  protected readonly activeSession = signal<TrainingSession | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly replacementCycle = signal<TrainingCycle | null>(null);
  protected readonly completingCycle = signal<TrainingCycle | null>(null);
  protected readonly reusingCycle = signal<TrainingCycle | null>(null);

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
    this.loadWorkspace();
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
    }).subscribe({
      next: ({ health, profile, focusAreas, cycles, plans, session }) => {
        this.healthVersion.set(health.version);
        this.profile.set(profile);
        this.profileDraft = this.toProfileInput(profile);
        this.focusAreas.set(focusAreas);
        this.cycles.set(cycles);
        this.plans.set(plans);
        this.activeSession.set(session);
        this.planDraft.rankedTargetMin = profile.weeklyRankedMin;
        this.planDraft.rankedTargetMax = profile.weeklyRankedMax;
        if (plans[0]) this.syncPlanDraft(plans[0]);
        this.loading.set(false);
      },
      error: (error) => this.fail(error, 'Não foi possível carregar o ambiente local.'),
    });
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
      this.notice.set('Semana confirmada.');
    });
  }
  protected savePlan(p: WeeklyPlan) {
    this.runSave(this.api.updateWeeklyPlan(p.id, this.planDraft), (updated) => {
      this.replacePlan(updated);
      this.notice.set('Semana atualizada. Os blocos foram mantidos nas mesmas posições relativas.');
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
        this.notice.set(message);
      },
      error: (e) => this.fail(e, 'Não foi possível atualizar o planejamento.'),
    });
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

  private clearMessages(): void {
    this.error.set(null);
    this.notice.set(null);
  }

  private fail(error: HttpErrorResponse, fallback: string): void {
    const message = error.error?.detail ?? error.error?.message;
    this.error.set(
      Array.isArray(message) ? message.join(' ') : typeof message === 'string' ? message : fallback,
    );
    this.loading.set(false);
    this.saving.set(false);
  }
}
