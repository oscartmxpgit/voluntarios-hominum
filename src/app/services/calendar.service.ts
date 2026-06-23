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

    return (response.result.items || []).map((item: any) =>
      this.mapToFullCalendarEvent(item)
    );
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
    const isAuthorized = await this.ensureAuthToken();
    if (!isAuthorized) throw new Error('No autorizado.');

    const userEmail = this.authService.getUserEmail() || 'Desconocido';

    console.log("Guardando evento con Email:", userEmail);

    const w = window as any;

    const start = new Date(eventDetails.start);
    const end = new Date(eventDetails.end);

    // FIX CRÍTICO: evitar Google 400 (timeRangeEmpty)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Fechas inválidas');
    }

    if (end <= start) {
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
  }

  async updateEvent(eventId: string, eventDetails: any): Promise<any> {
    const isAuthorized = await this.ensureAuthToken();
    if (!isAuthorized) throw new Error('No autorizado.');

    const w = window as any;

    const start = new Date(eventDetails.start);
    const end = new Date(eventDetails.end);

    // FIX CRÍTICO: evita PATCH con rango vacío
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Fechas inválidas');
    }

    if (end <= start) {
      throw new Error('La fecha fin debe ser posterior a la de inicio');
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

  async deleteEvent(eventId: string): Promise<void> {
    const isAuthorized = await this.ensureAuthToken();
    if (!isAuthorized) throw new Error('No autorizado.');

    const w = window as any;

    await w.gapi.client.calendar.events.delete({
      calendarId: this.CALENDAR_ID,
      eventId
    });
  }
}