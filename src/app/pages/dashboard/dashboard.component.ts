import { Component, OnInit, inject, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SummaryService, DashboardData, YearlyStat, MonthlyStat } from '../../services/summary.service';
import { FormatDurationPipe } from '../../pipes/duration.pipe';
import { AuthService } from '../../services/auth.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormatDurationPipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private summaryService = inject(SummaryService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('dashboardContent', { static: false }) dashboardElement!: ElementRef;

  data: DashboardData | null = null;
  loading = true;
  isExporting = false;
  viewMode: 'personal' | 'global' = 'personal'; 
  isAdmin = false;

  async ngOnInit(): Promise<void> {
    this.isAdmin = this.authService.isAdmin(); 
    await this.loadDashboardData();
  }

  // Al tener un solo endpoint que filtra por backend, 
  // la lógica de "viewMode" ahora solo cambia lo que se muestra en el título.
  async setViewMode(mode: 'personal' | 'global'): Promise<void> {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    // No necesitamos llamar a la API de nuevo porque getData() 
    // siempre trae lo permitido para el usuario actual.
  }

  private async loadDashboardData(): Promise<void> {
    this.loading = true;
    this.cdr.detectChanges(); 
    
    try {
      // Llamada corregida al servicio unificado
      this.data = await this.summaryService.getData();
    } catch (error) {
      console.error('Error al cargar estadísticas del dashboard:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); 
    }
  }

  toggleYear(year: YearlyStat): void {
    year.expanded = !year.expanded;
  }

  toggleMonth(month: MonthlyStat, event: Event): void {
    event.stopPropagation();
    month.expanded = !month.expanded;
  }

  async exportToPDF(): Promise<void> {
    if (!this.dashboardElement) return;

    try {
      this.isExporting = true;
      const element = this.dashboardElement.nativeElement;

      this.expandAllForExport();
      this.cdr.detectChanges();

      const canvas = await html2canvas(element, {
        scale: 2, 
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      const fileName = `Reporte_Dashboard_${this.viewMode}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Error al exportar PDF:', error);
    } finally {
      this.isExporting = false;
      this.resetExpansions();
      this.cdr.detectChanges();
    }
  }

  private expandAllForExport(): void {
    if (!this.data) return;
    this.data.yearlyHistory.forEach(year => {
      year.expanded = true;
      year.months.forEach(month => month.expanded = true);
    });
  }

  private resetExpansions(): void {
    if (!this.data) return;
    const currentYear = new Date().getFullYear();
    this.data.yearlyHistory.forEach(year => {
      year.expanded = year.year === currentYear;
      year.months.forEach(month => month.expanded = false);
    });
  }
}