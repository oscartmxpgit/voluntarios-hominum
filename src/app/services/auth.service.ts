import { Injectable, signal, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { User } from '../models/user';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly CLIENT_ID = environment.googleClientId;
  private readonly API_URL = environment.apiUrl;

  private router = inject(Router);
  private http = inject(HttpClient);
  private ngZone = inject(NgZone);

  private tokenClient: any;

  user = signal<User | null>(this.loadUserFromStorage());

  // =========================
  // BASIC USER HELPERS
  // =========================

  getUserEmail(): string {
    return this.user()?.email || '';
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return this.user() !== null && this.getToken() !== null;
  }

  // =========================
  // LOGOUT
  // =========================

  logout(): void {
    const g = window.google as any;
    g?.accounts?.id?.disableAutoSelect?.();

    this.user.set(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');

    this.tokenClient = null;

    this.router.navigate(['/login']);
  }

  // =========================
  // GOOGLE INIT
  // =========================

  async initializeAuth(elementId: string): Promise<void> {
    await this.waitForGoogle();
    this.setupGoogleAuth(elementId);
  }

  async requestCalendarAccess(): Promise<void> {
    if (this.getToken()) {
      this.router.navigate(['/calendar']);
      return;
    }

    if (this.tokenClient) {
      this.tokenClient.requestAccessToken();
    }
  }

  // =========================
  // GOOGLE SETUP
  // =========================

  private setupGoogleAuth(elementId: string): void {
    const g = window.google as any;
    if (!g?.accounts) return;

    if (!(window as any).__google_gsi_initialized) {
      g.accounts.id.initialize({
        client_id: this.CLIENT_ID,
        callback: (res: any) => this.handleCredentialResponse(res),
      });

      (window as any).__google_gsi_initialized = true;
    }

    this.renderButton(elementId);

    if (!this.tokenClient) {
      this.tokenClient = g.accounts.oauth2.initTokenClient({
        client_id: this.CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar',
        callback: (response: any) => {
          if (response.access_token) {
            localStorage.setItem('token', response.access_token);

            this.ngZone.run(() => {
              this.router.navigate(['/calendar']);
            });
          }
        },
      });
    }
  }

  private renderButton(elementId: string): void {
    const g = window.google as any;
    const buttonElement = document.getElementById(elementId);

    if (!buttonElement) {
      setTimeout(() => this.renderButton(elementId), 150);
      return;
    }

    g.accounts.id.renderButton(buttonElement, {
      theme: 'outline',
      size: 'large'
    });
  }

  // =========================
  // LOGIN HANDLER (UPDATED)
  // =========================

  private async handleCredentialResponse(response: any): Promise<void> {

    const payload = this.decodeToken(response.credential);

    const dbUser = await this.getUserFromDatabase(payload.email);

    // ❌ User not allowed
    if (!dbUser) {
      this.logout();
      return;
    }

    const userData: User = {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      isCoordinator: dbUser.is_coordinator === 1
    };

    this.ngZone.run(() => {
      this.user.set(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      this.requestCalendarAccess();
    });
  }

  // =========================
  // BACKEND CALL
  // =========================

  private async getUserFromDatabase(email: string): Promise<any | null> {
    try {
      const res = await firstValueFrom(
        this.http.get<any>(
          `${this.API_URL}/users/by-email?email=${encodeURIComponent(email)}`
        )
      );

      return res?.user ?? null;

    } catch {
      return null;
    }
  }

  // =========================
  // GOOGLE UTILITIES
  // =========================

  private waitForGoogle(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if ((window as any).google?.accounts) resolve();
        else setTimeout(check, 100);
      };
      check();
    });
  }

  private decodeToken(token: string): any {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  }

  private loadUserFromStorage(): User | null {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  }
}