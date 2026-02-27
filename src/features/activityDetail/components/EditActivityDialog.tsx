import { useState, useEffect } from "react";
import { Calendar, ChevronDown, ClipboardList, Save } from "lucide-react";
import InfoTooltip from "@/features/create/components/InfoTooltip";
import SubtaskForm, { Subtarea } from "@/features/create/components/SubtaskForm";
import { getCourses, createCourse } from "@/api/services/course";
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
}

const activityTypes = [
  { label: "Examen", value: "examen" },
  { label: "Taller", value: "taller" },
  { label: "Proyecto", value: "proyecto" },
];

export default function EditActivityDialog({
  open,
  onOpenChange,
  activityData = {},
}: EditActivityDialogProps) {
  const [titulo, setTitulo] = useState("");
  const [curso, setCurso] = useState("");
  const [tipo, setTipo] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [fechaEvento, setFechaEvento] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [subtareas, setSubtareas] = useState<Subtarea[]>([]);

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
    // Por ahora retornamos una fecha de ejemplo, cuando se conecte al backend será real
    if (dateStr.includes("15 nov")) return "2024-11-15";
    if (dateStr.includes("14 nov")) return "2024-11-14";
    if (dateStr.includes("12 nov")) return "2024-11-12";
    if (dateStr.includes("10 nov")) return "2024-11-10";
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
      
      if (activityData.subtasks && activityData.subtasks.length > 0) {
        setSubtareas(activityData.subtasks);
      } else {
        setSubtareas([]);
      }
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

    const subtaskErrors: { [key: number]: { nombre?: string; fechaObjetivo?: string; horas?: string } } = {};
    subtareas.forEach((subtask, index) => {
      if (!subtask.nombre.trim()) {
        subtaskErrors[subtask.id] = { ...subtaskErrors[subtask.id], nombre: "El nombre de la subtarea es obligatorio." };
      }
      if (!subtask.fechaObjetivo) {
        subtaskErrors[subtask.id] = { ...subtaskErrors[subtask.id], fechaObjetivo: "La fecha objetivo es obligatoria." };
      }
      if (!subtask.horas.trim()) {
        subtaskErrors[subtask.id] = { ...subtaskErrors[subtask.id], horas: "Las horas estimadas son obligatorias." };
      }
    });

    if (Object.keys(subtaskErrors).length > 0) {
      newErrors.subtareas = subtaskErrors;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      // Aquí iría la lógica para guardar los cambios
      console.log("Guardar cambios:", {
        titulo,
        curso,
        tipo,
        fechaEntrega,
        fechaEvento,
        descripcion,
        subtareas,
      });
      showToast("Actividad actualizada exitosamente", "success");
      onOpenChange(false);
    } else {
      showToast("Por favor, completa todos los campos obligatorios", "error");
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
                          className="bg-[#111827] border-border text-foreground hover:bg-[#111827]/80"
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
                  <div className="flex items-center gap-5 mt-3">
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
                <div className="mt-5.5" data-field="fechaEntrega">
                  <label className="block text-sm font-medium mb-1">
                    <span className="text-white">Fecha de entrega:</span> <span className="text-[#9CA3AF]">¿Cuándo la tienes que entregar?</span> <span className="text-primary">*</span>
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
                    <span className="text-white">Fecha del evento:</span> <span className="text-[#9CA3AF]">¿Cuándo es el evento asociado?</span>
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

            {/* Plan de estudio / Subtareas */}
            <div data-field="subtareas">
              <SubtaskForm
                subtareas={subtareas}
                onAdd={addSubtarea}
                onRemove={removeSubtarea}
                onUpdate={updateSubtarea}
                errors={errors.subtareas}
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
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-[#1E293B] border-border text-muted-foreground hover:bg-[#1E293B]/80"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white"
            >
              <Save className="h-4 w-4" />
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
