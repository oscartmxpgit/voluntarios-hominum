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

export interface TaskStat {
  name: string;
  hours: number;
  percentage?: number;
}

export interface MonthlyStat {
  monthKey: string;
  monthName: string;
  totalHours: number;
  totalVisits: number;
  patients: PatientStat[];
  tasks: TaskStat[];
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

@Injectable({ providedIn: 'root' })
export class SummaryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/time-entries`;

  async getTotalStats(): Promise<DashboardData> {
    const events = await firstValueFrom(this.http.get<any[]>(this.apiUrl));
    return this.buildStats(events);
  }

  async getMyStats(): Promise<DashboardData> {
    const events = await firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/mine`));
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
    const historicalPatientsSet = new Set<string>();
    
    const monthlyMap = new Map<string, MonthlyStat>();

    const getMonthName = (key: string) => {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      const name = date.toLocaleString('es-ES', { month: 'long' });
      return `${name.charAt(0).toUpperCase() + name.slice(1)} ${year}`;
    };

    events.forEach(event => {
      if (!event.start_datetime) return;
      
      const date = new Date(event.start_datetime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const hours = this.getDurationHours(event);
      const patient = event.patient_name || 'Sin asignar';
      const task = event.task_name || 'Sin tarea';

      totalHistoricalHours += hours;
      historicalPatientsSet.add(patient);

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          monthKey,
          monthName: getMonthName(monthKey),
          totalHours: 0,
          totalVisits: 0,
          patients: [],
          tasks: [],
          expanded: false
        });
      }

      const monthData = monthlyMap.get(monthKey)!;
      monthData.totalHours += hours;
      monthData.totalVisits += 1;

      // Actualizar paciente
      let pStat = monthData.patients.find(p => p.name === patient);
      if (!pStat) {
        pStat = { name: patient, hours: 0, visits: 0 };
        monthData.patients.push(pStat);
      }
      pStat.hours += hours;
      pStat.visits += 1;

      // Actualizar tarea
      let tStat = monthData.tasks.find(t => t.name === task);
      if (!tStat) {
        tStat = { name: task, hours: 0 };
        monthData.tasks.push(tStat);
      }
      tStat.hours += hours;
    });

    const allMonths = Array.from(monthlyMap.values());
    const maxMonthHours = Math.max(...allMonths.map(m => m.totalHours), 1);
    
    // Calcular porcentajes y ordenar
    allMonths.forEach(month => {
      month.percentageOfMax = Math.round((month.totalHours / maxMonthHours) * 100);
      
      month.patients.forEach(p => {
        p.percentage = Math.round((p.hours / (month.totalHours || 1)) * 100);
      });
      month.patients.sort((a, b) => b.hours - a.hours);

      month.tasks.forEach(t => {
        t.percentage = Math.round((t.hours / (month.totalHours || 1)) * 100);
      });
      month.tasks.sort((a, b) => b.hours - a.hours);
    });

    // Ordenar de más reciente a más antiguo
    allMonths.sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    const currentMonthIndex = allMonths.findIndex(m => m.monthKey === currentMonthKey);
    let currentMonth = null;
    let history = allMonths;

    if (currentMonthIndex !== -1) {
      currentMonth = allMonths[currentMonthIndex];
      history = allMonths.filter(m => m.monthKey !== currentMonthKey);
    } else {
      currentMonth = {
        monthKey: currentMonthKey,
        monthName: getMonthName(currentMonthKey),
        totalHours: 0,
        totalVisits: 0,
        patients: [],
        tasks: [],
        percentageOfMax: 0
      };
    }

    return {
      kpis: {
        totalHistoricalHours,
        hoursThisMonth: currentMonth.totalHours,
        visitsThisMonth: currentMonth.totalVisits,
        patientsThisMonth: currentMonth.patients.length,
        historicalPatients: historicalPatientsSet.size
      },
      currentMonth,
      history
    };
  }
}