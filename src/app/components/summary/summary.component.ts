import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './summary.component.html'
})
export class SummaryComponent {
  @Input() stats: any; // Recibe el objeto completo que devuelve SummaryService

  // Helper para formatear horas decimales a "Xh Ym"
  formatHours(decimalHours: any): string {
    const hours = parseFloat(decimalHours);
    if (isNaN(hours)) return '0h 0m';
    
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  }

  // Helper para convertir objeto de stats en array para el *ngFor
  getObjectKeys(obj: any) {
    return obj ? Object.keys(obj) : [];
  }
}