import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  async getAllUsers(): Promise<any[]> {
    return await firstValueFrom(
      this.http.get<any[]>(`${this.API_URL}/users`)
    );
  }

  async getUserByEmail(email: string): Promise<any | null> {
    const response = await firstValueFrom(
      this.http.get<any>(`${this.API_URL}/users/by-email?email=${encodeURIComponent(email)}`)
    );

    return response?.user ?? null;
  }

  async isUserAllowed(email: string): Promise<boolean> {
    const result = await firstValueFrom(
      this.http.get<any>(`${this.API_URL}/users/by-email?email=${encodeURIComponent(email)}`)
    );

    return result?.exists === true;
  }

  async isCoordinator(email: string): Promise<boolean> {
    const result = await firstValueFrom(
      this.http.get<any>(`${this.API_URL}/users/by-email?email=${encodeURIComponent(email)}`)
    );

    return result?.user?.is_coordinator === 1;
  }
}