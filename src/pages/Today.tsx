import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { Calendar, Clock, AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
import { useStore } from "@/app/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/today/components/card";
import { Badge } from "@/features/today/components/badge";
import { Button } from "@/features/today/components/button";
import { Checkbox } from "@/features/today/components/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/features/today/components/popover";
import { Calendar as CalendarPicker } from "@/features/today/components/calendar";
import { cn } from "@/shared/utils/utils";
import { useTodayData } from '../features/today/hooks/useTodayData';

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

// Componente Progress simple (temporal hasta que se implemente el componente completo)
const Progress = ({ value, className }: { value: number; className?: string }) => {
  const isDestructive = className?.includes ('[&>div]:bg-destructive');
  return (
    <div className={cn("w-full bg-secondary rounded-full overflow-hidden h-2", className)}>
      <div
        className={cn(
          "h-full transition-all duration-300 rounded-full",
          isDestructive ? "bg-destructive" : "bg-primary"
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
};

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
    const { courses, activities, subtasks, logs, loading, error } = useTodayData();
    const { user, updateSubtask } = useStore();
    // Calcular fecha de hoy en zona horaria local (no UTC)
    const getTodayLocal = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const today = getTodayLocal();
    const [rescheduleId, setRescheduleId] = useState<{ activityId: string; subtaskId: string } | null>(null);

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

    // Estados de carga y error
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
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
          <Card className="border-destructive">
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div className="text-center">
                <p className="font-semibold text-destructive">Error al cargar datos</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {errorMessage}
                </p>
              </div>
              <Button onClick={() => window.location.reload()}>Reintentar</Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  
    return (
      <div className="flex gap-6 max-w-7xl">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">¡Buenos días, {user.name.split(' ')[0]}! ☀️</h1>
            <p className="text-muted-foreground mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy', { locale: es })}</p>
          </div>

          {/* Overload alert */}
          {isOverloaded && (
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="flex items-start gap-3 py-4">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-destructive">Daily Limit Exceeded</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You have planned <strong className="text-foreground">{totalHours.toFixed(1)}h</strong> of study today, but your daily limit is{' '}
                    <strong className="text-foreground">{user.dailyLimit}h</strong>. Consider rescheduling some tasks.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {todaySubtasks.length === 0 && !loading && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">No tasks for today 🎉</h3>
                <p className="text-muted-foreground mt-1">Enjoy your free time or plan ahead!</p>
                <Button className="mt-4" onClick={() => {}}>
                  Create Activity
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Task cards grouped by activity */}
          <div className="space-y-4">
            {Object.entries(grouped).map(([activityId, group]) => (
              <Card key={activityId} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('text-xs', courseColorMap[group.courseColor] || '')}>
                        {group.course}
                      </Badge>
                      <CardTitle className="text-base">
                        <span className="hover:text-primary transition-colors cursor-pointer">
                          {group.title}
                        </span>
                      </CardTitle>
                    </div>
                    <span className="cursor-pointer">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {group.subtasks.map((st: BackendSubtask) => {
                    const activityId = typeof st.activity === 'object' ? st.activity.id : st.activity;
                    const estimatedHours = parseFloat(String(st.estimated_hours)) || 0;
                    return (
                      <div
                        key={st.id}
                        className={cn(
                          'flex items-center justify-between rounded-lg border p-3',
                          st.status === 'DONE' && 'opacity-50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={st.status === 'DONE'}
                            onCheckedChange={(checked) => {
                              // TODO: Implementar actualización en el backend
                              // Por ahora solo actualiza el estado local
                              updateSubtask(activityId, st.id, { status: checked ? 'done' : 'pending' });
                            }}
                          />
                          <span className={cn('text-sm', st.status === 'DONE' && 'line-through text-muted-foreground')}>
                            {st.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {estimatedHours.toFixed(1)}h
                          </Badge>
                          <Popover
                            open={rescheduleId?.subtaskId === st.id}
                            onOpenChange={(open) => !open && setRescheduleId(null)}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => setRescheduleId({ activityId, subtaskId: st.id })}
                              >
                                Reprogramar
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                              <CalendarPicker
                                mode="single"
                                selected={st.target_date ? new Date(st.target_date) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    // TODO: Implementar actualización en el backend
                                    // Por ahora solo actualiza el estado local
                                    updateSubtask(activityId, st.id, { targetDate: date.toISOString().split('T')[0] });
                                    setRescheduleId(null);
                                  }
                                }}
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <aside className="w-80 shrink-0 space-y-4 hidden lg:block">
          {/* Capacity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Capacidad de estudio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1 mb-3">
                <span className={cn('text-3xl font-bold', isOverloaded ? 'text-destructive' : 'text-primary')}>
                  {totalHours}
                </span>
                <span className="text-muted-foreground text-sm">/ {user.dailyLimit}h límite</span>
              </div>
              <Progress value={progressPercent} className={cn('h-2', isOverloaded && '[&>div]:bg-destructive')} />
              {isOverloaded && (
                <p className="text-xs text-destructive mt-2">
                  {(totalHours - user.dailyLimit).toFixed(1)}h over your daily limit
                </p>
              )}
            </CardContent>
          </Card>

          {/* Subject focus */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Enfoque por materia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.values(grouped).map((g: GroupedActivity) => {
                const hours = g.subtasks.reduce((sum: number, s: BackendSubtask) => 
                  sum + (s.status !== 'DONE' ? (parseFloat(String(s.estimated_hours)) || 0) : 0), 0);
                const pct = totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0;
                return (
                  <div key={g.course}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{g.course}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          g.courseColor === 'cyan' && 'bg-cyan',
                          g.courseColor === 'orange' && 'bg-orange',
                          g.courseColor === 'green' && 'bg-green',
                          g.courseColor === 'blue' && 'bg-blue',
                          g.courseColor === 'purple' && 'bg-purple',
                          g.courseColor === 'red' && 'bg-red',
                          g.courseColor === 'yellow' && 'bg-yellow'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </aside>
      </div>
    );
  }
