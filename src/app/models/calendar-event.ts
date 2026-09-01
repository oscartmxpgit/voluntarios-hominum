export interface CalendarEvent {
  id?: string;
  volunteer_id?: number;
  start_datetime: string;
  end_datetime: string;
  comment?: string;
  comments?: string;

  // Campos específicos (uno de estos dos debería venir poblado)
  patient_id?: number | null;
  patient_name?: string | null; // Opcional, vendrá del JOIN con la tabla de pacientes
  title?: string | null;        // Campo para eventos generales
  full_name?: string | null;
  volunteer_name?: string | null;
  volunteer_email?: string | null;
  email?: string | null;
}