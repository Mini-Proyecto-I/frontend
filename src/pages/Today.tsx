import React, { useState, useMemo, useEffect, useRef } from "react";
import { parseISO, startOfDay, differenceInDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, AlertCircle, Clock, Search, X, Loader2, CalendarClock, Info, CheckCircle2, Calendar, Pencil, Check, ChevronUp, ChevronDown, HelpCircle, CalendarRange, Trash2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useHoy } from "@/features/today/hooks/useHoy";
import { useAuth } from "@/app/authContext";
import { patchSubtask, deleteSubtask, putSubtaskWithConflictTolerance, postponeSubtask } from "@/api/services/subtask";
import { updateConfig, getConfig } from "@/api/services/config";
import { queryCache } from "@/lib/queryCache";
import { Input } from "@/shared/components/input";
import { Button } from "@/shared/components/button";
import EditSubtaskModal from "@/shared/components/EditSubtaskModal";
import { ResolveConflictModal } from "@/shared/components/ResolveConflictModal";
import { ConflictOutcomeModal } from "@/shared/components/ConflictOutcomeModal";
import { OverloadAlert } from "@/features/today/components/OverloadAlert";
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
import InfoTooltip from "@/features/create/components/InfoTooltip";
import { SubtaskDetailModal } from "@/shared/components/SubtaskDetailModal";
import { Badge } from "@/shared/components/badge";
import { MessageModal } from "@/shared/components/MessageModal";

function getGreeting(name: string) {
  const hour = new Date().getHours();
  // Name usually could have spaces, just take first name
  const firstName = name.split(" ")[0];
  if (hour >= 5 && hour < 12) return `¡Buen día, ${firstName}!`;
  if (hour >= 12 && hour < 19) return `¡Buenas tardes, ${firstName}!`;
  return `¡Buenas noches, ${firstName}!`;
}

function formatHours(hoursStr: string | number) {
  const h = parseFloat(String(hoursStr));
  if (h < 1) return `${Math.round(h * 60)} MIN`;
  return `${h.toFixed(1)}H`;
}

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



export default function Today() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isPostponeModalOpen, setIsPostponeModalOpen] = useState(false);
  const [postponingTask, setPostponingTask] = useState<any | null>(null);
  const [postponeNote, setPostponeNote] = useState("");
  const [postponeSuccessOpen, setPostponeSuccessOpen] = useState(false);
  const [postponeSuccessMessage, setPostponeSuccessMessage] = useState("");
  const [welcomeStep, setWelcomeStep] = useState(1);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [limitHours, setLimitHours] = useState(() => {
    const saved = window.localStorage.getItem("studyLimitHours");
    return saved ? parseFloat(saved) : 6;
  });
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [tempLimit, setTempLimit] = useState(limitHours.toString());
  const [welcomeLimit, setWelcomeLimit] = useState("6");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailTask, setDetailTask] = useState<any | null>(null);

  const openEditModal = (task: any) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (task: any) => {
    setDeletingTask(task);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingTask) return;

    setIsDeleting(true);
    const activityId = deletingTask.activity?.id;
    const subtaskId = deletingTask.id;

    try {
      await deleteSubtask(activityId, subtaskId);

      // Remove from local state
      setData((prev: any) => {
        const filterList = (list: any[]) => list.filter((item) => item.id !== subtaskId);
        return {
          ...prev,
          vencidas: filterList(prev.vencidas),
          para_hoy: filterList(prev.para_hoy),
          proximas: filterList(prev.proximas),
        };
      });

      setTiempoData((prev: any[]) => prev.filter((t: any) => t.id !== subtaskId) as any);

      queryCache.invalidate('activities');
      refetch();
      refetchTiempo();

      setIsDeleteModalOpen(false);
      setDeletingTask(null);
    } catch (e: any) {
      console.error("Error al eliminar subtarea:", e);
      // You could add an error state here if needed
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveLimit = async () => {
    let val = parseFloat(tempLimit);
    if (isNaN(val)) val = limitHours;
    if (val < 0.5) val = 0.5;
    if (val > 24) val = 24;

    try {
      // Sincronizar con el backend
      await updateConfig(val);

      // Actualizar estado local
      setLimitHours(val);
      setTempLimit(val.toString());
      window.localStorage.setItem("studyLimitHours", val.toString());
      setIsEditingLimit(false);

      // Refrescar datos para recalcular conflictos con el nuevo límite
      refetch();
    } catch (error) {
      console.error("Error al actualizar límite diario:", error);
      // Aún así guardar en localStorage para que el usuario vea el cambio
      setLimitHours(val);
      setTempLimit(val.toString());
      window.localStorage.setItem("studyLimitHours", val.toString());
      setIsEditingLimit(false);
    }
  };

  useEffect(() => {
    // Verificar si el welcome está en progreso (persiste ante recargas)
    const isFirstTime = window.localStorage.getItem("welcomeInProgress") === "true";
    if (location.state?.justRegistered || isFirstTime) {
      setShowWelcomeModal(true);
      window.localStorage.setItem("welcomeInProgress", "true");
      // Limpiar state al montarse el componente para evitar que aparezca de nuevo por state, 
      // pero mantenemos el flag de localStorage hasta que termine.
      if (location.state?.justRegistered) {
        navigate("/hoy", { replace: true, state: {} });
      }
    }
  }, [location.state, navigate]);

  // Sincronizar el límite diario con la configuración del backend al montar
  useEffect(() => {
    const fetchUserLimit = async () => {
      try {
        const data = await getConfig();
        const backendLimit = data?.daily_hours_limit;
        if (backendLimit !== undefined && backendLimit !== null) {
          const num = parseFloat(String(backendLimit));
          if (!isNaN(num)) {
            setLimitHours(num);
            setTempLimit(num.toString());
            window.localStorage.setItem("studyLimitHours", num.toString());
          }
        }
      } catch (error) {
        console.error("Error fetching user config (daily_hours_limit):", error);
        // Si falla, seguimos usando el valor de localStorage o el default de 6h
      }
    };

    fetchUserLimit();
  }, []);

  const [filters, setFilters] = useState({
    status: "",
    course: "",
    days_ahead: 7
  });
  const [search, setSearch] = useState("");
  const hasActiveFilters = Boolean(filters.course || filters.status || search);
  const [activeTab, setActiveTab] = useState<'vencidas' | 'para_hoy' | 'proximas'>('para_hoy');

  const {
    vencidas,
    para_hoy,
    proximas,
    total_vencidas,
    total_para_hoy,
    total_proximas,
    courses,
    loading,
    error,
    refetch,
    setData,
    setTiempoData,
    tiempoData,
    refetchTiempo
  } = useHoy(filters);

  // Cargar límite desde el backend al montar el componente
  useEffect(() => {
    const loadLimitFromBackend = async () => {
      try {
        const config = await getConfig();
        if (config?.daily_hours_limit) {
          const backendLimit = parseFloat(config.daily_hours_limit);
          const currentLimit = parseFloat(window.localStorage.getItem("studyLimitHours") || "6");

          // Solo actualizar si es diferente para evitar refrescos innecesarios
          if (Math.abs(backendLimit - currentLimit) > 0.01) {
            setLimitHours(backendLimit);
            setTempLimit(backendLimit.toString());
            window.localStorage.setItem("studyLimitHours", backendLimit.toString());
            // Refrescar datos para recalcular conflictos con el límite correcto
            refetch();
          }
        }
      } catch (error) {
        console.error("Error al cargar límite desde backend:", error);
        // Si falla, usar el valor de localStorage como fallback
      }
    };
    loadLimitFromBackend();
  }, [refetch]);


  const handlePostpone = async () => {
    if (!postponingTask) return;
    const taskLabel = String(postponingTask?.title ?? postponingTask?.name ?? "esta subtarea");
    try {
      await postponeSubtask(postponingTask.activity?.id, postponingTask.id, postponeNote);

      setData((prev: any) => {
        // No movemos la fecha objetivo: solo cambiamos el estado a POSTPONED.
        // Por eso debe seguir apareciendo en su sección (vencidas/para_hoy/proximas).
        const updateList = (list: any[]) =>
          list.map((item) => (item.id === postponingTask.id ? { ...item, status: "POSTPONED" } : item));
        return {
          ...prev,
          vencidas: updateList(prev.vencidas),
          para_hoy: updateList(prev.para_hoy),
          proximas: updateList(prev.proximas),
        };
      });

      // Actualizar también la lista usada para el cálculo de capacidad (tiempoData).
      setTiempoData((prev: any[]) =>
        prev.map((t: any) => (t.id === postponingTask.id ? { ...t, status: "POSTPONED" } : t)) as any
      );

      queryCache.invalidate('activities');
      refetch();
      refetchTiempo();

      setPostponeSuccessMessage(
        `Se cambió el estado de "${taskLabel}" a Pospuesta. La fecha de entrega no se verá afectada.`
      );
      setPostponeSuccessOpen(true);
    } catch (e) {
      console.error("Error al posponer subtarea:", e);
    } finally {
      setIsPostponeModalOpen(false);
      setPostponingTask(null);
      setPostponeNote("");
    }
  };

  const handleToggleSubtask = async (activityId: string, subtaskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "DONE" ? "PENDING" : "DONE";

    queryCache.invalidate('activities');
    // ── Optimistic local UI update ──────────────────────────────────────────
    setData((prev: any) => {
      const updateList = (list: any[]) =>
        list.map(item => item.id === subtaskId ? { ...item, status: newStatus } : item);

      return {
        ...prev,
        vencidas: updateList(prev.vencidas),
        para_hoy: updateList(prev.para_hoy),
        proximas: updateList(prev.proximas),
      };
    });

    setTiempoData((prev: any[]) =>
      prev.map(item => item.id === subtaskId ? { ...item, status: newStatus } : item) as any
    );

    try {
      await patchSubtask(activityId, subtaskId, { status: newStatus });
      // Update the tiempo card silently in background
      refetchTiempo();
    } catch (err) {
      console.error(err);
      // Revert optimistic update if the API call failed
      setData((prev: any) => {
        const revertList = (list: any[]) =>
          list.map(item => item.id === subtaskId ? { ...item, status: currentStatus } : item);

        return {
          ...prev,
          vencidas: revertList(prev.vencidas),
          para_hoy: revertList(prev.para_hoy),
          proximas: revertList(prev.proximas),
        };
      });

      setTiempoData((prev: any[]) =>
        prev.map(item => item.id === subtaskId ? { ...item, status: currentStatus } : item) as any
      );
    }
  };

  const handleClearFilters = () => {
    setFilters({ status: "", course: "", days_ahead: 7 });
    setSearch("");
  };

  const doneHours = useMemo(() => {
    if (!tiempoData) return 0;
    return tiempoData
      .filter((t: any) => t.status === "DONE")
      .reduce((acc: number, t: any) => acc + parseFloat(t.estimated_hours || 0), 0);
  }, [tiempoData]);

  const pendingHours = useMemo(() => {
    if (!tiempoData) return 0;
    return tiempoData
      .filter((t: any) => t.status !== "DONE")
      .reduce((acc: number, t: any) => acc + parseFloat(t.estimated_hours || 0), 0);
  }, [tiempoData]);

  const totalHours = doneHours + pendingHours;
  const isOverloaded = totalHours > limitHours;
  const conflictedTasks = useMemo<any[]>(() => {
    const all = [...vencidas, ...para_hoy, ...proximas];
    return all.filter((t: any) => t?.status !== "DONE" && t?.is_conflicted);
  }, [vencidas, para_hoy, proximas]);
  const conflictedCount = conflictedTasks.length;

  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [showConflictOutcomeModal, setShowConflictOutcomeModal] = useState(false);
  const [conflictOutcomeSource, setConflictOutcomeSource] = useState<"move" | "reduce" | null>(null);
  const [conflictOutcome, setConflictOutcome] = useState<null | {
    dateKey: string;
    usedHours: number;
    limitHours: number;
    availableHours: number;
    overworkHours: number;
    resolved: boolean;
  }>(null);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
  const [reduceHours, setReduceHours] = useState("");
  const [reduceError, setReduceError] = useState<string | null>(null);
  const [isReducing, setIsReducing] = useState(false);

  const selectedConflict = useMemo<any | null>(() => {
    if (conflictedTasks.length === 0) return null;
    return conflictedTasks.find((t: any) => String(t.id) === String(selectedConflictId)) ?? conflictedTasks[0];
  }, [conflictedTasks, selectedConflictId]);

  useEffect(() => {
    if (conflictedTasks.length === 0) {
      setIsConflictModalOpen(false);
      setSelectedConflictId(null);
      return;
    }

    // Abrir automáticamente cuando aparece el primer conflicto.
    setIsConflictModalOpen(true);

    // Mantener selección estable.
    const stillExists = conflictedTasks.some((t: any) => String(t.id) === String(selectedConflictId));
    if (!selectedConflictId || !stillExists) {
      setSelectedConflictId(String(conflictedTasks[0].id));
    }
  }, [conflictedTasks, selectedConflictId]);

  useEffect(() => {
    if (!selectedConflict) return;
    setReduceError(null);
    const current = parseFloat(String(selectedConflict.estimated_hours ?? 0));
    if (!Number.isFinite(current) || current <= 0) {
      setReduceHours("");
      return;
    }
    // Sugerencia por defecto: reducir exactamente el sobretrabajo,
    // sin bajar de 0.5h como límite mínimo.
    const dayKey = selectedConflict?.target_date;
    const stats = computeDayLoadForDateKey(dayKey);
    const over = stats.overworkHours || 0;

    let suggested = current;
    if (over > 0) {
      suggested = current - over;
    } else {
      // Si no hay sobretrabajo, sugerimos reducir 0.5h como antes.
      suggested = current - 0.5;
    }

    // Redondeo a 0.1h y respetar límite inferior 0.5h
    suggested = Math.max(0.5, Math.round(suggested * 10) / 10);
    setReduceHours(String(suggested));
  }, [selectedConflict?.id]);

  const handleMoveConflictTask = () => {
    if (!selectedConflict) return;
    setIsConflictModalOpen(false);
    const targetDate = selectedConflict?.target_date;
    const estimatedHours = parseFloat(String(selectedConflict?.estimated_hours || 0)) || 0;

    // En este flujo, queremos que el calendario:
    // - abra la semana de la tarea en conflicto
    // - la deje seleccionada para reubicar inmediatamente
    // - pueda devolver un resultado para mostrar un modal de éxito / pendiente en Hoy
    navigate("/calendario", {
      state: {
        focusDate: targetDate,
        returnTo: "hoy",
        conflictDateKey: targetDate,
        reprogramSubtask: {
          id: selectedConflict.id,
          activityId: selectedConflict.activity?.id,
          title: selectedConflict.title,
          deadline: selectedConflict.activity?.deadline,
          dateKey: targetDate,
          durationNum: estimatedHours,
        },
      },
    });
  };

  const computeDayLoadForDateKey = (dateKey?: string | null) => {
    if (!dateKey) {
      return {
        dateKey: "",
        usedHours: 0,
        limitHours,
        availableHours: Math.max(0, limitHours),
        overworkHours: 0,
        resolved: true,
      };
    }
    const all = [...(vencidas || []), ...(para_hoy || []), ...(proximas || [])];
    const used = all
      .filter((t: any) => t?.status !== "DONE" && t?.target_date === dateKey)
      .reduce((acc: number, t: any) => acc + (parseFloat(String(t?.estimated_hours || 0)) || 0), 0);

    const available = Math.max(0, limitHours - used);
    const overwork = Math.max(0, used - limitHours);
    return {
      dateKey,
      usedHours: used,
      limitHours,
      availableHours: available,
      overworkHours: overwork,
      resolved: used <= limitHours,
    };
  };

  const handleReduceConflictHours = async () => {
    if (!selectedConflict) return;
    setReduceError(null);

    const current = parseFloat(String(selectedConflict.estimated_hours ?? 0));
    const next = parseFloat(String(reduceHours));

    if (!Number.isFinite(next)) {
      setReduceError("Ingresa un número válido.");
      return;
    }
    if (next <= 0) {
      setReduceError("Las horas deben ser mayores a 0.");
      return;
    }
    if (!Number.isFinite(current) || current <= 0) {
      setReduceError("No se pudo leer las horas actuales de la tarea.");
      return;
    }
    if (next >= current) {
      setReduceError(`Debe ser menor a ${current.toFixed(2)}h.`);
      return;
    }

    setIsReducing(true);
    try {
      // Usar endpoint tolerante a conflictos: siempre acepta la nueva estimación
      // aunque todavía haya sobrecarga en ese día. Solo enviamos `estimated_hours`
      // para evitar que se rechace por validaciones de fecha pasada.
      const updated = await putSubtaskWithConflictTolerance(selectedConflict.id, {
        estimated_hours: next,
      });

      // Optimistic update local UI: nuevas horas
      setData((prev: any) => {
        const updateList = (list: any[]) =>
          list.map((item) =>
            item.id === selectedConflict.id ? { ...item, estimated_hours: next } : item
          );
        return {
          ...prev,
          vencidas: updateList(prev.vencidas),
          para_hoy: updateList(prev.para_hoy),
          proximas: updateList(prev.proximas),
        };
      });
      setTiempoData((prev: any[]) =>
        prev.map((t: any) => (t.id === selectedConflict.id ? { ...t, estimated_hours: next } : t)) as any
      );

      // Re-fetch para recalcular conflictos desde backend
      refetch();
      refetchTiempo();

      // Determinar resultado (éxito vs pendiente) usando la metadata `daily_load`
      const daily = updated?.daily_load;
      if (daily && selectedConflict?.target_date) {
        const outcome = {
          dateKey: selectedConflict.target_date,
          usedHours: daily.current_hours,
          limitHours: daily.limit,
          availableHours: Math.max(0, daily.limit - daily.current_hours),
          overworkHours: daily.has_conflict ? daily.exceeded_by : 0,
          resolved: !daily.has_conflict,
        };
        setConflictOutcome(outcome);
        setConflictOutcomeSource("reduce");
        setShowConflictOutcomeModal(true);
        // Mientras mostramos el resultado, ocultamos el modal de edición de conflicto.
        setIsConflictModalOpen(false);
      }
    } catch (e: any) {
      // Error real al actualizar (red, servidor, etc.)
      setReduceError(
        "No se pudo guardar la nueva estimación por un problema de conexión o del servidor. Inténtalo de nuevo en unos minutos."
      );
    } finally {
      setIsReducing(false);
    }
  };

  // Si venimos de Calendario con un resultado de reubicación, mostrar modal con el mismo diseño.
  useEffect(() => {
    const incoming = (location.state as any)?.conflictOutcome;
    if (!incoming) return;

    setConflictOutcome(incoming);
    setShowConflictOutcomeModal(true);
    setConflictOutcomeSource("move");

    // Limpiar state para evitar que se re-muestre.
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Filter lists locally by search query
  const searchFilter = (item: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return item.title.toLowerCase().includes(s) || (item.activity?.course?.name || "").toLowerCase().includes(s);
  };

  // En "vencidas" solo mostramos tareas no completadas (pendientes, pospuestas, etc.)
  const vencidasPendientes = useMemo(
    () => vencidas.filter((item: any) => item.status !== "DONE"),
    [vencidas]
  );
  const filteredVencidas = vencidasPendientes.filter(searchFilter);
  const filteredParaHoy = para_hoy.filter(searchFilter);
  const filteredProximas = proximas.filter(searchFilter);

  const pendingTodayCount = filteredParaHoy.filter((t: any) => t.status !== "DONE").length;

  if (!loading && !hasActiveFilters && vencidas.length === 0 && para_hoy.length === 0 && proximas.length === 0 && !showWelcomeModal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] w-full px-4 text-center animate-in fade-in zoom-in-[0.98] duration-700">
        <div className="relative mb-14">
          <div className="absolute inset-0 bg-blue-500/20 blur-[70px] rounded-full transform scale-150"></div>

          <div className="relative w-48 h-48 bg-[#111827] border border-slate-800/80 rounded-[3rem] shadow-2xl shadow-black/40 flex items-center justify-center rotate-3 transform hover:rotate-6 transition-all duration-500 z-10">
            <CalendarDays className="w-24 h-24 text-blue-500 drop-shadow-2xl" strokeWidth={1.5} />

            <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-blue-600 rounded-[1.2rem] shadow-xl shadow-blue-600/30 flex items-center justify-center -rotate-12 transform hover:rotate-0 hover:scale-110 transition-all duration-300 border-[6px] border-[#0B1120]">
              <Check className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
          </div>
        </div>

        <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-slate-500 mb-6 tracking-tight drop-shadow-sm">
          Un lienzo en blanco
        </h2>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed font-medium px-4">
          Aún no tienes actividades registradas. Este es el momento perfecto para organizar tu día y darle forma a tus proyectos.
        </p>

        <button
          onClick={() => navigate('/crear')}
          className="group relative flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl px-10 py-5 text-lg transition-all hover:-translate-y-1 shadow-[0_0_40px_-10px_rgba(37,99,235,0.4)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.6)]"
        >
          <span className="text-2xl font-light leading-none mb-0.5">+</span>
          Crear mi primera actividad
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-[1580px] w-full mx-auto px-4 sm:px-6 lg:px-10 pb-10 mt-6 lg:mt-10">
      {/* LEFT SIDE: TASKS (Approx 60% of layout)*/}
      <div className="flex-1 lg:w-[65%] xl:w-[70%] flex flex-col gap-6 order-2 lg:order-1 min-w-0">
        {/* Task List Tabs */}
        <div className="flex items-center gap-3 border-b border-slate-800/60 pb-4">
          <button
            onClick={() => setActiveTab('vencidas')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 ${activeTab === 'vencidas'
              ? 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-red-500/10'
              : 'bg-slate-800/30 text-slate-400 hover:bg-slate-800/60 border border-transparent'
              }`}
          >
            <AlertCircle className="w-5 h-5" />
            Vencidas
            {filteredVencidas.length > 0 && (
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${activeTab === 'vencidas' ? 'bg-red-500/20' : 'bg-slate-700/50'}`}>
                {filteredVencidas.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('para_hoy')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 ${activeTab === 'para_hoy'
              ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 shadow-emerald-400/10'
              : 'bg-slate-800/30 text-slate-400 hover:bg-slate-800/60 border border-transparent'
              }`}
          >
            <CalendarDays className="w-5 h-5" />
            Para Hoy
            {filteredParaHoy.length > 0 && (
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${activeTab === 'para_hoy' ? 'bg-emerald-400/20' : 'bg-slate-700/50'}`}>
                {filteredParaHoy.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('proximas')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 ${activeTab === 'proximas'
              ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-blue-500/10'
              : 'bg-slate-800/30 text-slate-400 hover:bg-slate-800/60 border border-transparent'
              }`}
          >
            <CalendarClock className="w-5 h-5" />
            Próximas
            {filteredProximas.length > 0 && (
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${activeTab === 'proximas' ? 'bg-blue-500/20' : 'bg-slate-700/50'}`}>
                {filteredProximas.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-slate-400 font-medium tracking-wide">Cargando tus tareas de hoy...</p>
          </div>
        ) : (
          <div className="flex-1 min-h-[500px]">
            {activeTab === 'vencidas' && (
              <div className="h-full animate-in fade-in zoom-in-95 duration-200">
                {/* COLUMN 1: VENCIDAS */}
                <div className="bg-[#111827] border border-slate-800/60 rounded-3xl p-6 shadow-xl shadow-black/20 flex flex-col h-full min-w-105">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                    <h3 className="text-xl font-black tracking-widest text-[#94A3B8] uppercase">Vencidas</h3>
                  </div>
                  <ScrollableTaskSection>
                    {filteredVencidas.map((item: any, idx: number) => (
                      <TaskCard
                        key={item.id}
                        item={item}
                        badge={idx === 0 ? "MÁS ANTIGUA" : null}
                        theme="red"
                        onToggle={() => handleToggleSubtask(item.activity.id, item.id, item.status)}
                        onEdit={() => openEditModal(item)}
                        onPostpone={() => {
                          setPostponingTask(item);
                          setIsPostponeModalOpen(true);
                        }}
                        onViewConflict={item?.is_conflicted && item?.status !== "DONE" ? () => { setSelectedConflictId(item.id); setIsConflictModalOpen(true); } : undefined}
                        onTitleClick={() => setDetailTask(item)}
                      />
                    ))}
                    {filteredVencidas.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center mt-4">
                        <CheckCircle2 className="w-14 h-14 text-slate-600/50 mb-4" strokeWidth={1.5} />
                        <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[200px]">
                          {search || filters.course || (filters.status && filters.status !== 'PENDING')
                            ? "No hay tareas atrasadas que coincidan con los filtros aplicados."
                            : "No tienes tareas atrasadas. ¡Buen trabajo!"}
                        </p>
                      </div>
                    )}
                  </ScrollableTaskSection>
                </div>
              </div>
            )}
            {activeTab === 'para_hoy' && (
              <div className="h-full animate-in fade-in zoom-in-95 duration-200">
                {/* COLUMN 2: PARA HOY */}
                <div className="bg-[#111827] border border-slate-800/60 rounded-3xl p-6 shadow-xl shadow-black/20 flex flex-col h-full min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <CalendarDays className="w-6 h-6 text-emerald-400 shrink-0" />
                    <h3 className="text-xl font-black tracking-widest text-[#94A3B8] uppercase">Para Hoy</h3>
                  </div>
                  <ScrollableTaskSection>
                    {filteredParaHoy.map((item: any, idx: number) => (
                      <TaskCard
                        key={item.id}
                        item={item}
                        badge={idx === 0 ? "LA MÁS CORTA" : null}
                        theme="emerald"
                        onToggle={() => handleToggleSubtask(item.activity.id, item.id, item.status)}
                        onEdit={() => openEditModal(item)}
                        onPostpone={() => {
                          setPostponingTask(item);
                          setIsPostponeModalOpen(true);
                        }}
                        onViewConflict={item?.is_conflicted && item?.status !== "DONE" ? () => { setSelectedConflictId(item.id); setIsConflictModalOpen(true); } : undefined}
                        onTitleClick={() => setDetailTask(item)}
                      />
                    ))}
                    {filteredParaHoy.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center mt-4">
                        <CheckCircle2 className="w-16 h-16 text-slate-600/50 mb-4" strokeWidth={1.5} />
                        <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[260px] mb-6 shadow-sm">
                          {filters.status === 'DONE'
                            ? "No tienes tareas completadas para hoy. Revisa en Pendientes"
                            : search || filters.course || (filters.status && filters.status !== 'PENDING')
                              ? "No hay tareas para hoy que coincidan con los filtros aplicados."
                              : "No tienes tareas para hoy. Disfruta tu descanso o añade alguna tarea"}
                        </p>
                        {!(search || filters.course || (filters.status && filters.status !== 'PENDING')) && (
                          <Button
                            onClick={() => navigate('/crear')}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-5 py-2.5 transition-colors shadow-lg shadow-blue-600/20"
                          >
                            + Nueva actividad
                          </Button>
                        )}
                      </div>
                    )}
                  </ScrollableTaskSection>
                </div>
              </div>
            )}
            {activeTab === 'proximas' && (
              <div className="h-full animate-in fade-in zoom-in-95 duration-200">
                {/* COLUMN 3: PRÓXIMAS */}
                <div className="bg-[#111827] border border-slate-800/60 rounded-3xl p-6 shadow-xl shadow-black/20 flex flex-col h-full min-w-105">
                  <div className="flex items-center gap-3 mb-2">
                    <CalendarClock className="w-6 h-6 text-blue-500 shrink-0" />
                    <h3 className="text-xl font-black tracking-widest text-[#94A3B8] uppercase">Próximas</h3>
                  </div>
                  <ScrollableTaskSection>
                    {filteredProximas.map((item: any, idx: number) => (
                      <TaskCard
                        key={item.id}
                        item={item}
                        badge={idx === 0 ? "MÁS CERCANA" : null}
                        theme="blue"
                        onToggle={() => handleToggleSubtask(item.activity.id, item.id, item.status)}
                        onEdit={() => openEditModal(item)}
                        onPostpone={() => {
                          setPostponingTask(item);
                          setIsPostponeModalOpen(true);
                        }}
                        onViewConflict={item?.is_conflicted && item?.status !== "DONE" ? () => { setSelectedConflictId(item.id); setIsConflictModalOpen(true); } : undefined}
                        onTitleClick={() => setDetailTask(item)}
                      />
                    ))}
                    {filteredProximas.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center mt-4">
                        <Calendar className="w-14 h-14 text-slate-600/50 mb-4" strokeWidth={1.5} />
                        <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[200px]">
                          {search || filters.course || (filters.status && filters.status !== 'PENDING')
                            ? "No hay tareas próximas que coincidan con los filtros aplicados."
                            : "No hay tareas próximas. Todo está al día."}
                        </p>
                      </div>
                    )}
                  </ScrollableTaskSection>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT SIDE: INFO & FILTERS (Approx 40% of layout) */}
      <div className="lg:w-[35%] xl:w-[30%] flex flex-col gap-6 order-1 lg:order-2">
        <div className="flex flex-col gap-8 w-full">
          {/* Welcome Card */}
          <div className="bg-[#111827] border border-slate-800/60 rounded-3xl p-6 lg:p-8 flex items-center justify-between shadow-xl shadow-black/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="space-y-2 relative z-10">
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white">
                <span className="text-blue-500">{getGreeting(user?.name || "Estudiante")}</span>
              </h1>
              <p className="text-slate-400 font-medium">
                Tienes {pendingTodayCount === 1 ? '1 tarea pendiente' : `${pendingTodayCount} tareas pendientes`} hoy
              </p>
            </div>
            <div className="bg-blue-600/10 p-4 rounded-2xl hidden sm:flex border border-blue-500/20 relative z-10">
              <CalendarDays className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          {/* Capacity Card */}
          <div className="bg-[#111827] border border-slate-800/60 rounded-3xl p-6 lg:p-7 flex flex-col justify-center shadow-xl shadow-black/20 space-y-4">
            <div className="flex items-start justify-between w-full">
              <div className="space-y-1 w-full">
                <div className="flex items-center gap-2">
                  {isOverloaded ? (
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                  ) : (
                    <CalendarClock className="w-5 h-5 text-slate-400 hidden" />
                  )}
                  <h2 className="text-slate-300 font-bold text-lg">Tiempo de estudio / día</h2>
                </div>

                <div className="flex items-center justify-between w-full mt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white">{totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}h</span>
                    <span className="text-slate-400 font-bold text-lg">/ {limitHours}h</span>
                  </div>

                  {!isEditingLimit ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingLimit(true)}
                      className="h-9 px-4 rounded-xl bg-slate-800/50 hover:bg-blue-500/20 text-slate-300 hover:text-blue-400 transition-all border border-slate-700/50"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 bg-slate-900 border border-blue-500/30 rounded-xl p-1.5 animate-in zoom-in-95 duration-200">
                      <Input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="24"
                        value={tempLimit}
                        onChange={(e) => setTempLimit(e.target.value)}
                        className="w-20 h-9 text-center bg-[#111827] border-slate-700 focus-visible:ring-1 focus-visible:ring-blue-500 text-white font-bold text-base rounded-lg"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveLimit}
                        className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md font-medium"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Guardar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div
                className={`flex flex-col transition-all duration-300 ${isOverloaded ? "items-stretch gap-5" : "items-stretch gap-6"}`}
              >
                <div className="space-y-4">
                  <div className="h-4 bg-slate-800 rounded-full w-full overflow-hidden flex">
                    {isOverloaded ? (
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-red-500 transition-all duration-500"
                        style={{ width: '100%' }}
                      />
                    ) : (
                      <>
                        <div
                          className="h-full bg-emerald-400 transition-all duration-500"
                          style={{ width: `${Math.min((doneHours / limitHours) * 100, 100)}%` }}
                        />
                        <div
                          className="h-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${Math.min((pendingHours / limitHours) * 100, 100 - (doneHours / limitHours) * 100)}%` }}
                        />
                      </>
                    )}
                  </div>
                  {!isOverloaded && (
                    <div className="mt-3 space-y-2">
                      <p className="flex items-center text-[13px] sm:text-sm text-slate-200 leading-snug">
                        <span className="inline-block w-3.5 h-3.5 rounded-full bg-emerald-400 mr-2" />
                        <span className="font-semibold mr-1">Verde</span>
                        <span className="text-slate-400">= horas completadas</span>
                      </p>
                      <p className="flex items-center text-[13px] sm:text-sm text-slate-200 leading-snug">
                        <span className="inline-block w-3.5 h-3.5 rounded-full bg-blue-500 mr-2" />
                        <span className="font-semibold mr-1">Azul</span>
                        <span className="text-slate-400">= horas pendientes hoy</span>
                      </p>
                    </div>
                  )}
                </div>

                {isOverloaded && (
                  <div className="mt-1">
                    <OverloadAlert totalHours={totalHours} dailyLimit={limitHours} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* FILTER BAR SECTION */}
        <div className="bg-[#111827] border border-slate-800/60 rounded-2xl p-4 shadow-lg shadow-black/10 flex flex-col gap-4 w-full">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" />
            <h2 className="text-white font-bold text-lg">Filtros</h2>
            {hasActiveFilters && (
              <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg font-semibold">
                Filtrado por: {[
                  filters.course && "Curso",
                  filters.status && "Estado",
                  search && "Nombre"
                ].filter(Boolean).join(", ")}
              </span>
            )
            }
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex-1 w-full flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Buscar por nombre</label>
              <div className="relative">
                <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${search ? "text-blue-600" : "text-slate-500"
                  }`} />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar tarea..."
                  style={search ? {
                    backgroundColor: 'white',
                    fontFamily: '"Lexend", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                  } : undefined}
                  className={`w-full pl-12 h-12 rounded-xl focus-visible:ring-blue-500 block ${search
                    ? "border-blue-500 text-blue-600 placeholder:text-blue-400/60"
                    : "bg-[#1F2937]/50 border-slate-700/50 text-slate-200 placeholder:text-slate-500"
                    }`}
                />
              </div>
            </div>

            <div className="w-full flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Curso</label>
              <Select
                value={filters.course || "all"}
                onValueChange={(v) => setFilters(prev => ({ ...prev, course: v === "all" ? "" : v }))}
                disabled={loading}
              >
                <SelectTrigger
                  style={filters.course ? {
                    backgroundColor: 'white',
                    fontFamily: '"Lexend", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                  } : undefined}
                  className={`w-full md:w-[200px] h-12 rounded-xl focus:ring-blue-500 shadow-inner border cursor-pointer ${filters.course
                    ? "border-blue-500 text-blue-600 [&_svg]:text-blue-600"
                    : "bg-[#1F2937]/50 border-slate-700/50 text-slate-200"
                    }`}
                >
                  <SelectValue placeholder="Todos los cursos" />
                </SelectTrigger>
                <SelectContent className="bg-[#1F2937] border-slate-700 text-slate-200 rounded-xl shadow-xl">
                  <SelectItem value="all" className="focus:bg-blue-600 focus:text-white rounded-lg cursor-pointer">Todos los cursos</SelectItem>
                  {courses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()} className="focus:bg-blue-600 focus:text-white rounded-lg cursor-pointer">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</label>
              <Select
                value={filters.status || "all"}
                onValueChange={(v) => setFilters(prev => ({ ...prev, status: v === "all" ? "" : v }))}
                disabled={loading}
              >
                <SelectTrigger
                  style={filters.status ? {
                    backgroundColor: 'white',
                    fontFamily: '"Lexend", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                  } : undefined}
                  className={`w-full md:w-[170px] h-12 rounded-xl focus:ring-blue-500 shadow-inner border cursor-pointer ${filters.status
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
                  <SelectItem value="POSTPONED" className="focus:bg-blue-600 focus:text-white rounded-lg cursor-pointer">Pospuesta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className={`h-12 rounded-xl mb-[1px] transition-all ${hasActiveFilters
                ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
                : "border-slate-700/50 bg-[#1F2937]/50 text-slate-400 cursor-not-allowed opacity-50"
                }`}
            >
              <X className="w-4 h-4 mr-2" /> Limpiar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-800 rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl max-w-[520px] w-full mx-4 relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>

            {welcomeStep === 1 ? (
              <>
                <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-blue-500/10">
                  <Info className="w-6 h-6 text-blue-400" />
                </div>

                <h3 className="text-2xl font-extrabold text-white mb-4 tracking-tight">
                  Vista <span className="text-blue-400">Hoy</span>: orden de prioridad
                </h3>
                <p className="text-slate-400 text-sm mb-6 px-2">
                  Esta pantalla sigue una regla clara para que sepas qué atender primero:
                </p>

                <div className="flex flex-col gap-5 text-left w-full mb-8 pl-8 pr-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-emerald-400/10 p-2.5 rounded-xl border border-emerald-400/20 mt-0.5">
                      <CalendarDays className="w-5 h-5 text-emerald-400 shrink-0" />
                    </div>
                    <div>
                      <p className="text-emerald-400 text-[15px] font-bold leading-snug mb-1">
                        1. Tareas de hoy (prioridad)
                      </p>
                      <p className="text-slate-400 text-[13px] leading-relaxed">
                        Lo primero que verás son las tareas del día. Son tu prioridad: complétalas primero. Se muestran ordenadas de menor a mayor tiempo estimado.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-orange-500/10 p-2.5 rounded-xl border border-orange-500/20 mt-0.5">
                      <Clock className="w-5 h-5 text-orange-500 shrink-0" />
                    </div>
                    <div>
                      <p className="text-orange-500 text-[15px] font-bold leading-snug mb-1">
                        2. Límite de horas
                      </p>
                      <p className="text-slate-400 text-[13px] leading-relaxed">
                        En segundo lugar, revisa tu tiempo de estudio diario. No te pases del límite que definiste; si te pasas, la barra te avisará.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20 mt-0.5">
                      <CalendarClock className="w-5 h-5 text-blue-400 shrink-0" />
                    </div>
                    <div>
                      <p className="text-blue-400 text-[15px] font-bold leading-snug mb-1">
                        3. Vencidas y próximas
                      </p>
                      <p className="text-slate-400 text-[13px] leading-relaxed">
                        Por último, usa las pestañas para ver lo atrasado (vencidas) y lo que viene (próximas), y así tener el panorama completo.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-slate-400 text-[13px] font-medium mt-2 mb-8 px-4">
                  Puedes filtrar por nombre, curso y estado cuando lo necesites.
                </p>

                <Button
                  onClick={() => setWelcomeStep(2)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-10 h-11 rounded-xl font-bold shadow-lg shadow-blue-600/20 text-sm transition-all w-full sm:w-auto"
                >
                  Continuar
                </Button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-blue-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/10">
                  <Clock className="w-7 h-7 text-blue-400" />
                </div>

                <h3 className="text-2xl font-extrabold text-white mb-4 tracking-tight">
                  Límite de <span className="text-blue-400">estudio</span>
                </h3>
                <p className="text-slate-400 text-[15px] mb-8 px-4 leading-relaxed">
                  ¿Cuántas horas quieres dedicar al estudio cada día? Te avisaremos si tus tareas superan este límite.
                </p>

                <div className="mb-10 w-full px-6">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">
                    Horas diarias sugeridas
                  </label>
                  <div className="relative group">
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="24"
                      value={welcomeLimit}
                      onChange={(e) => setWelcomeLimit(e.target.value)}
                      className="w-full h-16 text-center bg-slate-900/50 border-slate-700/50 focus-visible:ring-blue-500 text-white font-black text-3xl rounded-2xl transition-all group-hover:bg-slate-900"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-lg pointer-events-none">
                      Horas
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setWelcomeStep(1)}
                    className="h-11 px-8 rounded-xl border-slate-700 text-slate-400 hover:bg-slate-800"
                  >
                    Atrás
                  </Button>
                  <Button
                    onClick={async () => {
                      let val = parseFloat(welcomeLimit);
                      if (isNaN(val)) val = 6;
                      if (val < 0.5) val = 0.5;
                      if (val > 24) val = 24;

                      setLimitHours(val);
                      const normalized = val.toString();
                      setTempLimit(normalized);
                      window.localStorage.setItem("studyLimitHours", normalized);

                      // Persistir también en el backend como configuración del usuario
                      try {
                        await updateConfig(val);
                      } catch (error) {
                        console.error("Error updating user config from welcome modal:", error);
                      }

                      window.localStorage.removeItem("welcomeInProgress");
                      setShowWelcomeModal(false);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-10 h-11 rounded-xl font-bold shadow-lg shadow-blue-600/20 text-sm transition-all"
                  >
                    Comenzar ahora
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Ayuda */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-800 rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl max-w-[520px] w-full mx-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>

            <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-blue-500/10">
              <Info className="w-6 h-6 text-blue-400" />
            </div>

            <h3 className="text-2xl font-extrabold text-white mb-4 tracking-tight">
              Vista <span className="text-blue-400">Hoy</span>: orden de prioridad
            </h3>
            <p className="text-slate-400 text-sm mb-6 px-2">
              Esta pantalla sigue una regla clara para que sepas qué atender primero:
            </p>

            <div className="flex flex-col gap-5 text-left w-full mb-8 pl-8 pr-4">
              <div className="flex items-start gap-4">
                <CalendarDays className="w-5 h-5 text-emerald-400 mt-1 shrink-0" />
                <div>
                  <p className="text-emerald-400 text-[15px] font-semibold leading-snug">
                    1. Tareas de hoy (prioridad) — lo primero que ves; complétalas primero.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Clock className="w-5 h-5 text-orange-500 mt-1 shrink-0" />
                <div>
                  <p className="text-orange-500 text-[15px] font-semibold leading-snug">
                    2. Límite de horas — revisa que no te pases del tiempo de estudio diario.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CalendarClock className="w-5 h-5 text-blue-400 mt-1 shrink-0" />
                <div>
                  <p className="text-blue-400 text-[15px] font-semibold leading-snug">
                    3. Vencidas y próximas — pestañas para lo atrasado y lo que viene.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-slate-400 text-[13px] font-medium mt-2 mb-8 px-4">
              Puedes filtrar por nombre, curso y estado cuando lo necesites.
            </p>

            <Button
              onClick={() => setShowHelpModal(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-11 rounded-xl font-bold shadow-lg shadow-blue-600/20 text-sm transition-all w-full sm:w-auto"
            >
              Entendido
            </Button>
          </div>
        </div>
      )}

      {/* Botón flotante de ayuda */}
      <button
        onClick={() => setShowHelpModal(true)}
        className="fixed bottom-6 left-6 z-40 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center"
        aria-label="Mostrar ayuda"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      <ResolveConflictModal
        isOpen={isConflictModalOpen && conflictedCount > 0 && !!selectedConflict}
        onClose={() => setIsConflictModalOpen(false)}
        conflictedCount={conflictedCount}
        conflictedTasks={conflictedTasks}
        selectedConflict={selectedConflict}
        selectedConflictId={selectedConflictId ? String(selectedConflictId) : undefined}
        onSelectConflictId={(id) => setSelectedConflictId(id)}
        dateFormatted={selectedConflict?.target_date ? getFormattedDate(selectedConflict.target_date) : undefined}
        dayLabel={selectedConflict?.target_date ? getRelativeDateLabel(selectedConflict.target_date) : undefined}
        usedHours={selectedConflict?.target_date ? computeDayLoadForDateKey(selectedConflict.target_date).usedHours : undefined}
        limitHours={selectedConflict?.target_date ? computeDayLoadForDateKey(selectedConflict.target_date).limitHours : undefined}
        overworkHours={selectedConflict?.target_date ? computeDayLoadForDateKey(selectedConflict.target_date).overworkHours : undefined}
        reduceHours={reduceHours}
        setReduceHours={setReduceHours}
        isReducing={isReducing}
        reduceError={reduceError || ""}
        onReduceConfirm={handleReduceConflictHours}
        onMoveTask={handleMoveConflictTask}
      />

      <MessageModal
        open={postponeSuccessOpen}
        onOpenChange={setPostponeSuccessOpen}
        type="success"
        title="Pospuesta guardada"
        message={postponeSuccessMessage}
      />

      {/* Modal resultado (solucionado vs pendiente) */}
      <ConflictOutcomeModal
        isOpen={showConflictOutcomeModal && !!conflictOutcome}
        onClose={() => {
          setShowConflictOutcomeModal(false);
          setConflictOutcome(null);
          setConflictOutcomeSource(null);
        }}
        outcome={conflictOutcome}
        source={conflictOutcomeSource}
        getRelativeDateLabel={getRelativeDateLabel}
        getFormattedDate={getFormattedDate}
        onContinueResolving={() => {
          setShowConflictOutcomeModal(false);
          setConflictOutcomeSource(null);
          setIsConflictModalOpen(true);
        }}
      />

      {/* Edit Subtask Modal */}
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
          openDeleteModal(editingTask);
        }}
        onSave={async ({ title, estimatedHours }) => {
          if (!editingTask) return { ok: false, error: "No hay subtarea seleccionada." };

          const activityId = editingTask.activity?.id;
          const subtaskId = editingTask.id;

          try {
            await patchSubtask(activityId, subtaskId, {
              title,
              estimated_hours: estimatedHours,
            });

            setData((prev: any) => {
              const updateList = (list: any[]) =>
                list.map((item) =>
                  item.id === subtaskId
                    ? { ...item, title, estimated_hours: estimatedHours }
                    : item
                );
              return {
                ...prev,
                vencidas: updateList(prev.vencidas),
                para_hoy: updateList(prev.para_hoy),
                proximas: updateList(prev.proximas),
              };
            });
            setTiempoData((prev: any[]) =>
              prev.map((t: any) => (t.id === subtaskId ? { ...t, estimated_hours: estimatedHours } : t)) as any
            );

            refetch();
            refetchTiempo();

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

      {/* Delete Confirmation Modal */}
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

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div className="pr-8">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    Eliminar subtarea
                  </h3>
                  <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                    ¿Estás seguro que quieres eliminar la subtarea{" "}
                    <span className="text-red-300 font-semibold">"{deletingTask.title}"</span>?
                    Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingTask(null);
                  }}
                  disabled={isDeleting}
                  className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700"
                >
                  Cancelar
                </Button>
                <Button
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isPostponeModalOpen && postponingTask && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-[#0B1220] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-xl font-semibold text-white tracking-tight">
                Posponer subtarea
              </h2>
            </div>

            {/* Body */}
            <div className="px-6 py-2">
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Esta acción actualizará el estado de la tarea a{" "}
                <span className="text-white font-medium">"Pospuesta"</span>.
                La fecha de entrega no se verá afectada.
              </p>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Nota opcional
                </label>
                <textarea
                  value={postponeNote}
                  onChange={(e) => setPostponeNote(e.target.value)}
                  placeholder="Añade una nota sobre por qué pospones esta subtarea..."
                  rows={4}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl text-white text-sm p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none placeholder:text-slate-600"
                />
                <div className="flex items-start gap-2 pt-1">
                  <Info className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-400">
                    La nota es visible cuando revises la subtarea.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-6 mt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsPostponeModalOpen(false);
                  setPostponingTask(null);
                  setPostponeNote("");
                }}
                className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handlePostpone}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer"
              >
                Posponer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Task Modal */}
      <SubtaskDetailModal
        open={!!detailTask}
        onOpenChange={(open: boolean) => { if (!open) setDetailTask(null); }}
        subtask={detailTask}
        getFormattedDate={getFormattedDate}
      />
    </div>
  );
}

// Component for scrollable task sections
function ScrollableTaskSection({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showScrollUp, setShowScrollUp] = useState(false);
  const childrenArray = React.Children.toArray(children);
  const hasChildren = childrenArray.length > 0;

  useEffect(() => {
    const checkScroll = () => {
      if (containerRef.current && contentRef.current) {
        const container = containerRef.current;
        const containerHeight = container.clientHeight;
        const contentHeight = contentRef.current.scrollHeight;
        const scrollTop = container.scrollTop;
        const scrollBottom = scrollTop + containerHeight;

        // Verificar si hay más contenido que el visible (más de 3 tareas)
        const isScrollable = contentHeight > containerHeight;

        // Mostrar flecha hacia abajo si hay más contenido y no estás al final
        const isAtBottom = contentHeight - scrollBottom <= 10;
        setShowScrollDown(isScrollable && !isAtBottom);

        // Mostrar flecha hacia arriba si hay más contenido y no estás al inicio
        const isAtTop = scrollTop <= 10;
        setShowScrollUp(isScrollable && !isAtTop);
      }
    };

    // Delay para asegurar que el DOM esté renderizado
    const timeoutId = setTimeout(checkScroll, 100);

    // Revisar cuando cambie el tamaño de la ventana o el contenido
    window.addEventListener('resize', checkScroll);
    const resizeObserver = new ResizeObserver(checkScroll);

    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
      containerRef.current.addEventListener('scroll', checkScroll);
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkScroll);
      if (containerRef.current) {
        containerRef.current.removeEventListener('scroll', checkScroll);
      }
      resizeObserver.disconnect();
    };
  }, [children]);

  const handleScrollDown = () => {
    if (containerRef.current) {
      const scrollAmount = containerRef.current.clientHeight * 0.8; // Scroll 80% de la altura visible
      containerRef.current.scrollBy({
        top: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleScrollUp = () => {
    if (containerRef.current) {
      const scrollAmount = containerRef.current.clientHeight * 0.8; // Scroll 80% de la altura visible
      containerRef.current.scrollBy({
        top: -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <>
      <style>{`
        .task-scroll-container::-webkit-scrollbar {
          display: none;
        }
        .task-scroll-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="relative flex flex-col flex-1 min-h-0 w-full">
        {showScrollUp && (
          <div className="absolute top-0 left-0 right-0 flex justify-center pt-2 pointer-events-none z-10">
            <button
              onClick={handleScrollUp}
              className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-all hover:scale-110 flex items-center justify-center"
              aria-label="Desplazar hacia arriba"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
        )}
        <div
          ref={containerRef}
          className="task-scroll-container flex-1 overflow-y-auto overflow-x-hidden w-full"
          style={{
            // Altura fija para mostrar 3 tareas completas y algo de la 4ª antes de scrollear
            // 3 * 185px (card aprox) + 2 * 16px (gap) + ~40px margen ≈ 630px
            minHeight: '640px',
            maxHeight: '740px',
          }}
        >
          <div ref={contentRef} className="flex flex-col gap-4 pt-4 min-h-full">
            {hasChildren ? children : null}
          </div>
        </div>
        {showScrollDown && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-2 pointer-events-none z-10">
            <button
              onClick={handleScrollDown}
              className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition-all hover:scale-110 flex items-center justify-center"
              aria-label="Desplazar hacia abajo"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// Sub-component for individual tasks matching the requested UI
function TaskCard({ item, badge, theme, onToggle, onEdit, onViewConflict, onPostpone, onTitleClick }: { item: any, badge: string | null, theme: "red" | "emerald" | "blue", onToggle: () => void, onEdit: () => void, onViewConflict?: () => void, onPostpone?: () => void, onTitleClick?: () => void }) {
  const navigate = useNavigate();
  const isDone = item.status === "DONE";
  const isPostponed = item.status === "POSTPONED";
  const isConflicted = !isDone && !!item?.is_conflicted;
  const courseName = item.activity?.course?.name || "Actividad";
  const title = item.title;

  const handleReprogram = () => {
    const targetDate = item?.target_date;
    const estimatedHours = parseFloat(String(item?.estimated_hours || 0)) || 0;
    navigate("/calendario", {
      state: {
        focusDate: targetDate,
        reprogramSubtask: {
          id: item?.id,
          activityId: item?.activity?.id,
          title: item?.title,
          deadline: item?.activity?.deadline,
          dateKey: targetDate,
          durationNum: estimatedHours,
        },
      },
    });
  };

  const themeColors = {
    red: {
      border: "border-red-500/30",
      bg: "bg-red-950/20",
      badge: "bg-red-500 text-white",
      text: "text-red-400",
      icon: "text-red-500/70",
      hover: "hover:border-red-500/50",
      checkbox: "border-red-500 checked:bg-red-500",
    },
    emerald: {
      border: "border-emerald-500/30",
      bg: "bg-[#091E1A]", // Dark emerald bg
      badge: "bg-emerald-400 text-emerald-950",
      text: "text-emerald-400",
      icon: "text-emerald-500/70",
      hover: "hover:border-emerald-500/50",
      checkbox: "border-emerald-500 checked:bg-emerald-500",
    },
    blue: {
      border: "border-blue-500/30",
      bg: "bg-blue-950/20",
      badge: "bg-blue-500 text-white",
      text: "text-blue-400",
      icon: "text-blue-500/70",
      hover: "hover:border-blue-500/50",
      checkbox: "border-blue-500 checked:bg-blue-500",
    },
    purple: {
      border: "border-[#8B5CF6]/30",
      bg: "bg-[#8B5CF6]/[0.15]",
      badge: "bg-[#8B5CF6] text-white",
      text: "text-[#8B5CF6]",
      icon: "text-[#8B5CF6]/70",
      hover: "hover:border-[#7C3AED]/50",
      checkbox: "border-[#8B5CF6] checked:bg-[#8B5CF6]",
    }
  };

  const colors = isPostponed ? themeColors.purple : themeColors[theme];

  return (
    <div
      className={`relative flex flex-col gap-4 border ${isConflicted ? 'border-[#F59E0B] animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.5)]' : colors.border
        } ${colors.bg} rounded-3xl p-4 w-full transition-all duration-300 ${colors.hover} shadow-lg ${isDone ? 'opacity-50 grayscale' : ''
        }`}
    >
      {badge && (
        <div className={`absolute -top-3 left-6 px-3 py-1 font-black text-[10px] tracking-widest uppercase rounded-full ${colors.badge} shadow-lg`}>
          {badge}
        </div>
      )}
      {isConflicted && (
        <div className="absolute -top-3 right-6 px-3 py-1 font-bold text-[10px] tracking-widest uppercase rounded-full bg-[#F59E0B]/90 text-amber-950 shadow-lg">
          En conflicto
        </div>
      )}

      <div className="flex items-start gap-8">
        <button
          onClick={onToggle}
          className={`flex-shrink-0 mt-1 w-7 h-7 border-2 rounded-lg cursor-pointer ${colors.checkbox} flex items-center justify-center transition-colors shadow-inner`}
          aria-label={isDone ? "Marcar como pendiente" : "Marcar como completada"}
        >
          {isDone && (
            <svg
              className="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`font-black text-[10px] tracking-[0.15em] uppercase truncate ${colors.text} flex items-center gap-2`}>
            <span className="opacity-60">{courseName}</span>
            <span className="opacity-30">•</span>
            <Link to={`/actividad/${item.activity.id}`} className="hover:underline transition-all hover:opacity-100">
              {item.activity?.title || "Actividad"}
            </Link>
          </p>
          <h4
            onClick={onTitleClick}
            className={`mt-1 text-lg font-bold ${isDone ? 'text-slate-400 line-through' : 'text-slate-100'} leading-tight tracking-tight pr-2 ${onTitleClick ? 'cursor-pointer hover:text-blue-400 transition-colors' : ''}`}
          >
            {title}
          </h4>

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className={`text-[11px] font-black tracking-widest uppercase ${colors.text}`}>
              {getRelativeDateLabel(item.target_date)}
            </span>
            <div className={`flex items-center gap-1.5 text-[11px] font-black tracking-widest uppercase ${colors.text}`}>
              <Clock className={`w-3.5 h-3.5 ${colors.icon}`} />
              {formatHours(item.estimated_hours)}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-700/20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {isConflicted && onViewConflict && (
            <button
              type="button"
              onClick={onViewConflict}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#F59E0B]/90 hover:text-[#F59E0B] bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 px-3 py-2 rounded-lg border border-[#F59E0B]/40 transition-colors cursor-pointer"
            >
              <AlertCircle className="w-4 h-4" />
              Ver conflicto
            </button>
          )}

          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/35 hover:bg-slate-700/60 px-3 py-2 rounded-lg border border-slate-700/50 transition-colors cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
            Editar
          </button>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {isPostponed ? (
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-purple-200 bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 px-3 py-2 rounded-lg select-none">
              <Clock className="w-4 h-4 text-[#A78BFA]" />
              Pospuesta
            </span>
          ) : (
            onPostpone && (
              <button
                type="button"
                onClick={onPostpone}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/35 hover:bg-slate-700/60 px-3 py-2 rounded-lg border border-slate-700/50 transition-colors cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                Posponer
              </button>
            )
          )}

          <button
            type="button"
            onClick={handleReprogram}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200 hover:text-white bg-blue-600/15 hover:bg-blue-600/25 px-3 py-2 rounded-lg border border-blue-500/30 transition-colors cursor-pointer"
          >
            <CalendarRange className="w-4 h-4" />
            Reprogramar
          </button>
        </div>
      </div>
    </div>
  );
}

