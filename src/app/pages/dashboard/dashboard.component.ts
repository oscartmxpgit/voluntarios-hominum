import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SummaryService, DashboardData, MonthlyStat } from '../../services/summary.service';
import { FormatDurationPipe } from '../../pipes/duration.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormatDurationPipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private summaryService = inject(SummaryService);

  data: DashboardData | null = null;
  loading = true;

  async ngOnInit(): Promise<void> {
    await this.loadDashboardData();
  }

  private async loadDashboardData(): Promise<void> {
    try {
      // Usar getMyStats() si es el panel personal de "Mis horas"
      this.data = await this.summaryService.getTotalStats();
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