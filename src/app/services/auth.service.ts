import { Injectable, signal, NgZone } from '@angular/core';
import { User } from '../models/user';

declare var google: any;

@Injectable({ providedIn: 'root' })
export class AuthService {
  user = signal<User | null>(null);
  private readonly CLIENT_ID = 'TU_CLIENT_ID_DE_GOOGLE.apps.googleusercontent.com';

  constructor(private ngZone: NgZone) {}

  initializeAuth() {
    google.accounts.id.initialize({
      client_id: this.CLIENT_ID,
      callback: (res: any) => this.handleCredentialResponse(res)
    });
    
    // Renderiza el botón de login automático
    google.accounts.id.renderButton(
      document.getElementById("google-button"),
      { theme: "outline", size: "large" }
    );
  }

  private handleCredentialResponse(response: any) {
    // Decodificar JWT (normalmente se hace en backend, aquí extraemos info del token)
    const base64Url = response.credential.split('.')[1];
    const payload = JSON.parse(window.atob(base64Url));

    this.ngZone.run(() => {
      this.user.set({
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        isCoordinator: payload.email === 'coordinador@gmail.com'
      });
      // Aquí puedes guardar el token para el CalendarService
    });
  }
}