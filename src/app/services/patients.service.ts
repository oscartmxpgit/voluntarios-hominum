import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Patient {
  id?: number;
  name: string;
  assigned_volunteer_id: number | null;
  volunteer_email?: string;
  status?: 'active' | 'inactive';
}

export interface Volunteer {
  id: number;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class PatientsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/patients`;
  private volunteersApiUrl = `${environment.apiUrl}/volunteers`;

  async getAll(): Promise<Patient[]> {
    return await firstValueFrom(this.http.get<Patient[]>(this.apiUrl));
  }

  async getVolunteers(): Promise<Volunteer[]> {
    return await firstValueFrom(this.http.get<Volunteer[]>(`${this.volunteersApiUrl}/volunteers`)) || [];
  }

  async create(patient: Patient): Promise<void> {
    await firstValueFrom(this.http.post(this.apiUrl, patient));
  }

  async update(patient: Patient): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiUrl}/${patient.id}`, patient));
  }

  async delete(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiUrl}/${id}`));
  }
}