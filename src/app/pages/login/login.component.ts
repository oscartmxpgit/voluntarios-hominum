import { Component, AfterViewInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements AfterViewInit {
  constructor(private auth: AuthService) {}

  ngAfterViewInit() {
    if (typeof google !== 'undefined') {
      this.auth.initializeAuth('google-button');
    }
  }
}