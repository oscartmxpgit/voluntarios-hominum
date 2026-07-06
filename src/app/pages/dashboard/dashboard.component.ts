import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SummaryService, DashboardData, MonthlyStat } from '../../services/summary.service';
import { FormatDurationPipe } from '../../pipes/duration.pipe';
import { AuthService } from '../../services/auth.service'; // Ajusta la ruta a tu servicio de autenticación

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormatDurationPipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private summaryService = inject(SummaryService);
  private authService = inject(AuthService); // Inyectamos el servicio para verificar el rol

  data: DashboardData | null = null;
  loading = true;
  viewMode: 'personal' | 'global' = 'personal'; 
  isAdmin = false;

  async ngOnInit(): Promise<void> {
    // Aquí verificamos si el usuario es coordinador/admin. 
    // Ajusta esto según el método real de tu AuthService (ej. this.authService.user.role === 'admin')
    this.isAdmin = this.authService.isAdmin(); 

    await this.loadDashboardData();
  }

  async setViewMode(mode: 'personal' | 'global'): Promise<void> {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.loading = true;
    await this.loadDashboardData();
  }

  private async loadDashboardData(): Promise<void> {
    try {
      if (this.viewMode === 'personal') {
        this.data = await this.summaryService.getMyStats();
      } else {
        this.data = await this.summaryService.getTotalStats();
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      this.loading = false;
    }
  }

  toggleMonth(month: MonthlyStat): void {
    month.expanded = !month.expanded;
  }
}