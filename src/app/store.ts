import { create } from 'zustand';

export type SubtaskStatus = 'pending' | 'done' | 'postponed';
export type ActivityType = 'exam' | 'assignment' | 'project';

export interface Subtask {
  id: string;
  name: string;
  targetDate: string; // YYYY-MM-DD
  estimatedHours: number;
  status: SubtaskStatus;
  note?: string;
}

export interface Activity {
  id: string;
  title: string;
  course: string;
  courseColor: string; // tailwind color token
  deadline: string; // YYYY-MM-DD
  type: ActivityType;
  description?: string;
  subtasks: Subtask[];
}

export interface DemoUser {
  name: string;
  major: string;
  dailyLimit: number;
}

const TODAY = new Date().toISOString().split('T')[0];

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const TOMORROW = tomorrow.toISOString().split('T')[0];

const in3 = new Date();
in3.setDate(in3.getDate() + 3);
const IN3 = in3.toISOString().split('T')[0];

const in5 = new Date();
in5.setDate(in5.getDate() + 5);
const IN5 = in5.toISOString().split('T')[0];

const in7 = new Date();
in7.setDate(in7.getDate() + 7);
const IN7 = in7.toISOString().split('T')[0];

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const YESTERDAY = yesterday.toISOString().split('T')[0];

const initialActivities: Activity[] = [
  {
    id: '1',
    title: 'Examen de Cálculo',
    course: 'Calculus II',
    courseColor: 'cyan',
    deadline: IN5,
    type: 'exam',
    description: 'Midterm exam covering limits, derivatives, and integrals.',
    subtasks: [
      { id: '1-1', name: 'Review Limits & Continuity', targetDate: YESTERDAY, estimatedHours: 2, status: 'done' },
      { id: '1-2', name: 'Practice Derivatives', targetDate: TODAY, estimatedHours: 3, status: 'pending' },
      { id: '1-3', name: 'Past Paper 2022', targetDate: TOMORROW, estimatedHours: 4, status: 'pending' },
      { id: '1-4', name: 'Integral Calculus Review', targetDate: TOMORROW, estimatedHours: 3, status: 'pending' },
    ],
  },
  {
    id: '2',
    title: 'Essay: Industrial Revolution',
    course: 'History 301',
    courseColor: 'orange',
    deadline: IN7,
    type: 'assignment',
    description: 'Write a 2000-word essay on the Industrial Revolution impact.',
    subtasks: [
      { id: '2-1', name: 'Outline main arguments', targetDate: TODAY, estimatedHours: 1.5, status: 'pending' },
      { id: '2-2', name: 'Find 3 primary sources', targetDate: TODAY, estimatedHours: 1, status: 'pending' },
      { id: '2-3', name: 'Write first draft', targetDate: IN3, estimatedHours: 3, status: 'pending' },
      { id: '2-4', name: 'Proofread & citations', targetDate: IN5, estimatedHours: 1.5, status: 'pending' },
    ],
  },
  {
    id: '3',
    title: 'Lab Report: Motion',
    course: 'Physics 101',
    courseColor: 'green',
    deadline: IN5,
    type: 'project',
    description: 'Analyze motion data from the lab experiment and write conclusions.',
    subtasks: [
      { id: '3-1', name: 'Analyze data table', targetDate: TODAY, estimatedHours: 2, status: 'pending' },
      { id: '3-2', name: 'Write conclusion', targetDate: TOMORROW, estimatedHours: 1.5, status: 'pending' },
      { id: '3-3', name: 'Format & submit', targetDate: IN3, estimatedHours: 1, status: 'pending' },
    ],
  },
];

interface StoreState {
  user: DemoUser;
  activities: Activity[];
  addActivity: (activity: Omit<Activity, 'id'>) => void;
  updateActivity: (id: string, updates: Partial<Activity>) => void;
  updateSubtask: (activityId: string, subtaskId: string, updates: Partial<Subtask>) => void;
  addSubtask: (activityId: string, subtask: Omit<Subtask, 'id'>) => void;
  deleteSubtask: (activityId: string, subtaskId: string) => void;
  getSubtasksForDate: (date: string) => Array<Subtask & { activityId: string; activityTitle: string; course: string; courseColor: string }>;
  getTotalHoursForDate: (date: string) => number;
}

export const useStore = create<StoreState>((set, get) => ({
  user: { name: 'Alex Johnson', major: 'Computer Science', dailyLimit: 6 },
  activities: initialActivities,

  addActivity: (activity) => set((state) => ({
    activities: [...state.activities, { ...activity, id: Date.now().toString() }],
  })),

  updateActivity: (id, updates) => set((state) => ({
    activities: state.activities.map((a) => a.id === id ? { ...a, ...updates } : a),
  })),

  updateSubtask: (activityId, subtaskId, updates) => set((state) => ({
    activities: state.activities.map((a) =>
      a.id === activityId
        ? { ...a, subtasks: a.subtasks.map((s) => s.id === subtaskId ? { ...s, ...updates } : s) }
        : a
    ),
  })),

  addSubtask: (activityId, subtask) => set((state) => ({
    activities: state.activities.map((a) =>
      a.id === activityId
        ? { ...a, subtasks: [...a.subtasks, { ...subtask, id: `${activityId}-${Date.now()}` }] }
        : a
    ),
  })),

  deleteSubtask: (activityId, subtaskId) => set((state) => ({
    activities: state.activities.map((a) =>
      a.id === activityId
        ? { ...a, subtasks: a.subtasks.filter((s) => s.id !== subtaskId) }
        : a
    ),
  })),

  getSubtasksForDate: (date) => {
    const result: Array<Subtask & { activityId: string; activityTitle: string; course: string; courseColor: string }> = [];
    get().activities.forEach((a) => {
      a.subtasks.forEach((s) => {
        if (s.targetDate === date) {
          result.push({ ...s, activityId: a.id, activityTitle: a.title, course: a.course, courseColor: a.courseColor });
        }
      });
    });
    return result;
  },

  getTotalHoursForDate: (date) => {
    let total = 0;
    get().activities.forEach((a) => {
      a.subtasks.forEach((s) => {
        if (s.targetDate === date && s.status !== 'done') total += s.estimatedHours;
      });
    });
    return total;
  },
}));
