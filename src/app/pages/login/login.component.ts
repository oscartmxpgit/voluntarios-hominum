import { Component, AfterViewInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { GoogleLoaderService } from '../../services/google-loader.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements AfterViewInit {

  constructor(
    private auth: AuthService,
    private googleLoader: GoogleLoaderService
  ) {}

  async ngAfterViewInit() {
    await this.googleLoader.load();
    await this.auth.initializeAuth('google-button');
  }
}