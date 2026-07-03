import { Component } from '@angular/core';
import { ContactComponent } from '../contact/contact.component';
import { HeroComponent } from '../hero/hero.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ContactComponent, HeroComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent { }