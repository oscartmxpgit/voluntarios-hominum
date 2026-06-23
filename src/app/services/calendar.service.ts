import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

// Declaración global para acceso a gapi
declare var gapi: any;

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private authService = inject(AuthService);
  private readonly CALENDAR_ID = environment.calendarId;

  private async ensureAuthToken(): Promise<boolean> {
    const token = this.authService.getToken();
    const w = window as any;

    if (!token) {
      console.log("Token no encontrado, solicitando acceso...");
      await this.authService.requestCalendarAccess();
      return !!this.authService.getToken();
    }

    if (w.gapi?.client) {
      w.gapi.client.setToken({ access_token: token });
      return true;
    }

    return false;
  }

  /**
   * Obtiene la lista de eventos. 
   * NOTA: Se eliminó el parámetro privateExtendedProperty para evitar errores 400.
   * Los datos vienen incluidos por defecto si el evento los tiene.
   */
  async getAllEvents(): Promise<any[]> {
    const w = window as any;

    if (!w.gapi || !w.gapi.client) {
      console.error("Error: gapi.client no está inicializado.");
      return [];
    }

    const isAuthorized = await this.ensureAuthToken();
    if (!isAuthorized) {
      console.error("No se pudo obtener autorización.");
      return [];
    }

    try {
      const response = await w.gapi.client.calendar.events.list({
        calendarId: this.CALENDAR_ID,
        orderBy: 'startTime',
        singleEvents: true
      });

      return response.result.items.map((item: any) => this.mapToFullCalendarEvent(item));
    } catch (error: any) {
      if (error.status === 401 || error.result?.error?.code === 401) {
        console.warn("Token expirado, limpiando...");
        localStorage.removeItem('token');
      }
      console.error('Error al obtener eventos de Google Calendar:', error);
      return [];
    }
  }

  private mapToFullCalendarEvent(item: any) {
    return {
      id: item.id,
      title: item.summary || 'Sin título',
      start: item.start.dateTime || item.start.date,
      end: item.end.dateTime || item.end.date,
      // Mapeamos el objeto completo para que el SummaryService pueda inspeccionarlo
      extendedProperties: item.extendedProperties, 
      extendedProps: {
        volunteerEmail: item.extendedProperties?.private?.volunteerEmail || '',
        volunteerName: item.extendedProperties?.private?.volunteerName || '',
        patientName: item.extendedProperties?.private?.patientName || '',
        category: item.extendedProperties?.private?.category || '',
        notes: item.extendedProperties?.private?.notes || ''
      }
    };
  }

  async createEvent(eventDetails: any): Promise<any> {
    const w = window as any;
    try {
      const response = await w.gapi.client.calendar.events.insert({
        calendarId: this.CALENDAR_ID,
        resource: {
          summary: eventDetails.title,
          start: { dateTime: eventDetails.start },
          end: { dateTime: eventDetails.end },
          extendedProperties: {
            private: eventDetails.extendedProps
          }
        }
      });
      return response.result;
    } catch (error) {
      console.error('Error al crear evento:', error);
      throw error;
    }
  }

  async updateEvent(eventId: string, eventDetails: any): Promise<any> {
    const w = window as any;
    
    const isAuthorized = await this.ensureAuthToken();
    if (!isAuthorized) throw new Error("No autorizado");

    const isDateTime = eventDetails.start.includes('T');

    const resource: any = {
      summary: eventDetails.title,
      extendedProperties: {
        private: eventDetails.extendedProps
      }
    };

    if (isDateTime) {
      resource.start = { dateTime: eventDetails.start };
      resource.end = { dateTime: eventDetails.end };
    } else {
      resource.start = { date: eventDetails.start };
      resource.end = { date: eventDetails.end };
    }

    return await w.gapi.client.calendar.events.patch({
      calendarId: this.CALENDAR_ID,
      eventId: eventId,
      resource: resource
    });
  }
}