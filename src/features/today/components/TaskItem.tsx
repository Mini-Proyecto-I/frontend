import { Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/shared/utils/utils";
import { Checkbox } from "@/shared/components/checkbox";
import { Badge } from "@/shared/components/badge";
import { Button } from "@/shared/components/button";

interface BackendSubtask {
  id: string;
  title: string;
  activity: string | { id: string };
  status: 'DONE' | 'PENDING' | 'WAITING' | 'POSTPONED';
  estimated_hours: string | number;
  target_date?: string;
  execution_note?: string;
}

interface TaskItemProps {
  subtask: BackendSubtask;
  activityId: string;
  onStatusChange: (activityId: string, subtaskId: string, status: 'done' | 'pending') => void;
}

export const TaskItem = ({ subtask, activityId, onStatusChange }: TaskItemProps) => {
  const estimatedHours = parseFloat(String(subtask.estimated_hours)) || 0;

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
          {estimatedHours.toFixed(1)}h
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 cursor-pointer transition-all duration-200 hover:scale-105 hover:bg-primary/15 hover:text-primary"
        >
          Reprogramar
        </Button>
      </div>
    </div>
  );
};
