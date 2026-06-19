export interface CalendarEvent {
  id?: string;
  summary: string;
  start: { dateTime?: string, date?: string };
  end: { dateTime?: string, date?: string };
  extendedProperties?: {
    private?: {
      volunteerEmail?: string;
      volunteerName?: string;
      patientName?: string;
      category?: string;
      notes?: string;
    }
  };
}