import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientsService, Patient, Volunteer } from '../../services/patients.service';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patients.component.html',
  styleUrls: ['./patients.component.css']
})
export class PatientsComponent implements OnInit {

  private patientsService = inject(PatientsService);

  patients: Patient[] = [];
  volunteers: Volunteer[] = [];

  loading = true;

  showForm = false;
  isEditing = false;

  currentPatient: Patient = {
    name: '',
    assigned_volunteer_id: null
  };

  async ngOnInit(): Promise<void> {
    try {
      await this.refreshData();
    } catch (err) {
      console.error(err);
    } finally {
      this.loading = false;
    }
  }

  private async refreshData(): Promise<void> {

    const [patients, volunteers] = await Promise.all([
      this.patientsService.getAll(),
      this.patientsService.getVolunteers()
    ]);

    this.patients = patients.map(p => ({
      ...p,
      assigned_volunteer_id:
        p.assigned_volunteer_id == null
          ? null
          : Number(p.assigned_volunteer_id)
    }));

    this.volunteers = volunteers;
  }

  openCreateModal(): void {

    this.isEditing = false;

    this.currentPatient = {
      name: '',
      assigned_volunteer_id: null
    };

    this.showForm = true;
  }

  openEditModal(patient: Patient): void {

    this.isEditing = true;

    this.currentPatient = {
      ...patient,
      assigned_volunteer_id:
        patient.assigned_volunteer_id == null
          ? null
          : Number(patient.assigned_volunteer_id)
    };

    this.showForm = true;
  }

  async savePatient(): Promise<void> {

    if (!this.currentPatient.name.trim()) {
      return;
    }

    try {

      const payload: Patient = {
        ...this.currentPatient,
        assigned_volunteer_id:
          this.currentPatient.assigned_volunteer_id == null
            ? null
            : Number(this.currentPatient.assigned_volunteer_id)
      };

      console.log('Saving patient:', payload);

      if (this.isEditing && payload.id) {
        await this.patientsService.update(payload);
      } else {
        await this.patientsService.create(payload);
      }

      this.showForm = false;

      await this.refreshData();

    } catch (error) {
      console.error('Error al guardar:', error);
    }
  }

  async deletePatient(id: number): Promise<void> {

    if (!confirm('¿Estás seguro de eliminar este paciente?')) {
      return;
    }

    try {
      await this.patientsService.delete(id);
      await this.refreshData();
    } catch (error) {
      console.error(error);
    }
  }

  cancelForm(): void {
    this.showForm = false;
  }

  compareVolunteer = (a: number | null, b: number | null): boolean =>
    Number(a) === Number(b);
}