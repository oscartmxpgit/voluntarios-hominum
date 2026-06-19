import { Component, AfterViewInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `<div id="google-button"></div>`
})
export class LoginComponent implements AfterViewInit {
  constructor(private auth: AuthService) {}

  ngAfterViewInit() {
    this.auth.initializeAuth();
  }
}