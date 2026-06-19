export interface CalendarEvent {
  id?: string;
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
  extendedProperties: {
    private: {
      volunteerEmail: string;
      volunteerName: string;
      patientName: string;
      category: string;
      notes: string;
    }
  };
}