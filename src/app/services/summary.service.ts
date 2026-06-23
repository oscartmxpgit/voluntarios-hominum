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
    const validEvents = events.filter(
      event => !!event.extendedProperties?.private
    );

    return {
      totalVisits: validEvents.length,

      totalMonthlyHours:
        this.calculateTotalMonthlyHours(validEvents),

      hoursByCategory:
        this.calculateHoursByCategory(validEvents),

      hoursByVolunteer:
        this.calculateHoursByVolunteer(validEvents),

      visitsByPatient:
        this.calculateVisitsByPatient(validEvents),

      hoursByPatient:
        this.calculateHoursByPatient(validEvents)
    };
  }

  private getEventDuration(event: CalendarEvent): number {
    const startStr =
      event.start?.dateTime ||
      event.start?.date;

    const endStr =
      event.end?.dateTime ||
      event.end?.date;

    if (!startStr || !endStr) {
      return 1;
    }

    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();

    const hours =
      (end - start) / (1000 * 60 * 60);

    return hours > 0 ? hours : 1;
  }

  private calculateHoursByVolunteer(events: CalendarEvent[]) {
    return events.reduce((acc: any, event) => {
      const volunteer =
        event.extendedProperties?.private?.volunteerEmail?.trim() ||
        'Desconocido';

      acc[volunteer] =
        (acc[volunteer] || 0) +
        this.getEventDuration(event);

      return acc;
    }, {});
  }

  private calculateHoursByCategory(events: CalendarEvent[]) {
    return events.reduce((acc: any, event) => {
      const category =
        event.extendedProperties?.private?.category?.trim() ||
        'General';

      acc[category] =
        (acc[category] || 0) +
        this.getEventDuration(event);

      return acc;
    }, {});
  }

  private calculateVisitsByPatient(events: CalendarEvent[]) {
    return events.reduce((acc: any, event) => {
      const patient =
        event.extendedProperties?.private?.patientName?.trim() ||
        'Sin asignar';

      acc[patient] =
        (acc[patient] || 0) + 1;

      return acc;
    }, {});
  }

  private calculateHoursByPatient(events: CalendarEvent[]) {
    return events.reduce((acc: any, event) => {
      const patient =
        event.extendedProperties?.private?.patientName?.trim() ||
        'Sin asignar';

      acc[patient] =
        (acc[patient] || 0) +
        this.getEventDuration(event);

      return acc;
    }, {});
  }

  private calculateTotalMonthlyHours(events: CalendarEvent[]) {
    const now = new Date();

    return events
      .filter(event => {
        const dateStr =
          event.start?.dateTime ||
          event.start?.date;

        if (!dateStr) {
          return false;
        }

        const date = new Date(dateStr);

        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      })
      .reduce(
        (total, event) =>
          total + this.getEventDuration(event),
        0
      );
  }
}