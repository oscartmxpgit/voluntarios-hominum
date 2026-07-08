import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PatientStat {
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
  patients: PatientStat[];
  expanded?: boolean;
  percentageOfMax?: number;
}

export interface DashboardData {
  kpis: {
    totalHistoricalHours: number;
    hoursThisMonth: number;
    visitsThisMonth: number;
    patientsThisMonth: number;
    historicalPatients: number;
  };
  currentMonth: MonthlyStat | null;
  history: MonthlyStat[];
}

@Injectable({
  providedIn: 'root'
})
export class SummaryService {

  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/time-entries`;

  async getTotalStats(): Promise<DashboardData> {
    const events = await firstValueFrom(
      this.http.get<any[]>(this.apiUrl)
    );
    return this.buildStats(events);
  }

  async getMyStats(): Promise<DashboardData> {
    const events = await firstValueFrom(
      this.http.get<any[]>(`${this.apiUrl}/mine`)
    );
    return this.buildStats(events);
  }

  private getDurationHours(event: any): number {
    if (!event.start_datetime || !event.end_datetime) {
      return 0;
    }
    const diff =
      (
        new Date(event.end_datetime).getTime() -
        new Date(event.start_datetime).getTime()
      ) / 3600000;
    return isNaN(diff) ? 0 : diff;
  }

  private buildStats(events: any[]): DashboardData {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let totalHistoricalHours = 0;
    const historicalPatients = new Set<string>();
    const monthlyMap = new Map<string, MonthlyStat>();

    const getMonthName = (key: string) => {
      const [year, month] = key.split('-');
      const date = new Date(+year, +month - 1);
      const monthName = date.toLocaleString('es-ES', { month: 'long' });
      return (
        monthName.charAt(0).toUpperCase() +
        monthName.slice(1) +
        ' ' +
        year
      );
    };

    for (const event of events) {
      if (!event.start_datetime) continue;

      const date = new Date(event.start_datetime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const hours = this.getDurationHours(event);
      const patient = event.patient_name ?? 'Sin paciente';

      totalHistoricalHours += hours;
      historicalPatients.add(patient);

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          monthKey,
          monthName: getMonthName(monthKey),
          totalHours: 0,
          totalVisits: 0,
          patients: [],
          expanded: false
        });
      }

      const month = monthlyMap.get(monthKey)!;
      month.totalHours += hours;
      month.totalVisits++;

      let patientStat = month.patients.find(p => p.name === patient);
      if (!patientStat) {
        patientStat = { name: patient, hours: 0, visits: 0 };
        month.patients.push(patientStat);
      }
      patientStat.hours += hours;
      patientStat.visits++;
    }

    const allMonths = Array.from(monthlyMap.values());
    const maxHours = Math.max(...allMonths.map(m => m.totalHours), 1);

    for (const month of allMonths) {
      month.percentageOfMax = Math.round(month.totalHours / maxHours * 100);
      month.patients.forEach(p => {
        p.percentage = Math.round(p.hours / (month.totalHours || 1) * 100);
      });
      month.patients.sort((a, b) => b.hours - a.hours);
    }

    allMonths.sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    let currentMonth = allMonths.find(m => m.monthKey === currentMonthKey) ?? null;
    const history = allMonths.filter(m => m.monthKey !== currentMonthKey);

    if (!currentMonth) {
      currentMonth = {
        monthKey: currentMonthKey,
        monthName: getMonthName(currentMonthKey),
        totalHours: 0,
        totalVisits: 0,
        patients: [],
        percentageOfMax: 0
      };
    }

    return {
      kpis: {
        totalHistoricalHours,
        hoursThisMonth: currentMonth.totalHours,
        visitsThisMonth: currentMonth.totalVisits,
        patientsThisMonth: currentMonth.patients.length,
        historicalPatients: historicalPatients.size
      },
      currentMonth,
      history
    };
  }
}