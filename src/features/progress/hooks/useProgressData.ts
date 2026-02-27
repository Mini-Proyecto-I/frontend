// @/features/progress/hooks/useProgressData.ts
import { useState, useEffect, useCallback } from 'react';
import { getActivities } from '@/api/services/activity';
import { getSubtasksForActivity, patchSubtask } from '@/api/services/subtack';
// ✅ CAMBIO 1: Importar useToast en lugar de toast
import { useToast } from '@/shared/components/toast';

export interface Course {
  id: number | string;
  name: string;
  color?: string;
  course_color?: string;
}

export interface Subtask {
  id: number;
  name: string;
  status: 'PENDING' | 'DONE' | 'POSTPONED' | 'WAITING';
  estimated_hours?: number;
  note?: string;
}

export interface Activity {
  id: number;
  title: string;
  course: string | Course;
  course_color?: string;
  deadline: string | null;
  subtasks: Subtask[];
}

export function useProgressData() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ CAMBIO 2: Inicializar useToast
  const { showToast } = useToast();

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const activitiesData = await getActivities();
      
      const activitiesWithSubtasks = await Promise.all(
        activitiesData.map(async (activity: any) => {
          try {
            const subtasks = await getSubtasksForActivity(activity.id);
            return {
              ...activity,
              subtasks: Array.isArray(subtasks) ? subtasks : [],
              course_color: activity.course_color || 'cyan',
            };
          } catch {
            return {
              ...activity,
              subtasks: [],
              course_color: activity.course_color || 'cyan',
            };
          }
        })
      );

      setActivities(activitiesWithSubtasks);
      
      const courseMap = new Map<string | number, Course>();
      activitiesWithSubtasks.forEach((a) => {
        if (typeof a.course === 'object' && a.course !== null) {
          const course = a.course as Course;
          courseMap.set(course.id, course);
        } else if (typeof a.course === 'string') {
          courseMap.set(a.course, { id: a.course, name: a.course });
        }
      });
      setCourses(Array.from(courseMap.values()));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load activities';
      setError(errorMessage);
      // ✅ CAMBIO 3: Usar showToast con mensaje en español
      showToast('No se pudieron cargar las actividades. Verifica tu conexión.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSubtask = useCallback(
    async (activityId: number, subtaskId: number, updates: Partial<Subtask>) => {
      // Optimistic update
      setActivities((prev: Activity[]) =>
        prev.map((activity: Activity) =>
          activity.id === activityId
            ? {
                ...activity,
                subtasks: activity.subtasks.map((st: Subtask) =>
                  st.id === subtaskId ? { ...st, ...updates } : st
                ),
              }
            : activity
        )
      );

      try {
        await patchSubtask(activityId, subtaskId, updates);
        
        // ✅ CAMBIO 4: Comparar con 'DONE' (mayúscula) y usar showToast
        // ✅ CAMBIO 5: Mensajes en español sin emojis
        if (updates.status === 'DONE') {
          showToast('Tarea completada exitosamente', 'success');
        } else {
          showToast('Cambios guardados correctamente', 'success');
        }
      } catch (err) {
        fetchActivities();
        // ✅ CAMBIO 6: Mensaje de error claro en español
        showToast('No se pudo actualizar la tarea. Verifica tu conexión e intenta de nuevo.', 'error');
      }
    },
    [fetchActivities]
  );

  const refresh = useCallback(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    courses,
    loading,
    error,
    refresh,
    updateSubtask,
  };
}