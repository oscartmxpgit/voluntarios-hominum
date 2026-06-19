import { Injectable, inject } from '@angular/core';
import { CalendarEvent } from '../models/calendar-event';

// Declaramos gapi para evitar errores de compilación de TypeScript
declare var gapi: any;

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private readonly CALENDAR_ID = 'primary'; // O el ID específico de tu calendario

  /**
   * Obtiene todos los eventos del calendario configurado.
   * En una implementación real, aquí se llamaría a gapi.client.calendar.events.list
   */
  async getAllEvents(): Promise<CalendarEvent[]> {
    try {
      const response = await gapi.client.calendar.events.list({
        calendarId: this.CALENDAR_ID,
        orderBy: 'startTime',
        singleEvents: true
      });

      return response.result.items.map((item: any) => this.mapToCalendarEvent(item));
    } catch (error) {
      console.error('Error al obtener eventos de Google Calendar:', error);
      return [];
    }
  }

  /**
   * Mapea la respuesta de la API de Google al modelo interno CalendarEvent
   */
  private mapToCalendarEvent(item: any): CalendarEvent {
    return {
      id: item.id,
      summary: item.summary,
      start: { dateTime: item.start.dateTime || item.start.date },
      end: { dateTime: item.end.dateTime || item.end.date },
      extendedProperties: {
        private: {
          volunteerEmail: item.extendedProperties?.private?.volunteerEmail || '',
          volunteerName: item.extendedProperties?.private?.volunteerName || '',
          patientName: item.extendedProperties?.private?.patientName || '',
          category: item.extendedProperties?.private?.category || '',
          notes: item.extendedProperties?.private?.notes || ''
        }
      }
    };
  }

  /**
   * Crea un nuevo evento en el calendario
   */
  async createEvent(event: CalendarEvent): Promise<any> {
    return await gapi.client.calendar.events.insert({
      calendarId: this.CALENDAR_ID,
      resource: event
    });
  }

  /**
   * Elimina un evento
   */
  async deleteEvent(eventId: string): Promise<any> {
    return await gapi.client.calendar.events.delete({
      calendarId: this.CALENDAR_ID,
      eventId: eventId
    });
  }
}