export interface DashboardStats {
  totalVisits: number;
  totalMonthlyHours: number;
  monthlyBreakdown: Record<string, number>;

  hoursByCategory: Record<string, number>;
  hoursByVolunteer: Record<string, number>;

  visitsByPatient: Record<string, number>;
  hoursByPatient: Record<string, number>;
}