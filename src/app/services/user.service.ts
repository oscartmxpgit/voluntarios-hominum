import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {

  private http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  async getCurrentUserProfile(): Promise<any> {
    return await firstValueFrom(
      this.http.get<any>(`${this.API_URL}/users/me`)
    );
  }

  async getAllUsers(): Promise<any[]> {
    return await firstValueFrom(
      this.http.get<any[]>(`${this.API_URL}/users`)
    );
  }

  async isCoordinator(): Promise<boolean> {
    const user = await this.getCurrentUserProfile();
    return user?.is_coordinator === true;
  }
}