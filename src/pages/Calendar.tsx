import React, { useState, useMemo, useEffect, useRef } from "react";
import {
    format,
    startOfWeek,
    addDays,
    subWeeks,
    addWeeks,
    isSameDay,
    parseISO,
    startOfDay,
    startOfMonth,
    endOfMonth,
    addMonths,
    subMonths,
    isBefore,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, MoreVertical, Loader2, CalendarRange, CalendarCheck, Move, CirclePlus, X, Eye, Pencil, Trash2, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { Button } from "@/shared/components/button";
import { useHoy } from "@/features/today/hooks/useHoy";
import { patchSubtask, deleteSubtask, putSubtaskWithConflictTolerance } from "@/api/services/subtask";
import { patchActivity } from "@/api/services/activity";
import { queryCache } from "@/lib/queryCache";
import { Link, useLocation, useNavigate } from "react-router-dom";
import EditSubtaskModal from "@/shared/components/EditSubtaskModal";

export default function Calendar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
    const [selectedSubtask, setSelectedSubtask] = useState<any | null>(null);
    const [isMoving, setIsMoving] = useState(false);
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [overriddenDates, setOverriddenDates] = useState<Record<string, string>>({});
    // Estado local para actualizaciones optimistas del conflicto
    const [conflictOverrides, setConflictOverrides] = useState<Record<string, boolean>>({});
    // Picker de semanas tipo "Mes" (mini calendario)
    const [showWeekPicker, setShowWeekPicker] = useState(false);
    const [weekPickerDate, setWeekPickerDate] = useState<Date>(new Date());
    const [showReprogramActivityModal, setShowReprogramActivityModal] = useState(false);
    const [newDeadlineForActivity, setNewDeadlineForActivity] = useState("");
    const [savingDeadline, setSavingDeadline] = useState(false);
    const [reprogramSuccessMessage, setReprogramSuccessMessage] = useState<string | null>(null);
    const [showMoveSuccessModal, setShowMoveSuccessModal] = useState(false);
    const [moveSuccessData, setMoveSuccessData] = useState<{ taskTitle: string; dateLabel: string } | null>(null);
    const [showConflictResolvedModal, setShowConflictResolvedModal] = useState(false);
    const [conflictResolvedData, setConflictResolvedData] = useState<{ taskTitle: string; dateLabel: string } | null>(null);
    const [showConflictProcessingModal, setShowConflictProcessingModal] = useState(false);
    const [conflictProcessingMessage, setConflictProcessingMessage] = useState("Estamos revisando tu planificación...");
    const [showReduceConflictOutcomeModal, setShowReduceConflictOutcomeModal] = useState(false);
    const [reduceConflictOutcome, setReduceConflictOutcome] = useState<null | {
        dateKey: string;
        usedHours: number;
        limitHours: number;
        availableHours: number;
        overworkHours: number;
        resolved: boolean;
    }>(null);
    // Modal cuando no se puede cambiar (generaría conflicto): no se guarda, solo se informa y recomienda
    const [showReduceBlockedModal, setShowReduceBlockedModal] = useState(false);
    const [reduceBlockedData, setReduceBlockedData] = useState<{
        dateLabel: string;
        recommendedHours: number | null;
        /** true cuando ni con 0.5h se soluciona el conflicto */
        cannotReduceEvenMin?: boolean;
    } | null>(null);
    const [showOverloadModal, setShowOverloadModal] = useState(false);
    const [pendingConflictDay, setPendingConflictDay] = useState<Date | null>(null);
    const [reduceHoursForConflict, setReduceHoursForConflict] = useState("");
    const [reduceConflictError, setReduceConflictError] = useState<string | null>(null);
    const [isResolvingConflict, setIsResolvingConflict] = useState(false);
    const [overloadModalStep, setOverloadModalStep] = useState<"menu" | "reduce">("menu");
    const [showMoveOtherTasksModal, setShowMoveOtherTasksModal] = useState(false);
    const [strictMoveMode, setStrictMoveMode] = useState(false);
    const [conflictResolutionContext, setConflictResolutionContext] = useState<{
        originalSubtask: any;
        targetDateKey: string;
    } | null>(null);
    const pendingNavigateAfterModalRef = useRef<{ to: string; state?: object } | null>(null);
    const [editingSubtask, setEditingSubtask] = useState<any | null>(null);

    const { vencidas, para_hoy, proximas, loading, refetch } = useHoy({ days_ahead: 30 });

    const returnTo = useMemo(() => {
        const state = location.state as any;
        return state?.returnTo as string | undefined;
    }, [location.state]);

    const conflictDateKeyFromState = useMemo(() => {
        const state = location.state as any;
        return state?.conflictDateKey as string | undefined;
    }, [location.state]);

    // Si venimos desde algún flujo externo (Hoy / Detalle) con tarea a reprogramar,
    // enfocamos la semana de la tarea y activamos directamente el modo reubicación.
    useEffect(() => {
        const state = location.state as any;
        const focusDate = state?.focusDate as string | undefined;
        const incomingSubtask = state?.reprogramSubtask as
            | {
                id: string;
                activityId: string;
                title: string;
                deadline?: string;
                dateKey?: string;
                durationNum?: number;
            }
            | undefined;

        if (focusDate) {
            try {
                setCurrentDate(startOfDay(parseISO(focusDate)));
            } catch {
                // Ignorar si llega un valor inválido
            }
        }

        if (incomingSubtask) {
            const dateKey = incomingSubtask.dateKey;
            const date = dateKey ? startOfDay(parseISO(dateKey)) : null;
            setSelectedSubtask({
                ...incomingSubtask,
                date,
            });
            setIsMoving(true);
        }

        // Limpiamos el state para que no re-aplique en futuros re-renders o navegaciones internas.
        navigate(location.pathname, { replace: true, state: {} });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (showMoveSuccessModal || showConflictResolvedModal) {
            refetch();
        }
    }, [showMoveSuccessModal, showConflictResolvedModal, refetch]);

    const studyLimitHours = useMemo(() => {
        const saved = window.localStorage.getItem("studyLimitHours");
        return saved ? parseFloat(saved) : 6;
    }, []);

    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

    const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

    const handleOpenWeekPicker = () => {
        setWeekPickerDate(currentDate);
        setShowWeekPicker(true);
    };

    const handleCloseWeekPicker = () => {
        setShowWeekPicker(false);
    };

    const handleGoToToday = () => {
        const today = startOfDay(new Date());
        setCurrentDate(today);
        setWeekPickerDate(today);
        setShowWeekPicker(false);
    };

    const toggleDayExpansion = (dayKey: string) => {
        setExpandedDays(prev => ({
            ...prev,
            [dayKey]: !prev[dayKey]
        }));
    };

    // Combine all tasks from useHoy and normalize them
    const allActivities = useMemo(() => {
        const combined: any[] = [...(vencidas || []), ...(para_hoy || []), ...(proximas || [])];
        return combined.map(item => {
            const overridenDate = overriddenDates[item.id];
            const dateStr = overridenDate || item.target_date;

            // Usar el override de conflicto si existe, sino el valor del backend
            const hasConflictOverride = item.id in conflictOverrides;
            const isConflicted = hasConflictOverride ? conflictOverrides[item.id] : item.is_conflicted;

            return {
                id: item.id,
                date: dateStr ? startOfDay(parseISO(dateStr)) : null,
                dateKey: dateStr,
                course: item.activity?.course?.name || "Actividad",
                title: item.title,
                duration: item.estimated_hours ? `${item.estimated_hours} h` : "0 h",
                durationNum: parseFloat(item.estimated_hours || 0),
                status: item.status,
                courseId: item.activity?.course?.id,
                activityId: item.activity?.id,
                deadline: item.activity?.deadline,
                isConflicted: isConflicted
            };
        });
    }, [vencidas, para_hoy, proximas, overriddenDates, conflictOverrides]);

    // Calculate hours used per day
    const dayStats = useMemo(() => {
        const stats: Record<string, number> = {};
        allActivities.forEach(act => {
            if (act.dateKey) {
                const key = act.dateKey;
                stats[key] = (stats[key] || 0) + act.durationNum;
            }
        });
        return stats;
    }, [allActivities]);

    const getActivitiesForDay = (day: Date) => {
        return allActivities.filter(a => a.date && isSameDay(a.date, day));
    };

    // Semanas que se muestran dentro del mini picker (por mes), igual que en el botón "Mes" de subtareas
    const weekPickerWeeks = useMemo(() => {
        const monthStart = startOfMonth(weekPickerDate);
        const monthEnd = endOfMonth(weekPickerDate);
        const startW = startOfWeek(monthStart, { weekStartsOn: 1 });
        const weeks: Date[][] = [];
        let day = startW;
        while (day <= monthEnd || weeks.length < 6) {
            const week: Date[] = [];
            for (let i = 0; i < 7; i++) {
                week.push(day);
                day = addDays(day, 1);
            }
            weeks.push(week);
            if (day > monthEnd && weeks.length >= 4) break;
        }
        return weeks;
    }, [weekPickerDate]);

    const handleSelectWeekFromPicker = (weekStart: Date) => {
        // Sincronizar semana mostrada en /calendario con la semana elegida en el mini calendario
        setCurrentDate(weekStart);
        setWeekPickerDate(weekStart);
        setShowWeekPicker(false);
    };

    const handleSelectForMove = (activity: any) => {
        setSelectedSubtask(activity);
        setIsMoving(true);
        setStrictMoveMode(false);
    };

    const handleCancelMove = (keepProcessingModal = false) => {
        setSelectedSubtask(null);
        setIsMoving(false);
        setShowOverloadModal(false);
        setPendingConflictDay(null);
        setReduceHoursForConflict("");
        setReduceConflictError(null);
        setOverloadModalStep("menu");
        setShowMoveOtherTasksModal(false);
        setShowReduceBlockedModal(false);
        setReduceBlockedData(null);
        setStrictMoveMode(false);
        setConflictResolutionContext(null);
        if (!keepProcessingModal) {
            setShowConflictProcessingModal(false);
            setConflictProcessingMessage("Estamos revisando tu planificación...");
        }
        setReprogramSuccessMessage(null);
    };

    const formatHours = (hours: number) => (hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`);

    const computeProjectedHours = (day: Date, hoursForSelected: number, taskOverride?: any) => {
        const task = taskOverride ?? selectedSubtask;
        if (!task) return 0;
        const newDateKey = format(day, "yyyy-MM-dd");
        const oldDateKey = task.dateKey;
        const currentHoursInTarget = dayStats[newDateKey] || 0;

        if (oldDateKey === newDateKey) {
            const oldHours = task.durationNum || 0;
            return Math.max(0, currentHoursInTarget - oldHours + hoursForSelected);
        }
        return currentHoursInTarget + hoursForSelected;
    };

    const executeMove = async (
        day: Date,
        hoursForSelected: number,
        options?: {
            resetUI?: boolean;
            showSuccessModal?: boolean;
            taskOverride?: any;
            awaitRefetch?: boolean;
            preserveProcessingModal?: boolean;
            deferSync?: boolean;
        }
    ): Promise<boolean> => {
        const task = options?.taskOverride ?? selectedSubtask;
        if (!task) return false;

        const newDateKey = format(day, "yyyy-MM-dd");
        const subtaskId = task.id;
        const activityId = task.activityId;
        const oldDateKey = task.dateKey;
        const oldSubtaskHours = task.durationNum;
        const projectedHoursNewDay = computeProjectedHours(day, hoursForSelected, task);
        const willHaveConflict = projectedHoursNewDay > studyLimitHours;

        // Calcular el estado del día origen para retroalimentar a "Hoy".
        const conflictDateKey = conflictDateKeyFromState || oldDateKey;
        const oldDayHoursBefore = conflictDateKey ? (dayStats[conflictDateKey] || 0) : 0;
        const oldDayHoursAfter =
            conflictDateKey && oldDateKey === conflictDateKey && oldDateKey !== newDateKey
                ? Math.max(0, oldDayHoursBefore - oldSubtaskHours)
                : oldDayHoursBefore;

        const availableOldDay = Math.max(0, studyLimitHours - oldDayHoursAfter);
        const overworkOldDay = Math.max(0, oldDayHoursAfter - studyLimitHours);
        const resolvedOldDay = oldDayHoursAfter <= studyLimitHours;

        const taskTitle = task.title;
        const dateLabel = format(day, "d 'de' MMMM 'de' yyyy", { locale: es });
        const shouldPatchEstimatedHours =
            Number.isFinite(hoursForSelected) &&
            Math.abs(hoursForSelected - oldSubtaskHours) > 0.0001;

        // Actualización optimista: fecha y conflicto.
        setOverriddenDates(prev => ({
            ...prev,
            [subtaskId]: newDateKey
        }));
        setConflictOverrides(prev => ({
            ...prev,
            [subtaskId]: willHaveConflict
        }));

        const shouldResetUI = options?.resetUI !== false;
        const shouldShowSuccessModal = options?.showSuccessModal !== false;

        if (shouldResetUI) {
            handleCancelMove(options?.preserveProcessingModal === true);
        }

        try {
            await patchSubtask(activityId, subtaskId, {
                target_date: newDateKey,
                ...(shouldPatchEstimatedHours ? { estimated_hours: hoursForSelected } : {}),
            });

            if (options?.awaitRefetch) {
                await refetch();
            }

            if (options?.deferSync) {
                // Mantenemos la UI optimista; sincronizamos luego del flujo completo.
                setConflictOverrides(prev => {
                    const next = { ...prev };
                    delete next[subtaskId];
                    return next;
                });
            } else {
                // Refrescar datos en segundo plano sin bloquear la UI.
                queryCache.invalidate("activities");
                Promise.resolve()
                    .then(() => {
                        setConflictOverrides(prev => {
                            const next = { ...prev };
                            delete next[subtaskId];
                            return next;
                        });
                    })
                    .catch(() => {
                        // Si falla, mantenemos el override optimista.
                    });
            }

            if (shouldShowSuccessModal) {
                setMoveSuccessData({ taskTitle, dateLabel });
                setShowMoveSuccessModal(true);
                setConflictResolutionContext(null);
            }

            if (returnTo === "hoy" && conflictDateKey) {
                pendingNavigateAfterModalRef.current = {
                    to: "/hoy",
                    state: {
                        conflictOutcome: {
                            dateKey: conflictDateKey,
                            usedHours: oldDayHoursAfter,
                            limitHours: studyLimitHours,
                            availableHours: availableOldDay,
                            overworkHours: overworkOldDay,
                            resolved: resolvedOldDay,
                        },
                    },
                };
            }
            return true;
        } catch (error) {
            console.error("Error al reprogramar:", error);
            // Revertir cambios optimistas en caso de error.
            setOverriddenDates(prev => {
                const next = { ...prev };
                delete next[subtaskId];
                return next;
            });
            setConflictOverrides(prev => {
                const next = { ...prev };
                delete next[subtaskId];
                return next;
            });
            refetch();
            return false;
        }
    };

    const handleResolveByReducingHours = async () => {
        if (!selectedSubtask || !pendingConflictDay) return;
        setReduceConflictError(null);

        const current = parseFloat(String(selectedSubtask.durationNum ?? 0));
        const next = parseFloat(String(reduceHoursForConflict));

        if (!Number.isFinite(next)) {
            setReduceConflictError("Ingresa un número válido.");
            return;
        }
        if (next < 0.5) {
            setReduceConflictError("La estimación mínima es 0.5h.");
            return;
        }
        if (!Number.isFinite(current) || current <= 0) {
            setReduceConflictError("No se pudo leer las horas actuales de la subtarea.");
            return;
        }
        if (next >= current) {
            setReduceConflictError(`Debe ser menor a ${formatHours(current)}.`);
            return;
        }

        const dateKey = format(pendingConflictDay, "yyyy-MM-dd");
        const projectedAfter = computeProjectedHours(pendingConflictDay, next);
        const resolved = projectedAfter <= studyLimitHours;

        // Si reducir a estas horas no soluciona el conflicto: no guardar, solo mostrar modal
        if (!resolved) {
            // Horas ya programadas en el día destino (sin contar la tarea que se va a mover)
            const totalOnDay = dayStats[dateKey] || 0;
            const availableForDay = studyLimitHours - totalOnDay; // tiempo sobrante ese día
            // ¿Se puede resolver reduciendo? Solo si el tiempo sobrante >= 0.5h (mínimo de estimación)
            const canReduceToFit = availableForDay >= 0.5;
            const recommendedHours =
                canReduceToFit
                    ? Math.min(current, Math.max(0.5, Math.round(availableForDay * 2) / 2))
                    : null;

            setReduceBlockedData({
                dateLabel: format(pendingConflictDay, "EEEE d 'de' MMMM", { locale: es }),
                recommendedHours: recommendedHours !== null && recommendedHours < current ? recommendedHours : null,
                cannotReduceEvenMin: !canReduceToFit, // ni con 0.5h cabe
            });
            setShowOverloadModal(false);
            setOverloadModalStep("menu");
            setShowReduceBlockedModal(true);
            return;
        }

        // Sí resuelve: guardar en backend y mostrar éxito
        setIsResolvingConflict(true);
        try {
            const updated = await putSubtaskWithConflictTolerance(selectedSubtask.id, {
                target_date: dateKey,
                estimated_hours: next,
            });

            // Recalcular conflicto desde la respuesta del backend
            const daily = (updated as any)?.daily_load;
            const usedAfter = daily ? daily.current_hours : projectedAfter;
            const limitFromBackend = daily ? daily.limit : studyLimitHours;
            const overworkAfter = daily ? (daily.exceeded_by ?? 0) : 0;
            const availableAfter = Math.max(0, limitFromBackend - usedAfter);

            // Actualizar lista desde backend (refetch en segundo plano)
            queryCache.invalidateByPrefix("hoy:");
            refetch();

            // Mantener UI de “mover” para poder seguir configurando horas si no se resolvió
            setConflictOverrides((prev) => {
                const nextState = { ...prev };
                delete nextState[selectedSubtask.id];
                return nextState;
            });

            setShowOverloadModal(false);
            setOverloadModalStep("menu");
            setReduceConflictOutcome({
                dateKey,
                usedHours: usedAfter,
                limitHours: limitFromBackend,
                availableHours: availableAfter,
                overworkHours: overworkAfter,
                resolved: true,
            });
            setShowReduceConflictOutcomeModal(true);
        } catch (err) {
            console.error("Error al guardar y reprogramar:", err);
            setReduceConflictError("No se pudo guardar. Revisa la conexión e inténtalo de nuevo.");
        } finally {
            setIsResolvingConflict(false);
        }
    };

    const handleMoveOtherTaskFromConflictDay = (task: any) => {
        setSelectedSubtask(task);
        setIsMoving(true);
        setStrictMoveMode(true);
        setShowMoveOtherTasksModal(false);
        setShowOverloadModal(false);
        setReduceConflictError(null);
        setOverloadModalStep("menu");
    };

    const handleConfirmMove = async (day: Date) => {
        if (!selectedSubtask) return;

        // Verify deadline
        if (selectedSubtask.deadline) {
            const deadlineDate = startOfDay(parseISO(selectedSubtask.deadline));
            if (day > deadlineDate) {
                alert(`No puedes mover esta tarea después de su fecha límite (${format(deadlineDate, "d 'de' MMMM", { locale: es })}).`);
                return;
            }
        }

        const projectedHours = computeProjectedHours(day, selectedSubtask.durationNum);
        const hasConflict = projectedHours > studyLimitHours;

        if (strictMoveMode && hasConflict) {
            return;
        }

        if (strictMoveMode && !hasConflict && conflictResolutionContext) {
            const movedTask = selectedSubtask;
            const originalSubtask = conflictResolutionContext.originalSubtask;
            const targetDateKey = conflictResolutionContext.targetDateKey;
            const targetDayForOriginal = startOfDay(parseISO(targetDateKey));
            setShowConflictProcessingModal(true);
            setConflictProcessingMessage("Estamos revisando el conflicto de nuevo...");

            // 1) Mover la otra tarea seleccionada (sin modal de éxito intermedio).
            const movedOtherOk = await executeMove(day, movedTask.durationNum, {
                resetUI: false,
                showSuccessModal: false,
                taskOverride: movedTask,
                deferSync: true,
            });
            if (!movedOtherOk) {
                setShowConflictProcessingModal(false);
                return;
            }

            // 2) Recalcular si el conflicto original persiste al intentar mover la tarea original.
            const currentHoursTarget = dayStats[targetDateKey] || 0;
            const movedOutHours = movedTask.dateKey === targetDateKey ? movedTask.durationNum : 0;
            const hoursAfterMovingOther = Math.max(0, currentHoursTarget - movedOutHours);
            const projectedWithOriginal = hoursAfterMovingOther + (originalSubtask.durationNum || 0);
            const stillConflicted = projectedWithOriginal > studyLimitHours;

            if (stillConflicted) {
                const overload = projectedWithOriginal - studyLimitHours;
                const suggestedHours = Math.max(
                    0.5,
                    Math.round(((originalSubtask.durationNum || 0) - overload) * 10) / 10
                );

                // Volver al menú de resolución para la tarea original.
                setSelectedSubtask(originalSubtask);
                setIsMoving(true);
                setStrictMoveMode(false);
                setPendingConflictDay(targetDayForOriginal);
                setReduceHoursForConflict(String(suggestedHours));
                setReduceConflictError(null);
                setOverloadModalStep("menu");
                setShowOverloadModal(true);
                setShowMoveOtherTasksModal(false);
                setShowConflictProcessingModal(false);
                setConflictProcessingMessage("Estamos revisando tu planificación...");
                return;
            }

            // 3) Si ya no hay conflicto, mover automáticamente la tarea original al día objetivo.
            setConflictProcessingMessage("Estamos guardando tus cambios...");
            setSelectedSubtask(originalSubtask);
            setIsMoving(true);
            setStrictMoveMode(false);
            const originalMovedOk = await executeMove(targetDayForOriginal, originalSubtask.durationNum, {
                resetUI: true,
                showSuccessModal: false,
                taskOverride: originalSubtask,
                preserveProcessingModal: true,
                deferSync: true,
            });
            if (originalMovedOk) {
                setConflictResolvedData({
                    taskTitle: originalSubtask.title,
                    dateLabel: format(targetDayForOriginal, "d 'de' MMMM 'de' yyyy", { locale: es }),
                });
                setShowConflictResolvedModal(true);
                setConflictResolutionContext(null);
                queryCache.invalidate("activities");
            }
            setShowConflictProcessingModal(false);
            setConflictProcessingMessage("Estamos revisando tu planificación...");
            return;
        }

        if (hasConflict) {
            const overload = projectedHours - studyLimitHours;
            const suggestedHours = Math.max(0.5, Math.round((selectedSubtask.durationNum - overload) * 10) / 10);
            setConflictResolutionContext({
                originalSubtask: selectedSubtask,
                targetDateKey: format(day, "yyyy-MM-dd"),
            });
            setPendingConflictDay(day);
            setReduceHoursForConflict(String(suggestedHours));
            setReduceConflictError(null);
            setOverloadModalStep("menu");
            setShowOverloadModal(true);
            return;
        }

        setConflictResolutionContext(null);
        setShowConflictProcessingModal(true);
        setConflictProcessingMessage("Estamos guardando tus cambios...");
        const moveOk = await executeMove(day, selectedSubtask.durationNum, {
            preserveProcessingModal: true,
            deferSync: true,
        });
        setShowConflictProcessingModal(false);
        setConflictProcessingMessage("Estamos revisando tu planificación...");
        if (!moveOk) return;
    };

    const handleDelete = async (activityId: any, subtaskId: any) => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar esta tarea?")) return;
        try {
            await deleteSubtask(activityId, subtaskId);
            refetch();
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };

    const todayForDeadline = useMemo(() => startOfDay(new Date()), []);
    const handleOpenReprogramActivityModal = () => {
        setNewDeadlineForActivity(format(todayForDeadline, "yyyy-MM-dd"));
        setShowReprogramActivityModal(true);
    };

    const handleSaveNewDeadline = async () => {
        if (!selectedSubtask?.activityId || !newDeadlineForActivity) return;
        setSavingDeadline(true);
        try {
            await patchActivity(selectedSubtask.activityId, { deadline: newDeadlineForActivity });
            queryCache.invalidate("activities");
            queryCache.invalidateByPrefix("hoy:");
            await refetch();
            setSelectedSubtask((prev: typeof selectedSubtask) =>
                prev ? { ...prev, deadline: newDeadlineForActivity } : null
            );
            setShowReprogramActivityModal(false);
            setReprogramSuccessMessage("Actividad reprogramada. Ahora ya puedes mover tu tarea.");
        } catch (error) {
            console.error("Error al reprogramar actividad:", error);
        } finally {
            setSavingDeadline(false);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClick = () => setMenuOpenId(null);
        window.addEventListener("click", handleClick);
        return () => window.removeEventListener("click", handleClick);
    }, []);

    // Helper to get consistent colors based on courseId or Name
    const getCourseTheme = (courseId: any) => {
        const themes = [
            { border: "border-blue-500", text: "text-blue-400", bg: "hover:bg-blue-500/5", ring: "ring-blue-500/60 shadow-blue-500/40", glow: "" },
            { border: "border-emerald-500", text: "text-emerald-400", bg: "hover:bg-emerald-500/5", ring: "ring-emerald-500/60 shadow-emerald-500/40", glow: "" },
            { border: "border-amber-500", text: "text-amber-400", bg: "hover:bg-amber-500/5", ring: "ring-amber-500/60 shadow-amber-500/40", glow: "" },
            { border: "border-rose-500", text: "text-rose-400", bg: "hover:bg-rose-500/5", ring: "ring-rose-500/60 shadow-rose-500/40", glow: "" },
            { border: "border-violet-500", text: "text-violet-400", bg: "hover:bg-violet-500/5", ring: "ring-violet-500/60 shadow-violet-500/40", glow: "" },
            { border: "border-cyan-500", text: "text-cyan-400", bg: "hover:bg-cyan-500/5", ring: "ring-cyan-500/60 shadow-cyan-500/40", glow: "" },
        ];
        const index = typeof courseId === 'number' ? courseId % themes.length : (courseId ? courseId.length % themes.length : 0);
        return themes[index];
    };

    const weekRangeLabel = (() => {
        const endDate = addDays(startDate, 6);
        const startMonth = format(startDate, "MMMM", { locale: es });
        const endMonth = format(endDate, "MMMM", { locale: es });
        const year = format(startDate, "yyyy", { locale: es });

        if (startMonth === endMonth) {
            // Mismo mes: Semana del 10 al 16 de marzo, 2026
            return `Semana del ${format(startDate, "d")} al ${format(
                endDate,
                "d 'de' MMMM, yyyy",
                { locale: es }
            )}`;
        }

        // Mes distinto: Semana del 28 de febrero al 3 de marzo, 2026
        return `Semana del ${format(startDate, "d 'de' MMMM", {
            locale: es,
        })} al ${format(endDate, "d 'de' MMMM", {
            locale: es,
        })}, ${year}`;
    })();
    const today = useMemo(() => startOfDay(new Date()), []);

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Cargando calendario...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 w-full max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-10 py-8 animate-in fade-in duration-500 overflow-hidden">
            <div className="mb-4 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="bg-blue-600/10 p-3 rounded-2xl border border-blue-500/20 text-blue-500 shrink-0">
                            <CalendarRange className="w-8 h-8" />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight truncate">
                            {weekRangeLabel}
                        </h2>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center md:shrink-0 md:justify-end">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handlePrevWeek}
                            className="rounded-xl bg-slate-800/50 border-slate-700 hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/50 transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleNextWeek}
                            className="rounded-xl bg-slate-800/50 border-slate-700 hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/50 transition-all"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleOpenWeekPicker}
                            className="rounded-xl bg-slate-800/60 border-slate-700/80 text-slate-200 text-xs font-bold uppercase tracking-widest hover:bg-blue-600/20 hover:text-blue-300 hover:border-blue-500/60 transition-all px-4 py-2 flex items-center gap-2"
                        >
                            <CalendarRange className="w-4 h-4" />
                            Seleccionar semana
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleGoToToday}
                            className="rounded-xl bg-slate-800/60 border-slate-700/80 text-slate-200 text-xs font-bold uppercase tracking-widest hover:bg-blue-600/20 hover:text-blue-300 hover:border-blue-500/60 transition-all px-4 py-2"
                        >
                            Hoy
                        </Button>
                    </div>
                </div>
                <p className="text-xs text-slate-400 font-medium max-w-2xl">
                    En tu calendario puedes rerogramar tus tareas clickeando sobre ellas y luego clickeando sobre "mover aquí" en algún día antes de la fecha límite de la actividad y después de "hoy". Si un día queda sobrecargado, verás una guía para resolverlo moviendo tareas o reduciendo horas. Puedes moverte entre semanas con las flechas o el botón «Seleccionar semana»
                </p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-2 scrollbar-gray">
                <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-5 items-start pt-4 ${isMoving && selectedSubtask ? "pb-36" : "pb-2"}`}>
                    {weekDays.map((day, index) => {
                        const dayKey = format(day, "yyyy-MM-dd");
                        const dayActivities = getActivitiesForDay(day);
                        const isToday = isSameDay(day, new Date());
                        const isPastDay = day < today;
                        const isWeekend = index >= 5;
                        const isExpanded = expandedDays[dayKey];

                        const visibleActivities = isExpanded ? dayActivities : dayActivities.slice(0, 2);
                        const hasMore = dayActivities.length > 2;

                        // Calculate availability
                        const currentHours = dayStats[dayKey] || 0;
                        const availableHours = Math.max(0, studyLimitHours - currentHours);

                        const isAfterDeadline = selectedSubtask?.deadline && day > startOfDay(parseISO(selectedSubtask.deadline));
                        const isDeadlineDay = selectedSubtask?.deadline && isSameDay(day, parseISO(selectedSubtask.deadline));
                        const isSameDayAsSelected = !!selectedSubtask && !!selectedSubtask.date && isSameDay(day, selectedSubtask.date);
                        const projectedHoursForMove =
                            !!selectedSubtask ? computeProjectedHours(day, selectedSubtask.durationNum) : 0;
                        const willConflictForMove =
                            !!selectedSubtask &&
                            !isSameDayAsSelected &&
                            !isAfterDeadline &&
                            projectedHoursForMove > studyLimitHours;
                        const blockedByStrictConflict = !!selectedSubtask && strictMoveMode && willConflictForMove;
                        const canMoveSelected =
                            !!selectedSubtask &&
                            !isSameDayAsSelected &&
                            !isAfterDeadline &&
                            !blockedByStrictConflict;
                        const isBlockedInMoveMode = isMoving && (isPastDay || !!isAfterDeadline);
                        const hasAvailability = availableHours > 0;
                        const availabilityColor = hasAvailability ? "text-emerald-400" : "text-amber-400";

                        return (
                            <div key={day.toString()} className="flex flex-col gap-5 min-h-[450px]">
                                <div
                                    onDragOver={(e) => {
                                        if (!isMoving || isBlockedInMoveMode || isSameDayAsSelected || blockedByStrictConflict) return;
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = "move";
                                    }}
                                    onDrop={(e) => {
                                        if (!isMoving || isBlockedInMoveMode || isSameDayAsSelected || blockedByStrictConflict) return;
                                        e.preventDefault();
                                        handleConfirmMove(day);
                                    }}
                                    className={`sticky top-0 z-10 flex flex-col items-center p-4 rounded-2xl border-t-4 transition-all shadow-[0_4px_12px_0_rgba(0,0,0,0.25)]
                                    ${isBlockedInMoveMode ? "opacity-35 pointer-events-none grayscale-[0.2]" : ""}
                                    ${!isMoving && isPastDay ? "opacity-40 pointer-events-none" : ""}
                                    ${isToday
                                            ? "bg-slate-900 border-blue-500 shadow-lg shadow-blue-500/5"
                                            : "bg-slate-900 border-slate-800"
                                        } 
                                 ${isWeekend && !isBlockedInMoveMode ? "opacity-90" : ""} 
                                 ${isMoving && !isBlockedInMoveMode && canMoveSelected && !willConflictForMove ? 'ring-2 ring-emerald-500/50 bg-emerald-500/10' : ''}
                                 ${isMoving && !isBlockedInMoveMode && canMoveSelected && willConflictForMove ? 'ring-2 ring-amber-500/35 bg-amber-500/10' : ''}
                                 ${isMoving && !isBlockedInMoveMode && blockedByStrictConflict ? 'ring-2 ring-amber-500/35 bg-amber-500/10' : ''}
                                 ${isMoving && isDeadlineDay ? 'ring-2 ring-amber-500 bg-amber-500/10 animate-pulse transition-all scale-[1.02]' : ''}`}
                                >
                                    {isMoving && isDeadlineDay && (
                                        <div className="absolute -top-3 px-3 py-1 bg-amber-500 text-white text-[9px] font-black rounded-full shadow-lg z-20">
                                            FECHA LÍMITE
                                        </div>
                                    )}
                                    <span className={`text-xs font-black uppercase tracking-wider ${isToday ? "text-blue-500" : isMoving && isDeadlineDay ? "text-amber-500" : "text-slate-400"
                                        }`}>
                                        {format(day, "EEEE", { locale: es })}
                                    </span>
                                    <span className={`text-2xl font-black mt-1 leading-none ${isToday ? "text-blue-300" : isMoving && isDeadlineDay ? "text-amber-300" : "text-slate-200"}`}>
                                        {format(day, "d")}
                                    </span>
                                    <span className={`text-[10px] mt-2 font-black uppercase tracking-widest ${isBlockedInMoveMode ? "text-slate-500" : willConflictForMove ? "text-amber-400" : availabilityColor
                                        }`}>
                                        {isMoving && (isAfterDeadline || isPastDay)
                                            ? 'BLOQUEADO'
                                            : blockedByStrictConflict
                                                ? 'EXCEDE EL LÍMITE'
                                                : willConflictForMove
                                                    ? `QUEDARÍA EN ${formatHours(projectedHoursForMove)}`
                                                    : `Disponibilidad: ${availableHours % 1 === 0 ? availableHours : availableHours.toFixed(1)}h`}
                                    </span>
                                </div>

                                <div className="flex-1 space-y-4">
                                    {isMoving && canMoveSelected && !isPastDay && (
                                        <button
                                            onClick={() => handleConfirmMove(day)}
                                            className={`w-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl group cursor-pointer transition-all ${willConflictForMove
                                                ? "border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/15"
                                                : "border-blue-500/50 bg-blue-500/5 hover:bg-blue-500/10 animate-pulse"
                                                }`}
                                        >
                                            <CirclePlus className={`w-8 h-8 mb-2 group-hover:scale-110 transition-transform ${willConflictForMove ? "text-amber-400" : "text-blue-500"
                                                }`} />
                                            <span className={`text-xs font-black uppercase tracking-widest ${willConflictForMove ? "text-amber-300" : "text-blue-500"
                                                }`}>
                                                {willConflictForMove ? "Mover aquí (con conflicto)" : "Mover aquí"}
                                            </span>

                                        </button>
                                    )}
                                    {dayActivities.length > 0 ? (
                                        <>
                                            <div className="space-y-4">
                                                {visibleActivities.map((activity) => {
                                                    const theme = getCourseTheme(activity.courseId || activity.course);
                                                    const isDone = activity.status === "DONE";
                                                    const isSelected = selectedSubtask && selectedSubtask.id === activity.id;
                                                    const shouldDim = isMoving && !isSelected;
                                                    const isMenuOpen = menuOpenId === activity.id;
                                                    const isConflicted = activity.isConflicted;

                                                    const conflictTheme = {
                                                        border: "border-[#F59E0B]",
                                                        text: "text-[#F59E0B]",
                                                        bg: "hover:bg-[#F59E0B]/5",
                                                        ring: "ring-[#F59E0B]/60 shadow-[#F59E0B]/40",
                                                        glow: "shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                                                    };

                                                    const isPostponed = activity.status === "POSTPONED";
                                                    const postponedTheme = {
                                                        border: "border-purple-500",
                                                        text: "text-purple-400",
                                                        bg: "hover:bg-purple-500/5",
                                                        ring: "ring-purple-500/60 shadow-purple-500/40",
                                                        glow: "shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                                                    };

                                                    // Prioridad: Selección > Conflicto > Pospuesta > Tema por curso
                                                    const activeTheme = isSelected ? theme : (isConflicted ? conflictTheme : (isPostponed ? postponedTheme : theme));

                                                    return (
                                                        <div
                                                            key={activity.id}
                                                            draggable={!isMoving}
                                                            onDragStart={(e) => {
                                                                if (isMoving) return;
                                                                e.dataTransfer.setData("activityId", activity.id);
                                                                handleSelectForMove(activity);
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isMoving) {
                                                                    if (isSelected) handleCancelMove();
                                                                    return;
                                                                }
                                                                setSelectedSubtask(activity);
                                                                setIsMoving(true);
                                                            }}
                                                            className={`relative p-5 rounded-2xl bg-[#111827] border border-slate-800/80 shadow-xl shadow-black/20 group border-l-4 ${activeTheme.border} transition-all duration-300 cursor-grab active:cursor-grabbing
                                                            ${isConflicted ? activeTheme.glow : ''}
                                                            ${isSelected ? `ring-4 ${activeTheme.ring} translate-y-[-4px] scale-[1.02] z-20` : 'hover:translate-y-[-2px]'} 
                                                            ${shouldDim ? 'opacity-40 grayscale-[0.5]' : ''}
                                                            ${isDone && !isSelected ? 'opacity-30 grayscale pointer-events-none' : ''}`}
                                                        >
                                                            {isConflicted && !isSelected && (
                                                                <div className="absolute top-2 left-2 flex items-center gap-1">
                                                                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                                                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Conflicto</span>
                                                                </div>
                                                            )}
                                                            {isPostponed && !isSelected && !isConflicted && (
                                                                <div className="absolute top-2 left-2 flex items-center gap-1">
                                                                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                                                                    <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">Pospuesta</span>
                                                                </div>
                                                            )}
                                                            {isSelected && (
                                                                <div className={`absolute -top-3 -right-2 px-3 py-1 font-black text-[10px] tracking-widest uppercase rounded-full bg-blue-500 text-white shadow-lg z-30 animate-bounce`}>
                                                                    SELECCIONADO
                                                                </div>
                                                            )}

                                                            <div className="absolute top-4 right-3 z-30">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setMenuOpenId(isMenuOpen ? null : activity.id);
                                                                    }}
                                                                    className="text-slate-500 hover:text-blue-400 transition-colors p-1 rounded-lg hover:bg-slate-800"
                                                                >
                                                                    <MoreVertical className="w-5 h-5" />
                                                                </button>

                                                                {isMenuOpen && (
                                                                    <div
                                                                        className="absolute right-0 mt-2 w-48 bg-[#1f2937] border border-slate-700/50 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <Link to={`/actividad/${activity.activityId}`} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border-b border-slate-700/30">
                                                                            <Eye className="w-4 h-4 text-blue-400" />
                                                                            Ver detalle
                                                                        </Link>
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingSubtask(activity);
                                                                                setMenuOpenId(null);
                                                                            }}
                                                                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border-b border-slate-700/30"
                                                                        >
                                                                            <Pencil className="w-4 h-4 text-emerald-400" />
                                                                            Editar
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDelete(activity.activityId, activity.id)}
                                                                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                                        >
                                                                            <Trash2 className="w-4 h-4 text-rose-500" />
                                                                            Eliminar
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${activeTheme.text}`}>
                                                                {activity.course}
                                                            </span>
                                                            <h3 className={`text-white font-bold text-sm mt-1.5 leading-tight ${isDone ? 'line-through opacity-50' : ''}`}>
                                                                {activity.title}
                                                            </h3>
                                                            <div className="text-slate-400 text-xs mt-4 flex items-center justify-between font-medium">
                                                                <div className="flex items-center gap-1.5 uppercase tracking-widest text-[10px]">
                                                                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                                                                    <span className={isSelected ? 'bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-black' : ''}>
                                                                        {activity.duration}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {hasMore && !isMoving && (
                                                <button
                                                    onClick={() => toggleDayExpansion(dayKey)}
                                                    className="w-full py-2.5 px-4 rounded-xl border border-slate-800 bg-slate-800/30 text-slate-400 text-[11px] font-black uppercase tracking-widest hover:bg-slate-800/60 hover:text-white transition-all flex items-center justify-center gap-2 group/btn"
                                                >
                                                    {isExpanded ? (
                                                        <>
                                                            Ver menos
                                                            <ChevronLeft className="w-3.5 h-3.5 rotate-90" />
                                                        </>
                                                    ) : (
                                                        <>
                                                            Mostrar todo ({dayActivities.length - 2} más)
                                                            <ChevronLeft className="w-3.5 h-3.5 -rotate-90 group-hover/btn:translate-y-0.5 transition-transform" />
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        !isMoving && (
                                            <div className="h-full min-h-[150px] flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700/50 rounded-2xl bg-slate-800/10 transition-all hover:bg-blue-500/5 hover:border-blue-500/30 group/empty">
                                                <div className="w-12 h-12 rounded-full bg-slate-800/40 flex items-center justify-center mb-4 group-hover/empty:scale-110 transition-transform border border-slate-700/30 group-hover/empty:border-blue-500/30">
                                                    <CalendarCheck className="w-24 h-24 text-blue-500 drop-shadow-2xl" strokeWidth={1.5} />
                                                </div>
                                                <span className="text-slate-200 text-xs italic text-center font-bold tracking-widest uppercase group-hover/empty:text-blue-200 transition-colors">
                                                    Sin actividades
                                                </span>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modo reprogramación activo: fijo abajo para no bajar con muchas tareas */}
            {isMoving && selectedSubtask && (() => {
                const deadlineInPast = selectedSubtask.deadline && isBefore(startOfDay(parseISO(selectedSubtask.deadline)), todayForDeadline);
                const taskDateInPast = selectedSubtask.date && isBefore(selectedSubtask.date, todayForDeadline);
                const showReprogramPrompt = deadlineInPast && taskDateInPast;
                return (
                    <div className="fixed bottom-0 left-0 right-0 z-30 px-4 sm:px-6 lg:px-10 py-4 bg-[#0f172a]/95 backdrop-blur-sm border-t border-slate-800/80 animate-in slide-in-from-bottom duration-300">
                        <div className="max-w-[1550px] mx-auto flex flex-col md:flex-row items-center justify-between p-4 md:p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 gap-4 md:gap-5">
                            <div className="flex items-center gap-5 text-blue-500">
                                <div className="bg-blue-500 text-white p-3 rounded-xl shrink-0">
                                    <CalendarRange className="w-6 h-6" />
                                </div>
                                <div>
                                    <span className="font-black text-sm uppercase tracking-[0.2em]">Modo reprogramación activo</span>
                                    {reprogramSuccessMessage ? (
                                        <p className="text-emerald-400 text-base mt-1 font-medium">
                                            {reprogramSuccessMessage}
                                        </p>
                                    ) : showReprogramPrompt ? (
                                        <>
                                            <p className="text-slate-300 text-base mt-1">
                                                No puedes reprogramar tu tarea porque la fecha límite de la actividad está antes del día de hoy.
                                            </p>
                                            <p className="text-slate-400 text-sm mt-2">
                                                ¿Deseas reprogramar tu actividad?
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-slate-400 text-base mt-1">
                                            Selecciona un espacio antes de la <span className="text-white font-bold">{selectedSubtask.deadline ? format(parseISO(selectedSubtask.deadline), "d 'de' MMMM", { locale: es }) : 'fecha límite'}</span> para mover <span className="text-white font-bold">'{selectedSubtask.title}'</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                {!showReprogramPrompt && !reprogramSuccessMessage && selectedSubtask.deadline && (
                                    <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                                        <Clock className="w-5 h-5 text-amber-500" />
                                        <span className="text-xs font-black text-amber-500 uppercase tracking-widest">
                                            Fecha límite: {format(parseISO(selectedSubtask.deadline), "d 'de' MMM", { locale: es })}
                                        </span>
                                    </div>
                                )}
                                {showReprogramPrompt && !reprogramSuccessMessage && (
                                    <Button
                                        variant="outline"
                                        onClick={handleOpenReprogramActivityModal}
                                        className="px-6 py-2.5 text-sm font-black uppercase tracking-widest text-blue-400 border-blue-500/50 hover:bg-blue-500/10 transition-all rounded-xl"
                                    >
                                        Reprogramar actividad
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={() => handleCancelMove()}
                                    className="px-6 py-2.5 text-sm font-black uppercase tracking-widest text-rose-500 border-rose-500/30 hover:bg-rose-500/10 transition-all rounded-xl"
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Modal: resolver sobrecarga al reprogramar */}
            {showOverloadModal && isMoving && selectedSubtask && pendingConflictDay && (() => {
                const projectedHours = computeProjectedHours(pendingConflictDay, selectedSubtask.durationNum);
                const overload = Math.max(0, projectedHours - studyLimitHours);

                return (
                    <div
                        className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowOverloadModal(false);
                                setReduceConflictError(null);
                                setOverloadModalStep("menu");
                            }
                        }}
                    >
                        <div
                            className="w-full max-w-[620px] bg-[#111827] border border-slate-700/70 rounded-3xl shadow-2xl p-6 sm:p-7"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-2xl font-extrabold text-white tracking-tight">Conflicto de sobrecarga detectado</h3>
                                    <p className="text-slate-300 mt-1.5 leading-relaxed">
                                        Quedarías con <span className="text-amber-300 font-bold">{formatHours(projectedHours)} planificadas</span> (límite {formatHours(studyLimitHours)}).
                                    </p>
                                    <p className="text-slate-400 text-sm mt-2">
                                        Día elegido: <span className="text-slate-200 font-semibold capitalize">{format(pendingConflictDay, "EEEE d 'de' MMMM", { locale: es })}</span> · sobrecarga de{" "}
                                        <span className="text-amber-300 font-semibold">{formatHours(overload)}</span>.
                                    </p>
                                </div>
                            </div>

                            {overloadModalStep === "menu" && (
                                <div className="mt-6 grid gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setReduceConflictError(null);
                                            setOverloadModalStep("reduce");
                                        }}
                                        className="h-auto min-h-12 py-3 rounded-xl border-slate-600 bg-slate-800/40 hover:bg-slate-700/60 text-slate-100 font-bold justify-start px-4"
                                    >
                                        <span className="flex flex-col items-start text-left">
                                            <span>1) Reducir horas de la tarea actual</span>
                                            <span className="text-[11px] font-medium text-slate-400 mt-0.5">
                                                Ajusta las horas actuales para guardar en este día.
                                            </span>
                                        </span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowOverloadModal(false);
                                            setReduceConflictError(null);
                                            setOverloadModalStep("menu");
                                        }}
                                        className="h-auto min-h-12 py-3 rounded-xl border-slate-600 bg-slate-800/40 hover:bg-slate-700/60 text-slate-100 font-bold justify-start px-4"
                                    >
                                        <span className="flex flex-col items-start text-left">
                                            <span>2) Mover tarea a otro día</span>
                                            <span className="text-[11px] font-medium text-slate-400 mt-0.5">
                                                Elige otro día directamente en el calendario.
                                            </span>
                                        </span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowMoveOtherTasksModal(true);
                                        }}
                                        className="h-auto min-h-12 py-3 rounded-xl border-slate-600 bg-slate-800/40 hover:bg-slate-700/60 text-slate-100 font-bold justify-start px-4"
                                    >
                                        <span className="flex flex-col items-start text-left">
                                            <span>3) Mover otras tareas</span>
                                            <span className="text-[11px] font-medium text-slate-400 mt-0.5">
                                                Mueve otra tarea de este día para liberar horas y resolver este conflicto.
                                            </span>
                                        </span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleCancelMove()}
                                        className="h-auto min-h-12 py-3 rounded-xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold justify-start px-4"
                                    >
                                        <span className="flex flex-col items-start text-left">
                                            <span>4) Posponer la solución</span>
                                            <span className="text-[11px] font-medium text-amber-200/80 mt-0.5">
                                                Pospón la reprogramación de esta tarea.
                                            </span>
                                        </span>
                                    </Button>
                                </div>
                            )}

                            {overloadModalStep === "reduce" && (
                                <div className="mt-6">
                                    <div className="bg-slate-900/50 border border-slate-700/60 rounded-2xl p-4">
                                        <p className="text-sm text-slate-300 mb-3">
                                            Define las nuevas horas para guardar en este día. Rango permitido:{" "}
                                            <span className="font-semibold text-white">0.5h</span> a{" "}
                                            <span className="font-semibold text-white">{formatHours(selectedSubtask.durationNum)}</span>.
                                        </p>
                                        <div className="flex gap-3 items-center flex-wrap">
                                            <input
                                                type="number"
                                                step="0.25"
                                                min="0.5"
                                                max={selectedSubtask.durationNum}
                                                value={reduceHoursForConflict}
                                                onKeyDown={(e) => {
                                                    if (e.key === "-" || e.key === "Minus") e.preventDefault();
                                                }}
                                                onChange={(e) => {
                                                    const raw = e.target.value;
                                                    if (raw === "") {
                                                        setReduceHoursForConflict(raw);
                                                        return;
                                                    }
                                                    const parsed = parseFloat(raw);
                                                    if (!Number.isFinite(parsed)) {
                                                        setReduceHoursForConflict(raw);
                                                        return;
                                                    }
                                                    const clamped = Math.min(
                                                        selectedSubtask.durationNum,
                                                        Math.max(0.5, parsed)
                                                    );
                                                    setReduceHoursForConflict(String(clamped));
                                                }}
                                                className="h-11 w-24 text-base font-semibold bg-[#1F2937]/60 border border-slate-700/60 text-slate-200 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <Button
                                                onClick={handleResolveByReducingHours}
                                                disabled={isResolvingConflict}
                                                className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                            >
                                                {isResolvingConflict ? "Guardando..." : "Guardar y reprogramar"}
                                            </Button>
                                        </div>
                                        {reduceConflictError && (
                                            <p className="text-amber-300 text-sm mt-2 font-semibold">{reduceConflictError}</p>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setReduceConflictError(null);
                                            setOverloadModalStep("menu");
                                        }}
                                        className="mt-4 h-11 rounded-xl border-slate-600 bg-slate-800/40 hover:bg-slate-700/60 text-slate-200 font-bold"
                                    >
                                        Volver a opciones
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Modal: mover otras tareas del día en conflicto */}
            {showMoveOtherTasksModal && pendingConflictDay && (() => {
                const dayTasks = getActivitiesForDay(pendingConflictDay).filter(
                    (task) => task.status !== "DONE" && task.id !== selectedSubtask?.id
                );

                return (
                    <div
                        className="fixed inset-0 z-[96] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setShowMoveOtherTasksModal(false);
                        }}
                    >
                        <div
                            className="w-full max-w-[620px] bg-[#111827] border border-slate-700/70 rounded-3xl shadow-2xl p-6 sm:p-7"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
                                    <Move className="w-6 h-6 text-blue-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-2xl font-extrabold text-white tracking-tight">Mover otras tareas</h3>
                                    <p className="text-slate-400 text-sm mt-1.5">
                                        Selecciona una tarea del día{" "}
                                        <span className="text-slate-200 font-semibold capitalize">
                                            {format(pendingConflictDay, "EEEE d 'de' MMMM", { locale: es })}
                                        </span>
                                        {" "}para moverla. Esta tarea se moverá con restricción: no podrá guardarse en días con conflicto.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                                {dayTasks.length > 0 ? (
                                    dayTasks.map((task) => (
                                        <button
                                            key={task.id}
                                            type="button"
                                            onClick={() => handleMoveOtherTaskFromConflictDay(task)}
                                            className="w-full text-left p-4 rounded-2xl border border-slate-700 bg-slate-900/50 hover:bg-slate-800/60 transition-colors"
                                        >
                                            <p className="text-sm font-bold text-white leading-tight">{task.title}</p>
                                            <p className="text-[11px] text-slate-400 mt-1">
                                                {task.course} · {formatHours(task.durationNum)}
                                            </p>
                                        </button>
                                    ))
                                ) : (
                                    <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
                                        <p className="text-sm text-slate-400">
                                            No hay otras tareas pendientes para mover en este día.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-5 flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowMoveOtherTasksModal(false)}
                                    className="h-11 rounded-xl border-slate-600 bg-slate-800/40 hover:bg-slate-700/60 text-slate-200 font-bold"
                                >
                                    Volver
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleCancelMove()}
                                    className="h-11 rounded-xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold"
                                >
                                    Posponer solución
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Modal: no se pudo cambiar la tarea (generaría conflicto); no se guardó nada */}
            {showReduceBlockedModal && reduceBlockedData && (
                <div className="fixed inset-0 z-[97] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                    <div className="w-full max-w-[440px] bg-[#111827] rounded-3xl shadow-2xl shadow-black/60 overflow-hidden border border-amber-500/30">
                        <div className="p-6 sm:p-7 text-center">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 border bg-amber-500/10 border-amber-500/25">
                                <AlertCircle className="w-8 h-8 text-amber-400" strokeWidth={2} />
                            </div>
                            <h3 className="text-xl font-extrabold text-white tracking-tight">
                                No se pudo cambiar la tarea
                            </h3>
                            <p className="text-slate-400 text-base mt-3 leading-relaxed">
                                No se pudo cambiar la tarea para{" "}
                                <span className="text-white font-bold capitalize">{reduceBlockedData.dateLabel}</span>, porque generaría conflicto.
                            </p>
                            <p className="text-slate-300 text-sm mt-4 leading-relaxed">
                                {reduceBlockedData.recommendedHours != null ? (
                                    <>
                                        Te recomendamos establecer la estimación de horas de esta tarea a{" "}
                                        <span className="text-amber-300 font-extrabold">
                                            {reduceBlockedData.recommendedHours % 1 === 0
                                                ? reduceBlockedData.recommendedHours
                                                : reduceBlockedData.recommendedHours.toFixed(1)}
                                            h
                                        </span>
                                        {" "}(tiempo disponible ese día). Puedes volver atrás para aplicar esta estimación.
                                    </>
                                ) : reduceBlockedData.cannotReduceEvenMin ? (
                                    <>
                                        Ni con la reducción mínima (0,5 h) se soluciona el conflicto. Te recomendamos mover tu tarea a otro día o mover las tareas ya programadas para el día{" "}
                                        <span className="text-white font-semibold capitalize">{reduceBlockedData.dateLabel}</span>.
                                    </>
                                ) : (
                                    <>
                                        Te recomendamos mover esta tarea a otro día o liberar las tareas del día{" "}
                                        <span className="text-white font-semibold capitalize">{reduceBlockedData.dateLabel}</span>.
                                    </>
                                )}
                            </p>
                            <Button
                                onClick={() => {
                                    const data = reduceBlockedData;
                                    setShowReduceBlockedModal(false);
                                    setReduceBlockedData(null);
                                    if (data?.recommendedHours != null) {
                                        setReduceHoursForConflict(
                                            data.recommendedHours % 1 === 0
                                                ? String(data.recommendedHours)
                                                : data.recommendedHours.toFixed(1)
                                        );
                                        setOverloadModalStep("reduce");
                                    } else {
                                        setOverloadModalStep("menu");
                                    }
                                    setShowOverloadModal(true);
                                }}
                                className="mt-6 w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20 text-base"
                            >
                                Entendido
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de resultado al reducir horas (solo cuando se resolvió y se guardó) */}
            {showReduceConflictOutcomeModal && reduceConflictOutcome && (
                <div className="fixed inset-0 z-[97] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                    <div className="w-full max-w-[440px] bg-[#111827] rounded-3xl shadow-2xl shadow-black/60 overflow-hidden border border-emerald-500/30">
                        <div className="p-6 sm:p-7 text-center">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 border bg-emerald-500/20 border-emerald-500/30">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400" strokeWidth={2} />
                            </div>
                            <h3 className="text-xl font-extrabold text-white tracking-tight">
                                Conflicto solucionado
                            </h3>
                            <p className="text-slate-400 text-base mt-3 leading-relaxed">
                                Para el día{" "}
                                <span className="text-white font-bold">
                                    {format(parseISO(reduceConflictOutcome.dateKey), "EEEE d 'de' MMMM", {
                                        locale: es,
                                    })}
                                </span>{" "}
                                el conflicto quedó resuelto. Te quedan{" "}
                                <span className="text-emerald-300 font-extrabold">
                                    {reduceConflictOutcome.availableHours % 1 === 0
                                        ? reduceConflictOutcome.availableHours
                                        : reduceConflictOutcome.availableHours.toFixed(1)}
                                    h
                                </span>{" "}
                                disponibles.
                            </p>
                            <Button
                                onClick={() => {
                                    setShowReduceConflictOutcomeModal(false);
                                    setReduceConflictOutcome(null);
                                    setReduceConflictError(null);
                                    handleCancelMove();
                                }}
                                className="mt-6 w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20 text-base"
                            >
                                Entendido
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: reprogramar actividad (nueva fecha límite) */}
            {showReprogramActivityModal && selectedSubtask && (
                <div
                    className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
                    onClick={(e) => e.target === e.currentTarget && setShowReprogramActivityModal(false)}
                >
                    <div className="w-full max-w-md bg-[#111827] border border-slate-700 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-blue-500/10 p-2 rounded-xl">
                                <CalendarRange className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white">Reprogramar actividad</h3>
                                <p className="text-xs text-slate-400">Establece una nueva fecha límite para poder mover la tarea.</p>
                            </div>
                        </div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nueva fecha límite</label>
                        <input
                            type="date"
                            value={newDeadlineForActivity}
                            min={format(todayForDeadline, "yyyy-MM-dd")}
                            onChange={(e) => setNewDeadlineForActivity(e.target.value)}
                            className="w-full rounded-xl bg-[#1F2937]/50 border border-slate-600 px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div className="flex gap-3 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => setShowReprogramActivityModal(false)}
                                className="flex-1 rounded-xl border-slate-600 text-slate-400 hover:bg-slate-800"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSaveNewDeadline}
                                disabled={savingDeadline || !newDeadlineForActivity}
                                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            >
                                {savingDeadline ? "Guardando..." : "Guardar"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de éxito al reprogramar (mismo diseño que Hoy: orden de prioridad) */}
            {showMoveSuccessModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowMoveSuccessModal(false);
                            setMoveSuccessData(null);
                            const pending = pendingNavigateAfterModalRef.current;
                            pendingNavigateAfterModalRef.current = null;
                            if (pending) navigate(pending.to, { state: pending.state });
                        }
                    }}
                >
                    <div className="bg-[#111827] border border-slate-800 rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl max-w-[520px] w-full mx-4 relative overflow-hidden animate-in fade-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                        <div className="w-12 h-12 bg-emerald-400/20 border border-emerald-400/30 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/10">
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        </div>
                        <h3 className="text-2xl font-extrabold text-white mb-4 tracking-tight">
                            Tarea <span className="text-blue-400">reprogramada</span> con éxito
                        </h3>
                        <p className="text-slate-400 text-[15px] leading-relaxed mb-8 px-2">
                            {moveSuccessData
                                ? <>Moviste &quot;{moveSuccessData.taskTitle}&quot; al día {moveSuccessData.dateLabel}.</>
                                : ""}
                        </p>
                        <Button
                            onClick={() => {
                                setShowMoveSuccessModal(false);
                                setMoveSuccessData(null);
                                const pending = pendingNavigateAfterModalRef.current;
                                pendingNavigateAfterModalRef.current = null;
                                if (pending) navigate(pending.to, { state: pending.state });
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-11 rounded-xl font-bold shadow-lg shadow-blue-600/20 text-sm transition-all w-full sm:w-auto"
                        >
                            Entendido
                        </Button>
                    </div>
                </div>
            )}

            {/* Modal: conflicto solucionado tras mover otras tareas */}
            {showConflictResolvedModal && (
                <div
                    className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowConflictResolvedModal(false);
                            setConflictResolvedData(null);
                        }
                    }}
                >
                    <div
                        className="bg-[#111827] border border-emerald-500/30 rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl max-w-[520px] w-full mx-4 relative overflow-hidden animate-in fade-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                        <div className="w-12 h-12 bg-emerald-400/20 border border-emerald-400/30 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/10">
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        </div>
                        <h3 className="text-2xl font-extrabold text-white mb-4 tracking-tight">
                            Conflicto <span className="text-emerald-400">solucionado</span>
                        </h3>
                        <p className="text-slate-400 text-[15px] leading-relaxed mb-8 px-2">
                            {conflictResolvedData
                                ? <>Se liberó carga del día y se reprogramó &quot;{conflictResolvedData.taskTitle}&quot; para {conflictResolvedData.dateLabel} sin sobrepasar tu límite.</>
                                : "La reprogramación quedó en un estado viable."}
                        </p>
                        <Button
                            onClick={() => {
                                setShowConflictResolvedModal(false);
                                setConflictResolvedData(null);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-11 rounded-xl font-bold shadow-lg shadow-blue-600/20 text-sm transition-all w-full sm:w-auto"
                        >
                            Entendido
                        </Button>
                    </div>
                </div>
            )}

            {/* Modal: procesando resolución de conflicto */}
            {showConflictProcessingModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                    <div className="w-full max-w-[420px] bg-[#111827] border border-slate-700 rounded-3xl p-7 text-center shadow-2xl">
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center mx-auto mb-5">
                            <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
                        </div>
                        <h3 className="text-xl font-extrabold text-white tracking-tight">Ajustando tu calendario</h3>
                        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                            {conflictProcessingMessage}
                        </p>
                        <p className="text-slate-500 text-xs mt-3">
                            Esto puede tardar unos segundos.
                        </p>
                    </div>
                </div>
            )}

            {/* Modal para elegir semana: mini calendario tipo "Mes" del WeeklyDatePicker */}
            {showWeekPicker && (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) handleCloseWeekPicker();
                    }}
                >
                    <div
                        className="w-full max-w-[680px] bg-transparent border-none shadow-none animate-in fade-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Copia del overlay de "Mes" del WeeklyDatePicker */}
                        <div className="px-6 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="relative bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 pt-5">
                                {/* Botón cerrar arriba a la derecha, dentro del contenedor */}
                                <button
                                    type="button"
                                    onClick={handleCloseWeekPicker}
                                    className="absolute right-3 top-3 inline-flex items-center justify-center h-7 w-7 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                                    aria-label="Cerrar selector de semana"
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                {/* Month nav */}
                                <div className="flex items-center justify-between mb-3 pr-6">
                                    <button
                                        type="button"
                                        onClick={() => setWeekPickerDate(subMonths(weekPickerDate, 1))}
                                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm font-bold text-white capitalize">
                                        {format(weekPickerDate, "MMMM yyyy", { locale: es })}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setWeekPickerDate(addMonths(weekPickerDate, 1))}
                                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Day headers */}
                                <div className="grid grid-cols-7 gap-1 mb-1">
                                    {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                                        <div
                                            key={d}
                                            className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider py-1"
                                        >
                                            {d}
                                        </div>
                                    ))}
                                </div>

                                {/* Week rows - clickable */}
                                {weekPickerWeeks.map((week, wi) => {
                                    const weekStart = startOfWeek(week[0], { weekStartsOn: 1 });
                                    const isCurrentWeek = weekDays.some((wd) =>
                                        isSameDay(wd, week[0])
                                    );
                                    return (
                                        <button
                                            key={wi}
                                            type="button"
                                            onClick={() => handleSelectWeekFromPicker(weekStart)}
                                            className={`grid grid-cols-7 gap-1 w-full rounded-xl py-1 transition-all cursor-pointer ${isCurrentWeek
                                                ? "bg-blue-500/15 border border-blue-500/30"
                                                : "hover:bg-slate-800/60 border border-transparent"
                                                }`}
                                        >
                                            {week.map((day, di) => {
                                                const isInMonth =
                                                    day.getMonth() === weekPickerDate.getMonth();
                                                const isToday2 = isSameDay(
                                                    day,
                                                    startOfDay(new Date())
                                                );
                                                return (
                                                    <div
                                                        key={di}
                                                        className={`text-center text-xs py-1 rounded-lg ${isToday2
                                                            ? "bg-blue-600 text-white font-bold"
                                                            : isInMonth
                                                                ? "text-slate-300"
                                                                : "text-slate-600"
                                                            }`}
                                                    >
                                                        {format(day, "d")}
                                                    </div>
                                                );
                                            })}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Espacio inferior para que el modal respire visualmente */}
                        <div className="h-2" />
                    </div>
                </div>
            )}

            {/* Edit Subtask Modal */}
            <EditSubtaskModal
                open={Boolean(editingSubtask)}
                onOpenChange={(open) => {
                    if (!open) setEditingSubtask(null);
                }}
                initialTitle={editingSubtask?.title ?? ""}
                initialHours={editingSubtask?.durationNum}
                onReprogram={() => {
                    if (!editingSubtask) return;
                    handleSelectForMove(editingSubtask);
                    setEditingSubtask(null);
                }}
                onDelete={() => {
                    if (!editingSubtask) return;
                    setEditingSubtask(null);
                    handleDelete(editingSubtask.activityId, editingSubtask.id);
                }}
                onSave={async ({ title, estimatedHours }) => {
                    if (!editingSubtask) return { ok: false, error: "No hay subtarea seleccionada." };

                    try {
                        await patchSubtask(editingSubtask.activityId, editingSubtask.id, {
                            title,
                            estimated_hours: estimatedHours,
                        });
                        queryCache.invalidate("activities");
                        await refetch();
                        setEditingSubtask(null);
                        return { ok: true };
                    } catch (error) {
                        return {
                            ok: false,
                            error:
                                "No pudimos guardar los cambios. Revisa que las horas no superen tu límite diario de estudio y vuelve a intentarlo.",
                        };
                    }
                }}
            />
        </div>
    );
}
