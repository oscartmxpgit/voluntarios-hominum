import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { CalendarEvent } from '../models/calendar-event';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private http = inject(HttpClient);

  private readonly API_URL = `${environment.apiUrl}/time-entries`;

  // ==========================================================
  // GET EVENTS
  // ==========================================================

  async getAllEvents(): Promise<CalendarEvent[]> {
    return await firstValueFrom(this.http.get<CalendarEvent[]>(this.API_URL));
  }

  // ==========================================================
  // CREATE EVENT
  // ==========================================================

  async createEvent(event: any): Promise<any> {
    return await firstValueFrom(
      this.http.post<any>(this.API_URL, this.mapToApi(event))
    );
  }

  // ==========================================================
  // UPDATE EVENT
  // ==========================================================

  async updateEvent(id: string | number, event: any): Promise<any> {
    return await firstValueFrom(
      this.http.put<any>(`${this.API_URL}/${id}`, this.mapToApi(event))
    );
  }

  // ==========================================================
  // DELETE EVENT
  // ==========================================================

  async deleteEvent(id: string | number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.API_URL}/${id}`));
  }

  // ==========================================================
  // ATTACHMENTS - UPLOAD
  // ==========================================================

  async uploadTimeEntryAttachments(
    timeEntryId: string | number,
    files: File[]
  ): Promise<any> {
    if (!files || files.length === 0) {
      return {
        attachments: []
      };
    }

    const formData = new FormData();

    for (const file of files) {
      formData.append('attachments', file);
    }

    /*
     * IMPORTANT:
     *
     * Do NOT manually add:
     *
     * Content-Type: multipart/form-data
     *
     * The browser must generate the multipart boundary.
     */

    return await firstValueFrom(
      this.http.post<any>(
        `${this.API_URL}/${timeEntryId}/attachments`,
        formData
      )
    );
  }

  // ==========================================================
  // ATTACHMENTS - DELETE
  // ==========================================================

  async deleteTimeEntryAttachment(
    timeEntryId: string | number,
    attachmentId: string | number
  ): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(
        `${this.API_URL}/${timeEntryId}/attachments/${attachmentId}`
      )
    );
  }

  // ==========================================================
  // ATTACHMENTS - DOWNLOAD
  // ==========================================================

  async downloadTimeEntryAttachment(
    timeEntryId: string | number,
    attachmentId: string | number
  ): Promise<Blob> {
    return await firstValueFrom(
      this.http.get(
        `${this.API_URL}/${timeEntryId}/attachments/${attachmentId}`,
        {
          responseType: 'blob'
        }
      )
    );
  }

  // ==========================================================
  // PATIENTS
  // ==========================================================

  async getAllPatients(): Promise<any[]> {
    return await firstValueFrom(
      this.http.get<any[]>(`${environment.apiUrl}/patients`)
    );
  }

  async getAvailablePatients(): Promise<any[]> {
    return await firstValueFrom(
      this.http.get<any[]>(`${environment.apiUrl}/patients/available`)
    );
  }

  async getPatientsByVolunteer(volunteerId: number): Promise<any[]> {
    return await firstValueFrom(
      this.http.get<any[]>(
        `${environment.apiUrl}/patients/by-volunteer/${volunteerId}`
      )
    );
  }

  // ==========================================================
  // GENERAL EVENT TYPES
  // ==========================================================

  async getGeneralEventTypes(): Promise<any[]> {
    try {
      return await firstValueFrom(
        this.http.get<any[]>(`${environment.apiUrl}/general-events`)
      );
    } catch (error) {
      console.error('Error fetching general event types:', error);
      return [];
    }
  }

  // ==========================================================
  // MAP EVENT TO API
  // ==========================================================

  private mapToApi(event: any): any {
    const start = this.safeDate(event.start ?? event.start_datetime);
    const end = this.safeDate(event.end ?? event.end_datetime);

    if (!start || !end) {
      throw new Error('Fechas inválidas en el evento');
    }

    const payload: any = {
      ...event,
      start_datetime: this.toMySqlDate(start),
      end_datetime: this.toMySqlDate(end),
      title: event.title ?? null
    };

    // ========================================================
    // COMMENTS
    //
    // Backend accepts:
    //
    // comments: [
    //   "Comentario 1",
    //   "Comentario 2"
    // ]
    //
    // OR:
    //
    // comment: "Comentario"
    //
    // We preserve the new comments array.
    // ========================================================

    if (Array.isArray(event.comments)) {
      payload.comments = event.comments
        .filter(
          (comment: any) =>
            typeof comment === 'string' && comment.trim() !== ''
        )
        .map((comment: string) => comment.trim());

      delete payload.comment;
    } else if (
      typeof event.comment === 'string' &&
      event.comment.trim() !== ''
    ) {
      payload.comment = event.comment.trim();

      delete payload.comments;
    } else {
      /*
       * Don't send existing comment objects back to the API.
       *
       * Existing comments already live in the database.
       */

      delete payload.comment;
      delete payload.comments;
    }

    // ========================================================
    // PATIENT
    // ========================================================

    if (
      event.patient_id !== null &&
      event.patient_id !== undefined &&
      event.patient_id !== ''
    ) {
      payload.patient_id = Number(event.patient_id);
    } else {
      payload.patient_id = null;
    }

    // ========================================================
    // REMOVE FRONTEND-ONLY PROPERTIES
    // ========================================================

    /*
     * These values may exist because GET /time-entries
     * returned them.
     *
     * They are not needed for POST / PUT.
     */

    delete payload.attachments;
    delete payload.patient_name;
    delete payload.volunteer_name;
    delete payload.volunteer_email;
    delete payload.download_url;

    /*
     * The database ID is already in the URL during PUT.
     * Leaving it in the JSON would not necessarily break
     * anything, but there is no reason to send it.
     */

    delete payload.id;

    return payload;
  }

  // ==========================================================
  // SAFE DATE
  // ==========================================================

  private safeDate(value: any): Date | null {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return isNaN(date.getTime()) ? null : date;
  }

  // ==========================================================
  // MYSQL DATETIME FORMAT
  // ==========================================================

  private toMySqlDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');

    return (
      `${date.getFullYear()}-` +
      `${pad(date.getMonth() + 1)}-` +
      `${pad(date.getDate())} ` +
      `${pad(date.getHours())}:` +
      `${pad(date.getMinutes())}:` +
      `${pad(date.getSeconds())}`
    );
  }
}