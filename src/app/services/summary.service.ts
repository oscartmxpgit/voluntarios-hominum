import { Injectable, inject } from '@angular/core';
import { CalendarService } from './calendar.service';
import { CalendarEvent } from '../models/calendar-event';

@Injectable({
  providedIn: 'root'
})
export class SummaryService {
  private calendarService = inject(CalendarService);

  async getTotalStats() {
    const events = await this.calendarService.getAllEvents();
    return {
      hoursByVolunteer: this.calculateHoursByVolunteer(events),
      hoursByCategory: this.calculateHoursByCategory(events),
      totalMonthlyHours: this.calculateTotalMonthlyHours(events),
      totalVisits: events.length
    };
  }

  private calculateHours(start: string, end: string): number {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return diff / (1000 * 60 * 60);
  }

  private calculateHoursByVolunteer(events: CalendarEvent[]) {
    return events.reduce((acc: any, event) => {
      const hours = this.calculateHours(event.start.dateTime, event.end.dateTime);
      const name = event.extendedProperties.private.volunteerName;
      acc[name] = (acc[name] || 0) + hours;
      return acc;
    }, {});
  }

  private calculateHoursByCategory(events: CalendarEvent[]) {
    return events.reduce((acc: any, event) => {
      const hours = this.calculateHours(event.start.dateTime, event.end.dateTime);
      const cat = event.extendedProperties.private.category;
      acc[cat] = (acc[cat] || 0) + hours;
      return acc;
    }, {});
  }

  private calculateTotalMonthlyHours(events: CalendarEvent[]) {
    const currentMonth = new Date().getMonth();
    return events
      .filter(e => new Date(e.start.dateTime).getMonth() === currentMonth)
      .reduce((acc, event) => acc + this.calculateHours(event.start.dateTime, event.end.dateTime), 0);
  }
}