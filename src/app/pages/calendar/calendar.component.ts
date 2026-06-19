import { Component, OnInit, inject } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import { CalendarService } from '../../services/calendar.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [FullCalendarModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {
  private calendarService = inject(CalendarService);
  
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek'
    },
    events: []
  };

  async ngOnInit() {
    await this.loadEvents();
  }

  private async loadEvents() {
    const eventos = await this.calendarService.getAllEvents();
    // Actualizamos las opciones creando un nuevo objeto para disparar la detección de cambios
    this.calendarOptions = { 
      ...this.calendarOptions, 
      events: eventos 
    };
  }
}