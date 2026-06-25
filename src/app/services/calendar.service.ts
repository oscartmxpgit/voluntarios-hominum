import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

declare var gapi: any;

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private authService = inject(AuthService);
  private readonly CALENDAR_ID = environment.calendarId;

  private async ensureAuthToken(): Promise<boolean> {
    const token = this.authService.getToken();
    const w = window as any;

    if (!token) {
      await this.authService.requestCalendarAccess();
      return !!this.authService.getToken();
    }

    if (w.gapi?.client) {
      w.gapi.client.setToken({ access_token: token });
      return true;
    }
    return false;
  }

  // Manejador centralizado: redirige a '/' para que el AuthGuard gestione la seguridad
  private handleApiError(error: any): never {
    if (error.status === 401 || error.result?.error?.code === 401) {
      console.warn("Token expirado o inválido. Redirigiendo a home...");
      this.authService.logout(); 
      window.location.href = '/'; 
    }
    throw error;
  }

  async getAllEvents(): Promise<any[]> {
    try {
      await this.ensureAuthToken();
      const w = window as any;
      const response = await w.gapi.client.calendar.events.list({
        calendarId: this.CALENDAR_ID,
        singleEvents: true
      });
      return (response.result.items || []).map((item: any) => this.mapToFullCalendarEvent(item));
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  private mapToFullCalendarEvent(item: any) {
    return {
      id: item.id,
      summary: item.summary || '(Sin título)',
      title: item.summary || '(Sin título)',
      start: item.start,
      end: item.end,
      extendedProperties: item.extendedProperties,
      extendedProps: item.extendedProperties?.private || {}
    };
  }

  async createEvent(eventDetails: any): Promise<any> {
    try {
      const isAuthorized = await this.ensureAuthToken();
      if (!isAuthorized) throw new Error('No autorizado.');

      const userEmail = this.authService.getUserEmail() || 'Desconocido';
      const w = window as any;
      const start = new Date(eventDetails.start);
      const end = new Date(eventDetails.end);

      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        throw new Error('Rango de fechas inválido');
      }

      return await w.gapi.client.calendar.events.insert({
        calendarId: this.CALENDAR_ID,
        resource: {
          summary: eventDetails.title,
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
          extendedProperties: {
            private: {
              volunteerEmail: userEmail,
              category: eventDetails.extendedProps?.category || 'General',
              patientName: eventDetails.extendedProps?.patientName || '',
              notes: eventDetails.extendedProps?.notes || ''
            }
          }
        }
      });
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  async updateEvent(eventId: string, eventDetails: any): Promise<any> {
    try {
      const isAuthorized = await this.ensureAuthToken();
      if (!isAuthorized) throw new Error('No autorizado.');

      const w = window as any;
      const start = new Date(eventDetails.start);
      const end = new Date(eventDetails.end);

      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        throw new Error('Fechas inválidas');
      }

      return await w.gapi.client.calendar.events.patch({
        calendarId: this.CALENDAR_ID,
        eventId,
        resource: {
          summary: eventDetails.title,
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
          extendedProperties: {
            private: {
              volunteerEmail: eventDetails.extendedProps?.volunteerEmail || 'Desconocido',
              category: eventDetails.extendedProps?.category || 'General',
              patientName: eventDetails.extendedProps?.patientName || '',
              notes: eventDetails.extendedProps?.notes || ''
            }
          }
        }
      });
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      const isAuthorized = await this.ensureAuthToken();
      if (!isAuthorized) throw new Error('No autorizado.');

      const w = window as any;
      await w.gapi.client.calendar.events.delete({
        calendarId: this.CALENDAR_ID,
        eventId
      });
    } catch (error) {
      return this.handleApiError(error);
    }
  }
}