import { Injectable, inject } from '@angular/core';
import { CalendarService } from './calendar.service';

@Injectable({
  providedIn: 'root'
})
export class SummaryService {
  private calendarService = inject(CalendarService);

  async getTotalStats() {
    const events = await this.calendarService.getAllEvents();
    
    // Ya no necesitamos filtrar por extendedProperties.private, 
    // pues el CalendarService ya nos entrega eventos limpios.
    return {
      totalVisits: events.length,
      totalMonthlyHours: this.calculateTotalMonthlyHours(events),
      hoursByCategory: this.calculateHoursByCategory(events),
      hoursByVolunteer: this.calculateHoursByVolunteer(events),
      visitsByPatient: this.calculateVisitsByPatient(events),
      hoursByPatient: this.calculateHoursByPatient(events)
    };
  }

  // Ahora usamos directamente 'hours' de extendedProps (que viene de MySQL)
  private getEventDuration(event: any): number {
    const h = parseFloat(event.extendedProps?.hours);
    return isNaN(h) ? 0 : h;
  }

  private calculateHoursByVolunteer(events: any[]) {
    return events.reduce((acc: any, event) => {
      const volunteer = event.extendedProps?.volunteerEmail?.trim() || 'Desconocido';
      acc[volunteer] = (acc[volunteer] || 0) + this.getEventDuration(event);
      return acc;
    }, {});
  }

  private calculateHoursByCategory(events: any[]) {
    // Nota: Si en el futuro añades categoría a la BD, aquí está listo
    return events.reduce((acc: any, event) => {
      const category = event.extendedProps?.category?.trim() || 'General';
      acc[category] = (acc[category] || 0) + this.getEventDuration(event);
      return acc;
    }, {});
  }

  private calculateVisitsByPatient(events: any[]) {
    return events.reduce((acc: any, event) => {
      const patient = event.extendedProps?.patientName?.trim() || 'Sin asignar';
      acc[patient] = (acc[patient] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateHoursByPatient(events: any[]) {
    return events.reduce((acc: any, event) => {
      const patient = event.extendedProps?.patientName?.trim() || 'Sin asignar';
      acc[patient] = (acc[patient] || 0) + this.getEventDuration(event);
      return acc;
    }, {});
  }

  private calculateTotalMonthlyHours(events: any[]) {
    const now = new Date();
    return events
      .filter(event => {
        if (!event.start) return false;
        const date = new Date(event.start);
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      })
      .reduce((total, event) => total + this.getEventDuration(event), 0);
  }
}