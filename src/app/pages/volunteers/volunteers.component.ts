import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VolunteersService, Volunteer } from '../../services/volunteers.service';

@Component({
  selector: 'app-volunteers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './volunteers.component.html',
  styleUrls: ['./volunteers.component.css']
})
export class VolunteersComponent implements OnInit {
  private volunteersService = inject(VolunteersService);

  volunteers: Volunteer[] = [];
  loading = true;
  showForm = false;
  newEmail = '';

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  private async loadData(): Promise<void> {
    try {
      this.volunteers = await this.volunteersService.getAll();
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      this.loading = false;
    }
  }

  openCreateModal(): void {
    this.newEmail = '';
    this.showForm = true;
  }

  async createVolunteer(): Promise<void> {
    if (!this.newEmail) return;
    try {
      await this.volunteersService.create({ email: this.newEmail } as any);
      this.showForm = false;
      await this.loadData();
    } catch (error) {
      console.error('Error al crear usuario:', error);
    }
  }

  async toggleActive(volunteer: Volunteer): Promise<void> {
    if (volunteer.is_coordinator === 1) return;

    // Determinamos el nuevo estado lógico inverso
    const currentStatus = volunteer.is_active === 1;
    const newStatus = currentStatus ? 0 : 1;

    try {
      // Llamada al método update de tu servicio pasándole el ID y el nuevo estado de activación
      await this.volunteersService.update(volunteer.id, { is_active: newStatus });
      
      // Actualizamos el estado de manera local tras confirmar éxito en el backend
      volunteer.is_active = newStatus;
    } catch (error) {
      console.error('Error al cambiar el estado del voluntario:', error);
      // Revertimos el estado visual recargando el listado si la API da error
      await this.loadData();
    }
  }

  async deleteUser(volunteer: Volunteer): Promise<void> {
    if (volunteer.is_coordinator === 1) {
      alert('No se puede eliminar a un coordinador.');
      return;
    }
    if (!confirm(`¿Seguro que deseas eliminar a ${volunteer.email}?`)) return;
    try {
      await this.volunteersService.delete(volunteer.id);
      await this.loadData();
    } catch (error) {
      console.error(error);
    }
  }
}