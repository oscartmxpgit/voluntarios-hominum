import { Injectable, inject } from '@angular/core';
import { CalendarService } from './calendar.service';

@Injectable({ providedIn: 'root' })
export class SummaryService {

  private calendarService = inject(CalendarService);

  async getTotalStats() {
    const events = await this.calendarService.getAllEvents();

    return {
      totalVisits: events.length,
      totalMonthlyHours: this.calculateTotalMonthlyHours(events),
      hoursByCategory: this.calculateHoursByCategory(events),
      hoursByVolunteer: this.calculateHoursByVolunteer(events),
      visitsByPatient: this.calculateVisitsByPatient(events),
      hoursByPatient: this.calculateHoursByPatient(events)
    };
  }

  private getDurationHours(event: any): number {
    const start = new Date(event.start_datetime);
    const end = new Date(event.end_datetime);

    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    return isNaN(diff) ? 0 : diff;
  }

  private calculateHoursByVolunteer(events: any[]) {
    return events.reduce((acc: any, e) => {
      const key = e.volunteer_email || 'Desconocido';
      acc[key] = (acc[key] || 0) + this.getDurationHours(e);
      return acc;
    }, {});
  }

  private calculateHoursByCategory(events: any[]) {
    return events.reduce((acc: any, e) => {
      const key = 'General';
      acc[key] = (acc[key] || 0) + this.getDurationHours(e);
      return acc;
    }, {});
  }

  private calculateVisitsByPatient(events: any[]) {
    return events.reduce((acc: any, e) => {
      const key = e.patient_name || 'Sin asignar';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateHoursByPatient(events: any[]) {
    return events.reduce((acc: any, e) => {
      const key = e.patient_name || 'Sin asignar';
      acc[key] = (acc[key] || 0) + this.getDurationHours(e);
      return acc;
    }, {});
  }

  private calculateTotalMonthlyHours(events: any[]) {
    const now = new Date();

    return events
      .filter(e => {
        const d = new Date(e.start_datetime);
        return d.getMonth() === now.getMonth() &&
               d.getFullYear() === now.getFullYear();
      })
      .reduce((acc, e) => acc + this.getDurationHours(e), 0);
  }
}