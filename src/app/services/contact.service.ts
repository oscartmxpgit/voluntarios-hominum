import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: 'pending' | 'contacted' | 'archived';
  created_at: string;
}

export interface ContactResponse {
  id: number;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/contact-submissions`;

  async sendContactForm(formData: any): Promise<ContactResponse> {
    return await firstValueFrom(this.http.post<ContactResponse>(this.apiUrl, formData));
  }

  async getSubmissions(): Promise<ContactSubmission[]> {
    return await firstValueFrom(this.http.get<ContactSubmission[]>(this.apiUrl));
  }

  async updateStatus(id: number, status: string): Promise<void> {
    await firstValueFrom(this.http.patch<void>(`${this.apiUrl}/${id}`, { status }));
  }
}