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
  X,
} from 'lucide-react';
import { useProgressData, Activity, Subtask, Course } from '@/features/progress/hooks/useProgressData';
import { patchSubtask } from '@/api/services/subtack';
import { queryCache } from '@/lib/queryCache';
import { Card, CardContent } from '@/shared/components/card';
import { Badge } from '@/shared/components/badge';
import { Button } from '@/shared/components/button';
import { Input } from '@/shared/components/input';
import { cn } from '@/shared/utils/utils';
import { Link } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/select";

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
          className="text-blue-500 transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{value}%</span>
        <span className="text-xs text-slate-400 uppercase font-medium">Completado</span>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const { activities, courses, loading, error, refresh, updateSubtask } = useProgressData();

  const { showToast, ToastComponent } = useToast();

  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const hasActiveFilters =
    courseFilter !== "all" || statusFilter !== "all";
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [noteValues, setNoteValues] = useState<Record<number, string>>({});
  const [processingTasks, setProcessingTasks] = useState<Set<number>>(new Set());


  const filteredActivities = activities.filter((activity: Activity) => {

    const courseMatch =
      courseFilter === "all" ||
      getCourseName(activity.course) === courseFilter;

    const statusMatch =
      statusFilter === "all" ||
      activity.subtasks.some((s: Subtask) => s.status === statusFilter);

    return courseMatch && statusMatch;
  });

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
        .reduce((h: number, st: Subtask) => {
          const hours = typeof st.estimated_hours === 'string' 
            ? parseFloat(st.estimated_hours) 
            : (st.estimated_hours || 0);
          return h + (isNaN(hours) ? 0 : hours);
        }, 0),
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

    queryCache.invalidateByPrefix('hoy:');

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

    queryCache.invalidateByPrefix('hoy:');

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
      <div className="flex flex-col gap-8 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-10 pb-10 mt-6 lg:mt-10">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-slate-400">Cargando tu progreso...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-8 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-10 pb-10 mt-6 lg:mt-10">
        <div className="bg-[#111827] border border-red-500/30 rounded-3xl p-6 shadow-xl shadow-black/20">
          <div className="flex flex-col items-center py-16 text-center">
            <BarChart3 className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="font-semibold text-lg text-red-400 mb-2">Error al cargar los datos</h3>
            <p className="text-slate-400 mt-1 mb-6">{error}</p>
            <Button onClick={refresh} className="bg-blue-600 hover:bg-blue-700 text-white" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" /> Intentar de nuevo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-10 pb-10 mt-6 lg:mt-10">
      {/* ✅ CAMBIO 10: Renderizar ToastComponent en la raíz */}
      <ToastComponent />

      {/* Header Section */}
      <div className="bg-[#111827] border border-slate-800/60 rounded-3xl p-6 lg:p-8 shadow-xl shadow-black/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white mb-2">
              <span className="text-blue-500">Progreso Académico</span>
            </h1>
            <p className="text-slate-400 font-medium">Haz seguimiento de tus actividades y gestiona las fechas límite pendientes.</p>
          </div>
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20">
            <Link to="/crear">
              <Zap className="h-4 w-4 mr-2" />
              Nueva tarea
            </Link>
          </Button>
        </div>
      </div>

      {/* FILTER BAR SECTION */}
      <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4 shadow-lg shadow-black/10 flex flex-col gap-4 w-full">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <h2 className="text-white font-bold text-lg">Filtros</h2>
          {hasActiveFilters && (
            <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg font-semibold">
              Filtrado por: {[
                courseFilter !== "all" && "Curso",
                statusFilter !== "all" && "Estado"
              ].filter(Boolean).join(", ")}
            </span>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="relative flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Curso</label>
            <Select
              value={courseFilter || "all"}
              onValueChange={(v) => setCourseFilter(v === "all" ? "all" : v)}
            >
              <SelectTrigger 
                style={courseFilter !== "all" ? { 
                  backgroundColor: 'white',
                  fontFamily: '"Lexend", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                } : undefined}
                className={`w-full md:w-[200px] h-12 rounded-xl focus:ring-blue-500 shadow-inner border ${
                  courseFilter !== "all"
                    ? "border-blue-500 text-blue-600 [&_svg]:text-blue-600" 
                    : "bg-[#1F2937]/50 border-slate-700/50 text-slate-200"
                }`}
              >
                <SelectValue placeholder="Todos los cursos" />
              </SelectTrigger>
              <SelectContent className="bg-[#1F2937] border-slate-700 text-slate-200 rounded-xl shadow-xl">
                <SelectItem value="all" className="focus:bg-blue-600 focus:text-white rounded-lg cursor-pointer">Todos los cursos</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.name} className="focus:bg-blue-600 focus:text-white rounded-lg cursor-pointer">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</label>
            <Select
              value={statusFilter || "all"}
              onValueChange={(v) => setStatusFilter(v === "all" ? "all" : v)}
            >
              <SelectTrigger 
                style={statusFilter !== "all" ? { 
                  backgroundColor: 'white',
                  fontFamily: '"Lexend", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                } : undefined}
                className={`w-full md:w-[170px] h-12 rounded-xl focus:ring-blue-500 shadow-inner border ${
                  statusFilter !== "all"
                    ? "border-blue-500 text-blue-600 [&_svg]:text-blue-600" 
                    : "bg-[#1F2937]/50 border-slate-700/50 text-slate-200"
                }`}
              >
                <SelectValue placeholder="Cualquier estado" />
              </SelectTrigger>
              <SelectContent className="bg-[#1F2937] border-slate-700 text-slate-200 rounded-xl shadow-xl">
                <SelectItem value="all" className="focus:bg-blue-600 focus:text-white rounded-lg cursor-pointer">Cualquier estado</SelectItem>
                <SelectItem value="PENDING" className="focus:bg-blue-600 focus:text-white rounded-lg cursor-pointer">Pendiente</SelectItem>
                <SelectItem value="DONE" className="focus:bg-blue-600 focus:text-white rounded-lg cursor-pointer">Completado</SelectItem>
                <SelectItem value="POSTPONED" className="focus:bg-blue-600 focus:text-white rounded-lg cursor-pointer">Pospuesto</SelectItem>
                <SelectItem value="WAITING" className="focus:bg-blue-600 focus:text-white rounded-lg cursor-pointer">En Espera</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setCourseFilter("all");
              setStatusFilter("all");
            }}
            disabled={!hasActiveFilters}
            className={`h-12 rounded-xl mb-[1px] transition-all ${
              hasActiveFilters
                ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
                : "border-slate-700/50 bg-[#1F2937]/50 text-slate-400 cursor-not-allowed opacity-50"
            }`}
          >
            <X className="w-4 h-4 mr-2" /> Limpiar
          </Button>
        </div>
      </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Activities */}
          <div className="lg:col-span-2 space-y-6">
            {filteredActivities.length === 0 ? (
              <div className="bg-[#111827] border border-slate-800/60 rounded-3xl p-6 shadow-xl shadow-black/20 flex flex-col items-center justify-center py-16 text-center">
                <BarChart3 className="h-12 w-12 text-slate-600/50 mb-4" />
                <h3 className="font-semibold text-lg text-white mb-2">
                  Sin resultados
                </h3>
                <p className="text-slate-400 mt-1 mb-6">
                  No hay actividades que coincidan con los filtros seleccionados.
                </p>
                <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Link to="/crear">Crear actividad</Link>
                </Button>
              </div>
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
                  <div
                    key={activity.id}
                    className="bg-[#111827] border border-slate-800/60 rounded-3xl p-6 shadow-xl shadow-black/20 transition-all hover:border-slate-700/80"
                  >
                      {/* Card Header */}
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center",
                            courseColorClasses[courseColor] || courseColorClasses.cyan
                          )}>
                            <CourseIcon className={cn("h-6 w-6", courseColorClasses[courseColor]?.split(' ')[1] || 'text-cyan-500')} />
                          </div>
                          <div>
                            <Link
                              to={`/actividad/${activity.id}`}
                              className="text-xl font-semibold text-white hover:text-blue-400 transition-colors"
                            >
                              {activity.title}
                            </Link>
                            <p className="text-sm text-slate-400 mt-1">
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
                                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                : pct === 100
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            )}
                          >
                            {isBehind ? 'Retrasado' : pct === 100 ? 'Completado' : 'En curso'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-blue-400"
                            onClick={() => setExpanded({ ...expanded, [activity.id]: !isOpen })}
                          >
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-8">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-sm font-medium text-slate-400">Progreso</span>
                          <span className={cn("text-2xl font-bold", pct === 100 ? 'text-emerald-400' : 'text-blue-500')}>
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              pct === 100 ? 'bg-emerald-400' : 'bg-blue-500'
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
                                  "group p-4 rounded-xl border transition-all duration-200",
                                  "bg-slate-800/30",
                                  "border-slate-700/50",
                                  "hover:border-blue-500/30",
                                  isProcessing && "opacity-50 pointer-events-none"
                                )}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
                                  <div className="flex items-center gap-3 mb-3 sm:mb-0">
                                    <button
                                      onClick={() => handleCompleteTask(activity.id, st.id, st.name, courseName)}
                                      disabled={isProcessing}
                                      className="relative h-5 w-5 cursor-pointer rounded border border-slate-600 
                                               bg-transparent hover:border-blue-500 transition-all flex items-center justify-center
                                               disabled:cursor-not-allowed"
                                    >
                                      <Circle className="h-4 w-4 text-slate-500" />
                                    </button>
                                    <span className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
                                      {st.name}
                                    </span>
                                    {st.estimated_hours && (
                                      <Badge variant="secondary" className="text-[10px] bg-slate-700/50 text-slate-300 border-slate-600">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {typeof st.estimated_hours === 'string' 
                                          ? parseFloat(st.estimated_hours).toFixed(1)
                                          : (st.estimated_hours || 0).toFixed(1)}h
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 pl-8 sm:pl-0">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={isProcessing}
                                      className="h-8 text-xs bg-transparent hover:bg-blue-500/10 hover:text-blue-400 border-slate-700 text-slate-300 disabled:opacity-50"
                                      onClick={() => handlePostponeTask(activity.id, st.id, st.name)}
                                    >
                                      Posponer
                                    </Button>
                                    <Button
                                      size="sm"
                                      disabled={isProcessing}
                                      className="h-8 text-xs bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white transition-all disabled:opacity-50"
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
                                  className="text-xs h-9 bg-[#1F2937]/50 border-slate-700 text-slate-200 placeholder:text-slate-500 pl-8"
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
                        <div className="flex items-center gap-2 text-sm text-emerald-400">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-medium">¡Todas las tareas completadas! ¡Buen trabajo!</span>
                        </div>
                      )}

                      {isOpen && total === 0 && (
                        <div className="text-sm text-slate-400 text-center py-4">
                          Aún no hay subtareas. ¡Crea algunas tareas para comenzar!
                        </div>
                      )}
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Stats & Quick Actions */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Today's Focus - Circular Progress */}
            <div className="bg-[#111827] border border-slate-800/60 rounded-3xl p-6 shadow-xl shadow-black/20">
              <h3 className="text-lg font-semibold text-white mb-6">Enfoque de hoy</h3>
              <div className="flex items-center justify-center mb-6">
                <CircularProgress value={overallProgress} />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Tareas completadas</span>
                  <span className="font-semibold text-white">{totalDone}/{totalAll}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Tiempo de estudio</span>
                  <span className="font-semibold text-white">{totalHoursDone.toFixed(1)}h</span>
                </div>
              </div>
            </div>

            {/* Recent Achievements */}
            {recentWins.length > 0 && (
              <div className="bg-[#111827] border border-slate-800/60 rounded-3xl p-6 shadow-xl shadow-black/20">
                <div className="flex items-center gap-3 mb-4">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <h3 className="text-lg font-semibold text-white">Logros recientes</h3>
                </div>
                <ul className="space-y-4">
                  {recentWins.map((w: Subtask & { course: string }) => (
                    <li key={w.id} className="flex gap-3 items-start">
                      <div className={cn(
                        "mt-1 w-2 h-2 rounded-full",
                        recentWins.indexOf(w) === 0 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' :
                          recentWins.indexOf(w) === 1 ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' :
                            'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]'
                      )} />
                      <div>
                        <p className="text-sm font-medium text-slate-200">{w.name}</p>
                        <p className="text-xs text-slate-400">{w.course}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Upcoming Deadlines */}
            {upcomingDeadlines.length > 0 && (
              <div className="bg-[#111827] border border-slate-800/60 rounded-3xl p-6 shadow-xl shadow-black/20">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Próximamente
                </h3>
                <div className="relative pl-4 border-l-2 border-slate-700 space-y-6">
                  {upcomingDeadlines.map((item: Activity) => {
                    const days = getDaysLeft(item.deadline);
                    const isUrgent = days !== null && days <= 2;
                    return (
                      <div key={item.id} className="relative">
                        <div className={cn(
                          "absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-[#111827]",
                          isUrgent ? 'bg-red-500' : 'bg-slate-600'
                        )} />
                        <p className={cn("text-xs font-bold mb-1", isUrgent ? 'text-red-400' : 'text-blue-400')}>
                          {getDeadlineText(item.deadline).toUpperCase()}
                        </p>
                        <p className="text-sm text-slate-300">{item.title}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        </div>
    </div>
  );
}