import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly API_URL = environment.apiUrl;

  private async getHeaders(): Promise<HttpHeaders> {
    const token = await this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Obtiene el perfil completo del usuario actual desde tu BD
  async getCurrentUserProfile(): Promise<any> {
    const headers = await this.getHeaders();
    return await firstValueFrom(
      this.http.get<any>(`${this.API_URL}/users/me`, { headers })
    );
  }

  // Método optimizado: en lugar de llamar a la API para cada flag,
  // obtienes el perfil una vez y verificas localmente.
  async isCoordinator(): Promise<boolean> {
    try {
      const user = await this.getCurrentUserProfile();
      return user?.is_coordinator === 1;
    } catch {
      return false;
    }
  }

  // Lista de usuarios (Solo para coordinadores)
  async getAllUsers(): Promise<any[]> {
    const headers = await this.getHeaders();
    return await firstValueFrom(
      this.http.get<any[]>(`${this.API_URL}/users`, { headers })
    );
  }

  // Búsqueda genérica por email (si fuera necesaria)
  async getUserByEmail(email: string): Promise<any | null> {
    const headers = await this.getHeaders();
    const response = await firstValueFrom(
      this.http.get<any>(`${this.API_URL}/users/by-email?email=${encodeURIComponent(email)}`, { headers })
    );
    return response?.user ?? null;
  }
}