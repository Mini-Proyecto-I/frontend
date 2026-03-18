// @/features/progress/hooks/useProgressData.ts
import { useState, useEffect, useCallback } from 'react';
import { getActivities } from '@/api/services/activity';
import { getSubtasksForActivity, patchSubtask } from '@/api/services/subtask';
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

      // Fetch subtasks for each activity (using per-activity cache entries)
      const activitiesWithSubtasks = await Promise.all(
        activitiesData.map(async (activity: any) => {
          const subtaskKey = `subtasks:${activity.id}`;

          // Check per-activity subtask cache
          const cachedSubtasks = bypassCache
            ? undefined
            : queryCache.get<Subtask[]>(subtaskKey);

          const subtasks = cachedSubtasks ?? await (async () => {
            try {
              const fetched = await getSubtasksForActivity(activity.id);
              const result = Array.isArray(fetched) ? fetched : [];
              queryCache.set(subtaskKey, result, SUBTASKS_TTL);
              return result;
            } catch {
              return [];
            }
          })();

          return {
            ...activity,
            subtasks,
            course_color: activity.course_color || 'cyan',
          };
        })
      );

      queryCache.set('activities', activitiesWithSubtasks, ACTIVITIES_TTL);
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
    async (activityId: number, subtaskId: number, updates: Partial<Subtask>) => {
      // Optimistic local state update
      setActivities((prev: Activity[]) => {
        const updated = prev.map((activity: Activity) =>
          activity.id === activityId
            ? {
              ...activity,
              subtasks: activity.subtasks.map((st: Subtask) =>
                st.id === subtaskId ? { ...st, ...updates } : st
              ),
            }
            : activity
        );

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
        await patchSubtask(activityId, subtaskId, updates);

        if (updates.status === 'DONE') {
          showToast('Tarea completada exitosamente', 'success');
        } else {
          showToast('Cambios guardados correctamente', 'success');
        }
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
   * Force a full re-fetch, clearing related cache entries first.
   */
  const refresh = useCallback(() => {
    queryCache.invalidate('activities');
    queryCache.invalidateByPrefix('subtasks:');
    fetchActivities(true);
  }, [fetchActivities]);

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
  };
}