import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, ChevronDown, ClipboardList, Save } from "lucide-react";
import InfoTooltip from "@/features/create/components/InfoTooltip";
import SubtaskForm, { Subtarea } from "@/features/create/components/SubtaskForm";
import { getCourses, createCourse } from "@/api/services/course";
import { createActivity, getActivities } from "@/api/services/activity";
import { createSubtask } from "@/api/services/subtack";
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

      // Validación de duplicados
      if (payloadActivity.course_id && payloadActivity.title) {
        try {
          const existing = await getActivities();
          const normalizedTitle = payloadActivity.title.trim().toLowerCase();
          const normalizedCourseId = String(payloadActivity.course_id);

          const isDuplicate =
            Array.isArray(existing) &&
            existing.some((a: any) => {
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

  // Función para manejar el guardado de las subtareas (Paso 2)
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

    setIsSavingSubtasks(true);
    try {
      await Promise.all(
        subtareas.map((sub) =>
          createSubtask(createdActivityId, {
            title: sub.nombre.trim(),
            estimated_hours: parseFloat(sub.horas),
            target_date: sub.fechaObjetivo || null,
            status: "PENDING",
          })
        )
      );

      setModalType("success");
      setModalTitle("Subtareas guardadas");
      setModalMessage(`Se han guardado ${subtareas.length} subtarea${subtareas.length > 1 ? 's' : ''} exitosamente.`);
      setModalOpen(true);
      
      // Navegar a la página de éxito después de cerrar el modal
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
      console.error("[ActivityForm] Error al crear las subtareas:", error);
      
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
    "w-full rounded-lg bg-[#111827] border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

  return (
    <>
      <MessageModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
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
      <div className="flex-1 min-h-screen overflow-y-auto bg-[#111827]">
        <div className="max-w-[880px] mx-auto px-8 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <span>Dashboard</span>
          <span>›</span>
          <span>Actividades</span>
          <span>›</span>
          <span className="text-foreground font-medium">Nueva actividad</span>
        </div>

        {/* Header */}
        <h1 className="text-2xl font-bold text-foreground">
          {currentStep === 1 ? "Crear nueva actividad" : "Agregar subtareas"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1 mb-6">
          {currentStep === 1 
            ? "Añade un nuevo examen, tarea, o proyecto a tu plan de estudio."
            : "Divide tu actividad en subtareas más manejables para organizarte mejor."}
        </p>

        {/* Indicador de pasos */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-[#3B82F6]' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-[#3B82F6] text-white' : 'bg-[#1E293B] border border-border'}`}>
              {currentStep > 1 ? '✓' : '1'}
            </div>
            <span className="text-sm font-medium">Actividad</span>
          </div>
          <div className={`h-0.5 flex-1 ${currentStep >= 2 ? 'bg-[#3B82F6]' : 'bg-[#1E293B]'}`} />
          <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-[#3B82F6]' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-[#3B82F6] text-white' : 'bg-[#1E293B] border border-border'}`}>
              2
            </div>
            <span className="text-sm font-medium">Subtareas</span>
          </div>
        </div>

        {/* Paso 1: Detalles de la actividad */}
        {currentStep === 1 && (
        <>
        <div className="rounded-xl border border-border bg-[#1E293B] p-6 mb-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-[#3B82F6]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center">
                Detalles de la actividad
                <InfoTooltip text="Información general sobre la tarea o evento." />
              </h2>
              <p className="text-xs text-muted-foreground">
                Información general sobre la tarea o evento.
              </p>
            </div>
          </div>

          {/* Título */}
          <div className="mb-5" data-field="titulo">
            <label className="block text-sm font-medium mb-1.5">
              <span className="text-white">Título:</span> <span className="text-[#9CA3AF]">¿Qué tienes que hacer?</span> <span className="text-primary">*</span>
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
              className={`${inputClass} ${errors.titulo ? 'border-[#EF4444] focus:ring-[#EF4444]' : ''}`}
            />
            {errors.titulo && (
              <div className="mt-2 flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  <svg
                    className="h-4 w-4 text-[#EF4444]"
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
                <p className="text-sm text-[#EF4444] flex-1">{errors.titulo}</p>
              </div>
            )}
          </div>

          {/* Curso + Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div data-field="curso">
              <label className="block text-sm font-medium mb-1.5">
                <span className="text-white">Curso:</span> <span className="text-[#9CA3AF]">¿A qué curso pertenece?</span> <span className="text-primary">*</span>
                <InfoTooltip text="Selecciona el curso al que pertenece esta actividad." />
              </label>
              <div className="relative">
                <select
                  value={curso}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "create-new") {
                      setIsDialogOpen(true);
                      // Resetear el select a su valor anterior
                      setTimeout(() => {
                        e.target.value = curso || "";
                      }, 0);
                    } else {
                      setCurso(value);
                      clearFieldError("curso");
                    }
                  }}
                  disabled={loadingCourses}
                  className={`${inputClass} appearance-none pr-10 ${loadingCourses ? 'opacity-50 cursor-not-allowed' : ''} ${!curso ? 'text-muted-foreground' : ''} ${errors.curso ? 'border-[#EF4444] focus:ring-[#EF4444]' : ''}`}
                >
                  {!curso && (
                    <option value="" disabled hidden>
                      Selecciona un curso
                    </option>
                  )}
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                  <option value="create-new" className="text-[#3B82F6] font-medium">
                    ➕ Crear nuevo curso
                  </option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              {errors.curso && (
                <div className="mt-2 flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg
                      className="h-4 w-4 text-[#EF4444]"
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
                  <p className="text-sm text-[#EF4444] flex-1">{errors.curso}</p>
                </div>
              )}
              <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogContent className="sm:max-w-[550px] bg-[#1E293B] border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground text-xl">Crear nuevo curso</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Si el curso de tu actividad no está en la lista, puedes registrarlo aquí para poder seleccionarlo ahora y en futuras actividades.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-foreground">
                        <span className="text-white">Nombre del curso:</span> <span className="text-[#9CA3AF]">¿Qué curso quieres registrar?</span> <span className="text-primary">*</span>
                        <InfoTooltip text="Escribe el nombre completo del curso que deseas agregar a tu lista. Solo debes crearlo una vez y después estará disponible para seleccionarlo cuando lo necesites." />
                      </label>
                      <input
                        type="text"
                        value={newCourseName}
                        onChange={handleCourseNameChange}
                        placeholder="e.j. Cálculo Diferencial"
                        className={`${inputClass} ${courseError ? 'border-[#EF4444] focus:ring-[#EF4444]' : ''}`}
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
                              className="h-4 w-4 text-[#EF4444]"
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
                          <p className="text-sm text-[#EF4444] flex-1">{courseError}</p>
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
                      className="bg-[#111827] border-border text-foreground hover:bg-[#111827]/80 cursor-pointer"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCreateCourse}
                      disabled={!newCourseName.trim() || creatingCourse}
                      className="bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white"
                    >
                      {creatingCourse ? "Creando..." : "Crear curso"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div data-field="tipo">
              <label className="block text-sm font-medium mb-1.5">
                <span className="text-white">Tipo:</span> <span className="text-[#9CA3AF]">¿Qué tipo de actividad es?</span> <span className="text-primary">*</span>
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
                      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                        tipo === t.value
                          ? "border-[#3B82F6] bg-[#3B82F6]"
                          : errors.tipo
                          ? "border-[#EF4444]"
                          : "border-muted-foreground"
                      }`}
                    >
                      {tipo === t.value && (
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm text-foreground">{t.label}</span>
                  </label>
                ))}
              </div>
              {errors.tipo && (
                <div className="mt-2 flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg
                      className="h-4 w-4 text-[#EF4444]"
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
                  <p className="text-sm text-[#EF4444] flex-1">{errors.tipo}</p>
                </div>
              )}
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div className="flex flex-col justify-between" data-field="fechaEntrega">
              <label className="block text-sm font-medium mb-1">
                <span className="text-white">Fecha de entrega o del evento:</span> <span className="text-[#9CA3AF]">¿Cuándo debes entregar o presentar?</span> <span className="text-primary">*</span>
                <InfoTooltip text="Indica la fecha máxima o límite de entrega de esta actividad." />
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground pointer-events-none z-10" />
                <input
                  type="date"
                  value={fechaEntrega}
                  min={getTodayDate()}
                  onChange={(e) => {
                    setFechaEntrega(e.target.value);
                    clearFieldError("fechaEntrega");
                  }}
                  placeholder="mm/dd/yyyy"
                  className={`${inputClass} pl-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${errors.fechaEntrega ? 'border-[#EF4444] focus:ring-[#EF4444]' : ''}`}
                />
              </div>
              {errors.fechaEntrega && (
                <div className="mt-2 flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg
                      className="h-4 w-4 text-[#EF4444]"
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
                  <p className="text-sm text-[#EF4444] flex-1">{errors.fechaEntrega}</p>
                </div>
              )}
            </div>

            <div data-field="fechaEvento">
              <label className="block text-sm font-medium mb-1.5">
                <span className="text-white">Fecha adicional:</span> <span className="text-[#9CA3AF]">Si hay otra fecha importante (ej: sustentación)</span>
                <InfoTooltip text="Úsala cuando exista una fecha concreta en la que sucede el evento, por ejemplo un examen o presentación." />
              </label>
              <div className="text-[#9CA3AF] text-xs mb-1">(Opcional)</div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground pointer-events-none z-10" />
                <input
                  type="date"
                  value={fechaEvento}
                  min={getTodayDate()}
                  onChange={(e) => {
                    setFechaEvento(e.target.value);
                    setErrors((prev) => ({ ...prev, fechaEvento: undefined }));
                  }}
                  placeholder="mm/dd/yyyy"
                  className={`${inputClass} pl-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${errors.fechaEvento ? 'border-[#EF4444] focus:ring-[#EF4444]' : ''}`}
                />
              </div>
              {errors.fechaEvento && (
                <div className="mt-2 flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg
                      className="h-4 w-4 text-[#EF4444]"
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
                  <p className="text-sm text-[#EF4444] flex-1">{errors.fechaEvento}</p>
                </div>
              )}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              <span className="text-white">Descripción</span> <span className="text-[#9CA3AF] text-xs">(Opcional)</span>
              <InfoTooltip text="Añade notas o detalles específicos sobre esta actividad." />
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Añade detalles específicos o notas sobre esta actividad..."
              rows={4}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        </>
        )}

        {/* Paso 2: Plan de estudio / Subtareas */}
        {currentStep === 2 && (
        <>
        <div data-field="subtareas">
        <SubtaskForm
          subtareas={subtareas}
          onAdd={addSubtarea}
          onRemove={removeSubtarea}
          onUpdate={updateSubtarea}
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
        />
        </div>
        </>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={() => {
              if (currentStep === 2) {
                setCurrentStep(1);
              } else {
                navigate("/hoy");
              }
            }}
            className="px-6 py-2.5 rounded-lg bg-[#1E293B] border border-border text-muted-foreground text-sm font-medium hover:bg-[#1E293B]/80 transition-colors"
          >
            {currentStep === 2 ? "Volver" : "Cancelar"}
          </button>
          {currentStep === 1 ? (
            <button
              type="button"
              onClick={handleSaveActivity}
              disabled={isSavingActivity}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isSavingActivity
                  ? "bg-[#3B82F6]/70 text-white cursor-not-allowed"
                  : "bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90"
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
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isSavingSubtasks
                  ? "bg-[#3B82F6]/70 text-white cursor-not-allowed"
                  : "bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90"
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
