import { useState } from "react";
import { Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/shared/utils/utils";
import { Checkbox } from "@/shared/components/checkbox";
import { Badge } from "@/shared/components/badge";
import { Button } from "@/shared/components/button";
import { MessageModal } from "@/shared/components/MessageModal";
import { formatStudyHours } from "@/shared/utils/studyLimitFormat";

interface BackendSubtask {
  id: string;
  title: string;
  activity: string | { id: string };
  status: 'DONE' | 'PENDING' | 'WAITING' | 'POSTPONED';
  estimated_hours: string | number;
  target_date?: string;
  execution_note?: string;
  is_conflicted?: boolean;
}

interface TaskItemProps {
  subtask: BackendSubtask;
  activityId: string;
  onStatusChange: (activityId: string, subtaskId: string, status: 'done' | 'pending') => void;
}

export const TaskItem = ({ subtask, activityId, onStatusChange }: TaskItemProps) => {
  const estimatedHours = parseFloat(String(subtask.estimated_hours)) || 0;
  const [conflictBlockModalOpen, setConflictBlockModalOpen] = useState(false);

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border p-3',
        subtask.status === 'DONE' && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={subtask.status === 'DONE'}
          onCheckedChange={(checked) => {
            if (checked && subtask.is_conflicted) {
              setConflictBlockModalOpen(true);
              return;
            }
            onStatusChange(activityId, subtask.id, checked ? 'done' : 'pending');
          }}
        />
        <span className={cn('text-sm', subtask.status === 'DONE' && 'line-through text-muted-foreground')}>
          {subtask.title}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          {formatStudyHours(estimatedHours)}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 cursor-pointer transition-all duration-200 hover:scale-105 hover:bg-primary/15 hover:text-primary"
        >
          Reprogramar
        </Button>
      </div>
      <MessageModal
        open={conflictBlockModalOpen}
        onOpenChange={setConflictBlockModalOpen}
        type="warning"
        title="Tarea en conflicto"
        message="No puedes completar esta tarea mientras tenga un conflicto de horario. Resuelve el conflicto primero reduciendo las horas o moviendo la tarea a otro día."
      />
    </div>
  );
};
