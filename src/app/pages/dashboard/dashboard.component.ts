import { Component, OnInit, inject, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SummaryService, DashboardData, YearlyStat, MonthlyStat } from '../../services/summary.service';
import { FormatDurationPipe } from '../../pipes/duration.pipe';
import { AuthService } from '../../services/auth.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

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

  async setViewMode(mode: 'personal' | 'global'): Promise<void> {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    await this.loadDashboardData();
  }

  private async loadDashboardData(): Promise<void> {
    this.loading = true;
    this.cdr.detectChanges();
    try {
      this.data = await this.summaryService.getData(this.viewMode);
    } catch (error) {
      console.error('Error al cargar datos:', error);
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

  exportToExcel(): void {
    if (!this.data) return;

    const workbook = XLSX.utils.book_new();

    // Sheet 1: KPIs & Current Month Summary
    const summaryRows: any[][] = [];
    summaryRows.push([`Reporte de Estadísticas - ${this.viewMode === 'personal' ? 'Mis Estadísticas' : 'Estadísticas Globales'}`]);
    summaryRows.push([]);

    summaryRows.push(['Métrica KPI', 'Valor']);
    summaryRows.push(['Horas Este Mes', this.data.kpis.hoursThisMonth || 0]);
    summaryRows.push(['Total Histórico (Horas)', this.data.kpis.totalHistoricalHours || 0]);
    summaryRows.push(['Pacientes/Eventos Mes', this.data.kpis.subjectsThisMonth || 0]);
    summaryRows.push(['Total Visitas Mes', this.data.kpis.visitsThisMonth || 0]);
    summaryRows.push([]);

    if (this.data.currentMonth) {
      summaryRows.push([`Distribución Mes Actual (${this.data.currentMonth.monthName})`]);
      summaryRows.push(['Paciente / Tipo de Evento', 'Registros', 'Horas Dedicadas', 'Porcentaje']);
      this.data.currentMonth.subjects.forEach(subject => {
        summaryRows.push([
          subject.name,
          subject.visits,
          subject.hours,
          `${subject.percentage}%`
        ]);
      });
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    // Sheet 2: Historical Evolution
    const historyRows: any[][] = [];
    historyRows.push(['Año', 'Mes', 'Paciente / Tipo de Evento', 'Horas Dedicadas', 'Registros', '% del Mes']);

    this.data.yearlyHistory.forEach(yearStat => {
      yearStat.months.forEach(month => {
        month.subjects.forEach(subject => {
          historyRows.push([
            yearStat.year,
            month.monthName,
            subject.name,
            subject.hours,
            subject.visits,
            `${subject.percentage}%`
          ]);
        });
      });
    });

    const historySheet = XLSX.utils.aoa_to_sheet(historyRows);
    XLSX.utils.book_append_sheet(workbook, historySheet, 'Historial');

    // Download .xlsx file
    const filename = `Estadisticas_${this.viewMode}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  }

  async exportToPDF(): Promise<void> {
    if (!this.dashboardElement) return;
    try {
      this.isExporting = true;
      this.expandAllForExport();
      this.cdr.detectChanges();
      const canvas = await html2canvas(this.dashboardElement.nativeElement, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Reporte_${this.viewMode}_${new Date().toISOString().split('T')[0]}.pdf`);
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