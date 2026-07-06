import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SummaryService {
  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/time-entries`;

  async getTotalStats() {
    const events = await firstValueFrom(
      this.http.get<any[]>(this.apiUrl)
    );

    return this.buildStats(events);
  }

  async getMyStats() {
    const events = await firstValueFrom(
      this.http.get<any[]>(`${this.apiUrl}/mine`)
    );

    return this.buildStats(events);
  }

  private buildStats(events: any[]) {
    return {
      totalVisits: events.length,
      totalMonthlyHours: this.calculateTotalMonthlyHours(events),
      hoursByTask: this.calculateHoursByTask(events), // <--- Nuevo
      hoursByCategory: this.calculateHoursByCategory(events),
      hoursByVolunteer: this.calculateHoursByVolunteer(events),
      visitsByPatient: this.calculateVisitsByPatient(events),
      hoursByPatient: this.calculateHoursByPatient(events)
    };
  }

  private calculateHoursByTask(events: any[]) {
    return events.reduce((acc: any, e: any) => {
      const key = e.task_name || 'Sin tarea';
      acc[key] = (acc[key] || 0) + this.getDurationHours(e);
      return acc;
    }, {});
  }

  private getDurationHours(event: any): number {
    const diff = (new Date(event.end_datetime).getTime() - new Date(event.start_datetime).getTime()) / 3600000;
    return isNaN(diff) ? 0 : diff;
  }

  private calculateHoursByVolunteer(events: any[]) {
    return events.reduce((a: any, e: any) => {
      const k = e.volunteer_email || 'Desconocido';
      a[k] = (a[k] || 0) + this.getDurationHours(e);
      return a;
    }, {});
  }

  private calculateHoursByCategory(events: any[]) {
    return events.reduce((a: any, e: any) => {
      const k = 'General';
      a[k] = (a[k] || 0) + this.getDurationHours(e);
      return a;
    }, {});
  }

  private calculateVisitsByPatient(events: any[]) {
    return events.reduce((a: any, e: any) => {
      const k = e.patient_name || 'Sin asignar';
      a[k] = (a[k] || 0) + 1;
      return a;
    }, {});
  }

  private calculateHoursByPatient(events: any[]) {
    return events.reduce((a: any, e: any) => {
      const k = e.patient_name || 'Sin asignar';
      a[k] = (a[k] || 0) + this.getDurationHours(e);
      return a;
    }, {});
  }

  private calculateTotalMonthlyHours(events: any[]) {
    const now = new Date();
    return events
      .filter(e => {
        const d = new Date(e.start_datetime);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((a, e) => a + this.getDurationHours(e), 0);
  }
}