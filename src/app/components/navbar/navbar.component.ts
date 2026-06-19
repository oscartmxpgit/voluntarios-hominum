import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; // <--- Importante

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule], // <--- Importante
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {}