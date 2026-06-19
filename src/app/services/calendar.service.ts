import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

// Declaración global para acceso a gapi
declare var gapi: any;

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private authService = inject(AuthService);
  private readonly CALENDAR_ID = environment.calendarId;

  /**
   * Asegura que gapi tenga el token de acceso configurado.
   * Si no hay token, intenta solicitar acceso antes de continuar.
   */
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
   * Obtiene la lista de eventos desde la API de Google Calendar.
   */
  async getAllEvents(): Promise<any[]> {
    const w = window as any;
    
    // 1. Verificar inicialización de gapi
    if (!w.gapi || !w.gapi.client) {
      console.error("Error: gapi.client no está inicializado.");
      return [];
    }

    // 2. Asegurar autenticación
    const isAuthorized = await this.ensureAuthToken();
    if (!isAuthorized) {
      console.error("No se pudo obtener autorización para acceder al calendario.");
      return [];
    }

    try {
      // 3. Petición a la API
      const response = await w.gapi.client.calendar.events.list({
        calendarId: this.CALENDAR_ID,
        orderBy: 'startTime',
        singleEvents: true
      });

      // 4. Mapeo a formato FullCalendar
      return response.result.items.map((item: any) => this.mapToFullCalendarEvent(item));
    } catch (error: any) {
      // Si el error es 401, limpiamos el token para forzar nueva petición
      if (error.status === 401 || error.result?.error?.code === 401) {
        console.warn("Token expirado o inválido, limpiando...");
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
      extendedProps: {
        volunteerEmail: item.extendedProperties?.private?.volunteerEmail || '',
        volunteerName: item.extendedProperties?.private?.volunteerName || '',
        patientName: item.extendedProperties?.private?.patientName || '',
        category: item.extendedProperties?.private?.category || '',
        notes: item.extendedProperties?.private?.notes || ''
      }
    };
  }

  // Crear un nuevo evento
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
            private: eventDetails.extendedProps // Aquí guardamos tus campos personalizados
          }
        }
      });
      return response.result;
    } catch (error) {
      console.error('Error al crear evento:', error);
      throw error;
    }
  }

  // Editar un evento existente
  async updateEvent(eventId: string, eventDetails: any): Promise<any> {
    const w = window as any;
    try {
      const response = await w.gapi.client.calendar.events.patch({
        calendarId: this.CALENDAR_ID,
        eventId: eventId,
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
      console.error('Error al editar evento:', error);
      throw error;
    }
  }
}