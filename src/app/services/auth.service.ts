import { Injectable, signal, NgZone } from '@angular/core';
import { User } from '../models/user';
import { environment } from '../../environments/environment';

declare var google: any;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly CLIENT_ID = environment.googleClientId;
  private tokenClient: any;
  user = signal<User | null>(this.loadUserFromStorage());

  constructor(private ngZone: NgZone) {}

  initializeAuth(elementId: string) {
    if (typeof google !== 'undefined' && google.accounts) {
      // 1. Inicialización para Login (Identidad)
      google.accounts.id.initialize({
        client_id: this.CLIENT_ID,
        callback: (res: any) => this.handleCredentialResponse(res)
      });
      
      const buttonElement = document.getElementById(elementId);
      if (buttonElement) {
        google.accounts.id.renderButton(buttonElement, { theme: "outline", size: "large" });
      }

      // 2. Inicialización para acceso a APIs (Autorización)
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: this.CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        callback: (response: any) => {
          if (response.access_token) {
            localStorage.setItem('token', response.access_token);
            console.log("Access token obtenido correctamente");
          }
        },
      });
    }
  }

  async requestCalendarAccess(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (localStorage.getItem('token')) {
        resolve();
      } else if (this.tokenClient) {
        // Configuramos el callback para resolver la promesa cuando llegue el token
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
      
      // Una vez logueado, pedimos permiso para el calendario
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