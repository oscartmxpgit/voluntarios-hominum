import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SummaryService } from '../../services/summary.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  // Inyección de dependencia moderna usando inject
  private summaryService = inject(SummaryService);
  
  // Propiedades para mostrar en el template
  stats: any = null;
  loading: boolean = true;

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private async loadDashboardData() {
    try {
      // Supongamos que el servicio devuelve un observable o una promesa
      this.stats = await this.summaryService.getTotalStats();
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      this.loading = false;
    }
  }
}