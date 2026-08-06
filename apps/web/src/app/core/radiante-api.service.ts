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
}
