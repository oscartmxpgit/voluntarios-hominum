import { Injectable, inject } from '@angular/core';
import { CalendarService } from './calendar.service';
import { CalendarEvent } from '../models/calendar-event';

@Injectable({
  providedIn: 'root'
})
export class SummaryService {
  private calendarService = inject(CalendarService);

  // Filtro de seguridad: solo procesamos eventos creados por nuestra app
  private hasCustomProperties(event: CalendarEvent): boolean {
    return !!(event.extendedProperties?.private?.volunteerName);
  }

  async getTotalStats() {
    const events = await this.calendarService.getAllEvents();
    // Filtramos los eventos válidos antes de procesarlos
    const validEvents = events.filter(e => this.hasCustomProperties(e));
    
    return {
      hoursByVolunteer: this.calculateHoursByVolunteer(validEvents),
      hoursByCategory: this.calculateHoursByCategory(validEvents),
      totalMonthlyHours: this.calculateTotalMonthlyHours(validEvents),
      totalVisits: validEvents.length
    };
  }

  private getEventDuration(event: CalendarEvent): number {
    const startStr = event.start.dateTime || event.start.date;
    const endStr = event.end.dateTime || event.end.date;

    if (!startStr || !endStr) return 0;

    const diff = new Date(endStr).getTime() - new Date(startStr).getTime();
    return Math.max(0, diff / (1000 * 60 * 60));
  }

  private calculateHoursByVolunteer(events: CalendarEvent[]) {
    return events.reduce((acc: any, event) => {
      const name = event.extendedProperties!.private!.volunteerName!;
      acc[name] = (acc[name] || 0) + this.getEventDuration(event);
      return acc;
    }, {});
  }

  private calculateHoursByCategory(events: CalendarEvent[]) {
    return events.reduce((acc: any, event) => {
      const cat = event.extendedProperties!.private!.category || 'General';
      acc[cat] = (acc[cat] || 0) + this.getEventDuration(event);
      return acc;
    }, {});
  }

  private calculateTotalMonthlyHours(events: CalendarEvent[]) {
    const now = new Date();
    return events
      .filter(e => {
        const date = new Date(e.start.dateTime || e.start.date!);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((acc, event) => acc + this.getEventDuration(event), 0);
  }
}