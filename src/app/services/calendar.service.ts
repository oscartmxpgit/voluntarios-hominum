import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { CalendarEvent } from '../models/calendar-event';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {

  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/time-entries`;

  // =========================
  // GET EVENTS
  // =========================

  async getAllEvents(): Promise<CalendarEvent[]> {
    return await firstValueFrom(
      this.http.get<CalendarEvent[]>(this.API_URL)
    );
  }

  // =========================
  // CREATE
  // =========================

  async createEvent(event: any): Promise<any> {
    return await firstValueFrom(
      this.http.post(
        this.API_URL,
        this.mapToApi(event)
      )
    );
  }

  // =========================
  // UPDATE
  // =========================

  async updateEvent(id: string, event: any): Promise<any> {
    return await firstValueFrom(
      this.http.put(
        `${this.API_URL}/${id}`,
        this.mapToApi(event)
      )
    );
  }

  // =========================
  // DELETE
  // =========================

  async deleteEvent(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.API_URL}/${id}`)
    );
  }

  // =========================
  // PATIENTS
  // =========================

  async getAvailablePatients(): Promise<any[]> {
    return await firstValueFrom(
      this.http.get<any[]>(`${environment.apiUrl}/patients/available`)
    );
  }

  async getPatientsByVolunteer(volunteerId: number): Promise<any[]> {
    return await firstValueFrom(
      this.http.get<any[]>(`${environment.apiUrl}/patients/by-volunteer/${volunteerId}`)
    );
  }

 // =========================
  // EVENTS
  // =========================

async getGeneralEventTypes(): Promise<any[]> {
  try {
    return await firstValueFrom(
      this.http.get<any[]>(`${environment.apiUrl}/general-events`)
    );
  } catch (error) {
    console.error('Error fetching general event types:', error);
    return [];
  }
}

  // =========================
  // MAP EVENT TO API
  // =========================

  private mapToApi(event: any) {
    const start = this.safeDate(event.start ?? event.start_datetime);
    const end = this.safeDate(event.end ?? event.end_datetime);

    if (!start || !end) {
      throw new Error('Fechas inválidas en el evento');
    }

    // Estructura que espera el backend
    return {
      start_datetime: this.toMySqlDate(start),
      end_datetime: this.toMySqlDate(end),
      comments: event.comments ?? '',
      patient_id: event.patient_id ? Number(event.patient_id) : null,
      title: event.title ?? null // Añadido para eventos generales
    };
  }

  // =========================
  // SAFE DATE
  // =========================

  private safeDate(value: any): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  // =========================
  // MYSQL FORMAT
  // =========================

  private toMySqlDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}