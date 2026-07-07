import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { CalendarComponent } from './pages/calendar/calendar.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { HomeComponent } from './components/home/home.component';
import { authGuard } from './services/auth.guard';
import { adminGuard } from './services/admin.guard'; // Importa el nuevo guard
import { ContactListComponent } from './components/contact-list/contact-list.component';
import { PatientsComponent } from './pages/patients/patients.component';
import { VolunteersComponent } from './pages/volunteers/volunteers.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'calendar', component: CalendarComponent, canActivate: [authGuard] },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard, adminGuard],
    data: {
      mode: 'all'
    }
  },
  {
    path: 'contact-list',
    component: ContactListComponent,
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'volunteers',
    component: VolunteersComponent,
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'patients',
    component: PatientsComponent,
    canActivate: [authGuard, adminGuard]
  },
  { path: '**', redirectTo: '' }
];