import { Injectable, inject } from '@angular/core';
import { CalendarService } from './calendar.service';
import { CalendarEvent } from '../models/calendar-event';

@Injectable({
  providedIn: 'root'
})
export class SummaryService {
  private calendarService = inject(CalendarService);

  private hasCustomProperties(event: CalendarEvent): boolean {
    const hasProps = !!event.extendedProperties?.private;

    if (!hasProps) {
      console.warn(
        'Evento sin metadatos privados:',
        event.summary
      );
    }

    return hasProps;
  }

  async getTotalStats() {
    const events = await this.calendarService.getAllEvents();

    console.log('--- INSPECCIÓN DE EVENTOS ---');

    events.forEach(event => {
      console.log('Evento:', event.summary);
      console.log(
        'Props privadas:',
        event.extendedProperties?.private
      );
      console.log(
        'Start:',
        event.start?.dateTime || event.start?.date
      );
    });

    console.table(
      events.map(event => ({
        summary: event.summary,
        hasPrivate: !!event.extendedProperties?.private,
        volunteer:
          event.extendedProperties?.private?.volunteerName ||
          'VACÍO'
      }))
    );

    const validEvents = events.filter(event =>
      this.hasCustomProperties(event)
    );

    return {
      totalVisits: validEvents.length,
      totalMonthlyHours:
        this.calculateTotalMonthlyHours(validEvents),
      hoursByCategory:
        this.calculateHoursByCategory(validEvents),
      hoursByVolunteer:
        this.calculateHoursByVolunteer(validEvents)
    };
  }

  private getEventDuration(event: CalendarEvent): number {
    const startStr =
      event.start?.dateTime || event.start?.date;

    const endStr =
      event.end?.dateTime || event.end?.date;

    if (!startStr || !endStr) {
      return 0;
    }

    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();

    const hours =
      (end - start) / (1000 * 60 * 60);

    return hours > 0 ? hours : 1;
  }

  private calculateHoursByVolunteer(
    events: CalendarEvent[]
  ) {
    return events.reduce((acc: any, event) => {
      const props = event.extendedProperties?.private;

      const volunteer =
        props?.volunteerName?.trim()
          ? props.volunteerName
          : 'Desconocido';

      acc[volunteer] =
        (acc[volunteer] || 0) +
        this.getEventDuration(event);

      return acc;
    }, {});
  }

  private calculateHoursByCategory(
    events: CalendarEvent[]
  ) {
    return events.reduce((acc: any, event) => {
      const category =
        event.extendedProperties?.private?.category?.trim()
          ? event.extendedProperties.private.category
          : 'General';

      acc[category] =
        (acc[category] || 0) +
        this.getEventDuration(event);

      return acc;
    }, {});
  }

  private calculateTotalMonthlyHours(
    events: CalendarEvent[]
  ) {
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