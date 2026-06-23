import { Injectable, inject } from '@angular/core';
import { CalendarService } from './calendar.service';
import { CalendarEvent } from '../models/calendar-event';

@Injectable({
  providedIn: 'root'
})
export class SummaryService {
  private calendarService = inject(CalendarService);

  private hasCustomProperties(event: CalendarEvent): boolean {
    // Verificamos si al menos existe el objeto private
    const hasProps = !!(event.extendedProperties?.private);
    if (!hasProps) {
      console.warn('Evento sin metadatos privados:', event.summary);
    }
    return hasProps;
  }

  async getTotalStats() {
    const events = await this.calendarService.getAllEvents();

    // En SummaryService -> getTotalStats()
    console.log('--- INSPECCIÓN DE EVENTOS ---');
    events.forEach(e => {
      console.log('Evento:', e.summary);
      console.log('Props privadas:', e.extendedProperties?.private);
      console.log('Start:', e.start.dateTime || e.start.date);
    });

    // Inspección detallada
    console.log('--- INSPECCIÓN DE EVENTOS ---');
    console.table(events.map(e => ({
      summary: e.summary,
      hasPrivate: !!e.extendedProperties?.private,
      volunteer: e.extendedProperties?.private?.volunteerName || 'VACÍO'
    })));

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

    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();

    const diff = end - start;
    const hours = diff / (1000 * 60 * 60);

    // Si es 0 (mismo día/sin hora), retornamos 1 hora por defecto en lugar de 0
    return hours > 0 ? hours : 1;
  }

  private calculateHoursByVolunteer(events: CalendarEvent[]) {
    return events.reduce((acc: any, event) => {
      // Uso de encadenamiento opcional seguro para evitar errores en tiempo de ejecución
      const name = event.extendedProperties?.private?.volunteerName || 'Desconocido';
      const hours = this.getEventDuration(event);

      acc[name] = (acc[name] || 0) + hours;
      return acc;
    }, {});
  }

  private calculateHoursByCategory(events: CalendarEvent[]) {
    return events.reduce((acc: any, event) => {
      const cat = event.extendedProperties?.private?.category || 'General';
      const hours = this.getEventDuration(event);

      acc[cat] = (acc[cat] || 0) + hours;
      return acc;
    }, {});
  }

  private calculateTotalMonthlyHours(events: CalendarEvent[]) {
    const now = new Date();
    return events
      .filter(e => {
        const dateStr = e.start.dateTime || e.start.date;
        if (!dateStr) return false;
        const date = new Date(dateStr);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((acc, event) => acc + this.getEventDuration(event), 0);
  }
}