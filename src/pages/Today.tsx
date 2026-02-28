import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, PlusCircle, BarChart3, AlertTriangle } from "lucide-react";
import { useStore } from "@/app/store";
import { Card, CardContent } from "@/shared/components/card";
import { Button } from "@/shared/components/button";
import { useTodayData } from '../features/today/hooks/useTodayData';
import { OverloadAlert } from '@/features/today/components/OverloadAlert';
import { EmptyState } from '@/features/today/components/EmptyState';
import { ActivityCard } from '@/features/today/components/ActivityCard';
import { CapacityCard } from '@/features/today/components/CapacityCard';
import { SubjectFocusCard } from '@/features/today/components/SubjectFocusCard';
import ActivityDeletedSuccessDialog from '@/features/activityDetail/components/ActivityDeletedSuccessDialog';

/** Devuelve saludo e icono según la hora: mañana (5-11), tarde (12-18), noche (19-4) */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: 'Buenos días', emoji: '☀️' };
  if (hour >= 12 && hour < 19) return { text: 'Buenas tardes', emoji: '🌤️' };
  return { text: 'Buenas noches', emoji: '🌙' };
}

/** Frases motivadoras del día: rotan según el día del año (misma frase todo el día) */
const FRASES_MOTIVADORAS = [
  "Cada pequeño paso te acerca a tu meta.",
  "Tu esfuerzo de hoy es el éxito de mañana.",
  "La constancia vence lo que el talento no conquista.",
  "Hoy es un buen día para aprender algo nuevo.",
  "El progreso no es perfecto, pero es real.",
  "Tu actitud determina tu dirección.",
  "Pequeñas mejoras diarias llevan a grandes resultados.",
  "Lo que practicas mejora. Sigue adelante.",
  "El conocimiento es la mejor inversión.",
  "Cada sesión de estudio cuenta.",
  "Tu futuro self te agradecerá este momento.",
  "La disciplina es elegir entre lo que quieres ahora y lo que quieres más.",
  "No es sobre ser el mejor, es sobre ser mejor que ayer.",
  "El aprendizaje es un tesoro que te acompaña siempre.",
  "Haz de hoy un día productivo.",
];

function getFraseMotivadoraDelDia(): string {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return FRASES_MOTIVADORAS[dayOfYear % FRASES_MOTIVADORAS.length];
}

// Tipos del backend
interface BackendCourse {
  id: string;
  name: string;
}

interface BackendActivity {
  id: string;
  title: string;
  course?: BackendCourse;
  description?: string;
}

interface BackendSubtask {
  id: string;
  title: string;
  activity: BackendActivity | string;
  status: 'DONE' | 'PENDING' | 'WAITING' | 'POSTPONED';
  estimated_hours: string | number;
  target_date?: string;
  execution_note?: string;
}

interface GroupedActivity {
  title: string;
  course: string;
  courseColor: string;
  subtasks: BackendSubtask[];
}

const courseColorMap: Record<string, string> = {
    cyan: 'bg-cyan/20 text-cyan border-cyan/30',
    orange: 'bg-orange/20 text-orange border-orange/30',
    green: 'bg-green/20 text-green border-green/30',
    blue: 'bg-blue/20 text-blue border-blue/30',
    purple: 'bg-purple/20 text-purple border-purple/30',
    red: 'bg-red/20 text-red border-red/30',
    yellow: 'bg-yellow/20 text-yellow border-yellow/30',
};

// Función para asignar un color a un curso basado en su ID o nombre
const getCourseColor = (courseId: string, courseName: string, index: number): string => {
  const colors = ['cyan', 'orange', 'green', 'blue', 'purple', 'red', 'yellow'];
  // Usar el ID o nombre para generar un índice consistente
  const hash = courseId ? courseId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : index;
  return colors[hash % colors.length];
};

export default function Today() {
    const navigate = useNavigate();
    const location = useLocation();
    const { courses, activities, subtasks, logs, loading, error } = useTodayData();
    const { user, updateSubtask } = useStore();
    
    // Estado para el modal de éxito de actividad eliminada
    const [showActivityDeletedSuccess, setShowActivityDeletedSuccess] = useState(false);
    const [deletedActivityName, setDeletedActivityName] = useState("");
    
    // Verificar si hay un estado de navegación que indique mostrar el modal de éxito
    useEffect(() => {
      const state = location.state as { showActivityDeletedSuccess?: boolean; deletedActivityName?: string } | null;
      if (state?.showActivityDeletedSuccess && state?.deletedActivityName) {
        setShowActivityDeletedSuccess(true);
        setDeletedActivityName(state.deletedActivityName);
        // Limpiar el state de navegación para evitar que se muestre de nuevo al recargar
        window.history.replaceState({}, document.title);
      }
    }, [location.state]);
    // Calcular fecha de hoy en zona horaria local (no UTC)
    const getTodayLocal = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const today = getTodayLocal();

    // Crear un mapa de cursos por ID para acceso rápido
    const coursesMap = useMemo(() => {
      const map = new Map();
      courses.forEach((course: any, index: number) => {
        map.set(course.id, {
          ...course,
          color: getCourseColor(course.id, course.name, index),
        });
      });
      return map;
    }, [courses]);

    // Crear un mapa de actividades por ID
    const activitiesMap = useMemo(() => {
      const map = new Map();
      activities.forEach((activity: any) => {
        const course = activity.course ? coursesMap.get(activity.course.id) : null;
        map.set(activity.id, {
          ...activity,
          courseColor: course?.color || 'cyan',
        });
      });
      return map;
    }, [activities, coursesMap]);

    // Filtrar subtareas de hoy (usando nombres del backend directamente)
    const todaySubtasks = useMemo(() => {
      return subtasks.filter((subtask: any) => {
        // Filtrar por fecha de hoy
        if (!subtask.target_date) return false;
        // Normalizar la fecha del backend (puede venir con hora o en UTC)
        // Extraer solo la parte de la fecha (YYYY-MM-DD)
        const subtaskDate = subtask.target_date.split('T')[0];
        return subtaskDate === today;
      });
    }, [subtasks, today]);

    // Calcular total de horas (usando nombres del backend)
    const totalHours = useMemo(() => {
      return todaySubtasks
        .filter((st: any) => st.status !== 'DONE')
        .reduce((sum: number, st: any) => sum + (parseFloat(st.estimated_hours) || 0), 0);
    }, [todaySubtasks]);

    const isOverloaded = totalHours > user.dailyLimit;
    const progressPercent = Math.min((totalHours / user.dailyLimit) * 100, 100);

    // Agrupar subtareas por actividad (usando nombres del backend)
    const grouped = useMemo(() => {
      return todaySubtasks.reduce((acc: Record<string, GroupedActivity>, st: BackendSubtask) => {
        const activityId = typeof st.activity === 'object' ? st.activity.id : st.activity;
        const activity = activitiesMap.get(activityId);
        const course = typeof st.activity === 'object' ? st.activity.course : activity?.course;
        
        if (!acc[activityId]) {
          acc[activityId] = {
            title: activity?.title || 'Sin título',
            course: course?.name || 'Sin curso',
            courseColor: activity?.courseColor || 'cyan',
            subtasks: [],
          };
        }
        acc[activityId].subtasks.push(st);
        return acc;
      }, {} as Record<string, GroupedActivity>);
    }, [todaySubtasks, activitiesMap]);

    // Agrupar por materia/curso (suma horas de todas las actividades del mismo curso)
    const groupedByCourse = useMemo(() => {
      const byCourse: Record<string, { course: string; hours: number; courseColor: string }> = {};
      Object.values(grouped).forEach((g: GroupedActivity) => {
        const hours = g.subtasks.reduce(
          (sum: number, s: BackendSubtask) =>
            sum + (s.status !== 'DONE' ? (parseFloat(String(s.estimated_hours)) || 0) : 0),
          0
        );
        if (hours > 0) {
          if (!byCourse[g.course]) {
            byCourse[g.course] = { course: g.course, hours: 0, courseColor: g.courseColor };
          }
          byCourse[g.course].hours += hours;
        }
      });
      return Object.values(byCourse);
    }, [grouped]);

    // Estados de carga y error
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px] rounded-xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando datos...</p>
          </div>
        </div>
      );
    }

    if (error) {
      const errorMessage = (error as any)?.message || String(error) || 'Error desconocido';
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div className="text-center">
                <p className="font-semibold text-destructive">Error al cargar datos</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {errorMessage}
                </p>
              </div>
              <Button onClick={() => window.location.reload()} className="cursor-pointer transition-all duration-200 hover:scale-105 hover:bg-primary/90 hover:text-primary-foreground">
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  
    const greeting = getGreeting();

    return (
      <div className="flex gap-6 max-w-7xl">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                ¡{greeting.text}, {user.name.split(' ')[0]}! {greeting.emoji}
              </h1>
              <p className="text-muted-foreground mt-1 capitalize">{format(new Date(), 'EEEE, d \'de\' MMMM, yyyy', { locale: es })}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/crear')}
                className="cursor-pointer transition-all duration-200 hover:scale-105 hover:border-primary hover:bg-primary/15 hover:text-primary"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Crear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/progreso')}
                className="cursor-pointer transition-all duration-200 hover:scale-105 hover:border-primary hover:bg-primary/15 hover:text-primary"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Progreso
              </Button>
            </div>
          </div>

          {/* Frase motivadora del día */}
          <p className="text-muted-foreground/90 text-center italic text-sm sm:text-base py-2">
            "{getFraseMotivadoraDelDia()}"
          </p>

          {/* Overload alert */}
          {isOverloaded && (
            <OverloadAlert totalHours={totalHours} dailyLimit={user.dailyLimit} />
          )}

          {/* Empty state */}
          {todaySubtasks.length === 0 && !loading && (
            <EmptyState />
          )}

          {/* Task cards grouped by activity */}
          <div className="space-y-4">
            {Object.entries(grouped).map(([activityId, group]) => (
              <ActivityCard
                key={activityId}
                activityId={activityId}
                group={group}
                courseColorMap={courseColorMap}
                onStatusChange={(activityId, subtaskId, status) => {
                  updateSubtask(activityId, subtaskId, { status });
                }}
              />
            ))}
          </div>
        </div>

        {/* Right panel */}
        <aside className="w-80 shrink-0 space-y-4 hidden lg:block">
          <div className="rounded-xl border border-primary/10 bg-gradient-to-b from-primary/5 to-transparent p-1">
          <CapacityCard
            totalHours={totalHours}
            dailyLimit={user.dailyLimit}
            progressPercent={progressPercent}
            isOverloaded={isOverloaded}
          />
          <SubjectFocusCard
            groupedByCourse={groupedByCourse}
            totalHours={totalHours}
          />
          </div>
        </aside>

        {/* Modal de éxito de actividad eliminada */}
        <ActivityDeletedSuccessDialog
          open={showActivityDeletedSuccess}
          onOpenChange={setShowActivityDeletedSuccess}
          activityName={deletedActivityName}
        />
      </div>
    );
  }
