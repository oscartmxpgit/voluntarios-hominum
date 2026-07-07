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
  currentPatient: Patient = { name: '', assigned_volunteer_id: null };

  async ngOnInit(): Promise<void> {
    await this.refreshData();
    this.loading = false;
  }

  private async refreshData(): Promise<void> {
    [this.patients, this.volunteers] = await Promise.all([
      this.patientsService.getAll(),
      this.patientsService.getVolunteers()
    ]);
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.currentPatient = { name: '', assigned_volunteer_id: null };
    this.showForm = true;
  }

  openEditModal(patient: Patient): void {
    this.isEditing = true;
    this.currentPatient = { ...patient };
    this.showForm = true;
  }

  async savePatient(): Promise<void> {
    if (!this.currentPatient.name.trim()) return;

    try {
      if (this.isEditing && this.currentPatient.id) {
        await this.patientsService.update(this.currentPatient);
      } else {
        await this.patientsService.create(this.currentPatient);
      }
      this.showForm = false;
      await this.refreshData();
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  }

  async deletePatient(id: number): Promise<void> {
    if (!confirm('¿Estás seguro de eliminar este paciente?')) return;

    try {
      await this.patientsService.delete(id);
      await this.refreshData();
    } catch (error) {
      console.error('Error al eliminar:', error);
    }
  }

  cancelForm(): void {
    this.showForm = false;
  }
}