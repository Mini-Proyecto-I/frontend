import { useState } from 'react';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import {
  CheckCircle2,
  Circle,
  BarChart3,
  Trophy,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
  Zap,
  BookOpen,
  Code,
  Calculator,
  FileText,
  FlaskConical,
  Target,
} from 'lucide-react';
import { useProgressData, Activity, Subtask, Course } from '@/features/progress/hooks/useProgressData';
import { patchSubtask } from '@/api/services/subtack';
import { Card, CardContent } from '@/shared/components/card';
import { Badge } from '@/shared/components/badge';
import { Button } from '@/shared/components/button';
import { Input } from '@/shared/components/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
import { cn } from '@/shared/utils/utils';
import { Link } from 'react-router-dom';

import { useToast } from '@/shared/components/toast';

const STATUS = {
  PENDING: 'PENDING' as const,
  DONE: 'DONE' as const,
  POSTPONED: 'POSTPONED' as const,
  WAITING: 'WAITING' as const,
};

const courseIcons: Record<string, React.ElementType> = {
  calculus: Calculator,
  math: Calculator,
  software: Code,
  programming: Code,
  history: BookOpen,
  physics: FlaskConical,
  english: FileText,
  literature: BookOpen,
  project: Target,
  default: BookOpen,
};

const getCourseIcon = (courseName: string): React.ElementType => {
  const lower = courseName.toLowerCase();
  for (const [key, Icon] of Object.entries(courseIcons)) {
    if (lower.includes(key)) return Icon;
  }
  return courseIcons.default;
};

const courseColorClasses: Record<string, string> = {
  cyan: 'bg-cyan-500/10 text-cyan-500',
  orange: 'bg-orange-500/10 text-orange-500',
  green: 'bg-green-500/10 text-green-500',
  blue: 'bg-blue-500/10 text-blue-500',
  purple: 'bg-purple-500/10 text-purple-500',
  red: 'bg-red-500/10 text-red-500',
  yellow: 'bg-yellow-500/10 text-yellow-500',
  pink: 'bg-pink-500/10 text-pink-500',
};

const getCourseColor = (course: string | Course | undefined | null): string => {
  if (!course) return 'cyan';
  if (typeof course === 'string') {
    const lower = course.toLowerCase();
    if (lower.includes('calculus') || lower.includes('math')) return 'purple';
    if (lower.includes('software') || lower.includes('code') || lower.includes('programming')) return 'blue';
    if (lower.includes('history')) return 'orange';
    if (lower.includes('physics')) return 'green';
    if (lower.includes('english') || lower.includes('literature')) return 'pink';
    return 'cyan';
  }
  return (course as Course).color || 'cyan';
};

const getCourseName = (course: string | Course | undefined | null): string => {
  if (!course) return 'Unknown';
  if (typeof course === 'string') return course;
  if (typeof course === 'object' && course !== null) return (course as Course).name || 'Unknown';
  return 'Unknown';
};

const formatDateSafe = (dateString: string | null | undefined): string => {
  if (!dateString || typeof dateString !== 'string') return 'Sin fecha límite';
  const date = parseISO(dateString);
  if (!isValid(date)) return 'Fecha inválida';
  return format(date, 'MMM d, yyyy');
};

const getDaysLeft = (dateString: string | null | undefined): number | null => {
  if (!dateString || typeof dateString !== 'string') return null;
  const date = parseISO(dateString);
  if (!isValid(date)) return null;
  return differenceInDays(date, new Date());
};

const getDeadlineText = (dateString: string | null | undefined): string => {
  const days = getDaysLeft(dateString);
  if (days === null) return 'No deadline';
  if (days < 0) return 'Atrasado';
  if (days === 0) return 'Hoy (Urgente)';
  if (days === 1) return 'Mañana (Urgente)';
  if (days <= 3) return `${days} días restantes`;
  return formatDateSafe(dateString);
};

const getDeadlineColor = (dateString: string | null | undefined, progress: number): string => {
  const days = getDaysLeft(dateString);
  if (days === null) return 'text-slate-400';
  if (days < 0 || (days <= 3 && progress < 50)) return 'text-red-500';
  if (days <= 5) return 'text-yellow-500';
  return 'text-slate-400';
};

function CircularProgress({ value, size = 160, strokeWidth = 8 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-900 dark:text-white">{value}%</span>
        <span className="text-xs text-slate-500 uppercase font-medium">Completado</span>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const { activities, courses, loading, error, refresh, updateSubtask } = useProgressData();
  
  const { showToast, ToastComponent } = useToast();
  
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [noteValues, setNoteValues] = useState<Record<number, string>>({});
  const [processingTasks, setProcessingTasks] = useState<Set<number>>(new Set());

  const filteredActivities =
    filter === 'all'
      ? activities
      : activities.filter((a: Activity) => getCourseName(a.course) === filter);

  const totalDone = activities.reduce(
    (sum: number, a: Activity) => sum + a.subtasks.filter((st: Subtask) => st.status === STATUS.DONE).length,
    0
  );
  const totalAll = activities.reduce((sum: number, a: Activity) => sum + a.subtasks.length, 0);
  const overallProgress = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;
  
  const totalHoursDone = activities.reduce(
    (sum: number, a: Activity) =>
      sum +
      a.subtasks
        .filter((st: Subtask) => st.status === STATUS.DONE)
        .reduce((h: number, st: Subtask) => h + (st.estimated_hours || 0), 0),
    0
  );

  const recentWins = activities
    .flatMap((a: Activity) =>
      a.subtasks
        .filter((s: Subtask) => s.status === STATUS.DONE)
        .map((s: Subtask) => ({ ...s, course: getCourseName(a.course) }))
    )
    .slice(0, 5);

  const upcomingDeadlines = activities
    .filter((a: Activity) => a.deadline && getDaysLeft(a.deadline) !== null && getDaysLeft(a.deadline)! >= 0)
    .sort((a: Activity, b: Activity) => getDaysLeft(a.deadline)! - getDaysLeft(b.deadline)!)
    .slice(0, 4);

  const handleCompleteTask = async (
    activityId: number,
    subtaskId: number,
    subtaskName: string,
    courseName: string
  ) => {
    if (processingTasks.has(subtaskId)) return;

    const note = noteValues[subtaskId];
    
    const updateData: Partial<Subtask> = {
      status: STATUS.DONE,
    };
    
    if (note && note.trim().length > 0) {
      updateData.note = note.trim();
    }

    setProcessingTasks((prev) => new Set(prev).add(subtaskId));

    try {
      await patchSubtask(activityId, subtaskId, updateData);
      await updateSubtask(activityId, subtaskId, updateData);

      showToast('Tarea completada exitosamente', 'success');

      setNoteValues((prev) => {
        const copy = { ...prev };
        delete copy[subtaskId];
        return copy;
      });

    } catch (err: any) {
      console.error('❌ PATCH Error:', err);
      
      showToast('No se pudo completar la tarea. Verifica tu conexión e intenta de nuevo.', 'error');
      refresh();
    } finally {
      setProcessingTasks((prev) => {
        const next = new Set(prev);
        next.delete(subtaskId);
        return next;
      });
    }
  };

  const handlePostponeTask = async (
    activityId: number,
    subtaskId: number,
    subtaskName: string
  ) => {
    if (processingTasks.has(subtaskId)) return;

    setProcessingTasks((prev) => new Set(prev).add(subtaskId));

    try {
      const updateData = { status: STATUS.POSTPONED };
      
      await patchSubtask(activityId, subtaskId, updateData);
      await updateSubtask(activityId, subtaskId, updateData);

      showToast('Tarea pospuesta correctamente', 'success');

    } catch (err: any) {
      console.error('❌ PATCH Error:', err);
      
      showToast('No se pudo posponer la tarea. Verifica tu conexión e intenta de nuevo.', 'error');
      refresh();
    } finally {
      setProcessingTasks((prev) => {
        const next = new Set(prev);
        next.delete(subtaskId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-slate-500 dark:text-slate-400">Cargando tu progreso...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/20 bg-red-500/5">
        <CardContent className="flex flex-col items-center py-16 text-center">
          <BarChart3 className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="font-semibold text-lg text-red-500">Error al cargar los datos</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{error}</p>
          <Button onClick={refresh} className="mt-4" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" /> Intentar de nuevo
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#101622] p-6 lg:p-8">
      {/* ✅ CAMBIO 10: Renderizar ToastComponent en la raíz */}
      <ToastComponent />
      
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Progreso Académico</h1>
            <p className="text-slate-500 dark:text-slate-400">Haz seguimiento de tus actividades y gestiona las fechas límite pendientes.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="filter-by-course" className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Agrupar por curso
              </label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger
                  id="filter-by-course"
                  className="min-w-[220px] h-11 rounded-xl bg-white dark:bg-[#1a2230] border-slate-200 dark:border-slate-700 cursor-pointer transition-all duration-200 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:ring-2 focus:ring-primary/20 [&>svg]:transition-transform data-[state=open]:[&>svg]:rotate-180"
                >
                  <SelectValue placeholder="Filtrar por curso" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a2230] py-1.5 min-w-[var(--radix-select-trigger-width)]">
                  <SelectGroup>
                    <SelectLabel className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">
                      Ver tareas de
                    </SelectLabel>
                    <SelectItem
                      value="all"
                      className="cursor-pointer rounded-lg mx-1.5 py-2.5 pl-9 pr-3 focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <BarChart3 className="h-4 w-4 text-primary shrink-0" />
                        <span>Todos los cursos</span>
                      </span>
                    </SelectItem>
                  </SelectGroup>
                  <SelectSeparator className="my-1.5 bg-slate-200 dark:bg-slate-700" />
                  <SelectGroup>
                    {courses.map((c: Course) => {
                      const CourseIcon = getCourseIcon(c.name);
                      const colorKey = getCourseColor(c);
                      return (
                        <SelectItem
                          key={c.id}
                          value={c.name}
                          className="cursor-pointer rounded-lg mx-1.5 py-2.5 pl-9 pr-3 focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary transition-colors"
                        >
                          <span className="flex items-center gap-2.5">
                            <span
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                courseColorClasses[colorKey] || courseColorClasses.cyan
                              )}
                            >
                              <CourseIcon className={cn("h-4 w-4", courseColorClasses[colorKey]?.split(' ')[1] || 'text-cyan-500')} />
                            </span>
                            <span className="font-medium">{c.name}</span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <Button asChild className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30">
              <Link to="/crear">
                <Zap className="h-4 w-4 mr-2" />
                Nueva tarea
              </Link>
            </Button>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Activities */}
          <div className="lg:col-span-2 space-y-6">
            {filteredActivities.length === 0 ? (
              <Card className="border-dashed border-slate-200 dark:border-slate-700">
                <CardContent className="flex flex-col items-center py-16 text-center">
                  <BarChart3 className="h-12 w-12 text-slate-400 mb-4" />
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Aún no hay actividades</h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Crea tu primera actividad para comenzar a seguir tu progreso.
                  </p>
                  <Button asChild className="mt-4">
                    <Link to="/crear">Crear actividad</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredActivities.map((activity: Activity) => {
                const courseName = getCourseName(activity.course);
                const courseColor = getCourseColor(activity.course);
                const CourseIcon = getCourseIcon(courseName);
                
                const done = activity.subtasks.filter((s: Subtask) => s.status === STATUS.DONE).length;
                const total = activity.subtasks.length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const isOpen = expanded[activity.id] ?? true;
                
                const pending = activity.subtasks.filter((s: Subtask) => s.status !== STATUS.DONE);
                
                const allCompleted = total > 0 && done === total;
                
                const isBehind = pct < 50 && getDaysLeft(activity.deadline) !== null && getDaysLeft(activity.deadline)! <= 5;

                return (
                  <Card
                    key={activity.id}
                    className="bg-white dark:bg-[#1a2230] border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-6">
                      {/* Card Header */}
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-lg flex items-center justify-center",
                            courseColorClasses[courseColor] || courseColorClasses.cyan
                          )}>
                            <CourseIcon className={cn("h-6 w-6", courseColorClasses[courseColor]?.split(' ')[1] || 'text-cyan-500')} />
                          </div>
                          <div>
                              <Link
                                to={`/actividad/${activity.id}`}
                                className="text-xl font-semibold text-slate-900 dark:text-white hover:text-primary transition-colors"
                              >
                                {activity.title}
                              </Link>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                              Próxima fecha límite:{' '}
                              <span className={cn("font-medium", getDeadlineColor(activity.deadline, pct))}>
                                {getDeadlineText(activity.deadline)}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={isBehind ? 'destructive' : 'secondary'}
                            className={cn(
                              "text-xs font-semibold",
                              isBehind 
                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                : pct === 100
                                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                            )}
                          >
                            {isBehind ? 'Retrasado' : pct === 100 ? 'Completado' : 'En curso'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-primary"
                            onClick={() => setExpanded({ ...expanded, [activity.id]: !isOpen })}
                          >
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-8">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Progreso</span>
                          <span className={cn("text-2xl font-bold", pct === 100 ? 'text-green-500' : 'text-primary')}>
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              pct === 100 ? 'bg-green-500' : 'bg-primary'
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Subtasks List */}
                      {isOpen && pending.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                            Tareas pendientes ({pending.length})
                          </h4>
                          {pending.map((st: Subtask) => {
                            const isProcessing = processingTasks.has(st.id);
                            return (
                              <div
                                key={st.id}
                                className={cn(
                                  "group p-4 rounded-lg border transition-all duration-200",
                                  "bg-slate-50 dark:bg-slate-800/30",
                                  "border-slate-100 dark:border-slate-700/50",
                                  "hover:border-primary/30 dark:hover:border-primary/30",
                                  isProcessing && "opacity-50 pointer-events-none"
                                )}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
                                  <div className="flex items-center gap-3 mb-3 sm:mb-0">
                                    <button
                                      onClick={() => handleCompleteTask(activity.id, st.id, st.name, courseName)}
                                      disabled={isProcessing}
                                      className="relative h-5 w-5 cursor-pointer rounded border border-slate-300 dark:border-slate-600 
                                               bg-transparent hover:border-primary transition-all flex items-center justify-center
                                               disabled:cursor-not-allowed"
                                    >
                                      <Circle className="h-4 w-4 text-slate-400" />
                                    </button>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">
                                      {st.name}
                                    </span>
                                    {st.estimated_hours && (
                                      <Badge variant="secondary" className="text-[10px]">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {st.estimated_hours}h
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 pl-8 sm:pl-0">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={isProcessing}
                                      className="h-8 text-xs bg-transparent hover:bg-primary/10 hover:text-primary border-slate-200 dark:border-slate-700 disabled:opacity-50"
                                      onClick={() => handlePostponeTask(activity.id, st.id, st.name)}
                                    >
                                      Posponer
                                    </Button>
                                    <Button
                                      size="sm"
                                      disabled={isProcessing}
                                      className="h-8 text-xs bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all disabled:opacity-50"
                                      onClick={() => handleCompleteTask(activity.id, st.id, st.name, courseName)}
                                    >
                                      {isProcessing ? (
                                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                      )}
                                      <span>Hecho</span>
                                    </Button>
                                  </div>
                                </div>
                                <Input
                                  placeholder="Nota de reflexión (opcional) — ¿Qué fue difícil?"
                                  className="text-xs h-9 bg-white dark:bg-[#101622] border-slate-200 dark:border-slate-700 pl-8"
                                  value={noteValues[st.id] || ''}
                                  onChange={(e) => setNoteValues({ ...noteValues, [st.id]: e.target.value })}
                                  disabled={isProcessing}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {isOpen && allCompleted && (
                        <div className="flex items-center gap-2 text-sm text-green-500">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-medium">¡Todas las tareas completadas! ¡Buen trabajo!</span>
                        </div>
                      )}

                      {isOpen && total === 0 && (
                        <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                          Aún no hay subtareas. ¡Crea algunas tareas para comenzar!
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Right Column: Stats & Quick Actions */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Today's Focus - Circular Progress */}
            <Card className="bg-white dark:bg-[#1a2230] border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Enfoque de hoy</h3>
                <div className="flex items-center justify-center mb-6">
                  <CircularProgress value={overallProgress} />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Tareas completadas</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{totalDone}/{totalAll}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Tiempo de estudio</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{totalHoursDone}h</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Achievements */}
            {recentWins.length > 0 && (
              <Card className="bg-gradient-to-br from-primary/10 to-transparent dark:from-primary/5 dark:to-transparent border-primary/20 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Logros recientes</h3>
                  </div>
                  <ul className="space-y-4">
                    {recentWins.map((w: Subtask & { course: string }) => (
                      <li key={w.id} className="flex gap-3 items-start">
                        <div className={cn(
                          "mt-1 w-2 h-2 rounded-full",
                          recentWins.indexOf(w) === 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                          recentWins.indexOf(w) === 1 ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' :
                          'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]'
                        )} />
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{w.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{w.course}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Deadlines */}
            {upcomingDeadlines.length > 0 && (
              <Card className="bg-white dark:bg-[#1a2230] border-slate-200 dark:border-slate-800 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Próximamente
                  </h3>
                  <div className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-6">
                    {upcomingDeadlines.map((item: Activity) => {
                      const days = getDaysLeft(item.deadline);
                      const isUrgent = days !== null && days <= 2;
                      return (
                        <div key={item.id} className="relative">
                          <div className={cn(
                            "absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-slate-50 dark:border-[#101622]",
                            isUrgent ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'
                          )} />
                          <p className={cn("text-xs font-bold mb-1", isUrgent ? 'text-red-500' : 'text-primary')}>
                            {getDeadlineText(item.deadline).toUpperCase()}
                          </p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{item.title}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>

      {/* ✅ CAMBIO 11: Eliminar el toast manual de completedTask (ya está ToastComponent arriba) */}
    </div>
  );
}