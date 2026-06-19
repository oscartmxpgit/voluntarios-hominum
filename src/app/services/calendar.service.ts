import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { CalendarEvent } from '../models/calendar-event';

declare var gapi: any;

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private authService = inject(AuthService);
  private readonly CALENDAR_ID = 'primary';

  private setAuthToken() {
    const token = this.authService.getToken();
    if (token) {
      // Configuramos el token para que gapi lo use en las cabeceras automáticamente
      gapi.client.setToken({ access_token: token });
    }
  }

  async getAllEvents(): Promise<CalendarEvent[]> {
    try {
      this.setAuthToken(); // Autenticamos antes de la llamada
      
      const response = await gapi.client.calendar.events.list({
        calendarId: this.CALENDAR_ID,
        orderBy: 'startTime',
        singleEvents: true
      });

      return response.result.items.map((item: any) => this.mapToCalendarEvent(item));
    } catch (error) {
      console.error('Error al obtener eventos:', error);
      return [];
    }
  }

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
}