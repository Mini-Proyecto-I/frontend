// @/features/progress/hooks/useProgressData.ts
import { useState, useEffect, useCallback } from 'react';
import { getActivities, getCompletionPercent as getCompletionPercentApi } from '@/api/services/activity';
import { getSubtasksForActivity, patchSubtask, postponeSubtask as apiPostponeSubtask, putSubtaskWithConflictTolerance } from '@/api/services/subtask';
import { useToast } from '@/shared/components/toast';
import { queryCache } from '@/lib/queryCache';

const ACTIVITIES_TTL = 5 * 60 * 1000; // 5 minutes
const SUBTASKS_TTL = 5 * 60 * 1000;   // 5 minutes

export interface Course {
  id: number | string;
  name: string;
  color?: string;
  course_color?: string;
}

export interface Subtask {
  id: number;
  name: string;
  title?: string;
  status: 'PENDING' | 'DONE' | 'POSTPONED' | 'WAITING';
  estimated_hours?: number;
  note?: string;
  posponed_note?: string;
  is_conflicted?: boolean;
  target_date?: string;
}

export interface Activity {
  id: number;
  title: string;
  course: string | Course;
  course_color?: string;
  deadline: string | null;
  subtasks: Subtask[];
  matchingSubtasks?: Subtask[];
  total_subtasks?: number;
  total_subtasks_done?: number;
  completion_percent?: number;
}

export function useProgressData() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { showToast } = useToast();

  const fetchActivities = useCallback(async (bypassCache = false) => {
    // ── Serve from cache if available ──────────────────────────────────────
    if (!bypassCache) {
      const cachedActivities = queryCache.get<Activity[]>('activities');
      if (cachedActivities) {
        setActivities(cachedActivities);

        // Rebuild course list from cached activities
        const courseMap = new Map<string | number, Course>();
        cachedActivities.forEach((a) => {
          if (typeof a.course === 'object' && a.course !== null) {
            const course = a.course as Course;
            courseMap.set(course.id, course);
          } else if (typeof a.course === 'string') {
            courseMap.set(a.course, { id: a.course, name: a.course });
          }
        });
        setCourses(Array.from(courseMap.values()));
        setLoading(false);
        setError(null);
        return;
      }
    }

    // ── Cache miss → fetch from API ─────────────────────────────────────────
    try {
      setLoading(true);
      setError(null);

      const activitiesData = await getActivities();

      // Since the backend now includes subtasks in the activity response 
      // thanks to our recent Serializer update, we no longer need to 
      // fetch them individually here. This fixes the N+1 API call issue.
      const activitiesWithSubtasks = (activitiesData || []).map((activity: any) => ({
        ...activity,
        subtasks: Array.isArray(activity.subtasks) ? activity.subtasks : [],
        course_color: activity.course_color || 'cyan',
      }));

      queryCache.set('activities', activitiesWithSubtasks, ACTIVITIES_TTL);
      setActivities(activitiesWithSubtasks);

      const courseMap = new Map<string | number, Course>();
      activitiesWithSubtasks.forEach((a: Activity) => {
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
      showToast('No se pudieron cargar las actividades. Verifica tu conexión.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Applies an optimistic local update to a single subtask and also updates
   * the cache so the next navigation still sees the fresh data.
   */
  const updateSubtask = useCallback(
    async (activityId: number, subtaskId: number, updates: Partial<Subtask>, options?: { tolerant?: boolean }) => {
      // Optimistic local state update
      setActivities((prev: Activity[]) => {
        const updated = prev.map((activity: Activity) => {
          if (activity.id !== activityId) return activity;

          const updatedSubtasks = activity.subtasks.map((st: Subtask) =>
            st.id === subtaskId ? { ...st, ...updates } : st
          );

          // Recalculate counters for the activity to keep UI in sync optimistically
          const total = activity.total_subtasks ?? updatedSubtasks.length;
          const done = updatedSubtasks.filter(st => st.status === 'DONE').length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;

          return {
            ...activity,
            subtasks: updatedSubtasks,
            total_subtasks_done: done,
            completion_percent: pct
          };
        });

        // Sync the updated activities list back into cache
        queryCache.set('activities', updated, ACTIVITIES_TTL);

        // Also update the per-activity subtask cache entry
        const updatedActivity = updated.find((a) => a.id === activityId);
        if (updatedActivity) {
          queryCache.set(`subtasks:${activityId}`, updatedActivity.subtasks, SUBTASKS_TTL);
        }

        return updated;
      });

      try {
        let responseData;
        if (options?.tolerant) {
          responseData = await putSubtaskWithConflictTolerance(subtaskId, updates);
        } else {
          responseData = await patchSubtask(activityId, subtaskId, updates);
        }

        if (updates.status === 'DONE') {
          showToast('Tarea completada exitosamente', 'success');
        } else if (updates.status === 'PENDING') {
          showToast('Tarea marcada como pendiente', 'success');
        } else {
          showToast('Cambios guardados correctamente', 'success');
        }
        return responseData;
      } catch (err) {
        // On error: invalidate cache and re-fetch to get authoritative state
        queryCache.invalidate('activities');
        queryCache.invalidateByPrefix('subtasks:');
        fetchActivities(true);
        showToast('No se pudo actualizar la tarea. Verifica tu conexión e intenta de nuevo.', 'error');
      }
    },
    [fetchActivities]
  );

  /**
   * Postpone a subtask with optimistic update
   */
  const postponeSubtaskAction = useCallback(
    async (activityId: number, subtaskId: number, note: string) => {
      // Optimistic local state update
      setActivities((prev: Activity[]) => {
        const updated = prev.map((activity: Activity) => {
          if (activity.id !== activityId) return activity;

          const updatedSubtasks = activity.subtasks.map((st: Subtask) =>
            st.id === subtaskId ? { ...st, status: 'POSTPONED' as any, note } : st
          );

          // Recalculate counters for the activity to keep UI in sync optimistically
          const total = (activity as any).total_subtasks ?? updatedSubtasks.length;
          const done = updatedSubtasks.filter(st => st.status === 'DONE').length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;

          return {
            ...activity,
            subtasks: updatedSubtasks,
            total_subtasks_done: done,
            completion_percent: pct
          };
        });

        // Sync the updated activities list back into cache
        queryCache.set('activities', updated, ACTIVITIES_TTL);

        // Also update the per-activity subtask cache entry
        const updatedActivity = updated.find((a) => a.id === activityId);
        if (updatedActivity) {
          queryCache.set(`subtasks:${activityId}`, updatedActivity.subtasks, SUBTASKS_TTL);
        }

        return updated;
      });

      try {
        await apiPostponeSubtask(activityId, subtaskId, note);
        showToast('Tarea pospuesta correctamente', 'success');
      } catch (err) {
        queryCache.invalidate('activities');
        queryCache.invalidateByPrefix('subtasks:');
        fetchActivities(true);
        showToast('No se pudo posponer la tarea.', 'error');
      }
    },
    [fetchActivities]
  );

  /**
   * Force a full re-fetch, clearing related cache entries first.
   */
  const refresh = useCallback(() => {
    queryCache.invalidate('activities');
    queryCache.invalidateByPrefix('subtasks:');
    fetchActivities(true);
  }, [fetchActivities]);

  const getGlobalProgress = useCallback(async (fromDate?: string, toDate?: string) => {
    try {
      const data = await getCompletionPercentApi(fromDate, toDate);
      return data;
    } catch (err) {
      console.error('Error fetching global progress:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchActivities(false);
  }, [fetchActivities]);

  return {
    activities,
    courses,
    loading,
    error,
    refresh,
    updateSubtask,
    postponeSubtask: postponeSubtaskAction,
    getGlobalProgress,
  };
}