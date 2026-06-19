import { Injectable, signal, NgZone } from '@angular/core';
import { User } from '../models/user';
import { environment } from '../../environments/environment'; // Importamos el entorno

declare var google: any;

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Usamos la variable del entorno
  private readonly CLIENT_ID = environment.googleClientId;
  
  user = signal<User | null>(this.loadUserFromStorage());

  constructor(private ngZone: NgZone) {}

  initializeAuth(elementId: string) {
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.initialize({
        client_id: this.CLIENT_ID,
        callback: (res: any) => this.handleCredentialResponse(res)
      });
      
      const buttonElement = document.getElementById(elementId);
      if (buttonElement) {
        google.accounts.id.renderButton(
          buttonElement,
          { theme: "outline", size: "large", type: "standard" }
        );
      }
    }
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
      localStorage.setItem('token', response.credential);
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