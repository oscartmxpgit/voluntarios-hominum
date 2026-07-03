import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ClerkService } from '../services/clerk.service';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AppUser {
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

  constructor() {
    this.init();
  }

  // =========================
  // INIT SEGURO (CLERK & DB READY)
  // =========================
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
    const clerkUser = this.clerkService.clerk!.user!;
    const email = clerkUser.primaryEmailAddress?.emailAddress || '';
    let isCoordinator = false;

    try {
      const dbUser = await firstValueFrom(
        this.http.get<{id: number, email: string, is_coordinator: boolean}>(
            `${environment.apiUrl}/users/me`
        )
      );
      isCoordinator = dbUser.is_coordinator;
    } catch (error) {
      console.error('Error fetching user profile from backend:', error);
    }

    // Mapeamos los datos de Clerk al objeto AppUser
    this.user.set({
      email,
      name: clerkUser.fullName || '',
      picture: clerkUser.imageUrl || '',
      isCoordinator,
      // Aquí agregamos los campos faltantes
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl
    });
  }

  // =========================
  // PUBLIC API
  // =========================
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

  // =========================
  // TOKEN
  // =========================
  async getToken(): Promise<string> {
    const token = await this.clerkService.clerk?.session?.getToken();
    if (!token) throw new Error('Clerk token no disponible');
    return token;
  }

  // =========================
  // LOGOUT
  // =========================
  async logout(): Promise<void> {
    await this.clerkService.clerk?.signOut();
    this.user.set(null);
    this.ready.set(false);
    this.router.navigate(['/login']);
  }
}