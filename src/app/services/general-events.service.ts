import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GeneralEvent {
  id?: number;
  title: string;
  start_datetime: string; // Formato: 'YYYY-MM-DDTHH:mm'
  end_datetime: string;
}

@Injectable({ providedIn: 'root' })
export class GeneralEventsService {
  private http = inject(HttpClient);
  private readonly URL = `${environment.apiUrl}/general-events`;

  async getAll(): Promise<GeneralEvent[]> {
    return await firstValueFrom(this.http.get<GeneralEvent[]>(this.URL));
  }

  async create(event: GeneralEvent): Promise<any> {
    return await firstValueFrom(this.http.post(this.URL, event));
  }

  async update(event: GeneralEvent): Promise<any> {
    return await firstValueFrom(this.http.put(`${this.URL}/${event.id}`, event));
  }

  async delete(id: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.URL}/${id}`));
  }
}