import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

interface HealthResponse {
  status: 'ok' | 'degraded';
  services: {
    api: 'up';
    database: 'up' | 'down';
  };
  version: string;
}

interface ActiveFocus {
  name: string;
  priority: 'PRIMARY' | 'SECONDARY';
  successCriteria: string;
}

interface ProfileResponse {
  displayName: string;
  timezone: string;
  currentRank: string;
  sensitivity: number;
  dpi: number;
  weeklyRankedMin: number;
  weeklyRankedMax: number;
  primaryGoal: string;
  activeCycle: {
    name: string;
    startDate: string;
    endDate: string;
    focuses: ActiveFocus[];
  } | null;
}

const API_BASE_URL = 'http://127.0.0.1:3000/api/v1';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly http = inject(HttpClient);

  protected readonly loading = signal(true);
  protected readonly health = signal<HealthResponse | null>(null);
  protected readonly profile = signal<ProfileResponse | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.loadFoundation();
  }

  protected loadFoundation(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      health: this.http.get<HealthResponse>(`${API_BASE_URL}/health`),
      profile: this.http.get<ProfileResponse>(`${API_BASE_URL}/profile`),
    }).subscribe({
      next: ({ health, profile }) => {
        this.health.set(health);
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(
          'Não foi possível carregar a fundação local. Confirme a API, o PostgreSQL, a migration e o seed.',
        );
        this.loading.set(false);
      },
    });
  }
}
