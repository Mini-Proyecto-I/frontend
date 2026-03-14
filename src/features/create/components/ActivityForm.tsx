import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, ClipboardList, Save } from "lucide-react";
import InfoTooltip from "@/features/create/components/InfoTooltip";
import { getCourses, createCourse } from "@/api/services/course";
import { createActivity, getActivities, patchActivity } from "@/api/services/activity";
import { createSubtask, patchSubtask } from "@/api/services/subtack";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/shared/components/dialog";
import { Button } from "@/shared/components/button";
import { MessageModal } from "@/shared/components/MessageModal";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/components/select";
import SubtaskForm, { Subtarea } from "./SubtaskForm";
import { useHoy } from "@/features/today/hooks/useHoy";
import { getConfig } from "@/api/services/config";
import { queryCache } from "@/lib/queryCache";
import { parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import ConflictResolutionModal, {
    type ConflictInfo,
    type ExistingTask,
} from "./ConflictResolutionModal";
import RescheduleModal from "./RescheduleModal";

interface Course {
    id: string;
    name: string;
}

// Tipos de actividad alineados con el backend (choices de Activity.type)
const activityTypes = [
    { label: "Examen", value: "examen" },
    { label: "Quiz", value: "quiz" },
    { label: "Taller", value: "taller" },
    { label: "Proyecto", value: "proyecto" },
    { label: "Otro", value: "otro" },
];

const ActivityForm = () => {
    const navigate = useNavigate();
    const [titulo, setTitulo] = useState("");
    const [curso, setCurso] = useState("");
    const [tipo, setTipo] = useState("");
    const [fechaEntrega, setFechaEntrega] = useState("");
    const [fechaEvento, setFechaEvento] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [subtareas, setSubtareas] = useState<Subtarea[]>([]);
    const [isSavingActivity, setIsSavingActivity] = useState(false);
    const [isSavingSubtasks, setIsSavingSubtasks] = useState(false);

    // Estados para controlar los pasos del formulario
    const [currentStep, setCurrentStep] = useState<1 | 2>(1); // 1: actividad, 2: subtareas
    const [createdActivityId, setCreatedActivityId] = useState<number | null>(null);

    // Estados para cursos
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newCourseName, setNewCourseName] = useState("");
    const [creatingCourse, setCreatingCourse] = useState(false);
    const [courseError, setCourseError] = useState<string>("");

    // Estados de errores de validación
    const [errors, setErrors] = useState<{
        titulo?: string;
        curso?: string;
        tipo?: string;
        fechaEntrega?: string;
        fechaEvento?: string;
        subtareas?: { [key: number]: { nombre?: string; fechaObjetivo?: string; horas?: string } };
    }>({});

    // Estados para el modal de mensajes
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"success" | "error" | "warning">("success");
    const [modalTitle, setModalTitle] = useState("");
    const [modalMessage, setModalMessage] = useState("");

    // ──────────── CONFLICTOS INTELIGENTES ────────────
    // Datos del backend para detección de conflictos client-side
    const { vencidas, para_hoy, proximas, loading: loadingHoy, refetch: refetchHoy } = useHoy({ days_ahead: 60 });

    // Límite diario de estudio
    const [studyLimitHours, setStudyLimitHours] = useState(() => {
        const saved = window.localStorage.getItem("studyLimitHours");
        return saved ? parseFloat(saved) : 6;
    });

    // Cargar límite desde backend
    useEffect(() => {
        const loadLimit = async () => {
            try {
                const config = await getConfig();
                if (config?.daily_hours_limit) {
                    const backendLimit = parseFloat(config.daily_hours_limit);
                    setStudyLimitHours(backendLimit);
                    window.localStorage.setItem("studyLimitHours", backendLimit.toString());
                }
            } catch {
                // usar localStorage fallback
            }
        };
        loadLimit();
    }, []);

    // Calcular horas existentes por día desde el backend
    const existingHoursByDate = useMemo(() => {
        const stats: Record<string, number> = {};
        const combined: any[] = [...(vencidas || []), ...(para_hoy || []), ...(proximas || [])];
        combined.forEach((item) => {
            if (item.target_date) {
                stats[item.target_date] = (stats[item.target_date] || 0) + parseFloat(item.estimated_hours || 0);
            }
        });
        return stats;
    }, [vencidas, para_hoy, proximas]);

    // Obtener tareas existentes por día para la resolución de conflictos
    const getExistingTasksForDate = useCallback((dateStr: string): ExistingTask[] => {
        const combined: any[] = [...(vencidas || []), ...(para_hoy || []), ...(proximas || [])];
        return combined
            .filter((item) => item.target_date === dateStr)
            .map((item) => ({
                id: item.id,
                activityId: item.activity?.id,
                title: item.title,
                hours: parseFloat(item.estimated_hours || 0),
                course: item.activity?.course?.name || "Actividad",
                status: item.status,
                deadline: item.activity?.deadline,
            }));
    }, [vencidas, para_hoy, proximas]);

    // Estado de conflictos detectados
    const [detectedConflicts, setDetectedConflicts] = useState<ConflictInfo[]>([]);
    // Modal de resolución
    const [showResolutionModal, setShowResolutionModal] = useState(false);
    const [activeConflict, setActiveConflict] = useState<ConflictInfo | null>(null);
    // Modal de reprogramación
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [rescheduleTask, setRescheduleTask] = useState<ExistingTask | null>(null);
    // Highlighting de subtareas con conflicto
    const [highlightedSubtasks, setHighlightedSubtasks] = useState<Record<number, "horas" | "fecha">>({});
    // Fechas que tienen conflicto
    const [conflictDates, setConflictDates] = useState<Set<string>>(new Set());

    // Función helper para obtener la fecha de hoy en formato YYYY-MM-DD
    const getTodayDate = (): string => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today.toISOString().split('T')[0];
    };

    // Cargar cursos al montar el componente
    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            setLoadingCourses(true);
            const data = await getCourses();
            setCourses(data);
        } catch (error) {
            console.error("Error al cargar cursos:", error);
        } finally {
            setLoadingCourses(false);
        }
    };

    const handleCreateCourse = async () => {
        if (!newCourseName.trim()) {
            setCourseError("El nombre del curso es requerido");
            return;
        }

        // Limpiar error previo
        setCourseError("");

        try {
            setCreatingCourse(true);
            const newCourse = await createCourse({ name: newCourseName.trim() });
            setCourses([...courses, newCourse]);
            setCurso(newCourse.id.toString());
            setNewCourseName("");
            setCourseError("");
            setIsDialogOpen(false);
            setModalType("success");
            setModalTitle("Curso creado");
            setModalMessage("El curso ha sido añadido exitosamente. Ya puedes seleccionarlo en la lista.");
            setModalOpen(true);
        } catch (error: any) {
            console.error("Error al crear curso:", error);
            let errorMessage = "Error al crear el curso. Por favor, intenta de nuevo.";

            // Si es un error 500, usar el mensaje del interceptor
            if (error?.response?.status === 500) {
                errorMessage = error?.message || "Ups! Hubo un error en la red, intenta más tarde!";
            } else if (error?.response?.data) {
                const errorData = error.response.data;
                if (errorData.name && Array.isArray(errorData.name)) {
                    const nameError = errorData.name[0];
                    // Verificar si es un error de duplicado
                    if (nameError.toLowerCase().includes("already exists") ||
                        nameError.toLowerCase().includes("unique") ||
                        nameError.toLowerCase().includes("ya existe") ||
                        error.response.status === 400) {
                        errorMessage = "Es posible que ya exista un curso con ese nombre. Por favor, intenta con otro nombre.";
                    } else {
                        errorMessage = nameError;
                    }
                } else if (errorData.detail) {
                    errorMessage = errorData.detail;
                } else if (typeof errorData === 'string') {
                    errorMessage = errorData;
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                } else if (error.response.status === 400) {
                    errorMessage = "Es posible que ya exista un curso con ese nombre. Por favor, intenta con otro nombre.";
                }
            } else if (error?.message) {
                errorMessage = error.message;
            }

            // Mostrar error en el formulario
            setCourseError(errorMessage);
            // También mostrar modal para feedback adicional
            setModalType("error");
            setModalTitle("Error al crear curso");
            setModalMessage(errorMessage);
            setModalOpen(true);
        } finally {
            setCreatingCourse(false);
        }
    };

    const handleCourseNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewCourseName(e.target.value);
        // Limpiar error cuando el usuario empiece a escribir
        if (courseError) {
            setCourseError("");
        }
    };

    const handleDialogOpenChange = (open: boolean) => {
        setIsDialogOpen(open);
        // Limpiar errores y el nombre cuando se cierra el modal
        if (!open) {
            setNewCourseName("");
            setCourseError("");
        }
    };

    // Función para limpiar errores cuando el usuario empieza a escribir
    const clearFieldError = (field: string) => {
        if (errors[field as keyof typeof errors]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field as keyof typeof errors];
                return newErrors;
            });
        }
    };

    // Función de validación para el paso 1 (actividad)
    const validateActivityForm = (): boolean => {
        const newErrors: typeof errors = {};

        // Validar título
        if (!titulo.trim()) {
            newErrors.titulo = "El título no puede estar vacío";
        }

        // Validar curso
        if (!curso) {
            newErrors.curso = "El curso es obligatorio para crear una tarea.";
        }

        // Validar tipo
        if (!tipo) {
            newErrors.tipo = "El tipo es obligatorio para crear una tarea.";
        }

        // Validar fecha de entrega
        if (!fechaEntrega) {
            newErrors.fechaEntrega = "La fecha de entrega es obligatoria para crear una tarea.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Función de validación para el paso 2 (subtareas)
    const validateSubtasksForm = (): boolean => {
        const newErrors: typeof errors = { ...errors };
        const subtaskErrors: { [key: number]: { nombre?: string; fechaObjetivo?: string; horas?: string } } = {};

        if (subtareas.length > 0) {
            subtareas.forEach((sub) => {
                const subErrors: { nombre?: string; fechaObjetivo?: string; horas?: string } = {};

                if (!sub.nombre.trim()) {
                    subErrors.nombre = "El nombre de la subtarea es obligatorio.";
                }

                if (!sub.fechaObjetivo) {
                    subErrors.fechaObjetivo = "La fecha objetivo es obligatoria.";
                } else if (fechaEntrega && sub.fechaObjetivo > fechaEntrega) {
                    subErrors.fechaObjetivo = "La fecha objetivo no puede ser posterior a la fecha de entrega de la actividad.";
                }

                if (!sub.horas || parseFloat(sub.horas) <= 0) {
                    subErrors.horas = "Las horas estimadas son obligatorias y deben ser mayores a 0.";
                }

                if (Object.keys(subErrors).length > 0) {
                    subtaskErrors[sub.id] = subErrors;
                }
            });

            if (Object.keys(subtaskErrors).length > 0) {
                newErrors.subtareas = subtaskErrors;
            } else {
                delete newErrors.subtareas;
            }
        }

        setErrors(newErrors);
        return Object.keys(subtaskErrors).length === 0;
    };

    // Función para obtener mensajes de error más claros
    const getErrorMessage = (error: any): string => {
        const status = error?.response?.status;
        const errorData = error?.response?.data;

        if (!errorData && !error?.message) {
            return "Ocurrió un error inesperado. Por favor, intenta de nuevo.";
        }

        if (typeof errorData === "string") {
            return errorData;
        }

        if (errorData?.detail) {
            return errorData.detail;
        }

        if (errorData?.title) {
            const titleError = Array.isArray(errorData.title) ? errorData.title[0] : errorData.title;
            if (titleError?.toLowerCase().includes("already exists") ||
                titleError?.toLowerCase().includes("unique") ||
                titleError?.toLowerCase().includes("ya existe")) {
                return "Ya existe una actividad con este título en el curso seleccionado. Por favor, usa un título diferente.";
            }
            return String(titleError);
        }

        if (errorData?.deadline) {
            const deadlineError = Array.isArray(errorData.deadline) ? errorData.deadline[0] : errorData.deadline;
            if (deadlineError?.toLowerCase().includes("anterior")) {
                return "La fecha de entrega no puede ser anterior a la fecha del evento. Por favor, ajusta las fechas.";
            }
            return String(deadlineError) || "La fecha de entrega no es válida. Por favor, revisa la fecha seleccionada.";
        }

        if (errorData?.event_datetime) {
            const eventError = Array.isArray(errorData.event_datetime) ? errorData.event_datetime[0] : errorData.event_datetime;
            return String(eventError) || "La fecha del evento no es válida. Por favor, revisa la fecha seleccionada.";
        }

        // Manejar error de límite diario de horas (estimated_hours)
        if (errorData?.estimated_hours) {
            const hoursError = Array.isArray(errorData.estimated_hours) ? errorData.estimated_hours[0] : errorData.estimated_hours;
            if (hoursError?.toLowerCase().includes("limite diario") || 
                hoursError?.toLowerCase().includes("excede") ||
                hoursError?.toLowerCase().includes("límite")) {
                return String(hoursError) || "Se excede el límite diario de horas planificadas. Por favor, reduce las horas o cambia la fecha objetivo.";
            }
            return String(hoursError) || "Las horas estimadas no son válidas. Por favor, revisa el valor ingresado.";
        }

        if (error?.message) {
            if (error.message.includes("Network Error") || error.message.includes("Failed to fetch")) {
                return "No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta de nuevo.";
            }
            return error.message;
        }

        if (status === 500) {
            return "Ocurrió un error en el servidor. Por favor, intenta más tarde.";
        }

        if (status === 400) {
            // Si hay múltiples errores, intentar mostrar el más relevante
            if (errorData && typeof errorData === 'object') {
                const errorKeys = Object.keys(errorData);
                if (errorKeys.length > 0) {
                    const firstError = errorData[errorKeys[0]];
                    const firstErrorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
                    if (firstErrorMessage) {
                        return String(firstErrorMessage);
                    }
                }
            }
            return "Los datos ingresados no son válidos. Por favor, revisa el formulario.";
        }

        return "Ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo.";
    };

    // Función para manejar el guardado de la actividad (Paso 1)
    const handleSaveActivity = async () => {
        const isValid = validateActivityForm();
        if (!isValid) {
            setModalType("error");
            setModalTitle("Campos incompletos");
            setModalMessage("Por favor, completa todos los campos obligatorios marcados con *.");
            setModalOpen(true);
            setTimeout(() => {
                const errorFields = ["titulo", "curso", "tipo", "fechaEntrega"];
                for (const field of errorFields) {
                    const element = document.querySelector(`[data-field="${field}"]`);
                    if (element) {
                        element.scrollIntoView({ behavior: "smooth", block: "center" });
                        break;
                    }
                }
            }, 200);
            return;
        }

        setIsSavingActivity(true);
        try {
            const userId = 1;

            const payloadActivity = {
                title: titulo.trim(),
                description: descripcion || "",
                user: userId,
                course_id: curso || null,
                deadline: fechaEntrega,
                event_datetime: fechaEvento ? `${fechaEvento}T00:00:00Z` : null,
                type: tipo,
            };

            // Si la actividad ya fue creada (usuario volvió del paso de subtareas), actualizar en lugar de crear
            if (createdActivityId != null) {
                await patchActivity(createdActivityId, payloadActivity);
                setCurrentStep(2);
                setModalType("success");
                setModalTitle("Actividad actualizada");
                setModalMessage(`La actividad "${payloadActivity.title}" se ha actualizado. Puedes continuar con las subtareas.`);
                setModalOpen(true);
                setIsSavingActivity(false);
                return;
            }

            // Validación de duplicados (solo al crear; excluir la actividad actual si ya existe)
            if (payloadActivity.course_id && payloadActivity.title) {
                try {
                    const existing = await getActivities();
                    const normalizedTitle = payloadActivity.title.trim().toLowerCase();
                    const normalizedCourseId = String(payloadActivity.course_id);
                    const currentIdStr = createdActivityId != null ? String(createdActivityId) : null;

                    const isDuplicate =
                        Array.isArray(existing) &&
                        existing.some((a: any) => {
                            if (currentIdStr != null && a?.id != null && String(a.id) === currentIdStr) return false;
                            const existingTitle = String(a?.title ?? "").trim().toLowerCase();
                            const existingCourseId =
                                a?.course?.id != null
                                    ? String(a.course.id)
                                    : a?.course_id != null
                                        ? String(a.course_id)
                                        : "";

                            return (
                                existingCourseId === normalizedCourseId &&
                                existingTitle === normalizedTitle
                            );
                        });

                    if (isDuplicate) {
                        setErrors((prev) => ({
                            ...prev,
                            titulo: "Ya existe una actividad con este título en el curso seleccionado.",
                        }));
                        setModalType("error");
                        setModalTitle("Actividad duplicada");
                        setModalMessage("Ya existe una actividad con este título en el curso seleccionado. Por favor, usa un título diferente.");
                        setModalOpen(true);
                        setIsSavingActivity(false);
                        return;
                    }
                } catch (e) {
                    console.warn("[ActivityForm] No se pudo verificar duplicados:", e);
                }
            }

            const createdActivity = await createActivity(payloadActivity);
            setCreatedActivityId(createdActivity.id);

            // Cambiar al paso 2 (subtareas)
            setCurrentStep(2);
            setModalType("success");
            setModalTitle("Actividad creada");
            setModalMessage(`La actividad "${payloadActivity.title}" ha sido creada exitosamente. Ahora puedes agregar las subtareas.`);
            setModalOpen(true);
        } catch (error: any) {
            console.error("[ActivityForm] Error al crear la actividad:", error);

            const errorMessage = getErrorMessage(error);

            // Actualizar errores en el formulario si hay errores específicos de campos
            if (error?.response?.data) {
                const errorData = error.response.data;
                const newErrors: typeof errors = {};

                if (errorData.deadline) {
                    const deadlineError = Array.isArray(errorData.deadline) ? errorData.deadline[0] : errorData.deadline;
                    newErrors.fechaEntrega = String(deadlineError);
                }
                if (errorData.event_datetime) {
                    const eventError = Array.isArray(errorData.event_datetime) ? errorData.event_datetime[0] : errorData.event_datetime;
                    newErrors.fechaEvento = String(eventError);
                }
                if (errorData.title) {
                    const titleError = Array.isArray(errorData.title) ? errorData.title[0] : errorData.title;
                    newErrors.titulo = String(titleError);
                }

                if (Object.keys(newErrors).length > 0) {
                    setErrors((prev) => ({ ...prev, ...newErrors }));
                }
            }

            setModalType("error");
            setModalTitle("Error al crear actividad");
            setModalMessage(errorMessage);
            setModalOpen(true);
        } finally {
            setIsSavingActivity(false);
        }
    };

    // ──────────── DETECCIÓN DE CONFLICTOS CLIENT-SIDE ────────────
    const detectConflicts = useCallback((): ConflictInfo[] => {
        const conflicts: ConflictInfo[] = [];

        // Agrupar horas planeadas por fecha
        const plannedHoursByDate: Record<string, number> = {};
        const plannedTasksByDate: Record<string, Array<{ subtaskId: number; title: string; hours: number }>> = {};

        subtareas.forEach((sub) => {
            if (sub.fechaObjetivo && sub.horas && parseFloat(sub.horas) > 0) {
                const fecha = sub.fechaObjetivo;
                if (!plannedHoursByDate[fecha]) {
                    plannedHoursByDate[fecha] = 0;
                    plannedTasksByDate[fecha] = [];
                }
                plannedHoursByDate[fecha] += parseFloat(sub.horas);
                plannedTasksByDate[fecha].push({
                    subtaskId: sub.id,
                    title: sub.nombre.trim() || "Nueva subtarea",
                    hours: parseFloat(sub.horas),
                });
            }
        });

        // Para cada fecha con subtareas planeadas, verificar si excede el límite
        Object.entries(plannedHoursByDate).forEach(([fecha, plannedHours]) => {
            const existingHours = existingHoursByDate[fecha] || 0;
            const totalHours = existingHours + plannedHours;

            if (totalHours > studyLimitHours) {
                conflicts.push({
                    date: fecha,
                    totalHours,
                    limitHours: studyLimitHours,
                    excessHours: totalHours - studyLimitHours,
                    existingTasks: getExistingTasksForDate(fecha),
                    plannedTasks: plannedTasksByDate[fecha] || [],
                });
            }
        });

        return conflicts;
    }, [subtareas, existingHoursByDate, studyLimitHours, getExistingTasksForDate]);

    // ──────────── HANDLERS DE RESOLUCIÓN DE CONFLICTOS ────────────
    const handleOpenResolution = (conflict: ConflictInfo) => {
        setActiveConflict(conflict);
        setShowResolutionModal(true);
    };

    const handleReduceCurrentHours = (subtaskId: number) => {
        // Cerrar modal y marcar la subtarea para resaltar el campo de horas
        setShowResolutionModal(false);
        setHighlightedSubtasks((prev) => ({ ...prev, [subtaskId]: "horas" }));
        // Scroll al formulario de subtareas
        setTimeout(() => {
            const el = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 200);
    };

    const handleMoveCurrentDate = (subtaskId: number) => {
        // Cerrar modal y marcar la subtarea para resaltar el campo de fecha
        setShowResolutionModal(false);
        setHighlightedSubtasks((prev) => ({ ...prev, [subtaskId]: "fecha" }));
        // Scroll al formulario de subtareas
        setTimeout(() => {
            const el = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 200);
    };

    const handleChangeExistingHours = async (
        task: ExistingTask,
        newHours: number
    ): Promise<boolean> => {
        try {
            await patchSubtask(task.activityId, task.id, { estimated_hours: newHours });
            // Invalidar cache y refrescar datos
            queryCache.invalidateByPrefix("hoy:");
            queryCache.invalidate("activities");
            refetchHoy();
            // Limpiar conflictos - se re-detectarán al intentar guardar de nuevo
            setDetectedConflicts([]);
            setConflictDates(new Set());
            return true;
        } catch {
            return false;
        }
    };

    const handleMoveExistingTask = (task: ExistingTask) => {
        setShowResolutionModal(false);
        setRescheduleTask(task);
        setShowRescheduleModal(true);
    };

    const handleRescheduleComplete = () => {
        setShowRescheduleModal(false);
        setRescheduleTask(null);
        // Refrescar datos del backend
        queryCache.invalidateByPrefix("hoy:");
        queryCache.invalidate("activities");
        refetchHoy();
        // Limpiar conflictos previos
        setDetectedConflicts([]);
        setConflictDates(new Set());
        // Mostrar mensaje de éxito
        setModalType("success");
        setModalTitle("Tarea reprogramada");
        setModalMessage("La tarea ha sido movida exitosamente. Puedes verificar si aún hay conflictos guardando las subtareas.");
        setModalOpen(true);
    };

    // Limpiar highlights cuando el usuario modifica un campo resaltado
    const handleClearHighlight = (subtaskId: number) => {
        setHighlightedSubtasks((prev) => {
            const next = { ...prev };
            delete next[subtaskId];
            return next;
        });
    };

    // ──────────── GUARDAR SUBTAREAS (con detección de conflictos) ────────────
    const handleSaveSubtasks = async () => {
        if (!createdActivityId) {
            setModalType("error");
            setModalTitle("Error");
            setModalMessage("No se encontró la actividad. Por favor, intenta crear la actividad nuevamente.");
            setModalOpen(true);
            return;
        }

        // Si no hay subtareas, ir directamente a la página de éxito
        if (subtareas.length === 0) {
            navigate("/crear/exito", {
                state: {
                    activityId: createdActivityId,
                    title: titulo,
                    courseId: curso,
                },
            });
            return;
        }

        const isValid = validateSubtasksForm();
        if (!isValid) {
            setModalType("error");
            setModalTitle("Errores en las subtareas");
            setModalMessage("Por favor, corrige los errores en las subtareas antes de continuar.");
            setModalOpen(true);
            setTimeout(() => {
                const subtaskSection = document.querySelector('[data-field="subtareas"]');
                if (subtaskSection) {
                    subtaskSection.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }, 200);
            return;
        }

        // ── PASO 1: Detectar conflictos client-side ──
        const conflicts = detectConflicts();
        if (conflicts.length > 0) {
            setDetectedConflicts(conflicts);
            setConflictDates(new Set(conflicts.map((c) => c.date)));
            // NO enviar al backend. Mostrar las alertas de conflictos.
            setModalType("warning");
            setModalTitle("Conflictos de horas detectados");
            setModalMessage(
                `Se detectaron ${conflicts.length} conflicto${conflicts.length > 1 ? "s" : ""} de horas. Resuelve los conflictos antes de guardar.`
            );
            setModalOpen(true);
            setTimeout(() => {
                const conflictSection = document.querySelector('[data-conflict-alerts]');
                if (conflictSection) {
                    conflictSection.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }, 300);
            return;
        }

        // Limpiar conflictos previos si ya no hay
        setDetectedConflicts([]);
        setConflictDates(new Set());

        // ── PASO 2: No hay conflictos, enviar al backend ──
        setIsSavingSubtasks(true);
        try {
            const results = await Promise.allSettled(
                subtareas.map((sub) =>
                    createSubtask(createdActivityId, {
                        title: sub.nombre.trim(),
                        estimated_hours: parseFloat(sub.horas),
                        target_date: sub.fechaObjetivo || null,
                        status: "PENDING",
                    })
                )
            );

            const failedResults = results.filter((result) => result.status === 'rejected');

            if (failedResults.length > 0) {
                // Backend también rechazó — posible desincronización de datos
                const newErrors: typeof errors = { ...errors };
                let generalErrorMessage = "";

                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        const error = result.reason;
                        const subtarea = subtareas[index];

                        if (error?.response?.data?.estimated_hours) {
                            const hoursError = Array.isArray(error.response.data.estimated_hours)
                                ? error.response.data.estimated_hours[0]
                                : error.response.data.estimated_hours;

                            if (!newErrors.subtareas) newErrors.subtareas = {};
                            if (!newErrors.subtareas[subtarea.id]) newErrors.subtareas[subtarea.id] = {};
                            newErrors.subtareas[subtarea.id].horas = String(hoursError);
                        } else {
                            const errorMessage = getErrorMessage(error);
                            if (!generalErrorMessage) generalErrorMessage = errorMessage;
                        }
                    }
                });

                setErrors(newErrors);

                // Refrescar datos y re-detectar conflictos
                refetchHoy();
                setTimeout(() => {
                    const freshConflicts = detectConflicts();
                    if (freshConflicts.length > 0) {
                        setDetectedConflicts(freshConflicts);
                        setConflictDates(new Set(freshConflicts.map((c) => c.date)));
                    }
                }, 1000);

                setModalType("error");
                setModalTitle("Error al guardar subtareas");
                setModalMessage(
                    generalErrorMessage ||
                    "Algunas subtareas exceden el límite de horas. Resuelve los conflictos indicados."
                );
                setModalOpen(true);

                setTimeout(() => {
                    const subtaskSection = document.querySelector('[data-field="subtareas"]');
                    if (subtaskSection) subtaskSection.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 200);

                setIsSavingSubtasks(false);
                return;
            }

            // Todas las subtareas se crearon exitosamente
            setModalType("success");
            setModalTitle("Subtareas guardadas");
            setModalMessage(`Se han guardado ${subtareas.length} subtarea${subtareas.length > 1 ? 's' : ''} exitosamente.`);
            setModalOpen(true);

            setTimeout(() => {
                navigate("/crear/exito", {
                    state: {
                        activityId: createdActivityId,
                        title: titulo,
                        courseId: curso,
                    },
                });
            }, 1500);
        } catch (error: any) {
            console.error("[ActivityForm] Error inesperado al crear las subtareas:", error);
            const errorMessage = getErrorMessage(error);
            setModalType("error");
            setModalTitle("Error al guardar subtareas");
            setModalMessage(errorMessage);
            setModalOpen(true);
        } finally {
            setIsSavingSubtasks(false);
        }
    };

    const addSubtarea = () => {
        setSubtareas([
            ...subtareas,
            { id: Date.now(), nombre: "", fechaObjetivo: "", horas: "" },
        ]);
    };

    const removeSubtarea = (id: number) => {
        setSubtareas(subtareas.filter((s) => s.id !== id));
    };

    const updateSubtarea = (id: number, field: keyof Subtarea, value: string) => {
        setSubtareas(subtareas.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    };

    const inputClass =
        "w-full rounded-xl !bg-[#1F2937]/50 border border-slate-700/50 px-4 py-2.5 h-12 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";

    return (
        <>
            <MessageModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                type={modalType}
                title={modalTitle}
                message={modalMessage}
            />
            <ConflictResolutionModal
                open={showResolutionModal}
                onClose={() => setShowResolutionModal(false)}
                conflict={activeConflict}
                onReduceCurrentHours={handleReduceCurrentHours}
                onMoveCurrentDate={handleMoveCurrentDate}
                onChangeExistingHours={handleChangeExistingHours}
                onMoveExistingTask={handleMoveExistingTask}
            />
            <RescheduleModal
                open={showRescheduleModal}
                onClose={() => {
                    setShowRescheduleModal(false);
                    setRescheduleTask(null);
                }}
                task={rescheduleTask}
                onRescheduleComplete={handleRescheduleComplete}
            />
            {(isSavingActivity || isSavingSubtasks) && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="relative flex flex-col items-center gap-4">
                        <div className="relative h-16 w-16">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#3B82F6] via-[#22C55E] to-[#EAB308] opacity-80 animate-spin" />
                            <div className="absolute inset-[6px] rounded-full bg-[#020617]" />
                            <div className="absolute inset-[10px] rounded-full border-2 border-dashed border-[#3B82F6]/70 animate-spin-slow" />
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <p className="text-sm font-medium text-foreground">
                                {currentStep === 1 ? "Guardando tu actividad..." : "Guardando las subtareas..."}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {currentStep === 1
                                    ? "Estamos creando la actividad. Esto puede tardar unos segundos."
                                    : "Estamos guardando las subtareas. Esto puede tardar unos segundos."}
                            </p>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex-1 min-h-screen overflow-y-auto">
                <div className="max-w-[880px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10">

                    {/* Header */}
                    <h1 className="text-2xl lg:text-3xl font-extrabold text-white mb-2">
                        {currentStep === 1 ? "Crear nueva actividad" : "Agregar subtareas"}
                    </h1>
                    <p className="text-slate-400 font-medium text-sm mt-1 mb-8">
                        {currentStep === 1
                            ? "Añade un nuevo examen, tarea, o proyecto a tu plan de estudio."
                            : "Divide tu actividad en subtareas más manejables para organizarte mejor."}
                    </p>

                    {/* Indicador de pasos */}
                    <div className="flex items-center gap-2 mb-8">
                        <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-500' : 'text-slate-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-[#1F2937]/50 border border-slate-700/50'}`}>
                                {currentStep > 1 ? '✓' : '1'}
                            </div>
                            <span className="text-sm font-bold">Actividad</span>
                        </div>
                        <div className={`h-0.5 flex-1 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-slate-800/60'}`} />
                        <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-500' : 'text-slate-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-[#1F2937]/50 border border-slate-700/50'}`}>
                                2
                            </div>
                            <span className="text-sm font-bold">Subtareas</span>
                        </div>
                    </div>

                    {/* Paso 1: Detalles de la actividad */}
                    {currentStep === 1 && (
                        <>
                            <div className="rounded-3xl border border-slate-800/60 bg-[#111827] p-6 lg:p-8 mb-6 shadow-xl shadow-black/20">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-9 w-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                                        <ClipboardList className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white flex items-center">
                                            Detalles de la actividad
                                            <InfoTooltip text="Información general sobre la tarea o evento." />
                                        </h2>
                                        <p className="text-xs text-slate-400 font-medium">
                                            Información general sobre la tarea o evento.
                                        </p>
                                    </div>
                                </div>

                                {/* Título */}
                                <div className="mb-6" data-field="titulo">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                        <span className="text-white">Título:</span> <span className="text-slate-400 normal-case">¿Qué tienes que hacer?</span> <span className="text-blue-500">*</span>
                                        <InfoTooltip text="Escribe un título descriptivo para identificar la actividad rápidamente." />
                                    </label>
                                    <input
                                        type="text"
                                        value={titulo}
                                        onChange={(e) => {
                                            setTitulo(e.target.value);
                                            clearFieldError("titulo");
                                        }}
                                        placeholder="e.j. Examen final de cálculo"
                                        className={`${inputClass} ${errors.titulo ? 'border-red-500 focus:ring-red-500' : ''}`}
                                    />
                                        {errors.titulo && (
                                            <div className="mt-2 flex items-start gap-2">
                                                <div className="flex-shrink-0 mt-0.5">
                                                    <svg
                                                        className="h-4 w-4 text-red-500"
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </div>
                                                <p className="text-sm text-red-500 font-medium flex-1">{errors.titulo}</p>
                                            </div>
                                        )}
                                </div>

                                {/* Curso + Tipo */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div data-field="curso">
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                            <span className="text-white">Curso:</span> <span className="text-slate-400 normal-case">¿A qué curso pertenece?</span> <span className="text-blue-500">*</span>
                                            <InfoTooltip text="Selecciona el curso al que pertenece esta actividad." />
                                        </label>
                                        <Select
                                            value={curso || ""}
                                            onValueChange={(value) => {
                                                if (value === "create-new") {
                                                    setIsDialogOpen(true);
                                                } else {
                                                    setCurso(value);
                                                    clearFieldError("curso");
                                                }
                                            }}
                                            disabled={loadingCourses}
                                        >
                                            <SelectTrigger 
                                                className={`w-full rounded-xl !bg-[#1F2937]/50 border border-slate-700/50 h-12 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.curso ? 'border-red-500 focus:ring-red-500' : ''} ${loadingCourses ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <SelectValue placeholder="Selecciona un curso" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1F2937] border-slate-700 text-slate-200 rounded-xl shadow-xl">
                                                {courses.map((course) => (
                                                    <SelectItem key={course.id} value={course.id.toString()} className="focus:bg-blue-600 focus:text-white rounded-lg cursor-pointer">
                                                        {course.name}
                                                    </SelectItem>
                                                ))}
                                                <SelectItem value="create-new" className="focus:bg-blue-600 focus:text-white rounded-lg cursor-pointer text-blue-500 font-medium">
                                                    ➕ Crear nuevo curso
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.curso && (
                                            <div className="mt-2 flex items-start gap-2">
                                                <div className="flex-shrink-0 mt-0.5">
                                                    <svg
                                                        className="h-4 w-4 text-red-500"
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </div>
                                                <p className="text-sm text-red-500 font-medium flex-1">{errors.curso}</p>
                                            </div>
                                        )}
                                        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                                            <DialogContent className="sm:max-w-[550px] bg-[#111827] border-slate-800/60 rounded-3xl">
                                                <DialogHeader>
                                                    <DialogTitle className="text-white text-xl font-extrabold">Crear nuevo curso</DialogTitle>
                                                    <DialogDescription className="text-slate-400 font-medium">
                                                        Si el curso de tu actividad no está en la lista, puedes registrarlo aquí para poder seleccionarlo ahora y en futuras actividades.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                                            <span className="text-white">Nombre del curso:</span> <span className="text-slate-400 normal-case">¿Qué curso quieres registrar?</span> <span className="text-blue-500">*</span>
                                                            <InfoTooltip text="Escribe el nombre completo del curso que deseas agregar a tu lista. Solo debes crearlo una vez y después estará disponible para seleccionarlo cuando lo necesites." />
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={newCourseName}
                                                            onChange={handleCourseNameChange}
                                                            placeholder="e.j. Cálculo Diferencial"
                                                            className={`${inputClass} ${courseError ? 'border-red-500 focus:ring-red-500' : ''}`}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !creatingCourse && newCourseName.trim()) {
                                                                    handleCreateCourse();
                                                                }
                                                            }}
                                                            autoFocus
                                                        />
                                                        {courseError && (
                                                            <div className="mt-2 flex items-start gap-2">
                                                                <div className="flex-shrink-0 mt-0.5">
                                                                    <svg
                                                                        className="h-4 w-4 text-red-500"
                                                                        fill="currentColor"
                                                                        viewBox="0 0 20 20"
                                                                    >
                                                                        <path
                                                                            fillRule="evenodd"
                                                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                                            clipRule="evenodd"
                                                                        />
                                                                    </svg>
                                                                </div>
                                                                <p className="text-sm text-red-500 font-medium flex-1">{courseError}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setIsDialogOpen(false);
                                                            setNewCourseName("");
                                                            setCourseError("");
                                                        }}
                                                        className="bg-[#1F2937]/50 border-slate-700/50 text-slate-400 hover:bg-slate-800/50 hover:text-slate-300 cursor-pointer rounded-xl font-bold"
                                                    >
                                                        Cancelar
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        onClick={handleCreateCourse}
                                                        disabled={!newCourseName.trim() || creatingCourse}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20"
                                                    >
                                                        {creatingCourse ? "Creando..." : "Crear curso"}
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>

                                    <div data-field="tipo">
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                            <span className="text-white">Tipo:</span> <span className="text-slate-400 normal-case">¿Qué tipo de actividad es?</span> <span className="text-blue-500">*</span>
                                            <InfoTooltip text="Selecciona si es un examen, tarea o proyecto." />
                                        </label>
                                        <div className="flex items-center flex-wrap gap-x-5 gap-y-3 mt-3">
                                            {activityTypes.map((t) => (
                                                <label
                                                    key={t.value}
                                                    className="flex items-center gap-2 cursor-pointer"
                                                    onClick={() => {
                                                        setTipo(t.value);
                                                        clearFieldError("tipo");
                                                    }}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="tipo"
                                                        value={t.value}
                                                        checked={tipo === t.value}
                                                        onChange={(e) => {
                                                            setTipo(e.target.value);
                                                            clearFieldError("tipo");
                                                        }}
                                                        className="sr-only"
                                                    />
                                                    <div
                                                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${tipo === t.value
                                                            ? "border-blue-600 bg-blue-600"
                                                            : errors.tipo
                                                                ? "border-red-500"
                                                                : "border-slate-600"
                                                            }`}
                                                    >
                                                        {tipo === t.value && (
                                                            <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                                        )}
                                                    </div>
                                                    <span className="text-sm text-slate-200 font-medium">{t.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {errors.tipo && (
                                            <div className="mt-2 flex items-start gap-2">
                                                <div className="flex-shrink-0 mt-0.5">
                                                    <svg
                                                        className="h-4 w-4 text-red-500"
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </div>
                                                <p className="text-sm text-red-500 font-medium flex-1">{errors.tipo}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Fechas */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="flex flex-col justify-between" data-field="fechaEntrega">
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                            <span className="text-white">Fecha de entrega o del evento:</span> <span className="text-slate-400 normal-case">¿Cuándo debes entregar o presentar?</span> <span className="text-blue-500">*</span>
                                            <InfoTooltip text="Indica la fecha máxima o límite de entrega de esta actividad." />
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 pointer-events-none z-10" />
                                            <input
                                                type="date"
                                                value={fechaEntrega}
                                                min={getTodayDate()}
                                                onChange={(e) => {
                                                    setFechaEntrega(e.target.value);
                                                    clearFieldError("fechaEntrega");
                                                }}
                                                placeholder="mm/dd/yyyy"
                                                className={`w-full rounded-xl !bg-[#1F2937]/50 border border-slate-700/50 h-12 text-sm text-slate-200 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${errors.fechaEntrega ? 'border-red-500 focus:ring-red-500' : ''}`}
                                            />
                                        </div>
                                        {errors.fechaEntrega && (
                                            <div className="mt-2 flex items-start gap-2">
                                                <div className="flex-shrink-0 mt-0.5">
                                                    <svg
                                                        className="h-4 w-4 text-red-500"
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </div>
                                                <p className="text-sm text-red-500 font-medium flex-1">{errors.fechaEntrega}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div data-field="fechaEvento">
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                            <span className="text-white">Fecha adicional:</span> <span className="text-slate-400 normal-case">Si hay otra fecha importante (ej: sustentación)</span>
                                            <InfoTooltip text="Úsala cuando exista una fecha concreta en la que sucede el evento, por ejemplo un examen o presentación." />
                                        </label>
                                        <div className="text-slate-400 text-xs mb-1 font-medium">(Opcional)</div>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 pointer-events-none z-10" />
                                            <input
                                                type="date"
                                                value={fechaEvento}
                                                min={getTodayDate()}
                                                onChange={(e) => {
                                                    setFechaEvento(e.target.value);
                                                    setErrors((prev) => ({ ...prev, fechaEvento: undefined }));
                                                }}
                                                placeholder="mm/dd/yyyy"
                                                className={`w-full rounded-xl !bg-[#1F2937]/50 border border-slate-700/50 h-12 text-sm text-slate-200 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${errors.fechaEvento ? 'border-red-500 focus:ring-red-500' : ''}`}
                                            />
                                        </div>
                                        {errors.fechaEvento && (
                                            <div className="mt-2 flex items-start gap-2">
                                                <div className="flex-shrink-0 mt-0.5">
                                                    <svg
                                                        className="h-4 w-4 text-red-500"
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </div>
                                                <p className="text-sm text-red-500 font-medium flex-1">{errors.fechaEvento}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Descripción */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                        <span className="text-white">Descripción</span> <span className="text-slate-400 text-xs normal-case">(Opcional)</span>
                                        <InfoTooltip text="Añade notas o detalles específicos sobre esta actividad." />
                                    </label>
                                    <textarea
                                        value={descripcion}
                                        onChange={(e) => setDescripcion(e.target.value)}
                                        placeholder="Añade detalles específicos o notas sobre esta actividad..."
                                        rows={12}
                                        className={`${inputClass} resize-none min-h-[100px]`}
                                    />
                                </div>
                            </div>

                        </>
                    )}

                    {/* Paso 2: Plan de estudio / Subtareas */}
                    {currentStep === 2 && (
                        <>
                            {/* ── Alertas de conflictos detectados ── */}
                            {detectedConflicts.length > 0 && (
                                <div data-conflict-alerts className="mb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-2 mb-1">
                                        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <h3 className="text-sm font-bold text-amber-400">
                                            {detectedConflicts.length} conflicto{detectedConflicts.length > 1 ? "s" : ""} de horas detectado{detectedConflicts.length > 1 ? "s" : ""}
                                        </h3>
                                    </div>

                                    {detectedConflicts.map((conflict) => {
                                        const dateLabel = (() => {
                                            try {
                                                return format(parseISO(conflict.date), "EEEE d 'de' MMM", { locale: es });
                                            } catch {
                                                return conflict.date;
                                            }
                                        })();
                                        return (
                                            <div
                                                key={conflict.date}
                                                className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                                                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-white capitalize truncate">
                                                            {dateLabel}
                                                        </p>
                                                        <p className="text-xs text-slate-400">
                                                            <span className="text-red-400 font-bold">
                                                                {conflict.totalHours.toFixed(1)}h
                                                            </span>
                                                            {" "}de{" "}
                                                            <span className="text-white font-bold">
                                                                {conflict.limitHours.toFixed(1)}h
                                                            </span>
                                                            {" "}límite · Exceso:{" "}
                                                            <span className="text-red-400 font-bold">
                                                                +{conflict.excessHours.toFixed(1)}h
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenResolution(conflict)}
                                                    className="shrink-0 ml-3 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
                                                >
                                                    Resolver conflicto
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div data-field="subtareas">
                                <SubtaskForm
                                    subtareas={subtareas}
                                    onAdd={addSubtarea}
                                    onRemove={removeSubtarea}
                                    onUpdate={(id, field, value) => {
                                        updateSubtarea(id, field, value);
                                        // Si el usuario modifica un campo resaltado, quitar highlight
                                        if (highlightedSubtasks[id]) {
                                            const hlField = highlightedSubtasks[id];
                                            if (
                                                (hlField === "horas" && field === "horas") ||
                                                (hlField === "fecha" && field === "fechaObjetivo")
                                            ) {
                                                handleClearHighlight(id);
                                            }
                                        }
                                        // Si cambian horas o fecha, limpiar conflictos para que se re-detecten
                                        if (field === "horas" || field === "fechaObjetivo") {
                                            if (detectedConflicts.length > 0) {
                                                setDetectedConflicts([]);
                                                setConflictDates(new Set());
                                            }
                                        }
                                    }}
                                    errors={errors.subtareas}
                                    fechaEntrega={fechaEntrega}
                                    onClearError={(subtaskId, field) => {
                                        if (errors.subtareas?.[subtaskId]?.[field as keyof typeof errors.subtareas[number]]) {
                                            setErrors((prev) => {
                                                const newErrors = { ...prev };
                                                if (newErrors.subtareas?.[subtaskId]) {
                                                    const subErrors = { ...newErrors.subtareas[subtaskId] };
                                                    delete subErrors[field as keyof typeof subErrors];
                                                    if (Object.keys(subErrors).length === 0) {
                                                        const newSubtaskErrors = { ...newErrors.subtareas };
                                                        delete newSubtaskErrors[subtaskId];
                                                        newErrors.subtareas = Object.keys(newSubtaskErrors).length > 0 ? newSubtaskErrors : undefined;
                                                    } else {
                                                        newErrors.subtareas = { ...newErrors.subtareas, [subtaskId]: subErrors };
                                                    }
                                                }
                                                return newErrors;
                                            });
                                        }
                                    }}
                                    highlightedSubtasks={highlightedSubtasks}
                                    conflictDates={conflictDates}
                                />
                            </div>
                        </>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pb-8 mt-6">
                        <button
                            type="button"
                            onClick={() => {
                                if (currentStep === 2) {
                                    setCurrentStep(1);
                                } else {
                                    navigate("/hoy");
                                }
                            }}
                            className="px-6 py-2.5 rounded-xl bg-[#1F2937]/50 border border-slate-700/50 text-slate-400 text-sm font-bold hover:bg-slate-800/50 hover:text-slate-300 transition-colors"
                        >
                            {currentStep === 2 ? "Volver" : "Cancelar"}
                        </button>
                        {currentStep === 1 ? (
                            <button
                                type="button"
                                onClick={handleSaveActivity}
                                disabled={isSavingActivity}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer shadow-lg shadow-blue-600/20 ${isSavingActivity
                                    ? "bg-blue-600/70 text-white cursor-not-allowed"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                    }`}
                            >
                                {isSavingActivity ? (
                                    <>
                                        <span className="relative flex h-4 w-4">
                                            <span className="absolute inline-flex h-full w-full rounded-full bg-white/30 opacity-75 animate-ping" />
                                            <span className="relative inline-flex h-4 w-4 rounded-full bg-white" />
                                        </span>
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Guardar actividad
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSaveSubtasks}
                                disabled={isSavingSubtasks}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer shadow-lg shadow-blue-600/20 ${isSavingSubtasks
                                    ? "bg-blue-600/70 text-white cursor-not-allowed"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                    }`}
                            >
                                {isSavingSubtasks ? (
                                    <>
                                        <span className="relative flex h-4 w-4">
                                            <span className="absolute inline-flex h-full w-full rounded-full bg-white/30 opacity-75 animate-ping" />
                                            <span className="relative inline-flex h-4 w-4 rounded-full bg-white" />
                                        </span>
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Guardar subtareas
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ActivityForm;
