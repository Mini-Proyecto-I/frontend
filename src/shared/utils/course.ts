
export interface Course {
  id: number;
  name: string;
  color?: string;
}

export const getCourseName = (course: string | Course | undefined | null): string => {
  if (!course) return 'Unknown';
  if (typeof course === 'string') return course;
  if (typeof course === 'object') return course.name || 'Unknown';
  return 'Unknown';
};

export const getCourseColor = (course: string | Course | undefined | null): string => {
  if (!course) return 'cyan';
  if (typeof course === 'string') return 'cyan';
  if (typeof course === 'object') return course.color || 'cyan';
  return 'cyan';
};

/** Nombre del curso desde subtarea/actividad (objeto, string o course_name). */
export function resolveSubtaskCourseName(subtask: {
  course?: string | Course | null;
  activity?: {
    course?: string | Course | null;
    course_name?: string | null;
  } | null;
} | null | undefined): string | null {
  if (!subtask) return null;

  const candidates = [
    subtask.activity?.course,
    subtask.course,
    subtask.activity?.course_name,
  ];

  for (const c of candidates) {
    if (c == null || c === '') continue;
    if (typeof c === 'string') {
      const trimmed = c.trim();
      if (trimmed && trimmed !== 'Unknown') return trimmed;
      continue;
    }
    if (typeof c === 'object' && c.name) {
      const trimmed = String(c.name).trim();
      if (trimmed && trimmed !== 'Unknown') return trimmed;
    }
  }

  return null;
}