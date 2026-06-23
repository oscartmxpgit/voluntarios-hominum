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

  async getAllEvents(): Promise<any[]> {
    await this.ensureAuthToken();

    const w = window as any;

    const response = await w.gapi.client.calendar.events.list({
      calendarId: this.CALENDAR_ID,
      singleEvents: true
    });

    return response.result.items.map((item: any) =>
      this.mapToFullCalendarEvent(item)
    );
  }

  private mapToFullCalendarEvent(item: any) {

    return {
      id: item.id,
      summary: item.summary || '(Sin título)',
      title: item.summary || '(Sin título)',

      // IMPORTANTE: mantener formato Google Calendar
      start: item.start,
      end: item.end,

      extendedProperties: item.extendedProperties,

      extendedProps: item.extendedProperties?.private || {}
    };
  }

  async createEvent(eventDetails: any): Promise<any> {
    const isAuthorized = await this.ensureAuthToken();
    if (!isAuthorized) throw new Error('No autorizado.');

    const w = window as any;
    let userEmail = 'No disponible';

    // Intento 1: Intentar obtener el perfil del usuario logueado vía gapi oficial
    try {
      if (w.gapi && w.gapi.auth2) {
        const authInstance = w.gapi.auth2.getAuthInstance();
        const currentUser = authInstance.currentUser.get();
        if (currentUser && currentUser.getBasicProfile()) {
          userEmail = currentUser.getBasicProfile().getEmail();
        }
      }
    } catch (e) {
      console.warn("No se pudo obtener el email vía gapi.auth2", e);
    }

    console.log("Guardando evento con Email:", userEmail);

    return await w.gapi.client.calendar.events.insert({
      calendarId: this.CALENDAR_ID,
      resource: {
        summary: eventDetails.title,
        start: { dateTime: new Date(eventDetails.start).toISOString() },
        end: { dateTime: new Date(eventDetails.end).toISOString() },
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
  }

  async updateEvent(eventId: string, eventDetails: any): Promise<any> {
    const isAuthorized = await this.ensureAuthToken();

    if (!isAuthorized) {
      throw new Error('No autorizado.');
    }

    const w = window as any;

    return await w.gapi.client.calendar.events.patch({
      calendarId: this.CALENDAR_ID,
      eventId,
      resource: {
        summary: eventDetails.title,

        start: {
          dateTime: new Date(eventDetails.start).toISOString()
        },

        end: {
          dateTime: new Date(eventDetails.end).toISOString()
        },

        extendedProperties: {
          private: {
            volunteerEmail:
              eventDetails.extendedProps?.volunteerEmail || 'Desconocido',

            category:
              eventDetails.extendedProps?.category || 'General',

            patientName:
              eventDetails.extendedProps?.patientName || '',

            notes:
              eventDetails.extendedProps?.notes || ''
          }
        }
      }
    });
  }
}