import React, { useState, useMemo, useEffect } from "react";
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay, parseISO, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, MoreVertical, Loader2, CalendarRange, CalendarCheck, Move, CirclePlus, X, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/button";
import { useHoy } from "@/features/today/hooks/useHoy";
import { patchSubtask, deleteSubtask } from "@/api/services/subtack";
import { queryCache } from "@/lib/queryCache";
import { Link, useLocation, useNavigate } from "react-router-dom";

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

    const { vencidas, para_hoy, proximas, loading, refetch } = useHoy({ days_ahead: 30 });

    // Si venimos desde el flujo "Ver conflicto → Mover tarea" (Hoy), enfocamos la semana de la tarea.
    useEffect(() => {
        const focusDate = (location.state as any)?.focusDate as string | undefined;
        if (!focusDate) return;
        try {
            setCurrentDate(startOfDay(parseISO(focusDate)));
        } catch {
            // Ignorar si llega un valor inválido
        }
        // Limpiamos el state para que no re-aplique en futuros re-renders o navegaciones internas.
        navigate(location.pathname, { replace: true, state: {} });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const studyLimitHours = useMemo(() => {
        const saved = window.localStorage.getItem("studyLimitHours");
        return saved ? parseFloat(saved) : 6;
    }, []);

    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

    const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

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

    const handleSelectForMove = (activity: any) => {
        setSelectedSubtask(activity);
        setIsMoving(true);
    };

    const handleCancelMove = () => {
        setSelectedSubtask(null);
        setIsMoving(false);
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

        const newDateKey = format(day, "yyyy-MM-dd");
        const subtaskId = selectedSubtask.id;
        const activityId = selectedSubtask.activityId;
        const subtaskHours = selectedSubtask.durationNum;

        // Calcular horas del nuevo día (optimista)
        // dayStats ya incluye esta tarea en su día actual, así que:
        // - Si se mueve a otro día: nuevo día = horas actuales + horas de esta tarea
        // - Si se mueve al mismo día: no hay cambio
        const oldDateKey = selectedSubtask.dateKey;
        let currentHoursNewDay = dayStats[newDateKey] || 0;
        
        if (oldDateKey !== newDateKey) {
            // Si se mueve a un día diferente, agregar las horas de esta tarea al nuevo día
            currentHoursNewDay = currentHoursNewDay + subtaskHours;
        }
        
        const willHaveConflict = currentHoursNewDay > studyLimitHours;

        // Actualización optimista: fecha y conflicto
        setOverriddenDates(prev => ({
            ...prev,
            [subtaskId]: newDateKey
        }));
        
        // Actualizar estado de conflicto optimista solo para esta tarjeta
        setConflictOverrides(prev => ({
            ...prev,
            [subtaskId]: willHaveConflict
        }));

        handleCancelMove();

        try {
            await patchSubtask(activityId, subtaskId, {
                target_date: newDateKey
            });
            
            // Refrescar datos en segundo plano sin bloquear la UI
            queryCache.invalidate('activities');
            Promise.resolve(refetch()).then(() => {
                // Limpiar el override después de que el refetch termine
                // El backend ahora tiene el valor correcto
                setConflictOverrides(prev => {
                    const next = { ...prev };
                    delete next[subtaskId];
                    return next;
                });
            }).catch(() => {
                // Si falla, mantener el override optimista
            });
        } catch (error) {
            console.error("Error al reprogramar:", error);
            // Revertir cambios optimistas en caso de error
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
            // Refrescar para obtener el estado correcto del backend
            refetch();
        }
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

    const weekRangeLabel = `Semana del ${format(startDate, "d")} al ${format(addDays(startDate, 6), "d 'de' MMMM, yyyy", { locale: es })}`;
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
        <div className="flex-1 flex flex-col w-full max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-10 py-8 animate-in fade-in duration-500">
            {/* Relocation Mode Banner */}
            {isMoving && selectedSubtask && (
                <div className="flex flex-col md:flex-row items-center justify-between p-5 mb-8 rounded-2xl bg-blue-500/10 border border-blue-500/20 animate-in slide-in-from-top duration-300 gap-4">
                    <div className="flex items-center gap-4 text-blue-500">
                        <div className="bg-blue-500 text-white p-2 rounded-lg shrink-0">
                            <CalendarRange className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="font-black text-xs uppercase tracking-[0.2em]">Modo Reubicación Activo</span>
                            <p className="text-slate-400 text-sm mt-0.5">
                                Selecciona un espacio antes del <span className="text-white font-bold">{selectedSubtask.deadline ? format(parseISO(selectedSubtask.deadline), "d 'de' MMMM", { locale: es }) : 'límite'}</span> para mover <span className="text-white font-bold">'{selectedSubtask.title}'</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        {selectedSubtask.deadline && (
                            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                                <Clock className="w-4 h-4 text-amber-500" />
                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                    Límite: {format(parseISO(selectedSubtask.deadline), "d 'de' MMM", { locale: es })}
                                </span>
                            </div>
                        )}
                        <Button
                            variant="outline"
                            onClick={handleCancelMove}
                            className="px-6 py-2 text-xs font-black uppercase tracking-widest text-rose-500 border-rose-500/30 hover:bg-rose-500/10 transition-all rounded-xl"
                        >
                            Cancelar
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4">
                    {!isMoving && (
                        <div className="bg-blue-600/10 p-3 rounded-2xl border border-blue-500/20 text-blue-500">
                            <CalendarRange className="w-8 h-8" />
                        </div>
                    )}
                    <h2 className="text-3xl font-black text-white tracking-tight">
                        {weekRangeLabel}
                    </h2>
                </div>
                <div className="flex gap-3">
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
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-5 h-full overflow-visible items-start mt-2">
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
                    const canFitSelected = selectedSubtask && !isSameDay(day, selectedSubtask.date) && availableHours >= selectedSubtask.durationNum && !isAfterDeadline;

                    return (
                        <div key={day.toString()} className="flex flex-col gap-5 min-h-[450px]">
                            <div
                                onDragOver={(e) => {
                                    if (!isMoving || isPastDay) return;
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = "move";
                                }}
                                onDrop={(e) => {
                                    if (!isMoving || isPastDay) return;
                                    e.preventDefault();
                                    handleConfirmMove(day);
                                }}
                                className={`flex flex-col items-center p-4 rounded-2xl border-t-4 transition-all 
                                    ${isPastDay ? "opacity-40 pointer-events-none" : ""}
                                    ${isToday
                                        ? "bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/5"
                                        : "bg-slate-800/30 border-slate-800"
                                    } 
                                 ${isWeekend ? "opacity-90" : ""} 
                                 ${isMoving && canFitSelected ? 'ring-2 ring-emerald-500/50 bg-emerald-500/5' : ''}
                                 ${isMoving && isAfterDeadline ? 'opacity-20 pointer-events-none grayscale' : ''}
                                 ${isMoving && isDeadlineDay ? 'ring-2 ring-amber-500 bg-amber-500/10 animate-pulse transition-all scale-[1.02] z-10' : ''}`}
                            >
                                {isMoving && isDeadlineDay && (
                                    <div className="absolute -top-3 px-3 py-1 bg-amber-500 text-white text-[9px] font-black rounded-full shadow-lg z-20">
                                        FECHA LÍMITE
                                    </div>
                                )}
                                <span className={`text-xs font-black uppercase tracking-wider ${isToday ? "text-blue-500" : isMoving && isDeadlineDay ? "text-amber-500" : "text-slate-400"
                                    }`}>
                                    {format(day, "EEEE d", { locale: es })}
                                </span>
                                <span className={`text-[10px] mt-2 font-black uppercase tracking-widest ${canFitSelected ? 'text-emerald-400' : isMoving && isDeadlineDay ? 'text-amber-400' : 'text-slate-500'}`}>
                                    {isMoving && isAfterDeadline ? 'BLOQUEADO' : `Disponibilidad: ${availableHours % 1 === 0 ? availableHours : availableHours.toFixed(1)}h`}
                                </span>
                            </div>

                            <div className="flex-1 space-y-4">
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

                                                const activeTheme = isConflicted ? conflictTheme : theme;

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
                                                                        onClick={() => navigate(`/actividad/${activity.activityId}`)}
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

                                {isMoving && canFitSelected && !isPastDay && (
                                    <button
                                        onClick={() => handleConfirmMove(day)}
                                        className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-500/50 bg-blue-500/5 rounded-2xl group cursor-pointer hover:bg-blue-500/10 transition-all animate-pulse"
                                    >
                                        <CirclePlus className="w-8 h-8 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                                        <span className="text-blue-500 text-xs font-black uppercase tracking-widest">Mover aquí</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
