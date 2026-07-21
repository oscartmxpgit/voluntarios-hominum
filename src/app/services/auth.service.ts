import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { ClerkService } from '../services/clerk.service';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AppUser {
  id: number;
  email: string;
  name: string;
  picture: string;
  isCoordinator: boolean;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  private clerkService = inject(ClerkService);
  private http = inject(HttpClient);

  user = signal<AppUser | null>(null);
  private ready = signal(false);
  isForbidden = signal(false); // Estado para detectar si el usuario no tiene acceso en BD

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await this.waitForClerk();
    await this.syncUser();
    this.ready.set(true);
  }

  private async waitForClerk(): Promise<void> {
    while (!this.clerkService.clerk?.session || !this.clerkService.clerk?.user) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  private async syncUser(): Promise<void> {
    try {
      const token = await this.getToken();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

      const dbUser = await firstValueFrom(
        this.http.get<{ id: number, email: string, is_coordinator: boolean, is_active: number | boolean }>(
          `${environment.apiUrl}/volunteers/me`, { headers }
        )
      );

      if (!dbUser.is_active) {
        throw new Error('401 Unauthorized: El voluntario está inactivo');
      }

      const clerkUser = this.clerkService.clerk!.user!;
      this.isForbidden.set(false); // Acceso concedido
      this.user.set({
        id: dbUser.id,
        email: dbUser.email,
        name: clerkUser.fullName || '',
        picture: clerkUser.imageUrl || '',
        isCoordinator: !!dbUser.is_coordinator,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl
      });
    } catch (error: any) {
      console.error('Acceso denegado o usuario no registrado en BD:', error);
      
      // Fixed: Handle both 403 Forbidden and 401 Unauthorized status codes
      if (error instanceof HttpErrorResponse && (error.status === 403 || error.status === 401)) {
        this.isForbidden.set(true);
      }
      
      this.user.set(null);
    }
  }

  isAdmin(): boolean {
    return this.user()?.isCoordinator === true;
  }

  isReady(): boolean {
    return this.ready();
  }

  isLoggedIn(): boolean {
    return !!this.clerkService.clerk?.session;
  }

  getUserEmail(): string {
    return this.user()?.email
      || this.clerkService.clerk?.user?.primaryEmailAddress?.emailAddress
      || '';
  }

  getCurrentUser(): AppUser | null {
    return this.user();
  }

  async getToken(): Promise<string> {
    const token = await this.clerkService.clerk?.session?.getToken();
    if (!token) throw new Error('Token no disponible');
    return token;
  }

  async logout(): Promise<void> {
    await this.clerkService.clerk?.signOut();
    this.user.set(null);
    this.isForbidden.set(false); // Resetear estado
    this.ready.set(false);
    this.router.navigate(['/login']);
  }
}