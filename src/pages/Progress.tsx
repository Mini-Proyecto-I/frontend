  import { useState, useMemo, useEffect } from 'react';
  import { format, parseISO, isValid, differenceInDays, startOfDay, isSameDay, isSameWeek, isSameMonth, startOfWeek, addWeeks, addDays, startOfMonth, endOfMonth, isFriday } from 'date-fns';
  import { es } from 'date-fns/locale';
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
    Search,
    CalendarDays,
    CalendarRange,
    Pencil,
    Trash2,
  } from 'lucide-react';
  import { AlertCircle } from 'lucide-react';
  import { Check } from 'lucide-react';
  import { useProgressData, Activity, Subtask, Course } from '@/features/progress/hooks/useProgressData';
  import { putSubtaskWithConflictTolerance } from '@/api/services/subtask';
  import { queryCache } from '@/lib/queryCache';
  import { Card, CardContent } from '@/shared/components/card';
  import { Badge } from '@/shared/components/badge';
  import { Button } from '@/shared/components/button';
  import { Input } from '@/shared/components/input';
  import { cn } from '@/shared/utils/utils';
  import { Link, useNavigate } from 'react-router-dom';
  import { ResolveConflictModal } from '@/shared/components/ResolveConflictModal';
  import { ConflictOutcomeModal } from '@/shared/components/ConflictOutcomeModal';
  import EditSubtaskModal from '@/shared/components/EditSubtaskModal';
  import PostponeSubtaskModal from '@/shared/components/PostponeSubtaskModal';
  import { SubtaskDetailModal } from '@/shared/components/SubtaskDetailModal';
  import { MessageModal } from "@/shared/components/MessageModal";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/shared/components/select";
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from "@/shared/components/dialog";

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

  function getRelativeDateLabel(targetDateStr: string) {
    if (!targetDateStr) return "";
    const date = startOfDay(parseISO(targetDateStr));
    const today = startOfDay(new Date());
    const diffDays = differenceInDays(date, today);

    if (diffDays === 0) return "HOY";
    if (diffDays === -1) return "AYER";
    if (diffDays === 1) return "MAÑANA";
    if (diffDays < -1) return `HACE ${Math.abs(diffDays)} DÍAS`;
    return format(date, "EEEE", { locale: es }).toUpperCase();
  }

  function getFormattedDate(targetDateStr: string) {
    if (!targetDateStr) return "";
    try {
      return format(parseISO(targetDateStr), "EEEE d 'de' MMMM", { locale: es });
    } catch {
      return targetDateStr;
    }
  }

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
    const navigate = useNavigate();
    const {
      activities,
      courses,
      loading,
      error,
      refresh,
      updateSubtask,
      postponeSubtask,
      getGlobalProgress,
    } = useProgressData();

    const { showToast, ToastComponent } = useToast();

    const [courseFilter, setCourseFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [timeFilter, setTimeFilter] = useState("week");
    const [backendProgress, setBackendProgress] = useState<any>(null);
    const [isStatsLoading, setIsStatsLoading] = useState(false);

    const hasActiveFilters =
      courseFilter !== "all" || statusFilter !== "all" || searchTerm !== "" || timeFilter !== "all";
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});
    const [noteValues, setNoteValues] = useState<Record<number, string>>({});
    const [processingTasks, setProcessingTasks] = useState<Set<number>>(new Set());

    // Conflict Modals State
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
    const [conflictModalTask, setConflictModalTask] = useState<any>(null);
    const [conflictActivityMeta, setConflictActivityMeta] = useState<any>(null);
    const [reduceHours, setReduceHours] = useState("");
    const [isReducing, setIsReducing] = useState(false);
    const [reduceError, setReduceError] = useState("");
    const [conflictOutcome, setConflictOutcome] = useState<any>(null);
    const [conflictOutcomeSource, setConflictOutcomeSource] = useState<"reduce" | "move" | null>(null);

    // Detail Modal State
    const [detailTask, setDetailTask] = useState<any>(null);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<any>(null);

    // Postpone Modal State
    const [isPostponeModalOpen, setIsPostponeModalOpen] = useState(false);
    const [postponingTask, setPostponingTask] = useState<any>(null);
    const [postponeSuccessOpen, setPostponeSuccessOpen] = useState(false);
    const [postponeSuccessMessage, setPostponeSuccessMessage] = useState("");

    // Delete State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingTask, setDeletingTask] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);


    useEffect(() => {
      const fetchStats = async () => {
        // If we have active filters other than time, we better stick to local calculation
        // for the big circle, as the backend doesn't support search/course filtering in completion-percent yet.
        // But we can still fetch it to see the "Official" period progress.

        let fromDate: string | undefined;
        let toDate: string | undefined;
        const now = new Date();

        if (timeFilter === "today") {
          fromDate = format(now, "yyyy-MM-dd");
          toDate = fromDate;
        } else if (timeFilter === "week") {
          const start = startOfWeek(now, { weekStartsOn: 1 });
          const end = addWeeks(start, 1); // Not correct, addDays(start, 6)
          fromDate = format(start, "yyyy-MM-dd");
          toDate = format(addDays(start, 6), "yyyy-MM-dd");
        } else if (timeFilter === "month") {
          const start = startOfMonth(now);
          fromDate = format(start, "yyyy-MM-dd");
          toDate = format(endOfMonth(now), "yyyy-MM-dd");
        }

        setIsStatsLoading(true);
        const data = await getGlobalProgress(fromDate, toDate);
        if (data) {
          setBackendProgress(data);
        }
        setIsStatsLoading(false);
      };

      fetchStats();
    }, [timeFilter, getGlobalProgress]);

    const filteredActivities = useMemo(() => {
      return activities.map((activity: Activity) => {
        // Filter subtasks by search term and time period
        const subtasks = activity.subtasks.filter((st: Subtask | any) => {
          const subtaskName = st.name || st.title || "";
          const matchesSearch = subtaskName.toLowerCase().includes(searchTerm.toLowerCase());

          let matchesTime = true;
          if (timeFilter !== "all") {
            if (!st.target_date) {
              matchesTime = false;
            } else {
              const date = parseISO(st.target_date);
              const now = new Date();
              if (timeFilter === "today") {
                matchesTime = isSameDay(date, now);
              } else if (timeFilter === "week") {
                matchesTime = isSameWeek(date, now, { weekStartsOn: 1 });
              } else if (timeFilter === "month") {
                matchesTime = isSameMonth(date, now);
              }
            }
          }

          const matchesStatus = statusFilter === "all" || st.status === statusFilter;

          return matchesSearch && matchesTime && matchesStatus;
        });

        return {
          ...activity,
          matchingSubtasks: subtasks
        };
      }).filter((activity) => {
        const courseMatch =
          courseFilter === "all" ||
          getCourseName(activity.course) === courseFilter;

        // If we are searching or filtering by time/status at subtask level,
        // only show activities that have matching subtasks.
        const hasMatches = activity.matchingSubtasks.length > 0;

        return courseMatch && (searchTerm || timeFilter !== "all" || statusFilter !== "all" ? hasMatches : true);
      });
    }, [activities, courseFilter, statusFilter, searchTerm, timeFilter]);

    const stats = useMemo(() => {
      const hasComplexFilters = searchTerm !== "" || courseFilter !== "all" || statusFilter !== "all";

      // Always calculate hours locally as backend doesn't provide them yet
      let localHoursDone = 0;
      filteredActivities.forEach((a: any) => {
        a.matchingSubtasks.forEach((st: Subtask) => {
          if (st.status === STATUS.DONE) {
            const hours = typeof st.estimated_hours === 'string'
              ? parseFloat(st.estimated_hours)
              : (st.estimated_hours || 0);
            localHoursDone += (isNaN(hours) ? 0 : hours);
          }
        });
      });

      if (!hasComplexFilters && backendProgress && timeFilter !== "all") {
        return {
          done: backendProgress.total_subtasks_done,
          total: backendProgress.total_subtasks,
          pct: Math.round(backendProgress.completion_percent),
          hoursDone: localHoursDone
        };
      }

      let done = 0;
      let total = 0;
      // We already have hoursDone in localHoursDone at this point

      filteredActivities.forEach((a: any) => {
        a.matchingSubtasks.forEach((st: Subtask) => {
          total++;
          if (st.status === STATUS.DONE) {
            done++;
          }
        });
      });

      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return { done, total, pct, hoursDone: localHoursDone };
    }, [filteredActivities, backendProgress, timeFilter, searchTerm, courseFilter, statusFilter]);

    const overallProgress = stats.pct;
    const totalDone = stats.done;
    const totalAll = stats.total;
    const totalHoursDone = stats.hoursDone;

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
    ) => {
      if (processingTasks.has(subtaskId)) return;

      queryCache.invalidateByPrefix('hoy:');

      // Find current status to toggle
      const activity = activities.find(a => a.id === activityId);
      const subtask = activity?.subtasks.find(s => s.id === subtaskId);
      const isCurrentlyDone = subtask?.status === STATUS.DONE;
      const nextStatus = isCurrentlyDone ? STATUS.PENDING : STATUS.DONE;

      setProcessingTasks((prev) => new Set(prev).add(subtaskId));

      try {
        const updateData = { status: nextStatus };
        await updateSubtask(activityId, subtaskId, updateData);

        // Optimistic update for backendProgress to ensure the chart and stats update immediately
        setBackendProgress((prev: any) => {
          if (!prev) return prev;
          const delta = nextStatus === STATUS.DONE ? 1 : -1;
          const newDone = Math.max(0, prev.completed_count + delta);
          return {
            ...prev,
            completed_count: newDone,
            percent: prev.total_count > 0 ? Math.round((newDone / prev.total_count) * 100) : 0
          };
        });

        setNoteValues((prev) => {
          const copy = { ...prev };
          delete copy[subtaskId];
          return copy;
        });
      } catch (err: any) {
        console.error('❌ PATCH Error:', err);
        // showToast is handled by hook
        refresh();
      } finally {
        setProcessingTasks((prev) => {
          const next = new Set(prev);
          next.delete(subtaskId);
          return next;
        });
      }
    };

    const handlePostponeTask = async (note: string) => {
      if (!postponingTask) return;
      const { activityId, id: subtaskId } = postponingTask;
      const taskLabel = String(postponingTask?.title ?? postponingTask?.name ?? "esta subtarea");

      if (processingTasks.has(subtaskId)) return;

      queryCache.invalidateByPrefix('hoy:');
      setProcessingTasks((prev) => new Set(prev).add(subtaskId));

      try {
        await postponeSubtask(activityId, subtaskId, note.trim());

        // If it was DONE before and now it's POSTPONED (not really possible from UI but safe)
        // or just ensure we don't need to decrement counts.
        // Actually, postpone doesn't affect the DONE count unless it was DONE.
        // But we can still refresh global progress to be sure, or just keep it as is.
        // The most important thing is DONE/PENDING toggle.

        setPostponeSuccessMessage(
          `Se cambió el estado de "${taskLabel}" a Pospuesta. La fecha de entrega no se verá afectada.`
        );
        setPostponeSuccessOpen(true);
        setIsPostponeModalOpen(false);
        setPostponingTask(null);
      } catch (err: any) {
        console.error('❌ Postpone Error:', err);
        showToast('No se pudo posponer la tarea.', 'error');
        refresh();
      } finally {
        setProcessingTasks((prev) => {
          const next = new Set(prev);
          next.delete(subtaskId);
          return next;
        });
      }
    };

    const openPostponeModal = (st: Subtask, activityId: number) => {
      setPostponingTask({ ...st, activityId });
      setIsPostponeModalOpen(true);
    };

    const openDeleteModal = (st: Subtask, activityId: number) => {
      setDeletingTask({ ...st, activityId });
      setIsDeleteModalOpen(true);
    };

    const handleDeleteTask = async () => {
      if (!deletingTask) return;
      const { activityId, id: subtaskId } = deletingTask;

      setIsDeleting(true);
      try {
        const { deleteSubtask } = await import('@/api/services/subtask');
        await deleteSubtask(activityId, subtaskId);
        showToast('Tarea eliminada correctamente', 'success');
        setIsDeleteModalOpen(false);
        setDeletingTask(null);
        refresh();
      } catch (err) {
        showToast('Error al eliminar la tarea', 'error');
      } finally {
        setIsDeleting(false);
      }
    };

    const openConflictModal = (st: Subtask, activity: Activity) => {
      setConflictModalTask(st);
      setConflictActivityMeta({ id: activity.id, title: activity.title, deadline: activity.deadline });
      setReduceHours(st.estimated_hours ? String(st.estimated_hours) : "");
      setReduceError("");
      setIsConflictModalOpen(true);
    };

    const handleReduceConflictHours = async () => {
      if (!conflictModalTask || !conflictActivityMeta) return;
      const hrs = parseFloat(reduceHours);
      if (isNaN(hrs) || hrs < 0.5) {
        setReduceError("Ingresa un número válido (mínimo 0.5)");
        return;
      }

      setIsReducing(true);
      setReduceError("");
      try {
        const res = await putSubtaskWithConflictTolerance(conflictModalTask.id, {
          estimated_hours: hrs
        });
        const resolved = !res.is_conflicted;
        await updateSubtask(conflictActivityMeta.id, conflictModalTask.id, {
          estimated_hours: hrs,
          is_conflicted: res.is_conflicted
        });

        setConflictModalTask(null);
        setIsConflictModalOpen(false);
        setConflictOutcomeSource("reduce");
        setConflictOutcome({
          resolved,
          dateKey: res.target_date || res.target_date || new Date().toISOString().slice(0, 10),
          availableHours: res.available_hours || 0,
          overworkHours: res.overwork_hours || 0,
          limitHours: res.limit_hours || 6,
        });
      } catch (err: any) {
        setReduceError(err?.response?.data?.detail || "Error al actualizar las horas.");
      } finally {
        setIsReducing(false);
      }
    };

    const handleMoveConflictTask = () => {
      if (!conflictModalTask || !conflictActivityMeta) return;
      const task = conflictModalTask;
      const meta = conflictActivityMeta;
      setConflictModalTask(null);
      setIsConflictModalOpen(false);
      navigate("/calendario", {
        state: {
          focusDate: task.target_date || new Date().toISOString().slice(0, 10),
          reprogramSubtask: {
            id: task.id,
            activityId: meta.id,
            title: task.name,
            deadline: meta.deadline,
            dateKey: task.target_date || new Date().toISOString().slice(0, 10),
            durationNum: task.estimated_hours || 0,
          }
        }
      });
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

    const isFirstTime = activities.length === 0;
    const isEmptyFiltered = activities.length > 0 && filteredActivities.length === 0;

    if (isFirstTime) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] w-full px-4 text-center animate-in fade-in zoom-in-[0.98] duration-700">
      <div className="relative mb-14">
        <div className="absolute inset-0 bg-blue-500/20 blur-[70px] rounded-full transform scale-150"></div>
        <div className="relative w-48 h-48 bg-[#111827] border border-slate-800/80 rounded-[3rem] shadow-2xl shadow-black/40 flex items-center justify-center rotate-3 transform hover:rotate-6 transition-all duration-500 z-10">
          <BarChart3 className="w-24 h-24 text-blue-500 drop-shadow-2xl" strokeWidth={1.5} />
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-blue-600 rounded-[1.2rem] shadow-xl shadow-blue-600/30 flex items-center justify-center -rotate-12 transform hover:rotate-0 hover:scale-110 transition-all duration-300 border-[6px] border-[#111827]">
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
        </div>
      </div>
      <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-slate-500 mb-6 tracking-tight drop-shadow-sm">
        Un lienzo en blanco
      </h2>
      <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed font-medium px-4">
        Aún no tienes actividades registradas. Este es el momento perfecto para organizar tu progreso académico.
      </p>
      <Button asChild className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl px-10 py-5 text-lg transition-all hover:-translate-y-1 shadow-[0_0_40px_-10px_rgba(37,99,235,0.4)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.6)]">
        <Link to="/crear">
          <span className="text-2xl font-light leading-none mb-0.5 mr-2">+</span>
          Crear mi primera actividad
        </Link>
      </Button>
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
          </div>
        </div>

        {/* FILTER BAR SECTION */}
        <div className="flex flex-wrap items-center gap-3 mb-2">
          {/* Filtro Curso */}
          <div className="flex items-center gap-2 bg-[#1F2937]/60 border border-slate-700/50 rounded-xl px-3 py-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Curso:</span>
            <Select value={courseFilter || "all"} onValueChange={(v) => setCourseFilter(v === "all" ? "all" : v)}>
              <SelectTrigger className="bg-[#1F2937] border-slate-700 text-slate-200 rounded-xl shadow-xl [&_[role=option]]:bg-transparent [&_[role=option]]:text-slate-200 [&_[role=option][data-highlighted]]:bg-blue-600 [&_[role=option][data-highlighted]]:text-white [&_[role=option][data-state=checked]]:bg-transparent [&_[role=option][data-state=checked]]:text-white [&_[role=option][data-state=checked][data-highlighted]]:bg-blue-600">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-[#1F2937] border-slate-700 text-slate-200 rounded-xl shadow-xl [&_[role=option]]:bg-transparent [&_[role=option]]:text-slate-200 [&_[role=option][data-highlighted]]:bg-blue-600 [&_[role=option][data-highlighted]]:text-white [&_[role=option][data-state=checked]]:bg-transparent [&_[role=option][data-state=checked]]:text-white [&_[role=option][data-state=checked][data-highlighted]]:bg-blue-600">
                <SelectItem value="all" className="rounded-lg cursor-pointer text-slate-200">Todos</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.name} className="rounded-lg cursor-pointer text-slate-200">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Estado */}
          <div className="flex items-center gap-2 bg-[#1F2937]/60 border border-slate-700/50 rounded-xl px-3 py-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado:</span>
            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "all" : v)}>
              <SelectTrigger className="bg-[#1F2937] border-slate-700 text-slate-200 rounded-xl shadow-xl [&_[role=option]]:bg-transparent [&_[role=option]]:text-slate-200 [&_[role=option][data-highlighted]]:bg-blue-600 [&_[role=option][data-highlighted]]:text-white [&_[role=option][data-state=checked]]:bg-transparent [&_[role=option][data-state=checked]]:text-white [&_[role=option][data-state=checked][data-highlighted]]:bg-blue-600">
                <SelectValue placeholder="Activos" />
              </SelectTrigger>
              <SelectContent className="bg-[#1F2937] border-slate-700 text-slate-200 rounded-xl shadow-xl [&_[role=option]]:bg-transparent [&_[role=option]]:text-slate-200 [&_[role=option][data-highlighted]]:bg-blue-600 [&_[role=option][data-highlighted]]:text-white [&_[role=option][data-state=checked]]:bg-transparent [&_[role=option][data-state=checked]]:text-white [&_[role=option][data-state=checked][data-highlighted]]:bg-blue-600">
                <SelectItem value="all" className="">Cualquier estado</SelectItem>
                <SelectItem value="PENDING" className="rounded-lg cursor-pointer text-slate-200">Pendiente</SelectItem>
                <SelectItem value="DONE" className="rounded-lg cursor-pointer text-slate-200">Completado</SelectItem>
                <SelectItem value="POSTPONED" className="rounded-lg cursor-pointer text-slate-200">Pospuesto</SelectItem>
                <SelectItem value="WAITING" className="rounded-lg cursor-pointer text-slate-200">En Espera</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Barra de Búsqueda */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar subtarea..."
              className="pl-9 bg-[#1F2937]/60 border-slate-700/50 text-slate-200 rounded-xl focus-visible:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtro Período */}
          <div className="flex items-center gap-2 bg-[#1F2937]/60 border border-slate-700/50 rounded-xl px-3 py-2">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="bg-transparent border-none p-0 h-auto gap-1 text-slate-200 focus:ring-0">
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent className="bg-[#1F2937] border-slate-700 text-slate-200 rounded-xl shadow-xl">
                <SelectItem value="all">Todo el tiempo</SelectItem>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botón limpiar — solo visible si hay filtros activos */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setCourseFilter("all");
                setStatusFilter("all");
                setSearchTerm("");
                setTimeFilter("all");
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-400 transition-colors px-3 py-2 rounded-xl border border-slate-700/50 bg-[#1F2937]/60"
            >
              <X className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Activities */}
          <div className="lg:col-span-2 space-y-6">
            {isFirstTime ? (
              <div className="flex flex-col items-center justify-center py-20 w-full px-4 text-center animate-in fade-in zoom-in-[0.98] duration-700">
                <div className="relative mb-14">
                <div className="absolute inset-0 bg-blue-500/20 blur-[70px] rounded-full transform scale-150"></div>
                <div className="relative w-48 h-48 bg-[#111827] border border-slate-800/80 rounded-[3rem] shadow-2xl shadow-black/40 flex items-center justify-center rotate-3 transform hover:rotate-6 transition-all duration-500 z-10">
                <BarChart3 className="w-24 h-24 text-blue-500 drop-shadow-2xl" strokeWidth={1.5} />
                <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-blue-600 rounded-[1.2rem] shadow-xl shadow-blue-600/30 flex items-center justify-center -rotate-12 transform hover:rotate-0 hover:scale-110 transition-all duration-300 border-[6px] border-[#111827]">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
            </div>
          </div>
            <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-slate-500 mb-6 tracking-tight drop-shadow-sm">
              Un lienzo en blanco
            </h2>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed font-medium px-4">
              Aún no tienes actividades registradas. Este es el momento perfecto para organizar tu progreso académico.
            </p>
            <Button asChild className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl px-10 py-5 text-lg transition-all hover:-translate-y-1 shadow-[0_0_40px_-10px_rgba(37,99,235,0.4)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.6)]">
            <Link to="/crear">
            <span className="text-2xl font-light leading-none mb-0.5 mr-2">+</span>
            Crear mi primera actividad
            </Link>
          </Button>
        </div>
            ): isEmptyFiltered ?(
              <div className="bg-[#111827] border border-slate-800/60 rounded-3xl shadow-xl shadow-black/20 flex flex-col items-center justify-center py-20 text-center px-8">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-5">
                <Search className="h-6 w-6 text-slate-500" />
                </div>
                <h3 className="text-base font-semibold text-slate-200 mb-2">
                  No hay resultados
                </h3>
                <p className="text-sm text-slate-500 max-w-xs leading-relaxed mb-6">
                  Prueba cambiando o limpiando los filtros.
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="h-9 px-5 text-sm font-medium bg-transparent border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 hover:border-slate-600 transition-colors rounded-xl"
                    onClick={() => {
                      setCourseFilter("all");
                      setStatusFilter("all");
                      setSearchTerm("");
                      setTimeFilter("all");
                    }}
                    >
                      Limpiar Filtros
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      className="h-9 px-4 text-sm text-slate-600 hover:text-slate-400 hover:bg-transparent transition-colors"
                      >
                        <Link to="/crear">Crear actividad</Link>
                      </Button>
                    </div>
                  </div>
            ) : (
              filteredActivities.map((activity: Activity) => {
                const courseName = getCourseName(activity.course);
                const courseColor = getCourseColor(activity.course);
                const CourseIcon = getCourseIcon(courseName);

                const done = activity.total_subtasks_done ?? activity.subtasks.filter((s: Subtask) => s.status === STATUS.DONE).length;
                const total = activity.total_subtasks ?? activity.subtasks.length;
                const pct = activity.completion_percent !== undefined ? Math.round(activity.completion_percent) : (total > 0 ? Math.round((done / total) * 100) : 0);
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
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] font-bold bg-slate-800/50 text-slate-400 border-slate-700 uppercase tracking-tighter">
                              {courseName}
                            </Badge>
                            <span className="text-slate-600">•</span>
                            <p className="text-sm text-slate-500">
                              Próxima fecha límite:{' '}
                              <span className={cn("font-medium", getDeadlineColor(activity.deadline, pct))}>
                                {getDeadlineText(activity.deadline)}
                              </span>
                            </p>
                          </div>
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
                    {isOpen && activity.matchingSubtasks && activity.matchingSubtasks.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                          Tareas ({activity.matchingSubtasks?.length})
                        </h4>
                        {activity.matchingSubtasks?.map((st: Subtask | any) => {
                          const isProcessing = processingTasks.has(st.id);
                          const isPostponed = st.status === STATUS.POSTPONED;
                          const isConflicted = st.is_conflicted && st.status !== STATUS.DONE;

                          return (
                            <div
                              key={st.id}
                              className={cn(
                                "group p-4 rounded-xl border transition-all duration-200 bg-[#1F2937]/30",
                                isConflicted
                                  ? "border-amber-400 animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.3)] bg-amber-400/5"
                                  : isPostponed
                                    ? "border-[#8B5CF6]/30 bg-[#8B5CF6]/20"
                                    : "border-slate-700/50 hover:border-blue-500/30 bg-slate-800/20",
                                isProcessing && "opacity-50 pointer-events-none"
                              )}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
                                <div className="flex items-center gap-3 mb-3 sm:mb-0">
                                  <button
                                    onClick={() => handleCompleteTask(activity.id, st.id)}
                                    disabled={isProcessing}
                                    className={cn(
                                      "relative h-5 w-5 cursor-pointer rounded border transition-all flex items-center justify-center disabled:cursor-not-allowed",
                                      st.status === STATUS.DONE
                                        ? "bg-emerald-500 border-emerald-500"
                                        : "bg-transparent border-slate-600 hover:border-blue-500"
                                    )}
                                  >
                                    {st.status === STATUS.DONE ? (
                                      <CheckCircle2 className="h-4 w-4 text-white" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-slate-500" />
                                    )}
                                  </button>
                                  <span className={cn(
                                    "text-sm font-medium transition-colors cursor-pointer hover:text-blue-400 transition-colors",
                                    st.status === STATUS.DONE ? "text-slate-500 line-through" : "text-slate-200 group-hover:text-blue-400"
                                  )}
                                    onClick={() => setDetailTask(st)}>
                                    {st.name || st.title || ""}
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
                                  {isConflicted && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-[11px] font-semibold bg-amber-400/20 text-amber-400 hover:text-amber-300 border-amber-400/40 hover:bg-amber-400/30"
                                      onClick={() => openConflictModal(st, activity)}
                                    >
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Solucionar
                                    </Button>
                                  )}
                                  {isPostponed ? (
                                    <Badge variant="secondary" className="text-[10px] bg-slate-700/50 text-slate-300 border-slate-600">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Pospuesta
                                    </Badge>
                                  ) : st.status === STATUS.DONE ? (
                                    st.note ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                                        onClick={() => setDetailTask(st)}
                                      >
                                        <FileText className="h-3 w-3 mr-1" />
                                        Ver nota
                                      </Button>
                                    ) : null
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={isProcessing}
                                      className="h-8 text-xs bg-transparent hover:bg-slate-600/30 border-slate-700 text-slate-300 disabled:opacity-50"
                                      onClick={() => openPostponeModal(st, activity.id)}
                                    >
                                      Posponer
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isProcessing}
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-blue-400 border-slate-700"
                                    onClick={() => {
                                      setEditingTask({ ...st, title: st.name || st.title, activity });
                                      setIsEditModalOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    disabled={isProcessing}
                                    className={cn(
                                      "h-8 text-xs transition-all disabled:opacity-50",
                                      st.status === STATUS.DONE
                                        ? "bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white"
                                        : "bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white"
                                    )}
                                    onClick={() => handleCompleteTask(activity.id, st.id)}
                                  >
                                    {isProcessing ? (
                                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                    ) : st.status === STATUS.DONE ? (
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                    ) : (
                                      <Circle className="h-3 w-3 mr-1" />
                                    )}
                                    <span>{st.status === STATUS.DONE ? 'Completada' : 'Hecho'}</span>
                                  </Button>
                                </div>
                              </div>
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
              <h3 className="text-lg font-semibold text-white mb-6">Progreso de {timeFilter === "today" ? "hoy" : timeFilter === "week" ? "esta semana" : "este mes"}</h3>
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
            {/* Postponed Tasks */}
            {(() => {
              const postponed = activities.flatMap((a: Activity) =>
                a.subtasks
                  .filter((s: Subtask) => s.status === STATUS.POSTPONED)
                  .map((s: Subtask) => ({ ...s, course: getCourseName(a.course) }))
              );
              if (postponed.length === 0) return null;
              return (
                <div className="bg-[#111827] border border-slate-800/60 rounded-3xl p-6 shadow-xl shadow-black/20">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    Pospuestas
                  </h3>
                  <div className="space-y-3">
                    {postponed.slice(0, 4).map((t) => (
                      <div key={t.id} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 text-[10px] font-black uppercase">
                            Pospuesto
                          </span>
                          <p className="text-sm font-semibold text-slate-200 truncate">{t.name || t.title || ""}</p>
                        </div>
                        <p className="text-xs text-slate-500 pl-0.5">{t.course}</p>
                        {t.note && (
                          <p className="text-xs text-slate-500 italic pl-0.5">"{t.note}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* History */}
            {(() => {
              const history = activities.flatMap((a: Activity) =>
                a.subtasks
                  .filter((s: Subtask) => s.status === STATUS.DONE)
                  .map((s: Subtask) => ({ ...s, course: getCourseName(a.course) }))
              ).slice(0, 6);
              if (history.length === 0) return null;
              return (
                <div className="bg-[#111827] border border-slate-800/60 rounded-3xl p-6 shadow-xl shadow-black/20">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-slate-400" />
                    Historial
                  </h3>
                  <div className="space-y-3">
                    {history.map((t) => (
                      <div key={t.id} className="flex items-start gap-2 text-slate-400">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-slate-600" />
                        <div>
                          <p className="text-xs text-slate-300 truncate">{t.name || t.title || ""}</p>
                          <p className="text-[10px] text-slate-500">{t.course}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

          </aside>
        </div>

        <EditSubtaskModal
          open={Boolean(isEditModalOpen && editingTask)}
          onOpenChange={(open) => {
            setIsEditModalOpen(open);
            if (!open) setEditingTask(null);
          }}
          initialTitle={String(editingTask?.title ?? "")}
          initialHours={editingTask?.estimated_hours}
          onReprogram={() => {
            if (!editingTask) return;
            const targetDate = editingTask.target_date;
            const estimatedHours = parseFloat(String(editingTask.estimated_hours || 0)) || 0;
            navigate("/calendario", {
              state: {
                focusDate: targetDate,
                reprogramSubtask: {
                  id: editingTask.id,
                  activityId: editingTask.activity?.id,
                  title: editingTask.title,
                  deadline: editingTask.activity?.deadline,
                  dateKey: targetDate,
                  durationNum: estimatedHours,
                },
              },
            });
          }}
          onDelete={() => {
            if (!editingTask) return;
            setIsEditModalOpen(false);
            openDeleteModal(editingTask, editingTask.activity.id);
          }}
          onSave={async ({ title, estimatedHours }) => {
            if (!editingTask) return { ok: false, error: "No hay subtarea seleccionada." };

            const activityId = editingTask.activity?.id;
            const subtaskId = editingTask.id;

            try {
              await updateSubtask(activityId, subtaskId, {
                title,
                estimated_hours: estimatedHours,
              });

              setIsEditModalOpen(false);
              setEditingTask(null);
              return { ok: true };
            } catch {
              return {
                ok: false,
                error:
                  "No pudimos guardar los cambios. Revisa que las horas no superen tu límite diario de estudio y vuelve a intentarlo.",
              };
            }
          }}
        />

        <PostponeSubtaskModal
          isOpen={isPostponeModalOpen}
          onClose={() => {
            setIsPostponeModalOpen(false);
            setPostponingTask(null);
          }}
          onConfirm={handlePostponeTask}
          isProcessing={postponingTask && processingTasks.has(postponingTask.id)}
        />

        <MessageModal
          open={postponeSuccessOpen}
          onOpenChange={setPostponeSuccessOpen}
          type="success"
          title="Pospuesta guardada"
          message={postponeSuccessMessage}
        />

        {isDeleteModalOpen && deletingTask && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="w-full max-w-[560px] bg-[#111827] border border-slate-800 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden">
              <div className="p-6 sm:p-7 relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingTask(null);
                  }}
                  className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                  aria-label="Cerrar"
                  disabled={isDeleting}
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <Trash2 className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                      Eliminar subtarea
                    </h3>
                    <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                      ¿Estás seguro de que quieres eliminar la subtarea{" "}
                      <span className="text-red-400 font-semibold italic">"{deletingTask.name || deletingTask.title}"</span>? Esta acción no se puede deshacer.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-slate-800/60">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setDeletingTask(null);
                    }}
                    className="h-11 px-6 rounded-xl border-slate-700 text-slate-400 hover:bg-slate-800"
                    disabled={isDeleting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleDeleteTask}
                    className="h-11 px-8 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-600/20"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Eliminando..." : "Eliminar tarea"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conflict Resolution Modals */}
        <ResolveConflictModal
          isOpen={isConflictModalOpen}
          onClose={() => {
            setIsConflictModalOpen(false);
            setConflictModalTask(null);
          }}
          selectedConflict={conflictModalTask}
          dateFormatted={conflictModalTask?.target_date ? getFormattedDate(conflictModalTask.target_date) : ""}
          dayLabel={conflictModalTask?.target_date ? getRelativeDateLabel(conflictModalTask.target_date) : ""}
          reduceHours={reduceHours}
          setReduceHours={setReduceHours}
          isReducing={isReducing}
          reduceError={reduceError}
          onReduceConfirm={handleReduceConflictHours}
          onMoveTask={handleMoveConflictTask}
        />

        <ConflictOutcomeModal
          isOpen={!!conflictOutcome}
          onClose={() => setConflictOutcome(null)}
          outcome={conflictOutcome}
          source={conflictOutcomeSource}
          onContinueResolving={() => {
            setConflictOutcome(null);
            // If there were more conflicts we could keep it open, 
            // but Progress view handles them one by one.
          }}
          getRelativeDateLabel={getRelativeDateLabel}
          getFormattedDate={getFormattedDate}
        />

        {/* Subtask Detail Dialog */}
        <SubtaskDetailModal
          open={!!detailTask}
          onOpenChange={(open) => { if (!open) setDetailTask(null); }}
          subtask={detailTask}
          getFormattedDate={getFormattedDate}
        />
      </div>
    );
  }