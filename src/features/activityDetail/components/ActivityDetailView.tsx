import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, ChevronRight, AlertTriangle, Clock } from "lucide-react";
import { format, parseISO, startOfDay, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { ResolveConflictModal } from "@/shared/components/ResolveConflictModal";
import { ConflictOutcomeModal } from "@/shared/components/ConflictOutcomeModal";
import PostponeSubtaskModal from "@/shared/components/PostponeSubtaskModal";
import { postponeSubtask, updateSubtask, getSubtasksForActivity, patchSubtask } from "@/api/services/subtask";
import { queryCache } from "@/lib/queryCache";
import { cn } from "@/shared/utils/utils";
import ActivityDetailHeader from "./ActivityDetailHeader";
import ActivityProgressCard from "./ActivityProgressCard";
import StudyPlanSection from "./StudyPlanSection";
import { getActivity } from "@/api/services/activity";
import { useToast } from "@/shared/components/toast";

const PROGRESS_STATUS = {
  PENDING: "PENDING",
  DONE: "DONE",
  POSTPONED: "POSTPONED",
  WAITING: "WAITING",
};

interface ActivityDetailViewProps {
  activityId?: string;
}

interface BackendActivity {
  id: string;
  title: string;
  description?: string;
  course?: {
    id: string;
    name: string;
  };
  course_id?: string;
  type: string;
  deadline?: string;
  event_datetime?: string;
  created_at?: string;
}

interface BackendSubtask {
  id: string;
  title: string; // El backend devuelve 'title', no 'name'
  target_date?: string;
  estimated_hours?: number;
  status?: "PENDING" | "DONE" | "POSTPONED" | "WAITING";
  execution_note?: string;
  is_conflicted?: boolean;
}

export default function ActivityDetailView({ activityId }: ActivityDetailViewProps) {
  const [activity, setActivity] = useState<BackendActivity | null>(null);
  const [subtasks, setSubtasks] = useState<BackendSubtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Conflict Modals State
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflictModalTask, setConflictModalTask] = useState<any>(null);
  const [conflictOutcome, setConflictOutcome] = useState<any>(null);
  const [conflictOutcomeSource, setConflictOutcomeSource] = useState<"reduce" | "move" | null>(null);

  // Postpone Modal State
  const [isPostponeModalOpen, setIsPostponeModalOpen] = useState(false);
  const [postponingTask, setPostponingTask] = useState<any>(null);
  const [isPostponing, setIsPostponing] = useState(false);

  // Conflict Resolution logic states (as seen in Progress.tsx)
  const [reduceHours, setReduceHours] = useState("");
  const [isReducing, setIsReducing] = useState(false);
  const [reduceError, setReduceError] = useState("");

  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();

  const getFormattedDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "EEEE d 'de' MMMM", { locale: es });
    } catch {
      return dateString;
    }
  };

  const getRelativeDateLabel = (dateString: string) => {
    try {
      const date = startOfDay(parseISO(dateString));
      const today = startOfDay(new Date());
      const diff = differenceInDays(date, today);

      if (diff === 0) return "PARA HOY";
      if (diff === 1) return "PARA MAÑANA";
      if (diff === -1) return "HACE 1 DÍA";
      if (diff < -1) return `HACE ${Math.abs(diff)} DÍAS`;
      return `EN ${diff} DÍAS`;
    } catch {
      return "";
    }
  };

  const isMountedRef = useRef(true);

  // Función para actualizar el estado de una subtarea de forma optimista
  const handleSubtaskStatusChange = (subtaskId: string, newStatus: boolean) => {
    // Actualización optimista: cambiar el estado local inmediatamente
    setSubtasks((prevSubtasks) => {
      return prevSubtasks.map((subtask) => {
        if (subtask.id === subtaskId) {
          return {
            ...subtask,
            status: newStatus ? "DONE" : "PENDING",
          };
        }
        return subtask;
      });
    });

    // NO refrescar desde el backend inmediatamente para evitar que el gráfico vuelva a 0
    // El backend ya fue actualizado por el componente SubtaskItem mediante patchSubtask
    // Confiamos en la actualización optimista y solo sincronizamos después de un delay largo
    // para casos donde se necesite refrescar otros cambios (como ediciones de otros campos)
    if (activityId) {
      // Usar un delay más largo para evitar conflictos con la actualización optimista
      setTimeout(() => {
        getSubtasksForActivity(activityId)
          .then((subtasksData) => {
            if (isMountedRef.current) {
              setSubtasks((prevSubtasks) => {
                const backendSubtasks = Array.isArray(subtasksData) ? subtasksData : [];
                // Verificar que el cambio optimista se mantenga en el backend
                const optimisticSubtask = prevSubtasks.find(s => s.id === subtaskId);
                const backendSubtask = backendSubtasks.find(s => s.id === subtaskId);

                // Solo actualizar si el backend confirma el cambio optimista
                // Esto previene que el gráfico vuelva a 0 si hay un delay en el backend
                if (optimisticSubtask && backendSubtask &&
                  optimisticSubtask.status === backendSubtask.status) {
                  // El backend confirma el cambio, usar los datos del backend
                  return backendSubtasks;
                }
                // Si hay discrepancia o el backend aún no refleja el cambio, mantener el estado optimista
                return prevSubtasks;
              });
            }
          })
          .catch((err) => {
            console.error("Error al refrescar subtareas:", err);
            // En caso de error, mantener el estado optimista
          });
      }, 3000); // Esperar 3 segundos antes de sincronizar para dar tiempo al backend
    }
  };

  const fetchActivityData = async () => {
    if (!activityId) {
      setError("ID de actividad no proporcionado");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Obtener actividad y subtareas en paralelo
      const [activityData, subtasksData] = await Promise.all([
        getActivity(activityId),
        getSubtasksForActivity(activityId).catch(() => []), // Si falla, usar array vacío
      ]);

      // Solo actualizar el estado si el componente sigue montado
      if (isMountedRef.current) {
        setActivity(activityData);
        setSubtasks(Array.isArray(subtasksData) ? subtasksData : []);
      }
    } catch (err: any) {
      console.error("Error al cargar actividad:", err);

      let errorMessage = "Error al cargar la actividad. Por favor, intenta de nuevo.";

      // Manejar diferentes tipos de errores
      if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        errorMessage = "La solicitud está tardando demasiado. Verifica tu conexión a internet o intenta de nuevo más tarde.";
      } else if (err?.response?.status === 404) {
        errorMessage = "La actividad no fue encontrada. Puede que haya sido eliminada.";
      } else if (err?.response?.status >= 500) {
        errorMessage = "Error del servidor. Por favor, intenta de nuevo más tarde.";
      } else if (err?.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err?.message) {
        errorMessage = err.message;
      }

      if (isMountedRef.current) {
        setError(errorMessage);
        showToast(errorMessage, "error");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const fetchSubtasksOnly = async () => {
    if (!activityId) return;

    try {
      const subtasksData = await getSubtasksForActivity(activityId).catch(() => []);
      if (isMountedRef.current) {
        setSubtasks(Array.isArray(subtasksData) ? subtasksData : []);
      }
    } catch (err) {
      console.error("Error al refrescar solo las subtareas:", err);
    }
  };

  useEffect(() => {
    if (!activityId) {
      setError("ID de actividad no proporcionado");
      setLoading(false);
      return;
    }

    isMountedRef.current = true;
    fetchActivityData();

    // Cleanup: cancelar si el componente se desmonta o cambia el activityId
    return () => {
      isMountedRef.current = false;
    };
  }, [activityId]); // Removido showToast de las dependencias para evitar loops infinitos

  // Formatear fecha para mostrar (formato: "DD MMM")
  const formatDate = (dateString?: string): string => {
    if (!dateString) return "";

    try {
      // Parsear la fecha correctamente, manejando diferentes formatos
      let date: Date;

      // Si viene en formato YYYY-MM-DD, parsearlo directamente
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        // Si viene en formato ISO o otro, usar el constructor de Date
        date = new Date(dateString);
      }

      // Validar que la fecha sea válida
      if (isNaN(date.getTime())) {
        console.warn("Fecha inválida:", dateString);
        return "";
      }

      const months = [
        "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
        "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"
      ];

      return `${date.getDate()} ${months[date.getMonth()]}`;
    } catch (error) {
      console.error("Error al formatear fecha:", dateString, error);
      return "";
    }
  };

  // Formatear tipo de actividad
  const formatActivityType = (type?: string): string => {
    const typeMap: { [key: string]: string } = {
      examen: "Examen",
      quiz: "Quiz",
      taller: "Taller",
      proyecto: "Proyecto",
      otro: "Otro",
    };
    return type ? typeMap[type] || type : "Actividad";
  };

  // Calcular progreso basado en subtareas completadas
  const calculateProgress = (): number => {
    if (subtasks.length === 0) return 0;
    const completed = subtasks.filter((s) => s.status === "DONE").length;
    return Math.round((completed / subtasks.length) * 100);
  };

  // Calcular tiempo restante
  const calculateTimeLeft = (): string => {
    if (!activity?.deadline) return "Sin fecha";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(activity.deadline);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Vencido";
    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "1 día";
    return `${diffDays} días`;
  };

  // Calcular esfuerzo total
  const calculateTotalEffort = (): string => {
    const totalHours = subtasks.reduce((sum, s) => {
      const hours = s.estimated_hours || 0;
      // Asegurar que hours sea un número válido
      const numHours = typeof hours === 'number' ? hours : parseFloat(String(hours)) || 0;
      return sum + numHours;
    }, 0);

    if (totalHours === 0) return "0h";

    // Formatear las horas: si es un número entero, mostrar sin decimales; si tiene decimales, mostrar hasta 1 decimal
    const formattedHours = totalHours % 1 === 0
      ? totalHours.toString()
      : totalHours.toFixed(1);

    return `${formattedHours}h`;
  };

  // Determinar estado
  const getStatus = (): string => {
    if (subtasks.length > 0 && calculateProgress() === 100) return "Finalizado";

    if (!activity?.deadline) return "Sin fecha";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(activity.deadline);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Vencido";
    if (diffDays <= 3) return "Urgente";
    if (subtasks.length > 0 && calculateProgress() > 0) return "En progreso";
    return "Pendiente";
  };

  if (loading) {
    return (
      <div className="bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 font-display min-h-screen overflow-y-auto p-6 md:p-10 lg:p-12">
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-slate-400 dark:text-slate-500 animate-spin" />
            <p className="text-slate-500 dark:text-slate-400">Cargando los detalles de la actividad...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 font-display min-h-screen overflow-y-auto p-6 md:p-10 lg:p-12">
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error || "Actividad no encontrada"}</p>
            <button
              onClick={() => navigate("/progreso")}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Volver a Progreso
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Formatear subtareas para StudyPlanSection
  const formattedSubtasks = (Array.isArray(subtasks) && subtasks.length > 0)
    ? subtasks.map((subtask) => {
      let isToday = false;
      if (subtask.target_date) {
        // Parse date directly to avoid timezone offsetting issues
        const dateStr = subtask.target_date.split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        const today = new Date();
        isToday = today.getFullYear() === year &&
          today.getMonth() === month - 1 &&
          today.getDate() === day;
      }

      return {
        id: subtask.id,
        activityId: activityId || "",
        title: subtask.title, // El backend devuelve 'title'
        date: formatDate(subtask.target_date), // Fecha formateada para mostrar
        dateOriginal: subtask.target_date || "", // Fecha original en formato YYYY-MM-DD para el modal de edición
        hours: subtask.estimated_hours ? `${subtask.estimated_hours}h` : "0h",
        completed: subtask.status === "DONE",
        isActive: subtask.status === "PENDING" && !isToday,
        todayBadge: isToday,
        execution_note: subtask.execution_note,
        isConflicted: !!subtask.is_conflicted,
        status: subtask.status || "PENDING",
      };
    })
    : [];

  const handlePostponeTask = async (note: string) => {
    if (!postponingTask) return;
    const { id: subtaskId } = postponingTask;

    try {
      setIsPostponing(true);

      // Optimistic Update
      setSubtasks((prev) =>
        prev.map((s) =>
          s.id === subtaskId ? { ...s, status: "POSTPONED" as any, execution_note: note.trim() } : s
        )
      );

      await postponeSubtask(activityId!, subtaskId, note.trim());
      showToast('Tarea pospuesta correctamente', 'success');
      setIsPostponeModalOpen(false);
      setPostponingTask(null);
      queryCache.invalidateByPrefix('hoy:');
    } catch (err: any) {
      console.error('Error postponing task:', err);
      showToast('No se pudo posponer la tarea.', 'error');
      // On error, let the refetch handle correcting the state (or add rollback logic)
      fetchSubtasksOnly();
    } finally {
      setIsPostponing(false);
    }
  };

  const handleMoveConflictTask = () => {
    if (!conflictModalTask) return;
    const { id, target_date, estimated_hours, title } = conflictModalTask;
    navigate("/calendario", {
      state: {
        focusDate: target_date,
        reprogramSubtask: {
          id,
          activityId: activity?.id,
          title,
          deadline: activity?.deadline,
          dateKey: target_date,
          durationNum: estimated_hours,
        },
      },
    });
    setIsConflictModalOpen(false);
    setConflictModalTask(null);
  };

  const handleReduceConflictHours = async () => {
    if (!conflictModalTask || !reduceHours) return;

    const val = parseFloat(reduceHours);
    if (isNaN(val) || val <= 0) {
      setReduceError("Ingresa un número válido de horas.");
      return;
    }

    setIsReducing(true);
    setReduceError("");

    try {
      const result = await updateSubtask(activity?.id || "", conflictModalTask.id, {
        estimated_hours: val,
      });

      // The backend returns { resolved, date_key, available_hours, overwork_hours, limit_hours }
      setConflictOutcome({
        resolved: result.resolved,
        dateKey: result.date_key,
        availableHours: result.available_hours || 0,
        overworkHours: result.overwork_hours || 0,
        limitHours: result.limit_hours || 6,
      });

      setConflictOutcomeSource("reduce");
      setIsConflictModalOpen(false);
      setConflictModalTask(null);
      setReduceHours("");
      fetchSubtasksOnly();
    } catch (err: any) {
      console.error("Error reducing hours:", err);
      setReduceError(err?.response?.data?.detail || "No se pudieron actualizar las horas.");
    } finally {
      setIsReducing(false);
    }
  };

  return (
    <>
      <ToastComponent />
      <div className="bg-[#f8fafc] dark:bg-[#0A0F1C] text-slate-800 dark:text-slate-200 font-display min-h-screen overflow-y-auto">
        <div className="p-6 md:p-10 lg:p-12">
          <div className="max-w-[1000px] mx-auto flex flex-col space-y-8">
            <ActivityDetailHeader
              activityId={activityId}
              typeLabel={formatActivityType(activity.type)}
              dueDate={activity.deadline ? `DUE ${formatDate(activity.deadline)}` : "Sin fecha"}
              title={activity.title}
              description={activity.description || ""}
              courseId={activity.course?.id || activity.course_id}
              courseName={activity.course?.name}
              eventDate={activity.event_datetime ? activity.event_datetime.split("T")[0] : undefined}
              deadlineDate={activity.deadline || undefined}
              subtasks={subtasks.map((s) => ({
                id: parseInt(s.id),
                nombre: s.title,
                fechaObjetivo: s.target_date || "",
                horas: s.estimated_hours?.toString() || "",
              }))}
              onActivityUpdated={fetchActivityData}
            />

            <ActivityProgressCard
              progressPercent={calculateProgress()}
              timeLeft={calculateTimeLeft()}
              totalEffort={calculateTotalEffort()}
              status={getStatus()}
            />

            <StudyPlanSection
              subtasks={formattedSubtasks}
              activityId={activityId || ""}
              onSubtaskStatusChange={handleSubtaskStatusChange}
              onSubtaskUpdated={fetchSubtasksOnly}
              deadlineDate={activity.deadline}
              onOpenResolveConflict={(st: any) => {
                setConflictModalTask(st);
                setIsConflictModalOpen(true);
              }}
              onOpenPostpone={(st: any) => {
                setPostponingTask(st);
                setIsPostponeModalOpen(true);
              }}
            />
          </div>
        </div>
      </div>

      {/* Conflict & Postpone Modals */}
      {isConflictModalOpen && conflictModalTask && (
        <ResolveConflictModal
          isOpen={isConflictModalOpen}
          onClose={() => {
            setIsConflictModalOpen(false);
            setConflictModalTask(null);
            setReduceHours("");
            setReduceError("");
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
      )}

      {conflictOutcome && (
        <ConflictOutcomeModal
          isOpen={!!conflictOutcome}
          onClose={() => {
            setConflictOutcome(null);
            setConflictOutcomeSource(null);
          }}
          outcome={conflictOutcome}
          source={conflictOutcomeSource}
          onContinueResolving={() => {
            setConflictOutcome(null);
          }}
          getRelativeDateLabel={getRelativeDateLabel}
          getFormattedDate={getFormattedDate}
        />
      )}

      {isPostponeModalOpen && (
        <PostponeSubtaskModal
          isOpen={isPostponeModalOpen}
          onClose={() => {
            setIsPostponeModalOpen(false);
            setPostponingTask(null);
          }}
          onConfirm={handlePostponeTask}
          isProcessing={isPostponing}
        />
      )}
    </>
  );
}
