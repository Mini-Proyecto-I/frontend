import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/shared/utils/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/card";
import { Badge } from "@/shared/components/badge";
import { TaskItem } from "./TaskItem";

interface BackendSubtask {
  id: string;
  title: string;
  activity: string | { id: string };
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

interface ActivityCardProps {
  activityId: string;
  group: GroupedActivity;
  courseColorMap: Record<string, string>;
  onStatusChange: (activityId: string, subtaskId: string, status: 'done' | 'pending') => void;
}

export const ActivityCard = ({ activityId, group, courseColorMap, onStatusChange }: ActivityCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('text-xs', courseColorMap[group.courseColor] || '')}>
              {group.course}
            </Badge>
            <CardTitle className="text-base">
              <span
                className="hover:text-primary transition-colors cursor-pointer"
                onClick={() => navigate(`/actividad/${activityId}`)}
              >
                {group.title}
              </span>
            </CardTitle>
          </div>
          <span
            className="cursor-pointer"
            onClick={() => navigate(`/actividad/${activityId}`)}
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {group.subtasks.map((st) => (
          <TaskItem
            key={st.id}
            subtask={st}
            activityId={activityId}
            onStatusChange={onStatusChange}
          />
        ))}
      </CardContent>
    </Card>
  );
};
