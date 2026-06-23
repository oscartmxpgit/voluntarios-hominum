import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SummaryService } from '../../services/summary.service';

interface DashboardStats {
  totalVisits: number;
  totalMonthlyHours: number;

  hoursByCategory: Record<string, number>;
  hoursByVolunteer: Record<string, number>;

  visitsByPatient: Record<string, number>;
  hoursByPatient: Record<string, number>;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private summaryService = inject(SummaryService);

  stats: DashboardStats | null = null;
  loading = true;

  async ngOnInit(): Promise<void> {
    await this.loadDashboardData();
  }

  private async loadDashboardData(): Promise<void> {
    try {
      this.stats = await this.summaryService.getTotalStats();
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      this.loading = false;
    }
  }
}