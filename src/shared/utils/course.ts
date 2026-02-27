
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