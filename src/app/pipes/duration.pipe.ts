// src/app/pipes/duration.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatDuration',
  standalone: true // ESTO ES OBLIGATORIO
})
export class FormatDurationPipe implements PipeTransform {
  transform(value: number): string {
    if (value === undefined || value === null || value <= 0) return '0h 0m';
    
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    
    return `${hours}h ${minutes}m`;
  }
}