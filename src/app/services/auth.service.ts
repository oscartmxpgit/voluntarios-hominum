import { Injectable, signal, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models/user';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly CLIENT_ID = environment.googleClientId;

  private router = inject(Router);
  private tokenClient: any;

  private initialized = false;
  private buttonRendered = false;

  user = signal<User | null>(this.loadUserFromStorage());

  constructor(private ngZone: NgZone) {}

  // -----------------------------
  // PUBLIC API
  // -----------------------------

  getUserEmail(): string {
    return this.user()?.email || '';
  }

  // 🔥 FIX: always reset state when entering login again
  private resetAuthState(): void {
    this.initialized = false;
    this.buttonRendered = false;
  }

  async initializeAuth(elementId: string): Promise<void> {
    this.resetAuthState();

    await this.waitForGoogle();

    this.setupGoogleAuth(elementId);

    this.initialized = true;
  }

  async requestCalendarAccess(): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('token');

      if (token) {
        this.router.navigate(['/calendar']);
        resolve();
        return;
      }

      if (this.tokenClient) {
        this.tokenClient.requestAccessToken();
        resolve();
        return;
      }

      reject('TokenClient no inicializado');
    });
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return this.user() !== null;
  }

  logout(): void {
    const g = window.google as any;

    g?.accounts?.id?.disableAutoSelect?.();

    this.user.set(null);
    localStorage.clear();

    this.initialized = false;
    this.buttonRendered = false;
    this.tokenClient = null;

    this.router.navigate(['/login']);
  }

  // -----------------------------
  // GOOGLE SETUP
  // -----------------------------

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

    this.renderButtonOnce(elementId);

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

  // 🔥 FIXED: no permanent blocking, always retry-safe
  private renderButtonOnce(elementId: string): void {
    const g = window.google as any;

    const buttonElement = document.getElementById(elementId);

    if (!g?.accounts?.id || !buttonElement) {
      setTimeout(() => this.renderButtonOnce(elementId), 150);
      return;
    }

    g.accounts.id.renderButton(buttonElement, {
      theme: 'outline',
      size: 'large',
    });

    this.buttonRendered = true;
  }

  private handleCredentialResponse(response: any): void {
    const payload = this.decodeToken(response.credential);

    this.ngZone.run(() => {
      const isCoordinator = environment.coordinators.includes(payload.email);

      const userData: User = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        isCoordinator,
      };

      this.user.set(userData);
      localStorage.setItem('user', JSON.stringify(userData));

      this.requestCalendarAccess();
    });
  }

  // -----------------------------
  // GOOGLE READY CHECK
  // -----------------------------

  private waitForGoogle(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        const g = window.google as any;

        if (g?.accounts?.id && g?.accounts?.oauth2) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };

      check();
    });
  }

  // -----------------------------
  // UTILS
  // -----------------------------

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