import { Injectable, signal } from '@angular/core';
import { User } from '../models/user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Usamos signals para que la UI se actualice automáticamente
  user = signal<User | null>(null);

  constructor() {}

  login() {
    // Aquí inicializarás google.accounts.id.initialize
    console.log('Iniciando flujo de Google Login...');
  }

  logout() {
    this.user.set(null);
  }

  isLoggedIn(): boolean {
    return this.user() !== null;
  }
}