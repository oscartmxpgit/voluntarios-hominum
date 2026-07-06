import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Obligatorio
import { SummaryService } from '../../services/summary.service';

@Component({
  selector: 'app-my-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-dashboard.component.html',
  styleUrl: './my-dashboard.component.css'
})
export class MyDashboardComponent implements OnInit {
  private summaryService = inject(SummaryService);
  stats: any = null;
  loading = true;

  async ngOnInit() {
    this.stats = await this.summaryService.getMyStats();
    this.loading = false;
  }

  // Helper para convertir objeto de claves a array de pares [clave, valor]
  getObjectKeys(obj: any): [string, number][] {
    // Aseguramos que devolvemos un array de pares [string, number]
    return Object.entries(obj) as [string, number][];
  }
}