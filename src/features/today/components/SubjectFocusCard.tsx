import { cn } from "@/shared/utils/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/card";

interface SubjectFocusItem {
  course: string;
  hours: number;
  courseColor: string;
}

interface SubjectFocusCardProps {
  groupedByCourse: SubjectFocusItem[];
  totalHours: number;
}

export const SubjectFocusCard = ({ groupedByCourse, totalHours }: SubjectFocusCardProps) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Enfoque por materia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {groupedByCourse.map((g) => {
          const pct = totalHours > 0 ? Math.round((g.hours / totalHours) * 100) : 0;
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
  );
};
