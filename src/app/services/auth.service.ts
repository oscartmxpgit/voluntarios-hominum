import { Injectable, signal, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models/user';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly CLIENT_ID = environment.googleClientId;
  private router = inject(Router);
  private tokenClient: any;
  
  user = signal<User | null>(this.loadUserFromStorage());

  constructor(private ngZone: NgZone) {}

  getUserEmail(): string {
    return this.user()?.email || '';
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // 🔥 Verificación estricta: usuario + token
  isLoggedIn(): boolean {
    return this.user() !== null && this.getToken() !== null;
  }

  logout(): void {
    const g = window.google as any;
    g?.accounts?.id?.disableAutoSelect?.();

    // Limpieza explícita
    this.user.set(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    this.tokenClient = null;
    this.router.navigate(['/login']);
  }

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
            this.ngZone.run(() => this.router.navigate(['/calendar']));
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
    g.accounts.id.renderButton(buttonElement, { theme: 'outline', size: 'large' });
  }

  private handleCredentialResponse(response: any): void {
    const payload = this.decodeToken(response.credential);
    const userData: User = {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      isCoordinator: environment.coordinators.includes(payload.email),
    };

    this.ngZone.run(() => {
      this.user.set(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      this.requestCalendarAccess();
    });
  }

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