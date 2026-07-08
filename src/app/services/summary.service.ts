import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SubjectStat {
  name: string;
  hours: number;
  visits: number;
  percentage?: number;
}

export interface MonthlyStat {
  monthKey: string;
  monthName: string;
  totalHours: number;
  totalVisits: number;
  subjects: SubjectStat[];
  expanded?: boolean;
  percentageOfMax?: number;
}

export interface YearlyStat {
  year: number;
  totalHours: number;
  totalVisits: number;
  months: MonthlyStat[];
  expanded?: boolean;
}

export interface DashboardData {
  kpis: {
    totalHistoricalHours: number;
    hoursThisMonth: number;
    visitsThisMonth: number;
    subjectsThisMonth: number;
    historicalSubjects: number;
  };
  currentMonth: MonthlyStat | null;
  yearlyHistory: YearlyStat[];
}

@Injectable({
  providedIn: 'root'
})
export class SummaryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/time-entries`;

  /**
   * Obtiene todos los eventos. El backend filtra automáticamente si el usuario 
   * no es coordinador, devolviendo solo los eventos permitidos.
   */
  async getData(): Promise<DashboardData> {
    const events = await firstValueFrom(this.http.get<any[]>(this.apiUrl));
    return this.buildStats(events);
  }

  private getDurationHours(event: any): number {
    if (!event.start_datetime || !event.end_datetime) return 0;
    const diff = (new Date(event.end_datetime).getTime() - new Date(event.start_datetime).getTime()) / 3600000;
    return isNaN(diff) ? 0 : diff;
  }

  private buildStats(events: any[]): DashboardData {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let totalHistoricalHours = 0;
    const historicalSubjects = new Set<string>();
    const yearlyMap = new Map<number, YearlyStat>();

    const getMonthName = (monthIndex: number) => {
      const date = new Date(2000, monthIndex - 1, 1);
      const name = date.toLocaleString('es-ES', { month: 'long' });
      return name.charAt(0).toUpperCase() + name.slice(1);
    };

    for (const event of events) {
      if (!event.start_datetime) continue;

      const date = new Date(event.start_datetime);
      const year = date.getFullYear();
      const monthNum = date.getMonth() + 1;
      const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
      const hours = this.getDurationHours(event);
      
      // Lógica de fallback: Prioriza paciente, si no, usa título del evento
      const subjectName = event.patient_name || event.title || 'Evento sin título';

      totalHistoricalHours += hours;
      historicalSubjects.add(subjectName);

      if (!yearlyMap.has(year)) {
        yearlyMap.set(year, {
          year: year,
          totalHours: 0,
          totalVisits: 0,
          months: [],
          expanded: year === now.getFullYear()
        });
      }
      const yearStat = yearlyMap.get(year)!;
      yearStat.totalHours += hours;
      yearStat.totalVisits++;

      let monthStat = yearStat.months.find(m => m.monthKey === monthKey);
      if (!monthStat) {
        monthStat = {
          monthKey,
          monthName: getMonthName(monthNum),
          totalHours: 0,
          totalVisits: 0,
          subjects: [],
          expanded: false
        };
        yearStat.months.push(monthStat);
      }
      monthStat.totalHours += hours;
      monthStat.totalVisits++;

      let subjectStat = monthStat.subjects.find(s => s.name === subjectName);
      if (!subjectStat) {
        subjectStat = { name: subjectName, hours: 0, visits: 0 };
        monthStat.subjects.push(subjectStat);
      }
      subjectStat.hours += hours;
      subjectStat.visits++;
    }

    const yearlyHistory = Array.from(yearlyMap.values()).sort((a, b) => b.year - a.year);
    let currentMonth: MonthlyStat | null = null;
    let globalMaxHours = 1;

    for (const yearStat of yearlyHistory) {
      yearStat.months.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
      for (const month of yearStat.months) {
        if (month.totalHours > globalMaxHours) globalMaxHours = month.totalHours;
        month.subjects.sort((a, b) => b.hours - a.hours);
        month.subjects.forEach(s => {
          s.percentage = Math.round((s.hours / (month.totalHours || 1)) * 100);
        });
        if (month.monthKey === currentMonthKey) currentMonth = month;
      }
    }

    for (const yearStat of yearlyHistory) {
      for (const month of yearStat.months) {
        month.percentageOfMax = Math.round((month.totalHours / globalMaxHours) * 100);
      }
    }

    if (!currentMonth) {
      currentMonth = {
        monthKey: currentMonthKey,
        monthName: getMonthName(now.getMonth() + 1),
        totalHours: 0,
        totalVisits: 0,
        subjects: [],
        percentageOfMax: 0
      };
    }

    return {
      kpis: {
        totalHistoricalHours,
        hoursThisMonth: currentMonth.totalHours,
        visitsThisMonth: currentMonth.totalVisits,
        subjectsThisMonth: currentMonth.subjects.length,
        historicalSubjects: historicalSubjects.size
      },
      currentMonth,
      yearlyHistory
    };
  }
}