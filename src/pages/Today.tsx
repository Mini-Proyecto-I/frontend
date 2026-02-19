import { useState } from "react";
import { format } from "date-fns";
import { Calendar, Clock, AlertTriangle, ChevronRight } from "lucide-react";
import { useStore } from "@/app/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/today/components/card";
import { Badge } from "@/features/today/components/badge";
import { Button } from "@/features/today/components/button";
import { Checkbox } from "@/features/today/components/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/features/today/components/popover";
import { Calendar as CalendarPicker } from "@/features/today/components/calendar";
import { cn } from "@/shared/utils/utils";

// Componente Progress simple (temporal hasta que se implemente el componente completo)
const Progress = ({ value, className }: { value: number; className?: string }) => {
  const isDestructive = className?.includes('[&>div]:bg-destructive');
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
};


export default function Today() {
    const { user, getSubtasksForDate, getTotalHoursForDate, updateSubtask } = useStore();
    const today = new Date().toISOString().split('T')[0];
    const todaySubtasks = getSubtasksForDate(today);
    const totalHours = getTotalHoursForDate(today);
    const isOverloaded = totalHours > user.dailyLimit;
    const progressPercent = Math.min((totalHours / user.dailyLimit) * 100, 100);
  
    const grouped = todaySubtasks.reduce((acc, st) => {
      if (!acc[st.activityId]) acc[st.activityId] = { title: st.activityTitle, course: st.course, courseColor: st.courseColor, subtasks: [] };
      acc[st.activityId].subtasks.push(st);
      return acc;
    }, {} as Record<string, { title: string; course: string; courseColor: string; subtasks: typeof todaySubtasks }>);
  
    const [rescheduleId, setRescheduleId] = useState<{ activityId: string; subtaskId: string } | null>(null);
  
    return (
      <div className="flex gap-6 max-w-7xl">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Good Morning, {user.name.split(' ')[0]}! ☀️</h1>
            <p className="text-muted-foreground mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>

          {/* Overload alert */}
          {isOverloaded && (
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="flex items-start gap-3 py-4">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-destructive">Daily Limit Exceeded</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You have planned <strong className="text-foreground">{totalHours}h</strong> of study today, but your daily limit is{' '}
                    <strong className="text-foreground">{user.dailyLimit}h</strong>. Consider rescheduling some tasks.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {todaySubtasks.length === 0 && (
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
                  {group.subtasks.map((st) => (
                    <div
                      key={st.id}
                      className={cn(
                        'flex items-center justify-between rounded-lg border p-3',
                        st.status === 'done' && 'opacity-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={st.status === 'done'}
                          onCheckedChange={(checked) =>
                            updateSubtask(st.activityId, st.id, { status: checked ? 'done' : 'pending' })
                          }
                        />
                        <span className={cn('text-sm', st.status === 'done' && 'line-through text-muted-foreground')}>
                          {st.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {st.estimatedHours}h
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
                              onClick={() => setRescheduleId({ activityId: st.activityId, subtaskId: st.id })}
                            >
                              Reschedule
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <CalendarPicker
                              mode="single"
                              selected={new Date(st.targetDate)}
                              onSelect={(date) => {
                                if (date) {
                                  updateSubtask(st.activityId, st.id, { targetDate: date.toISOString().split('T')[0] });
                                  setRescheduleId(null);
                                }
                              }}
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  ))}
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Study Capacity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1 mb-3">
                <span className={cn('text-3xl font-bold', isOverloaded ? 'text-destructive' : 'text-primary')}>
                  {totalHours}
                </span>
                <span className="text-muted-foreground text-sm">/ {user.dailyLimit}h limit</span>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Subject Focus</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.values(grouped).map((g) => {
                const hours = g.subtasks.reduce((sum, s) => sum + (s.status !== 'done' ? s.estimatedHours : 0), 0);
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
                          g.courseColor === 'green' && 'bg-green'
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
