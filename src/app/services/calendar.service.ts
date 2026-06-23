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
    const w = window as any;
    if (!w.gapi?.client) return [];
    
    const isAuthorized = await this.ensureAuthToken();
    if (!isAuthorized) return [];

    try {
      const response = await w.gapi.client.calendar.events.list({
        calendarId: this.CALENDAR_ID,
        orderBy: 'startTime',
        singleEvents: true
      });
      return response.result.items.map((item: any) => this.mapToFullCalendarEvent(item));
    } catch (error) {
      console.error('Error al obtener eventos:', error);
      return [];
    }
  }

  private mapToFullCalendarEvent(item: any) {
    return {
      id: item.id,
      title: item.summary || 'Sin título',
      start: item.start.dateTime || item.start.date,
      end: item.end.dateTime || item.end.date,
      extendedProperties: item.extendedProperties,
      extendedProps: item.extendedProperties?.private || {}
    };
  }

  async createEvent(eventDetails: any): Promise<any> {
    const w = window as any;
    return await w.gapi.client.calendar.events.insert({
      calendarId: this.CALENDAR_ID,
      resource: {
        summary: eventDetails.title,
        start: { dateTime: new Date(eventDetails.start).toISOString() },
        end: { dateTime: new Date(eventDetails.end).toISOString() },
        extendedProperties: { private: eventDetails.extendedProps }
      }
    });
  }

  async updateEvent(eventId: string, eventDetails: any): Promise<any> {
    const w = window as any;
    await this.ensureAuthToken();

    // Solo enviamos lo que Google permite en un patch
    const resource = {
      summary: eventDetails.title,
      start: { dateTime: new Date(eventDetails.start).toISOString() },
      end: { dateTime: new Date(eventDetails.end).toISOString() },
      extendedProperties: { private: eventDetails.extendedProps }
    };

    return await w.gapi.client.calendar.events.patch({
      calendarId: this.CALENDAR_ID,
      eventId: eventId,
      resource: resource
    });
  }
}