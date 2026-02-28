export interface Course {
  id: string;
  name: string;
}

export type ActivityType = 'Examen' | 'Tarea' | 'Proyecto';

export interface SubtaskFormData {
  id: string;
  name: string;
  targetDate: string;
  estimatedHours: number;
}

export interface ActivityFormData {
  title: string;
  courseId: string;
  type: ActivityType;
  deliveryDate: string;
  eventDate: string;
  description: string;
  subtasks: SubtaskFormData[];
}
