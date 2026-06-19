import { Component, OnInit, inject } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarService } from '../../services/calendar.service';
import { EventFormComponent } from '../../components/event-form/event-form.component';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [FullCalendarModule, EventFormComponent],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {
  private calendarService = inject(CalendarService);

  isFormVisible = false;
  selectedEvent: any = null;

  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    selectable: true,
    editable: true,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek'
    },
    dateClick: (info) => this.handleDateClick(info),
    eventClick: (info) => this.handleEventClick(info),
    eventDrop: (info) => this.handleEventChange(info),
    eventResize: (info) => this.handleEventChange(info),
    events: []
  };

  async ngOnInit() {
    await this.loadEvents();
  }

  async loadEvents() {
    const eventos = await this.calendarService.getAllEvents();
    this.calendarOptions = { ...this.calendarOptions, events: eventos };
  }

  handleDateClick(info: any) {
    this.selectedEvent = {
      title: '',
      start: info.dateStr,
      end: info.dateStr,
      extendedProps: { volunteerName: '', patientName: '', category: '', notes: '' }
    };
    this.isFormVisible = true;
  }

  handleEventClick(info: any) {
    this.selectedEvent = {
      id: info.event.id,
      title: info.event.title,
      start: info.event.startStr,
      end: info.event.endStr,
      extendedProps: { ...info.event.extendedProps }
    };
    this.isFormVisible = true;
  }

  async handleEventChange(info: any) {
    // Usar directamente las cadenas ISO proporcionadas por FullCalendar
    const updatedEvent = {
      title: info.event.title,
      start: info.event.startStr, 
      end: info.event.endStr || info.event.startStr,
      extendedProps: info.event.extendedProps
    };

    try {
      await this.calendarService.updateEvent(info.event.id, updatedEvent);
    } catch (error) {
      console.error("Error al persistir cambio, revirtiendo...", error);
      info.revert();
    }
  }
}