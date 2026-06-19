import { Injectable, signal, NgZone } from '@angular/core';
import { User } from '../models/user';
import { environment } from '../../environments/environment';

declare var google: any;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly CLIENT_ID = environment.googleClientId;
  private tokenClient: any;
  user = signal<User | null>(this.loadUserFromStorage());

  constructor(private ngZone: NgZone) { }

  // En src/app/services/auth.service.ts
  initializeAuth(elementId: string) {
    // Verificación robusta: Esperar a que 'google' esté definido
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
          console.log("Access token obtenido correctamente");
        }
      },
    });
  }

  async requestCalendarAccess(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Si ya tenemos token, no pedimos permiso de nuevo
      if (localStorage.getItem('token')) {
        resolve();
      } else if (this.tokenClient) {
        this.tokenClient.callback = (response: any) => {
          if (response.access_token) {
            localStorage.setItem('token', response.access_token);
            resolve();
          } else {
            reject("No se pudo obtener el token");
          }
        };
        this.tokenClient.requestAccessToken();
      } else {
        reject("TokenClient no inicializado");
      }
    });
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private handleCredentialResponse(response: any) {
    const payload = this.decodeToken(response.credential);
    this.ngZone.run(() => {
      const userData: User = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        isCoordinator: payload.email === 'coordinador@gmail.com'
      };
      this.user.set(userData);
      localStorage.setItem('user', JSON.stringify(userData));

      // Tras loguear, solicitamos los permisos de calendario completos
      this.requestCalendarAccess().catch(err => console.error(err));
    });
  }

  logout() {
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.disableAutoSelect();
    }
    this.user.set(null);
    localStorage.clear();
  }

  isLoggedIn(): boolean {
    return this.user() !== null;
  }

  private decodeToken(token: string) {
    return JSON.parse(window.atob(token.split('.')[1]));
  }

  private loadUserFromStorage(): User | null {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  }
}