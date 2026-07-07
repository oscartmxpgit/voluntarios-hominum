import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Volunteer {
  id: number;
  clerk_user_id: string;
  email: string;
  is_coordinator: number; // 0 o 1
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class VolunteersService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/volunteers`;

  async getAll(): Promise<Volunteer[]> {
    const volunteers = await firstValueFrom(this.http.get<Volunteer[]>(this.apiUrl));
    return volunteers || [];
  }

  // Nuevo método para registrar nuevo usuario
  async create(user: { email: string }): Promise<void> {
    await firstValueFrom(this.http.post(this.apiUrl, user));
  }

  async updateRole(id: number, isCoordinator: boolean): Promise<void> {
    await firstValueFrom(this.http.patch(`${this.apiUrl}/${id}/role`, { 
      is_coordinator: isCoordinator ? 1 : 0 
    }));
  }

  async delete(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiUrl}/${id}`));
  }
}