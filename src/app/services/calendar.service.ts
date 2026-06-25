import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {

  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly API_URL = environment.apiUrl;

  async getAllEvents(): Promise<any[]> {
    return await firstValueFrom(
      this.http.get<any[]>(`${this.API_URL}/time-entries`)
    );
  }

  async createEvent(event: any): Promise<any> {
    const payload = this.mapToApi(event);
    return await firstValueFrom(
      this.http.post(`${this.API_URL}/time-entries`, payload)
    );
  }

  async updateEvent(id: string, event: any): Promise<any> {
    const payload = this.mapToApi(event);
    return await firstValueFrom(
      this.http.put(`${this.API_URL}/time-entries/${id}`, payload)
    );
  }

  async deleteEvent(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.API_URL}/time-entries/${id}`)
    );
  }

  getCurrentUserEmail(): string {
    return this.authService.getUserEmail() ?? '';
  }

  // =========================
  // 🔥 FIX PRINCIPAL AQUÍ
  // =========================
  private mapToApi(event: any) {

    const start = this.safeDate(event.start || event.start_datetime);
    const end = this.safeDate(event.end || event.end_datetime);

    if (!start || !end) {
      throw new Error('Fechas inválidas en evento');
    }

    return {
      volunteer_email: this.getCurrentUserEmail(),
      task_name: event.title || event.task_name || '',

      // 👇 FORMATO MYSQL CORRECTO
      start_datetime: this.toMySqlDate(start),
      end_datetime: this.toMySqlDate(end),

      patient_name: event.patientName || event.patient_name || '',
      comments: event.comments || event.notes || ''
    };
  }

  private safeDate(value: any): Date | null {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date;
  }

  // =========================
  // 🔥 MYSQL FORMAT FIX
  // =========================
  private toMySqlDate(date: Date): string {

    const pad = (n: number) => n.toString().padStart(2, '0');

    return (
      date.getFullYear() + '-' +
      pad(date.getMonth() + 1) + '-' +
      pad(date.getDate()) + ' ' +
      pad(date.getHours()) + ':' +
      pad(date.getMinutes()) + ':' +
      pad(date.getSeconds())
    );
  }
}