import { Injectable, signal, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models/user';
import { environment } from '../../environments/environment';

declare var google: any;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly CLIENT_ID = environment.googleClientId;
  private router = inject(Router);
  private tokenClient: any;
  user = signal<User | null>(this.loadUserFromStorage());

  constructor(private ngZone: NgZone) { }

  initializeAuth(elementId: string) {
    const checkGoogle = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts) {
        clearInterval(checkGoogle);
        this.setupGoogleAuth(elementId);
      }
    }, 100);
  }

  private setupGoogleAuth(elementId: string) {
    google.accounts.id.initialize({
      client_id: this.CLIENT_ID,
      callback: (res: any) => this.handleCredentialResponse(res)
    });

    const buttonElement = document.getElementById(elementId);
    if (buttonElement) {
      google.accounts.id.renderButton(buttonElement, { theme: "outline", size: "large" });
    }

    this.tokenClient = google.accounts.oauth2.initTokenClient({
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

  async requestCalendarAccess(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (localStorage.getItem('token')) {
        this.router.navigate(['/calendar']);
        resolve();
      } else if (this.tokenClient) {
        this.tokenClient.requestAccessToken();
        resolve();
      } else {
        reject("TokenClient no inicializado");
      }
    });
  }

  private handleCredentialResponse(response: any) {
    const payload = this.decodeToken(response.credential);
    
    this.ngZone.run(() => {
      const isUserCoordinator = environment.coordinators.includes(payload.email);
      const userData: User = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        isCoordinator: isUserCoordinator
      };

      this.user.set(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      this.requestCalendarAccess();
    });
  }

  getToken(): string | null { return localStorage.getItem('token'); }

  logout() {
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.disableAutoSelect();
    }
    this.user.set(null);
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean { return this.user() !== null; }

  private decodeToken(token: string) {
    return JSON.parse(window.atob(token.split('.')[1]));
  }

  private loadUserFromStorage(): User | null {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  }
}