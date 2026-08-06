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
} from './core/models';
import { RadianteApiService } from './core/radiante-api.service';

type View = 'dashboard' | 'profile' | 'focuses' | 'cycles';

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
  protected readonly healthVersion = signal('0.2.0');
  protected readonly profile = signal<Profile | null>(null);
  protected readonly focusAreas = signal<FocusArea[]>([]);
  protected readonly cycles = signal<TrainingCycle[]>([]);
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
    }).subscribe({
      next: ({ health, profile, focusAreas, cycles }) => {
        this.healthVersion.set(health.version);
        this.profile.set(profile);
        this.profileDraft = this.toProfileInput(profile);
        this.focusAreas.set(focusAreas);
        this.cycles.set(cycles);
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
