import { useState, useEffect } from "react";
import { Calendar, ChevronDown, ClipboardList, Save } from "lucide-react";
import InfoTooltip from "@/features/create/components/InfoTooltip";
import SubtaskForm, { Subtarea } from "@/features/create/components/SubtaskForm";
import { getCourses, createCourse } from "@/api/services/course";
import { updateActivity } from "@/api/services/activity";
import { getSubtasksForActivity, createSubtask, updateSubtask, deleteSubtask } from "@/api/services/subtack";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/dialog";
import { Button } from "@/shared/components/button";
import { useToast } from "@/shared/components/toast";

interface Course {
  id: string;
  name: string;
}

interface EditActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityId?: string;
  activityData?: {
    title?: string;
    typeLabel?: string;
    dueDate?: string;
    description?: string;
    courseId?: string;
    courseName?: string;
    eventDate?: string;
    subtasks?: Array<{
      id: number;
      nombre: string;
      fechaObjetivo: string;
      horas: string;
    }>;
  };
  onActivityUpdated?: () => void;
}

const activityTypes = [
  { label: "Examen", value: "examen" },
  { label: "Quiz", value: "quiz" },
  { label: "Taller", value: "taller" },
  { label: "Proyecto", value: "proyecto" },
  { label: "Otro", value: "otro" },
];

export default function EditActivityDialog({
  open,
  onOpenChange,
  activityId,
  activityData = {},
  onActivityUpdated,
}: EditActivityDialogProps) {
  const [titulo, setTitulo] = useState("");
  const [curso, setCurso] = useState("");
  const [tipo, setTipo] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [fechaEvento, setFechaEvento] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [subtareas, setSubtareas] = useState<Subtarea[]>([]);
  const [originalSubtasks, setOriginalSubtasks] = useState<Array<{ id: string | number; title: string; target_date?: string; estimated_hours?: number }>>([]);

  // Estados para cursos
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [courseError, setCourseError] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Estados de errores de validación
  const [errors, setErrors] = useState<{
    titulo?: string;
    curso?: string;
    tipo?: string;
    fechaEntrega?: string;
    fechaEvento?: string;
    subtareas?: { [key: number]: { nombre?: string; fechaObjetivo?: string; horas?: string } };
  }>({});

  const { showToast, ToastComponent } = useToast();

  const getTodayDate = (): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().split('T')[0];
  };

  // Mapear typeLabel a tipo
  const mapTypeLabelToType = (label: string): string => {
    if (label.toLowerCase().includes("examen")) return "examen";
    if (label.toLowerCase().includes("taller")) return "taller";
    if (label.toLowerCase().includes("proyecto")) return "proyecto";
    return "examen"; // default
  };

  // Parsear fecha desde formato "Entrega 15 nov" a YYYY-MM-DD
  const parseDate = (dateStr: string): string => {
    if (!dateStr || dateStr === "Sin fecha") return "";
    
    // Si ya viene en formato YYYY-MM-DD, retornarlo directamente
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Intentar parsear formato "Entrega DD MMM"
    const months: { [key: string]: string } = {
      ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06",
      jul: "07", ago: "08", sep: "09", oct: "10", nov: "11", dic: "12"
    };
    
    const match = dateStr.match(/(\d{1,2})\s+(\w{3})/i);
    if (match) {
      const day = match[1].padStart(2, "0");
      const month = months[match[2].toLowerCase()];
      if (month) {
        const currentYear = new Date().getFullYear();
        return `${currentYear}-${month}-${day}`;
      }
    }
    
    return getTodayDate();
  };

  // Cargar datos iniciales cuando se abre el modal
  useEffect(() => {
    if (open && activityData) {
      setTitulo(activityData.title || "");
      setCurso(activityData.courseId || "");
      setTipo(activityData.typeLabel ? mapTypeLabelToType(activityData.typeLabel) : "");
      setFechaEntrega(activityData.dueDate ? parseDate(activityData.dueDate) : "");
      setFechaEvento(activityData.eventDate || "");
      setDescripcion(activityData.description || "");
      
      // Limpiar errores al abrir
      setErrors({});
      
      // Función async para cargar subtareas originales y formatear
      const loadSubtasks = async () => {
        if (activityId) {
          try {
            const backendSubtasks = await getSubtasksForActivity(activityId);
            const formattedBackendSubtasks = Array.isArray(backendSubtasks) 
              ? backendSubtasks.map((s: any) => ({
                  id: s.id,
                  title: s.title || "",
                  target_date: s.target_date || "",
                  estimated_hours: s.estimated_hours || 0,
                }))
              : [];
            setOriginalSubtasks(formattedBackendSubtasks);

            // Usar directamente las subtareas del backend en lugar de activityData
            // Esto asegura que siempre tengamos los IDs correctos del backend
            if (formattedBackendSubtasks.length > 0) {
              const formattedSubtasks = formattedBackendSubtasks.map((bs: any) => {
                let horasValue = "";
                if (bs.estimated_hours) {
                  horasValue = String(bs.estimated_hours);
                }
                
                return {
                  id: bs.id, // Siempre usar el ID del backend
                  nombre: bs.title || "",
                  fechaObjetivo: bs.target_date || "",
                  horas: horasValue,
                };
              });
              setSubtareas(formattedSubtasks);
            } else if (activityData.subtasks && activityData.subtasks.length > 0) {
              // Fallback: si no hay subtareas del backend, usar activityData
              const formattedSubtasks = activityData.subtasks.map((subtask, index) => {
                let horasValue = "";
                if (subtask.horas) {
                  const cleanHours = subtask.horas.replace(/h/gi, "").trim();
                  horasValue = cleanHours && !isNaN(parseFloat(cleanHours)) ? cleanHours : "";
                }
                
                return {
                  id: typeof subtask.id === 'number' && subtask.id < 1000000000000
                    ? subtask.id 
                    : Date.now() + index,
                  nombre: subtask.nombre || "",
                  fechaObjetivo: subtask.fechaObjetivo || "",
                  horas: horasValue,
                };
              });
              setSubtareas(formattedSubtasks);
            } else {
              setSubtareas([]);
            }
          } catch (error) {
            console.error("Error al cargar subtareas originales:", error);
            setOriginalSubtasks([]);
            
            // Si falla, usar los datos de activityData directamente
            if (activityData.subtasks && activityData.subtasks.length > 0) {
              const formattedSubtasks = activityData.subtasks.map((subtask, index) => {
                let horasValue = "";
                if (subtask.horas) {
                  const cleanHours = subtask.horas.replace(/h/gi, "").trim();
                  horasValue = cleanHours && !isNaN(parseFloat(cleanHours)) ? cleanHours : "";
                }
                
                return {
                  id: typeof subtask.id === 'number' ? subtask.id : (parseInt(String(subtask.id)) || Date.now() + index),
                  nombre: subtask.nombre || "",
                  fechaObjetivo: subtask.fechaObjetivo || "",
                  horas: horasValue,
                };
              });
              setSubtareas(formattedSubtasks);
            } else {
              setSubtareas([]);
            }
          }
        } else if (activityData.subtasks && activityData.subtasks.length > 0) {
          // Si no hay activityId, usar los datos directamente
          const formattedSubtasks = activityData.subtasks.map((subtask, index) => {
            let horasValue = "";
            if (subtask.horas) {
              const cleanHours = subtask.horas.replace(/h/gi, "").trim();
              horasValue = cleanHours && !isNaN(parseFloat(cleanHours)) ? cleanHours : "";
            }
            
            return {
              id: typeof subtask.id === 'number' ? subtask.id : (parseInt(String(subtask.id)) || Date.now() + index),
              nombre: subtask.nombre || "",
              fechaObjetivo: subtask.fechaObjetivo || "",
              horas: horasValue,
            };
          });
          setSubtareas(formattedSubtasks);
        } else {
          setSubtareas([]);
        }
      };

      loadSubtasks();
    } else if (!open) {
      // Limpiar el estado cuando se cierra el modal
      setTitulo("");
      setCurso("");
      setTipo("");
      setFechaEntrega("");
      setFechaEvento("");
      setDescripcion("");
      setSubtareas([]);
      setErrors({});
    }
  }, [open, activityData]);

  // Cargar cursos
  useEffect(() => {
    if (open) {
      loadCourses();
    }
  }, [open]);

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

    setCourseError("");

    try {
      setCreatingCourse(true);
      const newCourse = await createCourse({ name: newCourseName.trim() });
      setCourses([...courses, newCourse]);
      setCurso(newCourse.id.toString());
      setIsDialogOpen(false);
      setNewCourseName("");
      showToast("Curso creado exitosamente", "success");
    } catch (error: any) {
      let errorMessage = "Error al crear el curso. Intenta de nuevo.";
      if (error?.response?.data?.name) {
        errorMessage = Array.isArray(error.response.data.name)
          ? error.response.data.name[0]
          : error.response.data.name;
        if (errorMessage.toLowerCase().includes("ya existe")) {
          errorMessage = "Es posible que ya exista un curso con ese nombre.";
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      setCourseError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleCourseNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCourseName(e.target.value);
    setCourseError("");
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setNewCourseName("");
      setCourseError("");
    }
  };

  const clearFieldError = (field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field as keyof typeof newErrors];
      return newErrors;
    });
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!titulo.trim()) {
      newErrors.titulo = "El título es obligatorio para crear una tarea.";
    }

    if (!curso) {
      newErrors.curso = "El curso es obligatorio para crear una tarea.";
    }

    if (!tipo) {
      newErrors.tipo = "El tipo es obligatorio para crear una tarea.";
    }

    if (!fechaEntrega) {
      newErrors.fechaEntrega = "La fecha de entrega es obligatoria para crear una tarea.";
    }

    // Validar subtareas (igual que ActivityForm)
    if (subtareas.length > 0) {
      const subtaskErrors: { [key: number]: { nombre?: string; fechaObjetivo?: string; horas?: string } } = {};
      subtareas.forEach((sub) => {
        const subErrors: { nombre?: string; fechaObjetivo?: string; horas?: string } = {};
        if (!sub.nombre.trim()) {
          subErrors.nombre = "El nombre de la subtarea es obligatorio.";
        }
        if (!sub.fechaObjetivo) {
          subErrors.fechaObjetivo = "La fecha objetivo es obligatoria.";
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
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showToast("Por favor, completa todos los campos obligatorios", "error");
      return;
    }

    if (!activityId) {
      showToast("Error: ID de actividad no disponible", "error");
      return;
    }

    setIsSaving(true);

    try {
      // Preparar los datos para el backend
      const activityUpdateData: any = {
        title: titulo.trim(),
        type: tipo,
        course_id: curso ? String(curso) : null,
        deadline: fechaEntrega || null,
      };

      // Manejar description: solo incluir si tiene contenido
      if (descripcion && descripcion.trim()) {
        activityUpdateData.description = descripcion.trim();
      } else {
        activityUpdateData.description = "";
      }

      // Si hay fecha de evento, convertirla a formato datetime
      if (fechaEvento) {
        const eventDateTime = new Date(fechaEvento);
        eventDateTime.setHours(12, 0, 0, 0);
        activityUpdateData.event_datetime = eventDateTime.toISOString();
      } else {
        activityUpdateData.event_datetime = null;
      }

      console.log("Datos a enviar al backend:", activityUpdateData);

      // Llamar a la API para actualizar la actividad
      await updateActivity(activityId, activityUpdateData);

      // Actualizar subtareas: crear nuevas, actualizar existentes, eliminar eliminadas
      if (activityId && originalSubtasks.length > 0) {
        // Obtener IDs de subtareas originales del backend (normalizados a string)
        const originalBackendIds = new Set(originalSubtasks.map(s => String(s.id)));

        // Separar subtareas en nuevas y existentes
        const newSubtasks: Subtarea[] = [];
        const existingSubtasks: Array<{ subtask: Subtarea; originalId: string }> = [];

        subtareas.forEach((sub) => {
          const idStr = String(sub.id);
          const isOriginalId = originalBackendIds.has(idStr);
          
          // Verificar si es un ID temporal (Date.now() genera números de 13+ dígitos)
          const isTemporaryId = !isOriginalId && (
            (typeof sub.id === 'number' && sub.id > 1000000000000) ||
            (idStr.length > 15 && !idStr.includes('-'))
          );

          if (isTemporaryId || !isOriginalId) {
            newSubtasks.push(sub);
          } else {
            existingSubtasks.push({ subtask: sub, originalId: idStr });
          }
        });

        // Crear nuevas subtareas
        if (newSubtasks.length > 0) {
          await Promise.all(
            newSubtasks.map((sub) =>
              createSubtask(activityId, {
                title: sub.nombre.trim(),
                estimated_hours: parseFloat(sub.horas) || 0,
                target_date: sub.fechaObjetivo || null,
                status: "PENDING",
              })
            )
          );
        }

        // Actualizar subtareas existentes
        if (existingSubtasks.length > 0) {
          await Promise.all(
            existingSubtasks.map(({ subtask, originalId }) => {
              const originalSubtask = originalSubtasks.find(os => String(os.id) === originalId);
              if (originalSubtask) {
                return updateSubtask(activityId, originalId, {
                  title: subtask.nombre.trim(),
                  estimated_hours: parseFloat(subtask.horas) || 0,
                  target_date: subtask.fechaObjetivo || null,
                });
              }
              return Promise.resolve();
            })
          );
        }

        // Eliminar subtareas que ya no están en la lista
        const currentIds = new Set(subtareas.map(s => String(s.id)));
        const subtasksToDelete = originalSubtasks.filter(
          os => !currentIds.has(String(os.id))
        );

        if (subtasksToDelete.length > 0) {
          await Promise.all(
            subtasksToDelete.map((sub) => deleteSubtask(activityId, String(sub.id)))
          );
        }
      } else if (activityId && subtareas.length > 0) {
        // Si no hay subtareas originales pero hay subtareas nuevas, crear todas
        await Promise.all(
          subtareas.map((sub) =>
            createSubtask(activityId, {
              title: sub.nombre.trim(),
              estimated_hours: parseFloat(sub.horas) || 0,
              target_date: sub.fechaObjetivo || null,
              status: "PENDING",
            })
          )
        );
      }

      // Mostrar mensaje de éxito
      showToast("¡Todo salió bien! La actividad se actualizó correctamente.", "success");
      
      // Llamar al callback para actualizar los datos en el componente padre
      if (onActivityUpdated) {
        onActivityUpdated();
      }
      
      // Cerrar el modal después de un breve delay
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
      
    } catch (error: any) {
      console.error("Error al actualizar actividad:", error);
      console.error("Datos del error:", error?.response?.data);
      
      let errorMessage = "Error al actualizar la actividad. Intenta de nuevo.";
      
      if (error?.response?.data) {
        if (error.response.data.title) {
          const titleError = Array.isArray(error.response.data.title) 
            ? error.response.data.title[0] 
            : error.response.data.title;
          errorMessage = titleError || errorMessage;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.deadline) {
          const deadlineError = Array.isArray(error.response.data.deadline) 
            ? error.response.data.deadline[0] 
            : error.response.data.deadline;
          errorMessage = deadlineError || errorMessage;
        } else if (error.response.data.event_datetime) {
          const eventError = Array.isArray(error.response.data.event_datetime) 
            ? error.response.data.event_datetime[0] 
            : error.response.data.event_datetime;
          errorMessage = eventError || errorMessage;
        } else if (typeof error.response.data === 'object') {
          const firstError = Object.values(error.response.data)[0];
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = firstError[0];
          } else if (typeof firstError === 'string') {
            errorMessage = firstError;
          }
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, "error");
    } finally {
      setIsSaving(false);
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
    setSubtareas((prevSubtareas) => 
      prevSubtareas.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const inputClass =
    "w-full rounded-lg bg-[#111827] border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

  return (
    <>
      <ToastComponent />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[880px] max-h-[90vh] overflow-y-auto bg-[#111827] border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground">
              Editar actividad
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Modifica los detalles de tu actividad.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Detalles de la actividad */}
            <div className="rounded-xl border border-border bg-[#1E293B] p-6">
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
                          className="cursor-pointer bg-[#111827] border-border text-foreground hover:bg-[#111827]/80"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          onClick={handleCreateCourse}
                          disabled={!newCourseName.trim() || creatingCourse}
                          className="cursor-pointer bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white disabled:cursor-not-allowed disabled:opacity-50"
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
                    <span className="text-white">Fecha de entrega:</span> <span className="text-[#9CA3AF]">¿Cuándo debes entregar o presentar?</span> <span className="text-primary">*</span>
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
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer bg-[#1E293B] border-border text-muted-foreground hover:bg-[#1E293B]/80"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="cursor-pointer flex items-center gap-2 bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
